import logging
from datetime import date
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from apps.instruments.models import CalibrationRecord
from .models import AlertRecipient, NotificationLog

logger = logging.getLogger(__name__)

THRESHOLDS = [
    (90, '90_days', 'emails/calibration_alert_90.html'),
    (30, '30_days', 'emails/calibration_alert_30.html'),
    (20, '20_days', 'emails/calibration_alert_20.html'),
]


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def check_calibration_due_dates(self):
    """
    Runs daily via Celery Beat at 8 AM.
    
    For every active calibration record, calculates days
    remaining until due date. Uses RANGE-based logic (not exact
    date match) so that if the scheduler misses a day due to
    downtime, it catches up automatically the next time it runs.
    
    For each threshold (90/30/20 days), checks NotificationLog
    to see if THIS specific instrument + calibration record +
    trigger_type + recipient has ALREADY received an alert this
    year. If not, sends the email and logs it. This prevents
    duplicate emails even if the task runs twice in one day or
    every day for a week straight while inside a threshold window.
    """
    today = date.today()
    current_year = today.year

    active_recipients = list(
        AlertRecipient.objects.filter(active=True)
    )

    if not active_recipients:
        logger.warning("No active alert recipients configured. Skipping notification run.")
        return "No active recipients."

    active_records = CalibrationRecord.objects.filter(
        instrument__is_deleted=False
    ).select_related('instrument')

    total_sent = 0
    total_skipped = 0
    total_failed = 0

    for record in active_records:
        remaining_days = (record.calibration_due_date - today).days

        for threshold, trigger_type, template_name in THRESHOLDS:
            if remaining_days > threshold:
                continue

            for recipient in active_recipients:
                already_sent = NotificationLog.objects.filter(
                    calibration_record=record,
                    trigger_type=trigger_type,
                    recipient_email=recipient.email,
                    year=current_year,
                    status='SUCCESS'
                ).exists()

                if already_sent:
                    total_skipped += 1
                    continue

                try:
                    send_single_alert_email(
                        record=record,
                        recipient=recipient,
                        trigger_type=trigger_type,
                        template_name=template_name,
                        remaining_days=remaining_days
                    )
                    NotificationLog.objects.create(
                        instrument=record.instrument,
                        calibration_record=record,
                        trigger_type=trigger_type,
                        recipient_email=recipient.email,
                        status='SUCCESS',
                        year=current_year,
                    )
                    total_sent += 1
                    logger.info(
                        f"Alert sent: {record.instrument.name} "
                        f"({record.instrument.serial_number}) | {trigger_type} | "
                        f"to {recipient.email}"
                    )
                except Exception as e:
                    NotificationLog.objects.create(
                        instrument=record.instrument,
                        calibration_record=record,
                        trigger_type=trigger_type,
                        recipient_email=recipient.email,
                        status='FAILED',
                        error_message=str(e),
                        year=current_year,
                    )
                    total_failed += 1
                    logger.error(
                        f"Failed to send alert for {record.instrument.name} "
                        f"to {recipient.email}: {e}"
                    )

    summary = (
        f"Notification run complete. Sent: {total_sent}, "
        f"Skipped (already sent): {total_skipped}, Failed: {total_failed}"
    )
    logger.info(summary)
    return summary


def send_single_alert_email(record, recipient, trigger_type, template_name, remaining_days):
    """
    Sends one email for one instrument's calibration record
    to one recipient. Email is specific to that instrument —
    includes instrument name, serial number, location,
    calibrated on date, due date, and days remaining.
    """
    instrument = record.instrument

    context = {
        'instrument_name': instrument.name,
        'serial_number': instrument.serial_number,
        'location': instrument.location,
        'department': instrument.department,
        'calibrated_on': record.calibrated_on,
        'calibration_due_date': record.calibration_due_date,
        'remaining_days': remaining_days,
        'recipient_name': recipient.name,
        'trigger_label': {
            '90_days': '90 Days Notice',
            '30_days': '30 Days Notice',
            '20_days': 'Urgent — 20 Days Notice',
        }.get(trigger_type, 'Notice'),
    }

    html_message = render_to_string(template_name, context)
    plain_message = strip_tags(html_message)

    subject = (
        f"[CalibTrack Alert] {instrument.name} "
        f"({instrument.serial_number}) — Calibration due in {remaining_days} days"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
        html_message=html_message,
        fail_silently=False,
    )


@shared_task
def send_test_email(recipient_email):
    """
    Utility task for admin to verify SMTP configuration is
    working correctly before relying on the daily scheduler.
    Can be triggered manually from Django shell or an admin
    API endpoint.
    """
    send_mail(
        subject="CalibTrack — Test Email",
        message="This is a test email from CalibTrack notification system. If you received this, SMTP is configured correctly.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient_email],
        fail_silently=False,
    )
    return f"Test email sent to {recipient_email}"

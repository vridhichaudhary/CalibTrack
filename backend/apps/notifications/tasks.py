import logging
from datetime import date
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from apps.instruments.models import CalibrationRecord, AMCRecord, CAMCRecord
from .models import AlertRecipient, NotificationLog

logger = logging.getLogger(__name__)

THRESHOLDS = [
    (90, '90_days', 'emails/calibration_alert_90.html'),
    (30, '30_days', 'emails/calibration_alert_30.html'),
    (20, '20_days', 'emails/calibration_alert_20.html'),
]


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def check_calibration_due_dates(self):
    today = date.today()
    current_year = today.year

    active_recipients = list(AlertRecipient.objects.filter(active=True))
    if not active_recipients:
        logger.warning("No active alert recipients configured. Skipping notification run.")
        return "No active recipients."

    total_sent = 0
    total_skipped = 0
    total_failed = 0

    records_to_check = [
        (CalibrationRecord.objects.filter(instrument__is_deleted=False).select_related('instrument'), 'calibration', 'Calibration'),
        (AMCRecord.objects.filter(instrument__is_deleted=False).select_related('instrument'), 'amc', 'AMC'),
        (CAMCRecord.objects.filter(instrument__is_deleted=False).select_related('instrument'), 'camc', 'CAMC'),
    ]

    for qs, record_type, type_label in records_to_check:
        for record in qs:
            due_date = record.calibration_due_date if record_type == 'calibration' else record.due_date
            remaining_days = (due_date - today).days

            applicable_threshold = None
            for threshold, trigger_type, template_name in sorted(THRESHOLDS, key=lambda x: x[0]):
                if remaining_days <= threshold:
                    applicable_threshold = (threshold, trigger_type, template_name)
                    break
            
            if not applicable_threshold:
                continue
                
            threshold, trigger_type, template_name = applicable_threshold

            for recipient in active_recipients:
                query_kwargs = {
                    'trigger_type': trigger_type,
                    'recipient_email': recipient.email,
                    'year': current_year,
                    'status': 'SUCCESS'
                }
                if record_type == 'calibration':
                    query_kwargs['calibration_record'] = record
                elif record_type == 'amc':
                    query_kwargs['amc_record'] = record
                elif record_type == 'camc':
                    query_kwargs['camc_record'] = record

                already_sent = NotificationLog.objects.filter(**query_kwargs).exists()

                if already_sent:
                    total_skipped += 1
                    continue

                try:
                    send_single_alert_email(
                        record=record,
                        recipient=recipient,
                        trigger_type=trigger_type,
                        template_name=template_name,
                        remaining_days=remaining_days,
                        record_type=record_type,
                        type_label=type_label,
                        due_date=due_date
                    )
                    
                    log_kwargs = {
                        'instrument': record.instrument,
                        'record_type': record_type,
                        'trigger_type': trigger_type,
                        'recipient_email': recipient.email,
                        'status': 'SUCCESS',
                        'year': current_year,
                    }
                    if record_type == 'calibration':
                        log_kwargs['calibration_record'] = record
                    elif record_type == 'amc':
                        log_kwargs['amc_record'] = record
                    elif record_type == 'camc':
                        log_kwargs['camc_record'] = record
                        
                    NotificationLog.objects.create(**log_kwargs)
                    total_sent += 1
                except Exception as e:
                    logger.error(f"Failed to send {record_type} email to {recipient.email}: {str(e)}")
                    log_kwargs = {
                        'instrument': record.instrument,
                        'record_type': record_type,
                        'trigger_type': trigger_type,
                        'recipient_email': recipient.email,
                        'status': 'FAILED',
                        'year': current_year,
                        'error_message': str(e)
                    }
                    if record_type == 'calibration':
                        log_kwargs['calibration_record'] = record
                    elif record_type == 'amc':
                        log_kwargs['amc_record'] = record
                    elif record_type == 'camc':
                        log_kwargs['camc_record'] = record
                        
                    NotificationLog.objects.create(**log_kwargs)
                    total_failed += 1

    return f"Sent: {total_sent}, Skipped: {total_skipped}, Failed: {total_failed}"


def send_single_alert_email(record, recipient, trigger_type, template_name, remaining_days, record_type, type_label, due_date):
    """
    Sends one calibration alert email for one specific instrument
    to one specific recipient.
    
    Each email contains full instrument details:
    - Instrument name and serial number (so recipient knows exactly
      which instrument needs calibration)
    - Physical location and department (so the right team can act)
    - Calibrated on date (when it was last done)
    - Calibration due date (the deadline)
    - Exact number of days remaining (the urgency)
    - Recipient's name (personalized greeting)
    
    Uses Resend HTTP API via django-anymail. If Resend is not
    configured, falls back to console backend for local development.
    Raises an exception on failure so the caller can log it to
    NotificationLog with status=FAILED and the exact error message.
    """
    instrument = record.instrument

    calibrated_on = getattr(record, 'calibrated_on', getattr(record, 'maintenance_on', None))

    context = {
        'instrument_name': instrument.name,
        'serial_number': instrument.serial_number,
        'location': instrument.location,
        'department': instrument.department,
        'calibrated_on': calibrated_on,
        'calibration_due_date': due_date,
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

    if remaining_days < 0:
        urgency = f"OVERDUE by {abs(remaining_days)} days"
    else:
        urgency = f"due in {remaining_days} days"

    subject = (
        f"[CalibTrack Alert] {instrument.name} "
        f"({instrument.serial_number}) — {type_label} {urgency}"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
        html_message=html_message,
        fail_silently=False,
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_test_email(self, recipient_email):
    """
    Sends a simple test email to verify that the email configuration works.
    Triggered manually from the admin UI.
    """
    from django.core.mail import send_mail
    from django.conf import settings

    try:
        send_mail(
            subject='CalibTrack — Test Email',
            message='This is a test email from CalibTrack to verify your email configuration is working correctly.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)

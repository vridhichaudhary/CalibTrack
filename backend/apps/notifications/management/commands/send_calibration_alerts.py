from django.core.management.base import BaseCommand
from apps.notifications.tasks import check_calibration_due_dates


class Command(BaseCommand):
    """
    Management command fallback for the calibration notification check.
    
    This is a SAFETY NET, not the primary mechanism. The primary
    mechanism is Celery Beat running check_calibration_due_dates
    automatically every day at 8 AM via the schedule defined in
    celery_app.py.
    
    This command calls the exact same underlying function directly
    (bypassing the Celery queue), so it can be used as a cron job
    fallback if Celery/Redis ever becomes unavailable:
    
        0 8 * * * cd /app && python manage.py send_calibration_alerts
    
    Usage:
        python manage.py send_calibration_alerts
    """

    help = 'Checks all calibration due dates and sends alert emails as needed.'

    def handle(self, *args, **options):
        self.stdout.write('Starting calibration due-date check...')
        result = check_calibration_due_dates()
        self.stdout.write(self.style.SUCCESS(result))

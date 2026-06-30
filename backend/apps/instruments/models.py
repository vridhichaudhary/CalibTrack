import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


def validate_report_file(file):
    """Validate calibration report file - allow any document type, just reject empty files."""
    if file.size == 0:
        raise ValidationError('Uploaded file is empty.')


# Keep old name as alias so existing migrations (0001_initial) don't break
validate_pdf_file = validate_report_file



def _next_serial_number():
    """Auto-generate the next sequential serial number like INST-0001."""
    last = Instrument.objects.filter(serial_number__startswith='INST-').order_by('-serial_number').values_list('serial_number', flat=True).first()
    if last:
        try:
            num = int(last.split('-')[1]) + 1
            return f'INST-{num:04d}'
        except (IndexError, ValueError):
            pass
    count = Instrument.objects.count() + 1
    return f'INST-{count:04d}'


def calibration_report_upload_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    return f"calibration_reports/{instance.instrument.serial_number}/{new_filename}"


class Instrument(models.Model):

    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('under_maintenance', 'Under Maintenance'),
        ('decommissioned', 'Decommissioned'),
    )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(
        max_length=255,
        db_index=True
    )
    serial_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )
    department = models.CharField(
        max_length=255,
        blank=True
    )
    description = models.TextField(
        blank=True
    )
    status = models.CharField(
        max_length=25,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    is_deleted = models.BooleanField(
        default=False,
        db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='instruments_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'instruments'
        verbose_name = 'Instrument'
        verbose_name_plural = 'Instruments'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'status']),
            models.Index(fields=['is_deleted', 'status']),
            models.Index(fields=['serial_number']),
        ]

    def __str__(self):
        return f"{self.name} ({self.serial_number})"

    def soft_delete(self, user=None):
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])

    def restore(self):
        self.is_deleted = False
        self.save(update_fields=['is_deleted', 'updated_at'])

    @property
    def latest_calibration(self):
        return self.calibration_records.order_by('-calibration_due_date').first()


class CalibrationRecord(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    instrument = models.ForeignKey(
        Instrument,
        on_delete=models.PROTECT,
        related_name='calibration_records'
    )
    calibrated_on = models.DateField()
    calibration_due_date = models.DateField(
        db_index=True
    )
    report_file = models.FileField(
        upload_to=calibration_report_upload_path,
        validators=[validate_report_file],
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='calibration_records_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'calibration_records'
        verbose_name = 'Calibration Record'
        verbose_name_plural = 'Calibration Records'
        ordering = ['-calibration_due_date']
        indexes = [
            models.Index(fields=['calibration_due_date']),
            models.Index(fields=['instrument', 'calibration_due_date']),
        ]

    def __str__(self):
        return f"{self.instrument.name} — Due: {self.calibration_due_date}"

    def clean(self):
        if self.calibrated_on and self.calibration_due_date:
            if self.calibration_due_date <= self.calibrated_on:
                raise ValidationError(
                    'Calibration due date must be after the calibrated on date.'
                )

    @property
    def days_until_due(self):
        from django.utils.timezone import now
        delta = self.calibration_due_date - now().date()
        return delta.days

    @property
    def alert_status(self):
        days = self.days_until_due
        if days < 0:
            return 'overdue'
        elif days <= 20:
            return 'critical'
        elif days <= 30:
            return 'warning'
        elif days <= 90:
            return 'upcoming'
        return 'ok'

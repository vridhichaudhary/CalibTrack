import uuid
from django.db import models
from django.conf import settings


class AlertRecipient(models.Model):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(
        unique=True,
        db_index=True
    )
    designation = models.CharField(
        max_length=255,
        blank=True
    )
    active = models.BooleanField(
        default=True,
        db_index=True
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='alert_recipients_added'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alert_recipients'
        verbose_name = 'Alert Recipient'
        verbose_name_plural = 'Alert Recipients'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} <{self.email}>"


class NotificationLog(models.Model):

    RECORD_TYPE_CHOICES = (
        ('calibration', 'Calibration'),
        ('amc', 'AMC'),
        ('camc', 'CAMC'),
    )
    
    TRIGGER_CHOICES = (
        ('90_days', '90 Days Before Due'),
        ('30_days', '30 Days Before Due'),
        ('20_days', '20 Days Before Due'),
    )

    STATUS_CHOICES = (
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    )

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    record_type = models.CharField(
        max_length=20,
        choices=RECORD_TYPE_CHOICES,
        default='calibration',
        db_index=True
    )
    instrument = models.ForeignKey(
        'instruments.Instrument',
        on_delete=models.CASCADE,
        related_name='notification_logs'
    )
    calibration_record = models.ForeignKey(
        'instruments.CalibrationRecord',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_logs'
    )
    amc_record = models.ForeignKey(
        'instruments.AMCRecord',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_logs'
    )
    camc_record = models.ForeignKey(
        'instruments.CAMCRecord',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_logs'
    )
    trigger_type = models.CharField(
        max_length=10,
        choices=TRIGGER_CHOICES,
        db_index=True
    )
    recipient_email = models.EmailField(db_index=True)
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        db_index=True
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    year = models.IntegerField(db_index=True)

    class Meta:
        db_table = 'notification_logs'
        verbose_name = 'Notification Log'
        verbose_name_plural = 'Notification Logs'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['instrument', 'trigger_type', 'year']),
            models.Index(fields=['calibration_record', 'trigger_type', 'recipient_email', 'year']),
            models.Index(fields=['status', 'sent_at']),
        ]

    def __str__(self):
        return f"{self.instrument.name} | {self.trigger_type} | {self.recipient_email} | {self.status}"

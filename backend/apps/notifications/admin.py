from django.contrib import admin
from .models import AlertRecipient, NotificationLog


@admin.register(AlertRecipient)
class AlertRecipientAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'designation', 'active', 'created_at']
    list_filter = ['active']
    search_fields = ['name', 'email']


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['instrument', 'trigger_type', 'recipient_email', 'status', 'sent_at', 'year']
    list_filter = ['trigger_type', 'status', 'year']
    search_fields = ['instrument__name', 'recipient_email']
    readonly_fields = ['id', 'instrument', 'calibration_record', 'trigger_type',
                       'recipient_email', 'status', 'error_message', 'sent_at', 'year']

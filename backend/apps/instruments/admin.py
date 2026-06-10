from django.contrib import admin
from .models import Instrument, CalibrationRecord


@admin.register(Instrument)
class InstrumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'serial_number', 'location', 'department', 'status', 'is_deleted', 'created_at']
    list_filter = ['status', 'is_deleted', 'department']
    search_fields = ['name', 'serial_number', 'location']
    ordering = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'created_by']


@admin.register(CalibrationRecord)
class CalibrationRecordAdmin(admin.ModelAdmin):
    list_display = ['instrument', 'calibrated_on', 'calibration_due_date', 'alert_status', 'created_by', 'created_at']
    list_filter = ['calibration_due_date']
    search_fields = ['instrument__name', 'instrument__serial_number']
    ordering = ['calibration_due_date']
    readonly_fields = ['id', 'created_at', 'created_by']

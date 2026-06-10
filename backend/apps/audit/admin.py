from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'table_name', 'record_id', 'changed_by', 'ip_address', 'timestamp']
    list_filter = ['action', 'table_name']
    search_fields = ['record_id', 'changed_by__username', 'table_name']
    readonly_fields = ['id', 'instrument', 'changed_by', 'action', 'table_name',
                       'record_id', 'old_values', 'new_values', 'ip_address', 'timestamp']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

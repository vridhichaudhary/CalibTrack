from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for AuditLog.
    Shows who changed what, when, and the before/after values.
    changed_by_username is included for display without
    requiring a separate user lookup on the frontend.
    """

    changed_by_username = serializers.CharField(
        source='changed_by.username',
        read_only=True,
        default=None
    )

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'instrument',
            'changed_by',
            'changed_by_username',
            'action',
            'table_name',
            'record_id',
            'old_values',
            'new_values',
            'ip_address',
            'timestamp',
        ]
        read_only_fields = fields

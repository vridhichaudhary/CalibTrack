from rest_framework import serializers
from .models import AlertRecipient, NotificationLog


class AlertRecipientSerializer(serializers.ModelSerializer):
    """
    Full serializer for AlertRecipient.
    Admin uses this to add, view, update, and deactivate
    people who receive calibration due-date emails.
    added_by is read-only and auto-set from the request user.
    """

    added_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = AlertRecipient
        fields = [
            'id',
            'name',
            'email',
            'designation',
            'active',
            'added_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'added_by',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        validated_data['added_by'] = self.context['request'].user
        return super().create(validated_data)


class NotificationLogSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for NotificationLog.
    Used by admin to audit which alert emails were sent,
    to whom, when, and whether they succeeded or failed.
    Includes nested instrument name and serial number
    for easy identification without extra API calls.
    """

    instrument_name = serializers.CharField(
        source='instrument.name',
        read_only=True
    )
    instrument_serial_number = serializers.CharField(
        source='instrument.serial_number',
        read_only=True
    )
    calibration_due_date = serializers.DateField(
        source='calibration_record.calibration_due_date',
        read_only=True
    )

    class Meta:
        model = NotificationLog
        fields = [
            'id',
            'instrument',
            'instrument_name',
            'instrument_serial_number',
            'calibration_record',
            'calibration_due_date',
            'trigger_type',
            'recipient_email',
            'status',
            'error_message',
            'sent_at',
            'year',
        ]
        read_only_fields = fields


class NotificationLogSummarySerializer(serializers.Serializer):
    """
    Summary stats for the admin dashboard.
    Shows total sent, total failed, and breakdown by trigger type
    for the current year.
    """

    total_sent = serializers.IntegerField()
    total_failed = serializers.IntegerField()
    by_trigger_type = serializers.DictField()
    recent_failures = NotificationLogSerializer(many=True)

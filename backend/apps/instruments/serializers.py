from rest_framework import serializers
from django.utils import timezone
from .models import Instrument, CalibrationRecord
from apps.users.serializers import UserSerializer


class CalibrationRecordSerializer(serializers.ModelSerializer):
    """
    Full serializer for CalibrationRecord.
    Used when returning calibration history for an instrument.
    Includes computed fields: days_until_due and alert_status.
    report_file_url returns the absolute URL to the PDF file.
    created_by is read-only and auto-set from the request user.
    """

    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)
    created_by = UserSerializer(read_only=True)
    report_file_url = serializers.SerializerMethodField()

    class Meta:
        model = CalibrationRecord
        fields = [
            'id',
            'instrument',
            'calibrated_on',
            'calibration_due_date',
            'report_file',
            'report_file_url',
            'notes',
            'days_until_due',
            'alert_status',
            'created_by',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'days_until_due',
            'alert_status',
            'report_file_url',
        ]
        extra_kwargs = {
            'report_file': {'write_only': True},
            'instrument': {'required': True},
        }

    def get_report_file_url(self, obj):
        request = self.context.get('request')
        if obj.report_file and request:
            return request.build_absolute_uri(obj.report_file.url)
        return None

    def validate(self, attrs):
        calibrated_on = attrs.get('calibrated_on')
        calibration_due_date = attrs.get('calibration_due_date')
        if calibrated_on and calibration_due_date:
            if calibration_due_date <= calibrated_on:
                raise serializers.ValidationError({
                    'calibration_due_date': (
                        'Calibration due date must be after the calibrated on date.'
                    )
                })
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CalibrationRecordListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for CalibrationRecord.
    Used in nested lists inside InstrumentDetailSerializer.
    Does not expand created_by to avoid N+1 queries.
    """

    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)
    report_file_url = serializers.SerializerMethodField()

    class Meta:
        model = CalibrationRecord
        fields = [
            'id',
            'calibrated_on',
            'calibration_due_date',
            'report_file_url',
            'notes',
            'days_until_due',
            'alert_status',
            'created_at',
        ]

    def get_report_file_url(self, obj):
        request = self.context.get('request')
        if obj.report_file and request:
            return request.build_absolute_uri(obj.report_file.url)
        return None


class InstrumentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer used for the instruments list endpoint.
    Returns the latest calibration record inline so the table
    can show due date and alert status without a second API call.
    Uses select_related and prefetch_related in the view to
    avoid N+1 database queries.
    """

    latest_calibration = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Instrument
        fields = [
            'id',
            'name',
            'serial_number',
            'location',
            'department',
            'status',
            'latest_calibration',
            'created_by',
            'created_at',
        ]

    def get_latest_calibration(self, obj):
        record = obj.calibration_records.order_by(
            '-calibration_due_date'
        ).first()
        if record:
            return CalibrationRecordListSerializer(
                record,
                context=self.context
            ).data
        return None


class InstrumentDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer used for instrument detail and create/update.
    Returns complete calibration history as a nested list.
    On write operations, only the instrument fields are accepted —
    calibration records are managed through their own endpoint.
    """

    calibration_records = CalibrationRecordListSerializer(
        many=True,
        read_only=True
    )
    created_by = UserSerializer(read_only=True)
    latest_calibration = serializers.SerializerMethodField()

    class Meta:
        model = Instrument
        fields = [
            'id',
            'name',
            'serial_number',
            'location',
            'department',
            'description',
            'status',
            'is_deleted',
            'calibration_records',
            'latest_calibration',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_deleted',
            'created_by',
            'created_at',
            'updated_at',
            'calibration_records',
            'latest_calibration',
        ]

    def get_latest_calibration(self, obj):
        record = obj.calibration_records.order_by(
            '-calibration_due_date'
        ).first()
        if record:
            return CalibrationRecordListSerializer(
                record,
                context=self.context
            ).data
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('created_by', None)
        return super().update(instance, validated_data)

from rest_framework import serializers
from django.utils import timezone
from .models import Instrument, CalibrationRecord, AMCRecord, CAMCRecord, _next_serial_number
from apps.users.serializers import UserSerializer


class CalibrationRecordSerializer(serializers.ModelSerializer):
    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)
    created_by = UserSerializer(read_only=True)
    report_file_url = serializers.SerializerMethodField()

    class Meta:
        model = CalibrationRecord
        fields = [
            'id', 'instrument', 'calibrated_on', 'calibration_due_date',
            'report_file', 'report_file_url', 'notes', 'days_until_due',
            'alert_status', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'days_until_due', 'alert_status', 'report_file_url']
        extra_kwargs = {'report_file': {'write_only': True}, 'instrument': {'required': True}}

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
                    'calibration_due_date': 'Calibration due date must be after the calibrated on date.'
                })
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CalibrationRecordListSerializer(serializers.ModelSerializer):
    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)
    report_file_url = serializers.SerializerMethodField()

    class Meta:
        model = CalibrationRecord
        fields = [
            'id', 'calibrated_on', 'calibration_due_date', 'report_file_url',
            'notes', 'days_until_due', 'alert_status', 'created_at',
        ]

    def get_report_file_url(self, obj):
        request = self.context.get('request')
        if obj.report_file and request:
            return request.build_absolute_uri(obj.report_file.url)
        return None


class AMCRecordSerializer(serializers.ModelSerializer):
    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = AMCRecord
        fields = [
            'id', 'instrument', 'maintenance_on', 'due_date',
            'notes', 'days_until_due', 'alert_status', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'days_until_due', 'alert_status']
        extra_kwargs = {'instrument': {'required': True}}

    def validate(self, attrs):
        maintenance_on = attrs.get('maintenance_on')
        due_date = attrs.get('due_date')
        if maintenance_on and due_date:
            if due_date <= maintenance_on:
                raise serializers.ValidationError({'due_date': 'Due date must be after the maintenance on date.'})
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AMCRecordListSerializer(serializers.ModelSerializer):
    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)

    class Meta:
        model = AMCRecord
        fields = [
            'id', 'maintenance_on', 'due_date',
            'notes', 'days_until_due', 'alert_status', 'created_at',
        ]


class CAMCRecordSerializer(serializers.ModelSerializer):
    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = CAMCRecord
        fields = [
            'id', 'instrument', 'maintenance_on', 'due_date',
            'notes', 'days_until_due', 'alert_status', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'days_until_due', 'alert_status']
        extra_kwargs = {'instrument': {'required': True}}

    def validate(self, attrs):
        maintenance_on = attrs.get('maintenance_on')
        due_date = attrs.get('due_date')
        if maintenance_on and due_date:
            if due_date <= maintenance_on:
                raise serializers.ValidationError({'due_date': 'Due date must be after the maintenance on date.'})
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CAMCRecordListSerializer(serializers.ModelSerializer):
    days_until_due = serializers.IntegerField(read_only=True)
    alert_status = serializers.CharField(read_only=True)

    class Meta:
        model = CAMCRecord
        fields = [
            'id', 'maintenance_on', 'due_date',
            'notes', 'days_until_due', 'alert_status', 'created_at',
        ]


class InstrumentListSerializer(serializers.ModelSerializer):
    latest_calibration = serializers.SerializerMethodField()
    latest_amc = serializers.SerializerMethodField()
    latest_camc = serializers.SerializerMethodField()
    created_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Instrument
        fields = [
            'id', 'name', 'serial_number', 'location', 'department',
            'status', 'latest_calibration', 'latest_amc', 'latest_camc',
            'created_by', 'created_at',
        ]

    def get_latest_calibration(self, obj):
        record = obj.calibration_records.order_by('-calibration_due_date').first()
        if record:
            return CalibrationRecordListSerializer(record, context=self.context).data
        return None

    def get_latest_amc(self, obj):
        record = obj.amc_records.order_by('-due_date').first()
        if record:
            return AMCRecordListSerializer(record, context=self.context).data
        return None

    def get_latest_camc(self, obj):
        record = obj.camc_records.order_by('-due_date').first()
        if record:
            return CAMCRecordListSerializer(record, context=self.context).data
        return None


class InstrumentDetailSerializer(serializers.ModelSerializer):
    calibration_records = CalibrationRecordListSerializer(many=True, read_only=True)
    amc_records = AMCRecordListSerializer(many=True, read_only=True)
    camc_records = CAMCRecordListSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    latest_calibration = serializers.SerializerMethodField()
    latest_amc = serializers.SerializerMethodField()
    latest_camc = serializers.SerializerMethodField()

    class Meta:
        model = Instrument
        fields = [
            'id', 'name', 'serial_number', 'location', 'department',
            'description', 'status', 'is_deleted',
            'calibration_records', 'latest_calibration',
            'amc_records', 'latest_amc',
            'camc_records', 'latest_camc',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'is_deleted', 'created_by', 'created_at', 'updated_at',
            'calibration_records', 'latest_calibration',
            'amc_records', 'latest_amc',
            'camc_records', 'latest_camc',
        ]

    def get_latest_calibration(self, obj):
        record = obj.calibration_records.order_by('-calibration_due_date').first()
        if record:
            return CalibrationRecordListSerializer(record, context=self.context).data
        return None

    def get_latest_amc(self, obj):
        record = obj.amc_records.order_by('-due_date').first()
        if record:
            return AMCRecordListSerializer(record, context=self.context).data
        return None

    def get_latest_camc(self, obj):
        record = obj.camc_records.order_by('-due_date').first()
        if record:
            return CAMCRecordListSerializer(record, context=self.context).data
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        if not validated_data.get('serial_number'):
            validated_data['serial_number'] = _next_serial_number()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('created_by', None)
        return super().update(instance, validated_data)

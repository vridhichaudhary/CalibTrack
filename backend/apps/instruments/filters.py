import django_filters
from django.db.models import Q
from .models import Instrument, CalibrationRecord
from django.utils import timezone
from datetime import timedelta


class InstrumentFilter(django_filters.FilterSet):
    """
    Allows the instrument list endpoint to be filtered by:
    - name (case-insensitive partial match)
    - serial_number (case-insensitive partial match)
    - location (case-insensitive partial match)
    - department (exact match)
    - status (exact match)
    - alert_status (computed from latest calibration due date)
    
    alert_status filter is especially important for the frontend
    to highlight instruments with upcoming or overdue calibrations.
    """

    name = django_filters.CharFilter(
        field_name='name',
        lookup_expr='icontains'
    )
    serial_number = django_filters.CharFilter(
        field_name='serial_number',
        lookup_expr='icontains'
    )
    location = django_filters.CharFilter(
        field_name='location',
        lookup_expr='icontains'
    )
    department = django_filters.CharFilter(
        field_name='department',
        lookup_expr='iexact'
    )
    status = django_filters.ChoiceFilter(
        choices=Instrument.STATUS_CHOICES
    )
    alert_status = django_filters.CharFilter(
        method='filter_by_alert_status',
        label='Alert Status'
    )

    class Meta:
        model = Instrument
        fields = [
            'name',
            'serial_number',
            'location',
            'department',
            'status',
        ]

    def filter_by_alert_status(self, queryset, name, value):
        """
        Filters instruments based on their latest calibration
        record's due date proximity.
        overdue  = due date has passed
        critical = due within 20 days
        warning  = due within 30 days
        upcoming = due within 90 days
        ok       = more than 90 days away
        """
        today = timezone.now().date()

        if value == 'overdue':
            return queryset.filter(
                calibration_records__calibration_due_date__lt=today
            ).distinct()
        elif value == 'critical':
            target = today + timedelta(days=20)
            return queryset.filter(
                calibration_records__calibration_due_date__gte=today,
                calibration_records__calibration_due_date__lte=target
            ).distinct()
        elif value == 'warning':
            target = today + timedelta(days=30)
            return queryset.filter(
                calibration_records__calibration_due_date__gte=today,
                calibration_records__calibration_due_date__lte=target
            ).distinct()
        elif value == 'upcoming':
            target = today + timedelta(days=90)
            return queryset.filter(
                calibration_records__calibration_due_date__gte=today,
                calibration_records__calibration_due_date__lte=target
            ).distinct()
        elif value == 'ok':
            target = today + timedelta(days=90)
            return queryset.filter(
                calibration_records__calibration_due_date__gt=target
            ).distinct()

        return queryset


class CalibrationRecordFilter(django_filters.FilterSet):
    """
    Allows filtering calibration records by:
    - instrument (exact UUID match)
    - calibrated_on range (from/to)
    - calibration_due_date range (from/to)
    """

    instrument = django_filters.UUIDFilter(
        field_name='instrument__id'
    )
    calibrated_on_after = django_filters.DateFilter(
        field_name='calibrated_on',
        lookup_expr='gte'
    )
    calibrated_on_before = django_filters.DateFilter(
        field_name='calibrated_on',
        lookup_expr='lte'
    )
    due_date_after = django_filters.DateFilter(
        field_name='calibration_due_date',
        lookup_expr='gte'
    )
    due_date_before = django_filters.DateFilter(
        field_name='calibration_due_date',
        lookup_expr='lte'
    )

    class Meta:
        model = CalibrationRecord
        fields = [
            'instrument',
            'calibrated_on_after',
            'calibrated_on_before',
            'due_date_after',
            'due_date_before',
        ]

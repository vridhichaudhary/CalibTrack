from rest_framework import generics
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.users.permissions import IsAdminRole


class AuditLogFilter(django_filters.FilterSet):
    """
    Allows filtering audit logs by:
    - action (CREATE, UPDATE, DELETE, RESTORE)
    - table_name (instruments, calibration_records)
    - instrument (UUID)
    - changed_by (UUID)
    """

    instrument = django_filters.UUIDFilter(field_name='instrument__id')
    changed_by = django_filters.UUIDFilter(field_name='changed_by__id')

    class Meta:
        model = AuditLog
        fields = ['action', 'table_name', 'instrument', 'changed_by']


class AuditLogListView(generics.ListAPIView):
    """
    GET /api/v1/audit/
    Admin only. Returns paginated audit trail of every
    create, update, delete, and restore action across
    instruments and calibration records.

    Sorted newest first. Fully read-only — audit logs
    can never be modified or deleted through the API,
    enforced both here and in Django admin.
    """

    permission_classes = [IsAdminRole]
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = AuditLogFilter
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        return AuditLog.objects.select_related(
            'instrument', 'changed_by'
        ).all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })

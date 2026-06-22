import logging
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Prefetch
from .models import Instrument, CalibrationRecord
from .serializers import (
    InstrumentListSerializer,
    InstrumentDetailSerializer,
    CalibrationRecordSerializer,
)
from .filters import InstrumentFilter, CalibrationRecordFilter
from apps.users.permissions import IsAdminRole, IsAdminOrReadOnly

logger = logging.getLogger(__name__)


class InstrumentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/instruments/
    Returns paginated list of all active (non-deleted) instruments.
    Sorted by calibration_due_date ascending by default so
    instruments with soonest due dates appear at the top.
    Supports search, filter, and ordering.

    POST /api/v1/instruments/
    Admin only. Creates a new instrument.
    """

    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = InstrumentFilter
    search_fields = ['name', 'serial_number', 'location', 'department']
    ordering_fields = [
        'name',
        'serial_number',
        'status',
        'created_at',
        'next_due_date',
    ]
    ordering = ['next_due_date']

    def get_queryset(self):
        from django.db.models import Min

        return Instrument.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by'
        ).prefetch_related(
            Prefetch(
                'calibration_records',
                queryset=CalibrationRecord.objects.order_by(
                    '-calibration_due_date'
                )
            )
        ).annotate(
            next_due_date=Min('calibration_records__calibration_due_date')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InstrumentDetailSerializer
        return InstrumentListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        instrument = serializer.save()
        logger.info(
            f"Instrument created: {instrument.name} "
            f"({instrument.serial_number}) by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': 'Instrument created successfully.',
            'data': InstrumentDetailSerializer(
                instrument,
                context={'request': request}
            ).data
        }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(
                page,
                many=True,
                context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response({
            'success': True,
            'data': serializer.data
        })


class InstrumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/instruments/<uuid:pk>/
    Returns full instrument detail with complete calibration history.

    PATCH  /api/v1/instruments/<uuid:pk>/
    Admin only. Updates instrument fields.

    DELETE /api/v1/instruments/<uuid:pk>/
    Admin only. Soft deletes the instrument — data is never lost.
    """

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = InstrumentDetailSerializer

    def get_queryset(self):
        return Instrument.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by'
        ).prefetch_related(
            Prefetch(
                'calibration_records',
                queryset=CalibrationRecord.objects.order_by(
                    '-calibration_due_date'
                ).select_related('created_by')
            )
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            context={'request': request}
        )
        return Response({
            'success': True,
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        instrument = serializer.save()
        logger.info(
            f"Instrument updated: {instrument.name} by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': 'Instrument updated successfully.',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instrument = self.get_object()
        instrument.soft_delete(user=request.user)
        logger.info(
            f"Instrument soft deleted: {instrument.name} "
            f"({instrument.serial_number}) by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': f'Instrument {instrument.name} has been deleted.'
        }, status=status.HTTP_200_OK)


class InstrumentRestoreView(APIView):
    """
    POST /api/v1/instruments/<uuid:pk>/restore/
    Admin only. Restores a soft-deleted instrument.
    This is important for industrial environments where
    accidental deletes must be recoverable.
    """

    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            instrument = Instrument.objects.get(pk=pk, is_deleted=True)
        except Instrument.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Instrument not found or is not deleted.'
            }, status=status.HTTP_404_NOT_FOUND)

        instrument.restore()
        logger.info(
            f"Instrument restored: {instrument.name} by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': f'Instrument {instrument.name} has been restored.'
        })


class CalibrationRecordListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/instruments/calibrations/
    Returns all calibration records with filtering.
    All authenticated users can read.

    POST /api/v1/instruments/calibrations/
    Admin only. Creates a new calibration record for an instrument.
    This is how admin adds a new calibration entry with PDF report upload.
    Accepts multipart/form-data because of file upload.
    """

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CalibrationRecordSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = CalibrationRecordFilter
    ordering_fields = ['calibration_due_date', 'calibrated_on', 'created_at']
    ordering = ['calibration_due_date']

    def get_queryset(self):
        return CalibrationRecord.objects.filter(
            instrument__is_deleted=False
        ).select_related(
            'instrument',
            'created_by'
        ).order_by('calibration_due_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        logger.info(
            f"Calibration record created for instrument: "
            f"{record.instrument.name} due: {record.calibration_due_date} "
            f"by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': 'Calibration record created successfully.',
            'data': CalibrationRecordSerializer(
                record,
                context={'request': request}
            ).data
        }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(
                page,
                many=True,
                context={'request': request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response({
            'success': True,
            'data': serializer.data
        })


class CalibrationRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/instruments/calibrations/<uuid:pk>/
    PATCH  /api/v1/instruments/calibrations/<uuid:pk>/
    DELETE /api/v1/instruments/calibrations/<uuid:pk>/

    Admin only for write operations.
    GET is available to all authenticated users.
    DELETE here is a hard delete — calibration records should
    only be deleted by admin in exceptional circumstances.
    The instrument itself uses soft delete but individual
    calibration records are protected by PROTECT on the FK.
    """

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CalibrationRecordSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return CalibrationRecord.objects.filter(
            instrument__is_deleted=False
        ).select_related('instrument', 'created_by')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            context={'request': request}
        )
        return Response({
            'success': True,
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        logger.info(
            f"Calibration record updated for: {record.instrument.name} "
            f"by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': 'Calibration record updated successfully.',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        record = self.get_object()
        instrument_name = record.instrument.name
        record.delete()
        logger.info(
            f"Calibration record deleted for: {instrument_name} "
            f"by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': 'Calibration record deleted successfully.'
        }, status=status.HTTP_200_OK)


class InstrumentCalibrationHistoryView(generics.ListAPIView):
    """
    GET /api/v1/instruments/<uuid:pk>/calibrations/
    Returns the complete calibration history for one specific instrument.
    Sorted by calibration_due_date descending — newest first.
    Available to all authenticated users.
    """

    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CalibrationRecordSerializer

    def get_queryset(self):
        return CalibrationRecord.objects.filter(
            instrument__id=self.kwargs['pk'],
            instrument__is_deleted=False
        ).select_related(
            'instrument',
            'created_by'
        ).order_by('-calibration_due_date')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })

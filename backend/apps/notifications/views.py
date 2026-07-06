import logging
from datetime import datetime
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from .models import AlertRecipient, NotificationLog
from .serializers import (
    AlertRecipientSerializer,
    NotificationLogSerializer,
    NotificationLogSummarySerializer,
)
from apps.users.permissions import IsAdminRole, IsAdminOrReadOnly
from .tasks import send_test_email, check_calibration_due_dates

logger = logging.getLogger(__name__)


class AlertRecipientListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/notifications/recipients/
    Admin only. Lists all alert recipients (active and inactive).

    POST /api/v1/notifications/recipients/
    Admin only. Adds a new alert recipient.
    This is the database-driven replacement for hardcoded
    email lists — admin can add or remove people anytime
    without any code deployment.
    """

    permission_classes = [IsAdminRole]
    serializer_class = AlertRecipientSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'email', 'designation']
    ordering_fields = ['name', 'created_at', 'active']
    ordering = ['name']

    def get_queryset(self):
        return AlertRecipient.objects.all()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        recipient = serializer.save()
        logger.info(
            f"Alert recipient added: {recipient.name} <{recipient.email}> "
            f"by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': 'Alert recipient added successfully.',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)

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


class AlertRecipientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/notifications/recipients/<uuid:pk>/
    PATCH  /api/v1/notifications/recipients/<uuid:pk>/
    DELETE /api/v1/notifications/recipients/<uuid:pk>/

    Admin only.
    PATCH is used to toggle 'active' field — this is how admin
    enables/disables a recipient without deleting their record.
    DELETE permanently removes the recipient (use sparingly —
    prefer setting active=False to preserve history).
    """

    permission_classes = [IsAdminRole]
    serializer_class = AlertRecipientSerializer

    def get_queryset(self):
        return AlertRecipient.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
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
        recipient = serializer.save()
        logger.info(
            f"Alert recipient updated: {recipient.name} <{recipient.email}> "
            f"by {request.user.username} — active={recipient.active}"
        )
        return Response({
            'success': True,
            'message': 'Alert recipient updated successfully.',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        recipient = self.get_object()
        email = recipient.email
        recipient.delete()
        logger.info(
            f"Alert recipient deleted: {email} by {request.user.username}"
        )
        return Response({
            'success': True,
            'message': f'Alert recipient {email} has been removed.'
        }, status=status.HTTP_200_OK)


class NotificationLogFilter(django_filters.FilterSet):
    """
    Allows filtering notification logs by:
    - trigger_type (90_days, 30_days, 20_days)
    - status (SUCCESS, FAILED)
    - year
    - instrument (UUID)
    """

    instrument = django_filters.UUIDFilter(field_name='instrument__id')

    class Meta:
        model = NotificationLog
        fields = ['trigger_type', 'status', 'year', 'instrument']


class NotificationLogListView(generics.ListAPIView):
    """
    GET /api/v1/notifications/logs/
    Admin only. Returns paginated notification log history.
    This is the audit trail for every alert email — shows
    exactly what was sent, to whom, when, and whether it
    succeeded or failed (and why, if it failed).

    Sorted newest first by default.
    Supports filtering by trigger_type, status, year, instrument.
    """

    permission_classes = [IsAdminRole]
    serializer_class = NotificationLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = NotificationLogFilter
    ordering_fields = ['sent_at', 'year']
    ordering = ['-sent_at']

    def get_queryset(self):
        return NotificationLog.objects.select_related(
            'instrument',
            'calibration_record'
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


class NotificationLogSummaryView(APIView):
    """
    GET /api/v1/notifications/logs/summary/
    Admin only. Returns a dashboard summary:
    - total emails sent successfully this year
    - total failed
    - breakdown by trigger type (90/30/20 days)
    - the 10 most recent failures (for quick troubleshooting)

    This gives the admin a quick health check of the
    notification system without digging through raw logs.
    """

    permission_classes = [IsAdminRole]

    def get(self, request):
        current_year = datetime.now().year

        logs = NotificationLog.objects.filter(year=current_year)

        total_sent = logs.filter(status='SUCCESS').count()
        total_failed = logs.filter(status='FAILED').count()

        by_trigger_type = {}
        for trigger_type, _ in NotificationLog.TRIGGER_CHOICES:
            by_trigger_type[trigger_type] = {
                'success': logs.filter(
                    trigger_type=trigger_type, status='SUCCESS'
                ).count(),
                'failed': logs.filter(
                    trigger_type=trigger_type, status='FAILED'
                ).count(),
            }

        recent_failures = logs.filter(
            status='FAILED'
        ).select_related(
            'instrument', 'calibration_record'
        ).order_by('-sent_at')[:10]

        data = {
            'total_sent': total_sent,
            'total_failed': total_failed,
            'by_trigger_type': by_trigger_type,
            'recent_failures': NotificationLogSerializer(
                recent_failures, many=True
            ).data,
        }

        return Response({
            'success': True,
            'data': data
        })


class SendTestEmailView(APIView):
    """
    POST /api/v1/notifications/test-email/
    Admin only. Sends a test email to verify SMTP configuration
    is correctly set up before relying on the automated daily
    scheduler. Accepts an optional 'email' field in the request
    body — if not provided, sends to the requesting admin's
    own email address.
    """

    permission_classes = [IsAdminRole]

    def post(self, request):
        target_email = request.data.get('email', request.user.email)

        try:
            send_test_email.delay(target_email)
            logger.info(
                f"Test email queued to {target_email} by {request.user.username}"
            )
            return Response({
                'success': True,
                'message': f'Test email has been queued for delivery to {target_email}. '
                            f'Check the inbox in a few seconds.'
            })
        except Exception as e:
            logger.error(f"Failed to queue test email: {e}")
            return Response({
                'success': False,
                'error': f'Failed to queue test email: {str(e)}'
            }, status=500)


class TriggerNotificationCheckView(APIView):
    """
    POST /api/v1/notifications/trigger-check/
    Admin only. Manually triggers the daily calibration due-date
    check SYNCHRONOUSLY — runs directly in the web process, not
    via Celery queue. This ensures it works even on Railway free
    tier where the Celery worker may be sleeping.
    Returns the actual result immediately so the admin sees exactly
    what happened (Sent: X, Skipped: X, Failed: X).
    """

    permission_classes = [IsAdminRole]

    def post(self, request):
        try:
            logger.info(
                f"Manual notification check triggered by {request.user.username}"
            )
            # Call directly (not .delay()) so it runs synchronously in the
            # web process and returns the real result right now.
            result = check_calibration_due_dates()
            logger.info(f"Manual notification check completed. Result: {result}")
            return Response({
                'success': True,
                'message': result,
            })
        except Exception as e:
            logger.error(f"Failed to run notification check: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': f'Notification check failed: {str(e)}'
            }, status=500)


class ExternalCronTriggerView(APIView):
    """
    POST /api/v1/notifications/cron-trigger/
    
    This is the GUARANTEED daily trigger for the entire
    notification system. It is called by cron-job.org every
    day at 8 AM IST via an HTTP POST request.
    
    WHY THIS APPROACH:
    Railway's free tier puts Celery Beat and Celery Worker
    containers to sleep when inactive. A sleeping Celery Beat
    never fires its schedule, which means the daily notification
    check silently never runs. This is catastrophic for a system
    where missing an alert could cause compliance failures in
    an industrial environment.
    
    By using an EXTERNAL cron service (cron-job.org) to hit this
    HTTP endpoint, we bypass Railway's container sleep entirely.
    Railway's WEB service wakes up instantly on any incoming
    HTTP request even on free tier. So we get guaranteed daily
    execution at zero cost.
    
    SECURITY:
    Protected by CRON_SECRET_KEY in settings. The cron service
    must send this key in the X-Cron-Secret header. Any request
    without the correct key is rejected with 401.
    
    IDEMPOTENT:
    Calling this endpoint multiple times on the same day is safe.
    The NotificationLog deduplication logic inside
    check_calibration_due_dates ensures each alert is sent
    exactly once per recipient per trigger type per year.
    So if both Celery Beat AND the external cron both fire on
    the same day, recipients still only get one email each.
    
    RUNS SYNCHRONOUSLY:
    Unlike the TriggerNotificationCheckView which uses .delay()
    to queue the task, this view calls check_calibration_due_dates()
    DIRECTLY without .delay(). This means it runs immediately in
    the web process and the HTTP response contains the actual result
    of the run. cron-job.org can then log this result and alert
    us if something went wrong.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        provided_key = request.headers.get('X-Cron-Secret', '')
        expected_key = getattr(settings, 'CRON_SECRET_KEY', '')

        if not expected_key:
            logger.error(
                "CRON_SECRET_KEY is not set in environment variables. "
                "The cron trigger endpoint is disabled for security."
            )
            return Response({
                'success': False,
                'error': 'Cron trigger is not configured on this server.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if provided_key != expected_key:
            logger.warning(
                f"Unauthorized cron trigger attempt. "
                f"IP: {request.META.get('REMOTE_ADDR')}"
            )
            return Response({
                'success': False,
                'error': 'Unauthorized.'
            }, status=status.HTTP_401_UNAUTHORIZED)

        logger.info("External cron trigger received. Starting notification check.")

        try:
            from apps.notifications.tasks import check_calibration_due_dates
            result = check_calibration_due_dates()

            logger.info(f"Cron trigger completed successfully. Result: {result}")

            return Response({
                'success': True,
                'message': result
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(
                f"Cron trigger failed with exception: {str(e)}",
                exc_info=True
            )
            return Response({
                'success': False,
                'error': f'Notification check failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

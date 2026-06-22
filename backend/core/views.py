from django.http import JsonResponse
from django.db import connection
from django.utils import timezone


def health_check(request):
    """
    GET /health/
    Public endpoint (no auth required) for uptime monitoring services.
    Checks database connectivity and returns a simple status.
    Used by Railway's own health checks and external monitors
    like UptimeRobot to detect outages and alert you immediately.
    """
    db_status = 'ok'
    try:
        connection.ensure_connection()
    except Exception:
        db_status = 'error'

    overall_status = 'ok' if db_status == 'ok' else 'degraded'

    return JsonResponse({
        'status': overall_status,
        'database': db_status,
        'timestamp': timezone.now().isoformat(),
    }, status=200 if overall_status == 'ok' else 503)

import threading

_thread_locals = threading.local()


def get_current_request():
    """
    Returns the request object for the current thread, if any.
    Used by signals.py to attach IP address to audit logs
    without needing to pass the request through every function call.
    """
    return getattr(_thread_locals, 'request', None)


class CurrentRequestMiddleware:
    """
    Stores the current request in thread-local storage so that
    Django signals (which don't receive the request object)
    can still access request.user and the client IP address
    for audit logging purposes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.request = request
        response = self.get_response(request)
        _thread_locals.request = None
        return response


def get_client_ip(request):
    """
    Extracts the real client IP address, accounting for
    requests that pass through a reverse proxy (Nginx) where
    the X-Forwarded-For header holds the original client IP.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

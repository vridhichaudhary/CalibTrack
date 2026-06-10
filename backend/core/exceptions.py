from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'success': False,
            'error': {
                'status_code': response.status_code,
                'detail': response.data,
            }
        }
    else:
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        response = Response(
            {
                'success': False,
                'error': {
                    'status_code': 500,
                    'detail': 'An unexpected server error occurred.',
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response

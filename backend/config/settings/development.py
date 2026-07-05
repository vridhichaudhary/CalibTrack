from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

CELERY_TASK_ALWAYS_EAGER = False

# In development, only use console backend if BREVO_API_KEY is
# not set. If a developer sets BREVO_API_KEY locally, let them
# test real email sending. Otherwise print to console.
if not config('BREVO_API_KEY', default=''):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

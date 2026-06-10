from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

CELERY_TASK_ALWAYS_EAGER = False

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

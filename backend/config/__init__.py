from celery import Celery

def make_celery():
    from backend.celery import app
    return app

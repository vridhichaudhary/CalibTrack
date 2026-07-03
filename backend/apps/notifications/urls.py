from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [

    path(
        'recipients/',
        views.AlertRecipientListCreateView.as_view(),
        name='recipient_list_create'
    ),

    path(
        'recipients/<uuid:pk>/',
        views.AlertRecipientDetailView.as_view(),
        name='recipient_detail'
    ),

    path(
        'logs/',
        views.NotificationLogListView.as_view(),
        name='log_list'
    ),

    path(
        'logs/summary/',
        views.NotificationLogSummaryView.as_view(),
        name='log_summary'
    ),

    path(
        'test-email/',
        views.SendTestEmailView.as_view(),
        name='send_test_email'
    ),

    path(
        'trigger-check/',
        views.TriggerNotificationCheckView.as_view(),
        name='trigger_notification_check'
    ),

    path(
        'cron-trigger/',
        views.ExternalCronTriggerView.as_view(),
        name='external_cron_trigger'
    ),
]

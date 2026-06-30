from django.urls import path
from . import views

app_name = 'instruments'

urlpatterns = [

    path(
        '',
        views.InstrumentListCreateView.as_view(),
        name='instrument_list_create'
    ),

    path(
        '<uuid:pk>/',
        views.InstrumentDetailView.as_view(),
        name='instrument_detail'
    ),

    path(
        '<uuid:pk>/restore/',
        views.InstrumentRestoreView.as_view(),
        name='instrument_restore'
    ),

    path(
        '<uuid:pk>/calibrations/',
        views.InstrumentCalibrationHistoryView.as_view(),
        name='instrument_calibration_history'
    ),

    path(
        'calibrations/',
        views.CalibrationRecordListCreateView.as_view(),
        name='calibration_list_create'
    ),

    path(
        'calibrations/<uuid:pk>/',
        views.CalibrationRecordDetailView.as_view(),
        name='calibration_detail'
    ),

    path(
        "amc/",
        views.AMCRecordListCreateView.as_view(),
        name="amc_list_create"
    ),
    path(
        "amc/<uuid:pk>/",
        views.AMCRecordDetailView.as_view(),
        name="amc_detail"
    ),
    path(
        "<uuid:pk>/amc/",
        views.InstrumentAMCRecordsView.as_view(),
        name="instrument_amc"
    ),

    path(
        "camc/",
        views.CAMCRecordListCreateView.as_view(),
        name="camc_list_create"
    ),
    path(
        "camc/<uuid:pk>/",
        views.CAMCRecordDetailView.as_view(),
        name="camc_detail"
    ),
    path(
        "<uuid:pk>/camc/",
        views.InstrumentCAMCRecordsView.as_view(),
        name="instrument_camc"
    ),
]


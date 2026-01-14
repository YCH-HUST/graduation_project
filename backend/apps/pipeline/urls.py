"""
URL configuration for pipeline app.
"""
from django.urls import path
from .views import PipelineRunView
from .yolo_views import YoloDetectView

urlpatterns = [
    path('cases/<uuid:case_id>/run_pipeline/', PipelineRunView.as_view(), name='run_pipeline'),
    path('yolo/detect/', YoloDetectView.as_view(), name='yolo_detect'),
]


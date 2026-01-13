"""
URL configuration for pipeline app.
"""
from django.urls import path
from .views import PipelineRunView

urlpatterns = [
    path('cases/<uuid:case_id>/run_pipeline/', PipelineRunView.as_view(), name='run_pipeline'),
]

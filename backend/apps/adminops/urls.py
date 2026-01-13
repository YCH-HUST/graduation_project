"""
URL configuration for adminops app.
"""
from django.urls import path
from .views import HealthCheckView

urlpatterns = [
    path('admin/health/', HealthCheckView.as_view(), name='health_check'),
]

"""
URL configuration for adminops app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthCheckView, GovernanceViewSet

router = DefaultRouter()
router.register(r'admin/governance', GovernanceViewSet, basename='governance')

urlpatterns = [
    path('admin/health/', HealthCheckView.as_view(), name='health_check'),
    path('', include(router.urls)),
]

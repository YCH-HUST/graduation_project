"""
URL configuration for adminops app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    HealthCheckView, 
    GovernanceViewSet, 
    UserViewSet, 
    CaseViewSet, 
    StatisticsView
)

router = DefaultRouter()
router.register(r'admin/governance', GovernanceViewSet, basename='governance')
router.register(r'admin/users', UserViewSet, basename='admin-users')
router.register(r'admin/cases', CaseViewSet, basename='admin-cases')

urlpatterns = [
    path('admin/health/', HealthCheckView.as_view(), name='health_check'),
    path('admin/statistics/', StatisticsView.as_view(), name='statistics'),
    path('', include(router.urls)),
]


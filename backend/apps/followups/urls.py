"""
URL configuration for followups app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicationPlanViewSet, MedicationLogViewSet

router = DefaultRouter()
router.register(r'followups/plans', MedicationPlanViewSet, basename='medication-plan')
router.register(r'followups/logs', MedicationLogViewSet, basename='medication-log')

urlpatterns = [
    path('', include(router.urls)),
]

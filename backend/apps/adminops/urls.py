"""
URL configuration for adminops app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    HealthCheckView,
    UserViewSet,
    CaseViewSet,
    StatisticsView
)
from .ai_config_views import (
    AIConfigView,
    TestLLMView,
    MLModelListView,
    MLModelUploadView,
)

router = DefaultRouter()
router.register(r'admin/users', UserViewSet, basename='admin-users')
router.register(r'admin/cases', CaseViewSet, basename='admin-cases')

urlpatterns = [
    path('admin/health/', HealthCheckView.as_view(), name='health_check'),
    path('admin/statistics/', StatisticsView.as_view(), name='statistics'),
    # AI 配置管理
    path('admin/ai-config/', AIConfigView.as_view(), name='ai_config'),
    path('admin/ai-config/test-llm/', TestLLMView.as_view(), name='ai_config_test_llm'),
    # ML 模型管理
    path('admin/ml-models/', MLModelListView.as_view(), name='ml_model_list'),
    path('admin/ml-models/<str:model_type>/', MLModelUploadView.as_view(), name='ml_model_upload'),
    path('', include(router.urls)),
]


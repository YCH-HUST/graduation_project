"""
URL configuration for accounts app.
"""
from django.urls import path
from .views import LoginView, RegisterView

urlpatterns = [
    # 带斜杠的路由
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    # 不带斜杠的路由（兼容前端）
    path('login', LoginView.as_view(), name='login_no_slash'),
    path('register', RegisterView.as_view(), name='register_no_slash'),
]

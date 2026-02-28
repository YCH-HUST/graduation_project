"""
URL configuration for accounts app.
"""
from django.urls import path
from .views import LoginView, RegisterView, ProfileView, RecentPatientsView, ChangePasswordView
from .patient_views import PatientListCreateView, PatientDetailView
from .statistics_views import DoctorStatisticsView
from .doctor_views import DoctorListView

urlpatterns = [
    # 带斜杠的路由
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    # 不带斜杠的路由（兼容前端）
    path('login', LoginView.as_view(), name='login_no_slash'),
    path('register', RegisterView.as_view(), name='register_no_slash'),
]

# Profile 和 Doctor API 路由（需要在主 urls.py 中配置到 /api/ 前缀）
profile_urlpatterns = [
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile', ProfileView.as_view(), name='profile_no_slash'),
    path('doctor/recent-patients/', RecentPatientsView.as_view(), name='recent_patients'),
    path('doctor/recent-patients', RecentPatientsView.as_view(), name='recent_patients_no_slash'),
    # 患者管理 API
    path('doctor/patients/', PatientListCreateView.as_view(), name='patient_list_create'),
    path('doctor/patients', PatientListCreateView.as_view(), name='patient_list_create_no_slash'),
    path('doctor/patients/<int:pk>/', PatientDetailView.as_view(), name='patient_detail'),
    path('doctor/patients/<int:pk>', PatientDetailView.as_view(), name='patient_detail_no_slash'),
    # 统计 API
    path('doctor/statistics/', DoctorStatisticsView.as_view(), name='doctor_statistics'),
    path('doctor/statistics', DoctorStatisticsView.as_view(), name='doctor_statistics_no_slash'),
    # 医生列表 API
    path('doctors/', DoctorListView.as_view(), name='doctor_list'),
    path('doctors', DoctorListView.as_view(), name='doctor_list_no_slash'),
    # 修改密码 API
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('change-password', ChangePasswordView.as_view(), name='change_password_no_slash'),
]

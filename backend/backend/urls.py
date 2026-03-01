"""
URL configuration for backend project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from apps.accounts.urls import profile_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('apps.accounts.urls')),
    path('api/', include('apps.cases.urls')),
    path('api/', include('apps.pipeline.urls')),
    path('api/', include('apps.adminops.urls')),
    path('api/', include(profile_urlpatterns)),  # Profile 和 Doctor API
    path('api/', include('apps.notifications.urls')),  # 通知 API
    path('api/', include('apps.followups.urls')),  # 用药随访 API
    path('api/', include('apps.chat.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

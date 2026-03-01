"""
URL configuration for notifications app.
"""
from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
    NotificationStreamView,
)

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications', NotificationListView.as_view(), name='notification_list_no_slash'),
    path('notifications/<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('notifications/<int:pk>/read', NotificationMarkReadView.as_view(), name='notification_mark_read_no_slash'),
    path('notifications/read-all/', NotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('notifications/read-all', NotificationMarkAllReadView.as_view(), name='notification_mark_all_read_no_slash'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notification_unread_count'),
    path('notifications/unread-count', NotificationUnreadCountView.as_view(), name='notification_unread_count_no_slash'),
    path('notifications/stream/', NotificationStreamView.as_view(), name='notification_stream'),
    path('notifications/stream', NotificationStreamView.as_view(), name='notification_stream_no_slash'),
]

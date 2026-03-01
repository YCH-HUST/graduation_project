from django.urls import path
from .views import (
    ChatMessageListView, ChatStreamView, ChatConversationListView, 
    ChatMarkReadView, GlobalChatStreamView, ChatUnreadCountView
)

urlpatterns = [
    path('chat/conversations/', ChatConversationListView.as_view(), name='chat_conversations'),
    path('chat/stream/global/', GlobalChatStreamView.as_view(), name='chat_stream_global'),
    path('chat/unread-count/', ChatUnreadCountView.as_view(), name='chat_unread_count'),
    path('chat/<int:patient_id>/messages/', ChatMessageListView.as_view(), name='chat_message_list'),
    path('chat/<int:patient_id>/stream/', ChatStreamView.as_view(), name='chat_stream'),
    path('chat/<int:patient_id>/read/', ChatMarkReadView.as_view(), name='chat_mark_read'),
]

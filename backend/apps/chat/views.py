import json
import time
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse
from django.core.cache import cache
from .models import ChatMessage
from .serializers import ChatMessageSerializer
from apps.accounts.models import User

class ChatMessageListView(generics.ListCreateAPIView):
    """
    拉取历史消息，发送新消息
    """
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        patient_id = self.kwargs['patient_id']
        return ChatMessage.objects.filter(patient_id=patient_id)

    def perform_create(self, serializer):
        patient_id = self.kwargs['patient_id']
        patient = User.objects.get(id=patient_id)
        serializer.save(sender=self.request.user, patient=patient)


class ChatStreamView(APIView):
    """
    Server-Sent Events 房间，推送新消息
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, patient_id):
        def event_stream():
            cache_key = f'chat_update_{patient_id}'
            yield "data: {\"type\": \"connected\"}\n\n"
            
            last_timestamp = cache.get(cache_key) or time.time()
            if cache.get(cache_key) is None:
                cache.set(cache_key, last_timestamp, timeout=None)
            
            last_message = ChatMessage.objects.filter(patient_id=patient_id).last()
            last_message_id = last_message.id if last_message else 0

            while True:
                time.sleep(1)
                
                current_timestamp = cache.get(cache_key)
                
                if current_timestamp is None or current_timestamp != last_timestamp:
                    new_messages = ChatMessage.objects.filter(
                        patient_id=patient_id, 
                        id__gt=last_message_id
                    ).order_by('created_at')
                    
                    if new_messages.exists():
                        serializer = ChatMessageSerializer(new_messages, many=True)
                        data = json.dumps({'type': 'new_messages', 'messages': serializer.data})
                        yield f"data: {data}\n\n"
                        last_message_id = new_messages.last().id
                    
                    if current_timestamp is None:
                        current_timestamp = time.time()
                        cache.set(cache_key, current_timestamp, timeout=None)
                        
                    last_timestamp = current_timestamp

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

class ChatConversationListView(APIView):
    """
    获取当前用户的会话列表
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'patient':
            last_msg = ChatMessage.objects.filter(patient=user).order_by('-created_at').first()
            if not last_msg:
                return Response([])
            unread_count = ChatMessage.objects.filter(patient=user, is_read=False).exclude(sender=user).count()
            
            doctor_msg = ChatMessage.objects.filter(patient=user).exclude(sender=user).order_by('-created_at').first()
            doctor_name = "在线医生"
            if doctor_msg:
                doctor_name = doctor_msg.sender.full_name or doctor_msg.sender.username
                
            return Response([{
                "patient_id": user.id,
                "name": doctor_name,
                "latest_message": last_msg.content,
                "updated_at": last_msg.created_at,
                "unread_count": unread_count
            }])
        else:
            from django.db.models import Max
            latest_ids = ChatMessage.objects.values('patient').annotate(max_id=Max('id')).values_list('max_id', flat=True)
            latest_messages = ChatMessage.objects.filter(id__in=latest_ids).select_related('patient').order_by('-created_at')
            
            conversations = []
            for msg in latest_messages:
                unread_count = ChatMessage.objects.filter(patient=msg.patient, is_read=False).exclude(sender=user).count()
                patient_name = msg.patient.full_name or msg.patient.username
                conversations.append({
                    "patient_id": msg.patient.id,
                    "name": patient_name,
                    "latest_message": msg.content,
                    "updated_at": msg.created_at,
                    "unread_count": unread_count
                })
            return Response(conversations)


class ChatMarkReadView(APIView):
    """
    标记某个由对方发送的会话的所有消息为已读
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, patient_id):
        user = request.user
        messages = ChatMessage.objects.filter(patient_id=patient_id, is_read=False).exclude(sender=user)
        updated = messages.update(is_read=True)
        
        if user.role == 'patient':
            cache.set(f'global_chat_update_patient_{user.id}', time.time(), timeout=None)
        else:
            cache.set('global_chat_update_doctors', time.time(), timeout=None)
            
        return Response({"success": True, "updated": updated})


class GlobalChatStreamView(APIView):
    """
    全局 SSE 房间，专门推送总未读消息数给导航栏红点
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        def event_stream():
            if user.role == 'patient':
                cache_key = f'global_chat_update_patient_{user.id}'
            else:
                cache_key = 'global_chat_update_doctors'
                
            yield "data: {\"type\": \"connected\"}\n\n"
            
            # Initial push
            def get_unread_count():
                if user.role == 'patient':
                    return ChatMessage.objects.filter(patient=user, is_read=False).exclude(sender=user).count()
                else:
                    return ChatMessage.objects.filter(is_read=False, sender__role='patient').count()
            
            initial_count = get_unread_count()
            yield f"data: {json.dumps({'type': 'unread_count', 'count': initial_count})}\n\n"
            
            last_timestamp = cache.get(cache_key) or time.time()
            if cache.get(cache_key) is None:
                cache.set(cache_key, last_timestamp, timeout=None)

            while True:
                time.sleep(2)
                
                current_timestamp = cache.get(cache_key)
                if current_timestamp is None or current_timestamp != last_timestamp:
                    count = get_unread_count()
                    yield f"data: {json.dumps({'type': 'unread_count', 'count': count})}\n\n"
                    
                    if current_timestamp is None:
                        current_timestamp = time.time()
                        cache.set(cache_key, current_timestamp, timeout=None)
                        
                    last_timestamp = current_timestamp

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

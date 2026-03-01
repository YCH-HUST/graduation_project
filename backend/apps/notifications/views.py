"""
Notification views.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import StreamingHttpResponse
from django.core.cache import cache
import time
import json

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    获取用户通知列表
    GET /api/notifications/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # 获取当前用户的通知
        notifications = Notification.objects.filter(recipient=request.user)
        
        # 筛选参数
        is_read = request.query_params.get('is_read')
        if is_read == 'true':
            notifications = notifications.filter(is_read=True)
        elif is_read == 'false':
            notifications = notifications.filter(is_read=False)
        
        # 统计未读数量
        unread_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        # 限制返回数量
        limit = int(request.query_params.get('limit', 50))
        notifications = notifications[:limit]
        
        return Response({
            'items': NotificationSerializer(notifications, many=True).data,
            'unread_count': unread_count,
        })


class NotificationMarkReadView(APIView):
    """
    标记单条通知已读
    PUT /api/notifications/{id}/read/
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': '通知不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        notification.is_read = True
        notification.save()
        
        return Response({'ok': True})


class NotificationMarkAllReadView(APIView):
    """
    标记所有通知已读
    PUT /api/notifications/read-all/
    """
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({'ok': True, 'count': count})


class NotificationUnreadCountView(APIView):
    """
    获取未读通知数量
    GET /api/notifications/unread-count/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        
        return Response({'count': count})


class NotificationStreamView(APIView):
    """
    Server-Sent Events 接口，推送未读消息数
    GET /api/notifications/stream/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user_id = request.user.id
        
        def event_stream():
            # 初始化查询
            unread_count = Notification.objects.filter(
                recipient_id=user_id,
                is_read=False
            ).count()
            data = json.dumps({'unread_count': unread_count})
            yield f"data: {data}\n\n"
            
            cache_key = f'unread_update_{user_id}'
            # 将初始化时间作为最后的已知更新时间
            last_timestamp = cache.get(cache_key) or time.time()
            # 设置一次缓存，避免为None
            if cache.get(cache_key) is None:
                cache.set(cache_key, last_timestamp, timeout=None)
            
            while True:
                time.sleep(1)
                
                # 获取当前缓存的时间戳
                current_timestamp = cache.get(cache_key)
                
                # 如果缓存不存在或者时间戳变了
                if current_timestamp is None or current_timestamp != last_timestamp:
                    unread_count = Notification.objects.filter(
                        recipient_id=user_id,
                        is_read=False
                    ).count()
                    
                    data = json.dumps({'unread_count': unread_count})
                    yield f"data: {data}\n\n"
                    
                    if current_timestamp is None:
                        current_timestamp = time.time()
                        cache.set(cache_key, current_timestamp, timeout=None)
                        
                    last_timestamp = current_timestamp

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


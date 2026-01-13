"""
Notification views.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

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

"""
Notification serializers.
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """通知序列化器"""
    related_case_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'content',
            'related_case_id', 'is_read', 'created_at'
        ]
    
    def get_related_case_id(self, obj):
        if obj.related_case:
            return str(obj.related_case.id)
        return None

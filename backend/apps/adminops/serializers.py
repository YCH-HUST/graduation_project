"""
Serializers for adminops app.
"""
from rest_framework import serializers
from .models import GovernanceItem


class GovernanceItemSerializer(serializers.ModelSerializer):
    """数据治理项序列化器"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = GovernanceItem
        fields = ['id', 'type', 'value', 'description', 'created_by', 'created_by_name', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class GovernanceItemCreateSerializer(serializers.Serializer):
    """数据治理项创建序列化器"""
    type = serializers.ChoiceField(
        choices=['synonym', 'tag', 'template', 'blacklist'],
        required=True
    )
    value = serializers.CharField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')

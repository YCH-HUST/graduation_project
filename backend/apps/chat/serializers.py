from rest_framework import serializers
from .models import ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'patient', 'sender', 'sender_name', 'sender_role', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'patient', 'sender', 'sender_name', 'sender_role', 'is_read', 'created_at']

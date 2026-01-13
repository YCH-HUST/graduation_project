"""
Serializers for accounts app.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """用户信息序列化器"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role']


class LoginSerializer(serializers.Serializer):
    """登录序列化器"""
    
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        user = authenticate(username=username, password=password)
        
        if not user:
            raise serializers.ValidationError('用户名或密码错误')
        
        if not user.is_active:
            raise serializers.ValidationError('用户已被禁用')
        
        attrs['user'] = user
        return attrs


class RegisterSerializer(serializers.Serializer):
    """
    注册序列化器
    POST /auth/register
    """
    username = serializers.CharField(
        required=True,
        min_length=3,
        max_length=20,
        help_text='3-20字符，字母数字下划线'
    )
    password = serializers.CharField(
        required=True,
        min_length=6,
        write_only=True,
        help_text='至少6字符'
    )
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')
    role = serializers.ChoiceField(
        choices=['patient', 'doctor', 'admin'],
        required=False,
        default='patient'
    )
    
    def validate_username(self, value):
        """验证用户名格式和唯一性"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError('用户名只能包含字母、数字和下划线')
        
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('用户名已存在')
        
        return value
    
    def validate_email(self, value):
        """验证邮箱唯一性（如果提供）"""
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError('该邮箱已被注册')
        return value
    
    def create(self, validated_data):
        """创建用户"""
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            role=validated_data.get('role', 'patient')
        )
        user.full_name = validated_data.get('full_name', '')
        user.save()
        return user


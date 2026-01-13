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
        fields = [
            'id', 'username', 'email', 'full_name', 'role',
            'hospital', 'job_title', 'years_of_experience', 'gender', 'age'
        ]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """个人资料更新序列化器"""
    
    class Meta:
        model = User
        fields = [
            'full_name', 'email', 'hospital', 'job_title',
            'years_of_experience', 'gender', 'age'
        ]
        extra_kwargs = {
            'full_name': {'required': False},
            'email': {'required': False},
            'hospital': {'required': False},
            'job_title': {'required': False},
            'years_of_experience': {'required': False},
            'gender': {'required': False},
            'age': {'required': False},
        }
    
    def validate_email(self, value):
        """验证邮箱唯一性（如果提供且已更改）"""
        user = self.instance
        if value and user and user.email != value:
            if User.objects.filter(email=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError('该邮箱已被其他用户使用')
        return value


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


# ============ 患者管理序列化器 ============

class PatientListSerializer(serializers.ModelSerializer):
    """患者列表序列化器"""
    case_count = serializers.IntegerField(read_only=True, default=0)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email', 
            'gender', 'age', 'case_count', 'date_joined'
        ]


class PatientDetailSerializer(serializers.ModelSerializer):
    """患者详情序列化器"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'email',
            'gender', 'age', 'hospital', 'job_title',
            'years_of_experience', 'date_joined'
        ]


class PatientCreateSerializer(serializers.Serializer):
    """患者创建序列化器"""
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
    full_name = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    gender = serializers.ChoiceField(choices=['male', 'female', ''], required=False, default='')
    age = serializers.IntegerField(required=False, min_value=0, max_value=150, allow_null=True, default=None)
    
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
        """创建患者用户"""
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            role='patient'
        )
        user.full_name = validated_data.get('full_name', '')
        user.gender = validated_data.get('gender', '')
        user.age = validated_data.get('age')
        user.save()
        return user


class PatientUpdateSerializer(serializers.ModelSerializer):
    """患者更新序列化器"""
    
    class Meta:
        model = User
        fields = ['full_name', 'email', 'gender', 'age']
        extra_kwargs = {
            'full_name': {'required': False},
            'email': {'required': False},
            'gender': {'required': False},
            'age': {'required': False},
        }
    
    def validate_email(self, value):
        """验证邮箱唯一性（如果提供且已更改）"""
        user = self.instance
        if value and user and user.email != value:
            if User.objects.filter(email=value).exclude(pk=user.pk).exists():
                raise serializers.ValidationError('该邮箱已被其他用户使用')
        return value


class PatientCaseSerializer(serializers.Serializer):
    """患者病例简要序列化器"""
    id = serializers.UUIDField()
    chief_complaint = serializers.SerializerMethodField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
    
    def get_chief_complaint(self, obj):
        return obj.chief_complaint_text[:50] if obj.chief_complaint_text else ''

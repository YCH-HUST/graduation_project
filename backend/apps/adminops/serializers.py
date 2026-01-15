"""
Serializers for adminops app.
"""
from rest_framework import serializers
from .models import GovernanceItem
from apps.accounts.models import User
from apps.cases.models import Case


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


class AdminUserSerializer(serializers.ModelSerializer):
    """管理员用户序列化器"""
    case_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'gender', 'age',
                  'hospital', 'job_title', 'department', 'years_of_experience',
                  'is_active', 'date_joined', 'last_login', 'case_count']
        read_only_fields = ['id', 'date_joined', 'last_login', 'case_count']
    
    def get_case_count(self, obj):
        if obj.role == 'patient':
            return obj.cases.count()
        elif obj.role == 'doctor':
            return obj.assigned_cases.count()
        return 0


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """管理员创建用户序列化器"""
    password = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'full_name', 'role', 'gender', 'age',
                  'hospital', 'job_title', 'department', 'years_of_experience']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminCaseListSerializer(serializers.ModelSerializer):
    """管理员病例列表序列化器"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    doctor_name = serializers.CharField(source='assigned_doctor.full_name', read_only=True, allow_null=True)
    review_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = ['id', 'patient_name', 'patient_username', 'doctor_name', 
                  'status', 'chief_complaint_text', 'created_at', 'updated_at', 'review_count']
    
    def get_review_count(self, obj):
        return obj.reviews.count()


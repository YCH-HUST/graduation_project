"""
Serializers for cases app.
"""
import json
from rest_framework import serializers
from .models import Case, CaseAsset, Review


class CaseAssetSerializer(serializers.ModelSerializer):
    """病例资源序列化器"""
    url = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseAsset
        fields = ['id', 'type', 'url', 'created_at']
    
    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.url


class CaseCreateSerializer(serializers.Serializer):
    """
    病例创建序列化器
    处理 multipart/form-data 请求
    """
    raw_image = serializers.ImageField(required=True)
    chief_complaint_text = serializers.CharField(required=False, allow_blank=True, default='')
    questionnaire_json = serializers.CharField(required=False, allow_blank=True, default='{}')
    
    def validate_questionnaire_json(self, value):
        if not value:
            return {}
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            raise serializers.ValidationError('问诊问卷必须是有效的 JSON 格式')
    
    def create(self, validated_data):
        user = self.context['request'].user
        raw_image = validated_data.pop('raw_image')
        questionnaire_json = validated_data.pop('questionnaire_json', {})
        chief_complaint_text = validated_data.pop('chief_complaint_text', '')
        
        # 创建病例
        case = Case.objects.create(
            patient=user,
            status='draft',
            chief_complaint_text=chief_complaint_text,
            questionnaire_json=questionnaire_json
        )
        
        # 保存原始图像
        CaseAsset.objects.create(
            case=case,
            type='raw_image',
            file=raw_image
        )
        
        return case


class CaseListSerializer(serializers.ModelSerializer):
    """病例列表序列化器"""
    patient_name = serializers.CharField(source='patient.username', read_only=True)
    
    class Meta:
        model = Case
        fields = ['id', 'patient_name', 'status', 'chief_complaint_text', 'created_at', 'updated_at']


class CaseDetailSerializer(serializers.ModelSerializer):
    """病例详情序列化器"""
    patient_name = serializers.CharField(source='patient.username', read_only=True)
    assets = CaseAssetSerializer(many=True, read_only=True)
    latest_run = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = ['id', 'patient', 'patient_name', 'status', 'chief_complaint_text', 
                  'questionnaire_json', 'created_at', 'updated_at', 'assets', 'latest_run']
    
    def get_latest_run(self, obj):
        from apps.pipeline.serializers import PipelineRunSerializer
        latest = obj.pipeline_runs.order_by('-created_at').first()
        if latest:
            return PipelineRunSerializer(latest).data
        return None


class ReviewSerializer(serializers.ModelSerializer):
    """审核序列化器"""
    doctor_name = serializers.CharField(source='doctor.username', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'case', 'doctor', 'doctor_name', 'decision', 
                  'edited_syndrome_json', 'edited_prescription_json', 'note', 'created_at']
        read_only_fields = ['id', 'doctor', 'created_at']


class ReviewCreateSerializer(serializers.Serializer):
    """审核创建序列化器"""
    decision = serializers.ChoiceField(choices=['approved', 'rejected'], required=True)
    edited_syndrome_json = serializers.JSONField(required=False, default=dict)
    edited_prescription_json = serializers.JSONField(required=False, default=dict)
    note = serializers.CharField(required=False, allow_blank=True, default='')

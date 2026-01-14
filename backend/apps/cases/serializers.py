"""
Serializers for cases app.
Updated to match frontend API contract.
"""
import json
from rest_framework import serializers
from .models import Case, CaseAsset, Review


class CaseAssetSerializer(serializers.ModelSerializer):
    """病例资源序列化器"""
    url = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseAsset
        fields = ['id', 'type', 'url', 'description', 'created_at']
    
    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        elif obj.file:
            return obj.file.url
        return None
    
    def get_description(self, obj):
        """根据类型返回描述"""
        descriptions = {
            'raw_image': '原始舌象',
            'mask': '分割掩码',
            'heatmap': '热力图',
            'annotated': '标注结果',
        }
        return descriptions.get(obj.type, obj.type)


class CaseCreateSerializer(serializers.Serializer):
    """
    病例创建序列化器
    处理 multipart/form-data 请求
    前端使用 tongue_image 和 questionnaire 字段
    """
    # 支持前端的字段名 tongue_image，同时兼容 raw_image
    tongue_image = serializers.ImageField(required=False)
    raw_image = serializers.ImageField(required=False)
    # 支持 questionnaire 字段
    questionnaire = serializers.CharField(required=False, allow_blank=True, default='{}')
    questionnaire_json = serializers.CharField(required=False, allow_blank=True, default='{}')
    chief_complaint_text = serializers.CharField(required=False, allow_blank=True, default='')
    # 医生ID（可选）
    doctor_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, attrs):
        # 兼容两种字段名
        image = attrs.get('tongue_image') or attrs.get('raw_image')
        if not image:
            raise serializers.ValidationError({'tongue_image': '舌象图片为必填项'})
        attrs['image'] = image
        return attrs
    
    def validate_questionnaire(self, value):
        if not value:
            return {}
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            raise serializers.ValidationError('问诊问卷必须是有效的 JSON 格式')
    
    def validate_questionnaire_json(self, value):
        if not value:
            return {}
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            raise serializers.ValidationError('问诊问卷必须是有效的 JSON 格式')
    
    def validate_doctor_id(self, value):
        """验证医生ID"""
        if value:
            from apps.accounts.models import User
            try:
                doctor = User.objects.get(id=value, role='doctor')
                return doctor
            except User.DoesNotExist:
                raise serializers.ValidationError('指定的医生不存在')
        return None
    
    def create(self, validated_data):
        user = self.context['request'].user
        image = validated_data.get('image')
        doctor = validated_data.get('doctor_id')  # 已经是 User 对象或 None
        
        # 优先使用 questionnaire，其次使用 questionnaire_json
        questionnaire = validated_data.get('questionnaire') or validated_data.get('questionnaire_json') or {}
        if isinstance(questionnaire, str):
            try:
                questionnaire = json.loads(questionnaire)
            except:
                questionnaire = {}
        
        # 从 questionnaire 中提取 chief_complaint
        chief_complaint = validated_data.get('chief_complaint_text', '')
        if not chief_complaint and isinstance(questionnaire, dict):
            chief_complaint = questionnaire.get('chief_complaint', '')
        
        # 创建病例
        case = Case.objects.create(
            patient=user,
            assigned_doctor=doctor,
            status='draft',
            chief_complaint_text=chief_complaint,
            questionnaire_json=questionnaire
        )
        
        # 保存原始图像
        CaseAsset.objects.create(
            case=case,
            type='raw_image',
            file=image
        )
        
        return case


class CaseListSerializer(serializers.ModelSerializer):
    """病例列表序列化器"""
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    questionnaire = serializers.JSONField(source='questionnaire_json', read_only=True)
    
    class Meta:
        model = Case
        fields = ['id', 'patient_id', 'patient_name', 'questionnaire', 'status', 'created_at']


class CaseDetailSerializer(serializers.ModelSerializer):
    """病例详情序列化器 - 匹配前端契约"""
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)
    patient_name = serializers.SerializerMethodField()
    tongue_image = serializers.SerializerMethodField()
    questionnaire = serializers.JSONField(source='questionnaire_json', read_only=True)
    
    class Meta:
        model = Case
        fields = ['id', 'patient_id', 'patient_name', 'tongue_image', 'questionnaire', 
                  'status', 'created_at', 'updated_at']
    
    def get_patient_name(self, obj):
        return obj.patient.full_name or obj.patient.username
    
    def get_tongue_image(self, obj):
        """获取原始舌象图片 URL"""
        raw_asset = obj.assets.filter(type='raw_image').first()
        if raw_asset and raw_asset.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(raw_asset.file.url)
            return raw_asset.file.url
        return None


class PipelineRunDetailSerializer(serializers.Serializer):
    """流水线运行详情 - 匹配前端契约"""
    id = serializers.IntegerField()
    case_id = serializers.UUIDField(source='case.id')
    status = serializers.SerializerMethodField()
    progress = serializers.IntegerField()
    current_stage = serializers.SerializerMethodField()
    result_available = serializers.SerializerMethodField()
    diagnosis_result = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    completed_at = serializers.SerializerMethodField()
    
    def get_status(self, obj):
        """转换状态值为前端格式"""
        status_map = {
            'queued': 'pending',
            'running': 'running',
            'success': 'completed',
            'failed': 'failed',
        }
        return status_map.get(obj.status, obj.status)
    
    def get_current_stage(self, obj):
        """根据进度返回当前阶段"""
        if obj.status == 'success':
            return 'completed'
        if obj.status == 'failed':
            return 'failed'
        if obj.progress < 20:
            return 'preprocessing'
        elif obj.progress < 40:
            return 'segmentation'
        elif obj.progress < 60:
            return 'feature_extraction'
        elif obj.progress < 85:
            return 'diagnosis'
        elif obj.progress < 100:
            return 'postprocessing'
        return 'completed'
    
    def get_result_available(self, obj):
        return obj.status == 'success'
    
    def get_completed_at(self, obj):
        if obj.status == 'success':
            return obj.created_at  # 简化处理
        return None
    
    def get_diagnosis_result(self, obj):
        """构建诊断结果 - 匹配前端契约格式"""
        if obj.status != 'success':
            return None
        
        inference = obj.inference_result_json or {}
        
        # 转换 syndromes 格式
        syndromes = []
        for s in inference.get('syndromes', []):
            syndromes.append({
                'name': s.get('name', ''),
                'score': s.get('confidence', 0),
                'description': ', '.join(s.get('key_symptoms', []))
            })
        
        # 转换 formulas 格式
        formulas = []
        for p in inference.get('prescriptions', []):
            formulas.append({
                'name': p.get('name', ''),
                'score': p.get('score', 0),
                'composition': ', '.join(p.get('composition', [])) if isinstance(p.get('composition'), list) else p.get('composition', ''),
                'indication': p.get('indication', '')
            })
        
        # 提取证据要点
        yolo = obj.yolo_result_json or {}
        tongue_features = yolo.get('tongue_features', {})
        evidence_points = []
        if tongue_features:
            if tongue_features.get('color'):
                evidence_points.append(f"舌质{tongue_features.get('color')}")
            if tongue_features.get('coating_color'):
                evidence_points.append(f"苔{tongue_features.get('coating_thickness', '')}{tongue_features.get('coating_color', '')}苔")
        
        return {
            'syndromes': syndromes,
            'formulas': formulas,
            'evidence_points': evidence_points,
            'llm_explanation': obj.explanation_text or '',
            'confidence_score': yolo.get('confidence_score', 0.8)
        }


class ReviewSerializer(serializers.ModelSerializer):
    """审核序列化器"""
    doctor_name = serializers.CharField(source='doctor.username', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'case', 'doctor', 'doctor_name', 'decision', 
                  'edited_syndrome_json', 'edited_prescription_json', 'note', 'created_at']
        read_only_fields = ['id', 'doctor', 'created_at']


class ReviewCreateSerializer(serializers.Serializer):
    """
    审核创建序列化器
    兼容前端的 approve/reject/revise 和后端的 approved/rejected
    """
    decision = serializers.ChoiceField(
        choices=['approve', 'reject', 'revise', 'approved', 'rejected'],
        required=True
    )
    edited_syndromes = serializers.ListField(required=False, default=list)
    edited_formulas = serializers.ListField(required=False, default=list)
    edited_syndrome_json = serializers.JSONField(required=False, default=dict)
    edited_prescription_json = serializers.JSONField(required=False, default=dict)
    note = serializers.CharField(required=False, allow_blank=True, default='')
    
    def validate_decision(self, value):
        """统一转换为后端格式"""
        if value == 'approve':
            return 'approved'
        if value == 'reject':
            return 'rejected'
        if value == 'revise':
            return 'revise'
        return value

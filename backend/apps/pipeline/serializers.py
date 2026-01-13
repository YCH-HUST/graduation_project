"""
Serializers for pipeline app.
"""
from rest_framework import serializers
from .models import PipelineRun


class PipelineRunSerializer(serializers.ModelSerializer):
    """流水线运行记录序列化器"""
    result_available = serializers.SerializerMethodField()
    
    class Meta:
        model = PipelineRun
        fields = ['id', 'case', 'status', 'progress', 'yolo_result_json', 
                  'nlp_result_json', 'inference_result_json', 'explanation_text',
                  'timing_json', 'error_message', 'created_at', 'result_available']
    
    def get_result_available(self, obj):
        return obj.status == 'success'


class PipelineStatusSerializer(serializers.Serializer):
    """流水线状态序列化器"""
    status = serializers.CharField()
    progress = serializers.IntegerField()
    result_available = serializers.BooleanField()

"""
Views for pipeline app.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.cases.models import Case
from apps.accounts.permissions import IsCaseOwnerOrDoctorOrAdmin
from apps.audit.utils import log_action
from .models import PipelineRun
from .serializers import PipelineRunSerializer
from .tasks import start_pipeline_async


class PipelineRunView(APIView):
    """
    流水线运行接口
    POST /api/cases/{id}/run_pipeline/
    """
    permission_classes = [IsCaseOwnerOrDoctorOrAdmin]
    
    def post(self, request, case_id):
        """
        启动或查询流水线状态
        
        请求体：
        - action: "start" 启动流水线
        - action: "status" 或空 查询状态
        """
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            return Response({'error': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 检查对象权限
        user = request.user
        if user.role == 'patient' and case.patient != user:
            return Response({'error': '您没有权限操作此病例'}, status=status.HTTP_403_FORBIDDEN)
        
        action = request.data.get('action', 'status')
        
        if action == 'start':
            return self._start_pipeline(request, case)
        else:
            return self._get_status(request, case)
    
    def _start_pipeline(self, request, case):
        """启动流水线"""
        # 检查是否有正在运行的流水线
        running = case.pipeline_runs.filter(status__in=['queued', 'running']).exists()
        if running:
            return Response({'error': '已有流水线正在运行'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 检查是否有原始图像
        if not case.assets.filter(type='raw_image').exists():
            return Response({'error': '病例缺少原始图像'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 创建流水线记录
        pipeline_run = PipelineRun.objects.create(
            case=case,
            status='queued',
            progress=0
        )
        
        # 记录审计日志
        log_action(user=request.user, action='pipeline_start', case=case)
        
        # 启动后台任务
        start_pipeline_async(str(case.id), pipeline_run.id)
        
        return Response({
            'message': '流水线已启动',
            'pipeline_run_id': pipeline_run.id,
            'status': 'queued',
            'progress': 0,
            'result_available': False
        }, status=status.HTTP_201_CREATED)
    
    def _get_status(self, request, case):
        """查询流水线状态"""
        latest_run = case.pipeline_runs.order_by('-created_at').first()
        
        if not latest_run:
            return Response({
                'status': None,
                'progress': 0,
                'result_available': False,
                'message': '尚未启动过流水线'
            })
        
        return Response({
            'status': latest_run.status,
            'progress': latest_run.progress,
            'result_available': latest_run.status == 'success',
            'pipeline_run_id': latest_run.id,
            'error_message': latest_run.error_message if latest_run.status == 'failed' else None
        })

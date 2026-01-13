"""
Views for pipeline app.
Updated to match frontend API contract - supports both GET and POST.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.cases.models import Case
from apps.accounts.permissions import IsCaseOwnerOrDoctorOrAdmin
from apps.audit.utils import log_action
from .models import PipelineRun
from .tasks import start_pipeline_async


class PipelineRunView(APIView):
    """
    流水线运行接口
    POST /api/cases/{id}/run_pipeline/ - 启动流水线
    GET /api/cases/{id}/run_pipeline/ - 查询状态（前端轮询用）
    """
    permission_classes = [IsCaseOwnerOrDoctorOrAdmin]
    
    def get(self, request, case_id):
        """
        GET 方法 - 查询流水线状态
        前端每 2 秒轮询一次
        """
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            return Response({'detail': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 检查权限
        user = request.user
        if user.role == 'patient' and case.patient != user:
            return Response({'detail': '您没有权限操作此病例'}, status=status.HTTP_403_FORBIDDEN)
        
        return self._get_status(case)
    
    def post(self, request, case_id):
        """
        POST 方法 - 启动流水线（或查询状态，兼容旧接口）
        """
        try:
            case = Case.objects.get(pk=case_id)
        except Case.DoesNotExist:
            return Response({'detail': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 检查对象权限
        user = request.user
        if user.role == 'patient' and case.patient != user:
            return Response({'detail': '您没有权限操作此病例'}, status=status.HTTP_403_FORBIDDEN)
        
        # 无论有没有 action 字段，POST 都启动流水线
        # 如果需要兼容旧的 action=status，可以检查
        action = request.data.get('action', 'start')
        if action == 'status':
            return self._get_status(case)
        
        return self._start_pipeline(request, case)
    
    def _start_pipeline(self, request, case):
        """启动流水线"""
        # 检查是否有正在运行的流水线
        running = case.pipeline_runs.filter(status__in=['queued', 'running']).exists()
        if running:
            # 返回当前状态而不是报错
            return self._get_status(case)
        
        # 检查是否有原始图像
        if not case.assets.filter(type='raw_image').exists():
            return Response({'detail': '病例缺少原始图像'}, status=status.HTTP_400_BAD_REQUEST)
        
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
            'status': 'pending',
            'progress': 0,
            'current_stage': 'preprocessing',
            'result_available': False
        }, status=status.HTTP_200_OK)
    
    def _get_status(self, case):
        """查询流水线状态 - 匹配前端契约格式"""
        latest_run = case.pipeline_runs.order_by('-created_at').first()
        
        if not latest_run:
            return Response({
                'status': 'pending',
                'progress': 0,
                'current_stage': 'preprocessing',
                'result_available': False
            })
        
        # 状态映射
        status_map = {
            'queued': 'pending',
            'running': 'running',
            'success': 'completed',
            'failed': 'failed',
        }
        
        # 根据进度确定 current_stage
        current_stage = self._get_current_stage(latest_run)
        
        return Response({
            'status': status_map.get(latest_run.status, latest_run.status),
            'progress': latest_run.progress,
            'current_stage': current_stage,
            'result_available': latest_run.status == 'success'
        })
    
    def _get_current_stage(self, pipeline_run):
        """根据进度返回当前阶段"""
        if pipeline_run.status == 'success':
            return 'completed'
        if pipeline_run.status == 'failed':
            return 'failed'
        
        progress = pipeline_run.progress
        if progress < 20:
            return 'preprocessing'
        elif progress < 40:
            return 'segmentation'
        elif progress < 60:
            return 'feature_extraction'
        elif progress < 85:
            return 'diagnosis'
        elif progress < 100:
            return 'postprocessing'
        return 'completed'

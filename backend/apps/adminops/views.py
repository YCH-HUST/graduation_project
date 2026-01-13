"""
Views for adminops app.
Updated to match frontend API contract format.
"""
import time
import requests
from datetime import datetime
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from django.db import connection

from apps.accounts.permissions import IsAdmin
from .models import GovernanceItem
from .serializers import GovernanceItemSerializer, GovernanceItemCreateSerializer


class HealthCheckView(APIView):
    """
    服务健康检查接口
    GET /api/admin/health/
    
    响应格式匹配前端契约：
    {
      "services": [...],
      "overall_status": "healthy" | "unhealthy" | "degraded"
    }
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        """检查各个服务的健康状态"""
        services = []
        
        # 1. 检查 Django Backend
        services.append(self._check_django())
        
        # 2. 检查数据库
        services.append(self._check_database())
        
        # 3. 检查外部 AI 服务
        service_configs = getattr(settings, 'PIPELINE_SERVICES', {})
        for name, config in service_configs.items():
            services.append(self._check_external_service(name, config))
        
        # 计算 overall_status
        overall_status = self._calculate_overall_status(services)
        
        return Response({
            'services': services,
            'overall_status': overall_status
        })
    
    def _check_django(self) -> dict:
        """检查 Django 后端"""
        start_time = time.time()
        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            'name': 'Django Backend',
            'status': 'healthy',
            'latency_ms': latency_ms,
            'message': '响应正常',
            'last_check': datetime.now().isoformat()
        }
    
    def _check_database(self) -> dict:
        """检查数据库连接"""
        start_time = time.time()
        
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                'name': 'MySQL Database',
                'status': 'healthy',
                'latency_ms': latency_ms,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                'name': 'MySQL Database',
                'status': 'unhealthy',
                'latency_ms': latency_ms,
                'message': str(e),
                'last_check': datetime.now().isoformat()
            }
    
    def _check_external_service(self, name: str, config: dict) -> dict:
        """检查外部 AI 服务"""
        url = config.get('url', '')
        timeout = config.get('timeout', 5)
        
        # 构建健康检查 URL
        health_url = url.replace('/predict', '/health').replace('/parse', '/health') \
                        .replace('/infer', '/health').replace('/generate', '/health')
        
        start_time = time.time()
        
        try:
            response = requests.get(health_url, timeout=timeout)
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                'name': f'{name} Service',
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'latency_ms': latency_ms,
                'last_check': datetime.now().isoformat()
            }
            
        except requests.exceptions.RequestException:
            latency_ms = int((time.time() - start_time) * 1000)
            
            # 外部服务未部署时，返回 degraded 状态（使用 Mock 模式）
            return {
                'name': f'{name} Service',
                'status': 'degraded',
                'latency_ms': latency_ms,
                'message': f'使用 Mock 模式（实际服务未部署）',
                'last_check': datetime.now().isoformat()
            }
    
    def _calculate_overall_status(self, services: list) -> str:
        """计算整体状态"""
        statuses = [s.get('status', 'unknown') for s in services]
        
        if all(s == 'healthy' for s in statuses):
            return 'healthy'
        elif any(s == 'unhealthy' for s in statuses):
            return 'unhealthy'
        else:
            return 'degraded'


class GovernanceViewSet(viewsets.GenericViewSet):
    """
    数据治理接口
    GET /api/admin/governance/?type=synonym
    POST /api/admin/governance/
    DELETE /api/admin/governance/{id}/
    """
    queryset = GovernanceItem.objects.all()
    permission_classes = [IsAdmin]
    
    def list(self, request):
        """
        GET /api/admin/governance/?type=synonym
        获取数据治理项列表
        """
        queryset = self.get_queryset()
        
        # 按类型过滤
        item_type = request.query_params.get('type')
        if item_type:
            queryset = queryset.filter(type=item_type)
        
        serializer = GovernanceItemSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request):
        """
        POST /api/admin/governance/
        创建数据治理项
        """
        serializer = GovernanceItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        item = GovernanceItem.objects.create(
            type=serializer.validated_data['type'],
            value=serializer.validated_data['value'],
            description=serializer.validated_data.get('description', ''),
            created_by=request.user
        )
        
        return Response(
            GovernanceItemSerializer(item).data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, pk=None):
        """
        DELETE /api/admin/governance/{id}/
        删除数据治理项
        """
        try:
            item = GovernanceItem.objects.get(pk=pk)
        except GovernanceItem.DoesNotExist:
            return Response({'detail': '项目不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

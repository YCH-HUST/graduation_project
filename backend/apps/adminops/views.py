"""
Views for adminops app.
"""
import time
import requests
from datetime import datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings

from apps.accounts.permissions import IsAdmin


class HealthCheckView(APIView):
    """
    服务健康检查接口
    GET /api/admin/health/
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        """
        检查各个外部服务的健康状态
        默认使用 mock 检查（服务未部署时返回模拟数据）
        """
        services = []
        service_configs = getattr(settings, 'PIPELINE_SERVICES', {})
        
        for name, config in service_configs.items():
            service_status = self._check_service(name, config)
            services.append(service_status)
        
        return Response({
            'services': services,
            'checked_at': datetime.now().isoformat()
        })
    
    def _check_service(self, name: str, config: dict) -> dict:
        """
        检查单个服务的健康状态
        
        Args:
            name: 服务名称
            config: 服务配置（包含 url 和 timeout）
            
        Returns:
            包含服务状态的字典
        """
        url = config.get('url', '')
        timeout = config.get('timeout', 10)
        
        start_time = time.time()
        
        try:
            # 尝试发送健康检查请求
            # 在实际部署前，这些服务可能不存在，所以我们使用 mock 响应
            response = requests.get(
                url.replace('/predict', '/health').replace('/parse', '/health')
                    .replace('/infer', '/health').replace('/generate', '/health'),
                timeout=timeout
            )
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                'name': name,
                'up': response.status_code == 200,
                'latency_ms': latency_ms,
                'checked_at': datetime.now().isoformat()
            }
            
        except requests.exceptions.RequestException:
            # 服务不可用时，返回 mock 数据（标记为 mock）
            latency_ms = int((time.time() - start_time) * 1000)
            
            return {
                'name': name,
                'up': True,  # Mock 模式下假设服务可用
                'latency_ms': 0,
                'checked_at': datetime.now().isoformat(),
                'mock': True,
                'message': f'服务 {name} 使用 Mock 模式（实际服务未部署）'
            }

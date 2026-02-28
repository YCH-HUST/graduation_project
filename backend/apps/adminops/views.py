"""
Views for adminops app.
Updated to match frontend API contract format.
"""
import os
import time
import requests
from datetime import datetime, timedelta
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from django.db import connection
from django.db.models import Count, Q

from apps.accounts.permissions import IsAdmin
from apps.accounts.models import User
from apps.cases.models import Case
from .models import GovernanceItem
from .serializers import (
    GovernanceItemSerializer, 
    GovernanceItemCreateSerializer,
    AdminUserSerializer,
    AdminUserCreateSerializer,
    AdminCaseListSerializer,
)


class HealthCheckView(APIView):
    """
    服务健康检查接口
    GET /api/admin/health/
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        """检查各个服务的健康状态"""
        services = [
            self._check_django(),
            self._check_database(),
            self._check_yolo_model(),
            self._check_ml_models(),
            self._check_llm_api(),
        ]
        overall_status = self._calculate_overall_status(services)
        return Response({'services': services, 'overall_status': overall_status})
    
    def _check_django(self) -> dict:
        """检查 Django 后端"""
        return {
            'name': 'Django Backend',
            'status': 'healthy',
            'latency_ms': 0,
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
                'message': '连接正常',
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
    
    def _check_yolo_model(self) -> dict:
        """检查 YOLO 模型文件"""
        start_time = time.time()
        model_path = os.path.join(settings.BASE_DIR, 'models', 'yolo', 'best.pt')
        try:
            if not os.path.exists(model_path):
                return {
                    'name': 'YOLO 舌象检测模型',
                    'status': 'unhealthy',
                    'latency_ms': int((time.time() - start_time) * 1000),
                    'message': '模型文件不存在',
                    'last_check': datetime.now().isoformat()
                }
            size_mb = os.path.getsize(model_path) / (1024 * 1024)
            from ultralytics import YOLO  # noqa: F401 仅检查依赖
            return {
                'name': 'YOLO 舌象检测模型',
                'status': 'healthy',
                'latency_ms': int((time.time() - start_time) * 1000),
                'message': f'模型就绪（{size_mb:.1f} MB）',
                'last_check': datetime.now().isoformat()
            }
        except ImportError:
            return {
                'name': 'YOLO 舌象检测模型',
                'status': 'degraded',
                'latency_ms': int((time.time() - start_time) * 1000),
                'message': '缺少 ultralytics 依赖',
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'name': 'YOLO 舌象检测模型',
                'status': 'unhealthy',
                'latency_ms': int((time.time() - start_time) * 1000),
                'message': str(e),
                'last_check': datetime.now().isoformat()
            }

    def _check_ml_models(self) -> dict:
        """检查证型 + 中药 ML 模型文件"""
        start_time = time.time()
        base = os.path.normpath(os.path.join(settings.BASE_DIR, '..', 'machinelearning'))
        paths = {
            '证型模型': os.path.join(base, 'tcm_syndrome_model', 'model.pkl'),
            '中药模型': os.path.join(base, 'tcm_herb_model',     'model.pkl'),
        }
        missing = []
        total_mb = 0.0
        for label, path in paths.items():
            if not os.path.exists(path):
                missing.append(label)
            else:
                total_mb += os.path.getsize(path) / (1024 * 1024)

        latency_ms = int((time.time() - start_time) * 1000)
        if missing:
            return {
                'name': 'ML 推理模型（证型 + 中药）',
                'status': 'unhealthy',
                'latency_ms': latency_ms,
                'message': f'文件缺失: {"、".join(missing)}',
                'last_check': datetime.now().isoformat()
            }
        return {
            'name': 'ML 推理模型（证型 + 中药）',
            'status': 'healthy',
            'latency_ms': latency_ms,
            'message': f'两个模型就绪（共 {total_mb:.1f} MB）',
            'last_check': datetime.now().isoformat()
        }

    def _check_llm_api(self) -> dict:
        """检查 LLM API 连通性（使用当前 DB 配置）"""
        start_time = time.time()
        try:
            from apps.adminops.models import AIConfig
            api_url = AIConfig.get('llm_api_url')
            api_key = AIConfig.get('llm_api_key')
            model   = AIConfig.get('llm_model_name')
        except Exception:
            api_url = 'https://api.siliconflow.cn/v1/chat/completions'
            api_key = ''
            model   = ''

        try:
            resp = requests.post(
                api_url,
                headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': 'ping'}],
                    'max_tokens': 5,
                    'enable_thinking': False,
                },
                timeout=10
            )
            latency_ms = int((time.time() - start_time) * 1000)
            if resp.status_code == 200:
                return {
                    'name': f'LLM API（{model.split("/")[-1] if "/" in model else model}）',
                    'status': 'healthy',
                    'latency_ms': latency_ms,
                    'message': '接口正常',
                    'last_check': datetime.now().isoformat()
                }
            else:
                err_msg = resp.json().get('message', f'HTTP {resp.status_code}')
                return {
                    'name': f'LLM API（{model.split("/")[-1] if "/" in model else model}）',
                    'status': 'unhealthy',
                    'latency_ms': latency_ms,
                    'message': err_msg,
                    'last_check': datetime.now().isoformat()
                }
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                'name': 'LLM API',
                'status': 'unhealthy',
                'latency_ms': latency_ms,
                'message': str(e)[:80],
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


class UserViewSet(viewsets.GenericViewSet):
    """
    用户管理接口
    GET /api/admin/users/
    POST /api/admin/users/
    GET /api/admin/users/{id}/
    PUT /api/admin/users/{id}/
    DELETE /api/admin/users/{id}/
    """
    queryset = User.objects.all()
    permission_classes = [IsAdmin]
    
    def list(self, request):
        """获取用户列表"""
        queryset = self.get_queryset()
        
        # 角色筛选
        role = request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        # 搜索
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | 
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        # 分页
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total = queryset.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        queryset = queryset[start:end]
        
        serializer = AdminUserSerializer(queryset, many=True)
        return Response({
            'items': serializer.data,
            'page': page,
            'page_size': page_size,
            'total': total
        })
    
    def create(self, request):
        """创建用户"""
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            AdminUserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    
    def retrieve(self, request, pk=None):
        """获取用户详情"""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': '用户不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)
    
    def update(self, request, pk=None):
        """更新用户"""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': '用户不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 更新字段
        updatable_fields = ['email', 'full_name', 'role', 'gender', 'age', 
                           'hospital', 'job_title', 'department', 'years_of_experience', 'is_active']
        for field in updatable_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
        
        # 更新密码
        if 'password' in request.data and request.data['password']:
            user.set_password(request.data['password'])
        
        user.save()
        return Response(AdminUserSerializer(user).data)
    
    def destroy(self, request, pk=None):
        """删除用户"""
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': '用户不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 不允许删除自己
        if user.id == request.user.id:
            return Response({'detail': '不能删除自己'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CaseViewSet(viewsets.GenericViewSet):
    """
    病例管理接口
    GET /api/admin/cases/
    GET /api/admin/cases/{id}/
    DELETE /api/admin/cases/{id}/
    """
    queryset = Case.objects.all()
    permission_classes = [IsAdmin]
    
    def list(self, request):
        """获取病例列表"""
        queryset = self.get_queryset()
        
        # 状态筛选
        case_status = request.query_params.get('status')
        if case_status:
            queryset = queryset.filter(status=case_status)
        
        # 搜索
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(patient__username__icontains=search) | 
                Q(patient__full_name__icontains=search) |
                Q(chief_complaint_text__icontains=search)
            )
        
        # 分页
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total = queryset.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        queryset = queryset[start:end]
        
        serializer = AdminCaseListSerializer(queryset, many=True)
        return Response({
            'items': serializer.data,
            'page': page,
            'page_size': page_size,
            'total': total
        })
    
    def retrieve(self, request, pk=None):
        """获取病例详情"""
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({'detail': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AdminCaseListSerializer(case)
        return Response(serializer.data)
    
    def destroy(self, request, pk=None):
        """删除病例"""
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({'detail': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        case.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StatisticsView(APIView):
    """
    系统统计接口
    GET /api/admin/statistics/
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        """获取系统统计数据"""
        # 用户统计
        user_stats = User.objects.values('role').annotate(count=Count('id'))
        users = {item['role']: item['count'] for item in user_stats}
        
        # 病例统计
        case_stats = Case.objects.values('status').annotate(count=Count('id'))
        cases = {item['status']: item['count'] for item in case_stats}
        
        # 今日新增
        today = datetime.now().date()
        today_users = User.objects.filter(date_joined__date=today).count()
        today_cases = Case.objects.filter(created_at__date=today).count()
        
        # 本周趋势
        trend = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            date_str = date.strftime('%m-%d')
            cases_count = Case.objects.filter(created_at__date=date).count()
            trend.append({'date': date_str, 'count': cases_count})
        
        return Response({
            'users': {
                'patient': users.get('patient', 0),
                'doctor': users.get('doctor', 0),
                'admin': users.get('admin', 0),
                'total': sum(users.values()),
            },
            'cases': {
                'draft': cases.get('draft', 0),
                'running': cases.get('running', 0),
                'pending_review': cases.get('pending_review', 0),
                'approved': cases.get('approved', 0),
                'rejected': cases.get('rejected', 0),
                'failed': cases.get('failed', 0),
                'total': sum(cases.values()),
            },
            'today': {
                'users': today_users,
                'cases': today_cases,
            },
            'trend': trend,
        })


class AuditLogView(APIView):
    """
    审计日志接口
    GET /api/admin/audit-logs/
    支持筛选：action, username, start_date, end_date
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.audit.models import AuditLog
        qs = AuditLog.objects.select_related('user', 'case').order_by('-created_at')

        # 筛选
        action = request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        username = request.query_params.get('username')
        if username:
            qs = qs.filter(user__username__icontains=username)

        start_date = request.query_params.get('start_date')
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)

        end_date = request.query_params.get('end_date')
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        # 分页
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total = qs.count()
        start = (page - 1) * page_size
        logs = qs[start:start + page_size]

        items = []
        for log in logs:
            items.append({
                'id': log.id,
                'user': log.user.username if log.user else '系统',
                'user_role': log.user.role if log.user else '',
                'action': log.action,
                'action_display': log.get_action_display(),
                'case_id': log.case_id,
                'details': log.details,
                'created_at': log.created_at.isoformat(),
            })

        return Response({
            'items': items,
            'total': total,
            'page': page,
            'page_size': page_size,
        })

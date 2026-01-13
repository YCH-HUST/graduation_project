"""
Views for cases app.
Updated to match frontend API contract.
"""
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Case, CaseAsset, Review
from .serializers import (
    CaseCreateSerializer, CaseListSerializer, CaseDetailSerializer,
    CaseAssetSerializer, ReviewCreateSerializer, ReviewSerializer,
    PipelineRunDetailSerializer
)
from apps.accounts.permissions import IsPatient, IsDoctor, IsCaseOwnerOrDoctorOrAdmin
from apps.audit.utils import log_action


class CaseViewSet(viewsets.GenericViewSet):
    """
    病例视图集
    """
    queryset = Case.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CaseCreateSerializer
        if self.action == 'list':
            return CaseListSerializer
        if self.action == 'retrieve':
            return CaseDetailSerializer
        if self.action == 'review':
            return ReviewCreateSerializer
        return CaseListSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsPatient()]
        if self.action in ['retrieve', 'list']:
            return [IsCaseOwnerOrDoctorOrAdmin()]
        if self.action == 'review':
            return [IsDoctor()]
        return [IsCaseOwnerOrDoctorOrAdmin()]
    
    def create(self, request):
        """
        POST /api/cases/
        患者创建病例
        """
        serializer = CaseCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        case = serializer.save()
        
        # 记录审计日志
        log_action(user=request.user, action='case_create', case=case)
        
        # 返回数字格式的 case_id（前端期望）
        return Response({'case_id': case.id.int if hasattr(case.id, 'int') else str(case.id)}, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, pk=None):
        """
        GET /api/cases/{id}/
        获取病例详情 - 匹配前端契约格式
        """
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({'detail': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 检查权限
        self.check_object_permissions(request, case)
        
        # 构建 case 数据
        case_serializer = CaseDetailSerializer(case, context={'request': request})
        
        # 构建 latest_run 数据
        latest_run = case.pipeline_runs.order_by('-created_at').first()
        latest_run_data = None
        if latest_run:
            latest_run_data = PipelineRunDetailSerializer(latest_run).data
        
        # 构建 assets 数据
        assets_serializer = CaseAssetSerializer(
            case.assets.all(), 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'case': case_serializer.data,
            'latest_run': latest_run_data,
            'assets': assets_serializer.data
        })
    
    def list(self, request):
        """
        GET /api/cases?status=pending_review&page=1&page_size=10&search=关键词
        查询病例列表 - 支持 search 参数
        """
        user = request.user
        queryset = Case.objects.all()
        
        # 患者只能看自己的病例
        if user.role == 'patient':
            queryset = queryset.filter(patient=user)
        
        # 按状态过滤
        status_filter = request.query_params.get('status')
        if status_filter:
            if status_filter == 'pending':
                queryset = queryset.filter(status='pending_review')
            else:
                queryset = queryset.filter(status=status_filter)
        
        # 搜索功能
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(chief_complaint_text__icontains=search) |
                Q(patient__username__icontains=search) |
                Q(patient__full_name__icontains=search)
            )
        
        # 分页
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CaseListSerializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            return Response({
                'items': response.data['results'],
                'page': int(request.query_params.get('page', 1)),
                'page_size': self.paginator.page_size,
                'total': response.data['count']
            })
        
        serializer = CaseListSerializer(queryset, many=True)
        return Response({
            'items': serializer.data,
            'page': 1,
            'page_size': len(serializer.data),
            'total': len(serializer.data)
        })
    
    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        """
        POST /api/cases/{id}/review/
        医生审核病例 - 兼容 approve/reject/revise
        """
        try:
            case = Case.objects.get(pk=pk)
        except Case.DoesNotExist:
            return Response({'detail': '病例不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 检查病例状态
        if case.status != 'pending_review':
            return Response({'detail': '该病例当前状态不可审核'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        decision = data['decision']
        
        # 处理前端字段名
        edited_syndromes = data.get('edited_syndromes') or data.get('edited_syndrome_json') or {}
        edited_formulas = data.get('edited_formulas') or data.get('edited_prescription_json') or {}
        
        # 创建审核记录
        review = Review.objects.create(
            case=case,
            doctor=request.user,
            decision=decision,
            edited_syndrome_json=edited_syndromes,
            edited_prescription_json=edited_formulas,
            note=data.get('note', '')
        )
        
        # 更新病例状态
        case.status = decision
        case.save()
        
        # 记录审计日志
        action_type = 'review_approve' if decision == 'approved' else 'review_reject'
        log_action(user=request.user, action=action_type, case=case)
        
        return Response({'ok': True})

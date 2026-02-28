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
from apps.notifications.utils import notify_doctors_new_case, notify_patient_case_reviewed
from apps.followups.models import MedicationPlan


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
        
        # 通知所有医生有新病例待审核
        notify_doctors_new_case(case)
        
        # 返回字符串格式的 case_id (UUID)
        return Response({'case_id': str(case.id)}, status=status.HTTP_201_CREATED)
    
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
        
        # 最新审核记录（含医生修订数据）
        latest_review = case.reviews.order_by('-created_at').first()
        latest_review_data = None
        if latest_review:
            latest_review_data = ReviewSerializer(latest_review).data

        return Response({
            'case': case_serializer.data,
            'latest_run': latest_run_data,
            'assets': assets_serializer.data,
            'latest_review': latest_review_data,
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
        
        # 按状态过滤 - 支持逗号分隔的多状态
        status_filter = request.query_params.get('status')
        if status_filter:
            if status_filter == 'pending':
                # 兼容旧的前端逻辑
                queryset = queryset.filter(status='pending_review')
            elif ',' in status_filter:
                # 支持多状态筛选
                statuses = status_filter.split(',')
                queryset = queryset.filter(status__in=statuses)
            else:
                queryset = queryset.filter(status=status_filter)
        
        # 日期范围过滤
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
            
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
        if case.status not in ['pending_review', 'approved']:
            return Response({'detail': '该病例当前状态不可审核'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        decision = data['decision']

        # 如果病例已通过，仅允许修订
        if case.status == 'approved' and decision != 'revise':
            return Response({'detail': '已通过的病例仅允许进行修订'}, status=status.HTTP_400_BAD_REQUEST)
        
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
        final_status = decision
        if decision == 'revise':
            final_status = 'approved'
            
        case.status = final_status
        case.save()
        
        # 记录审计日志
        if decision in ['approved', 'revise']:
            action_type = 'review_approve'
        else:
            action_type = 'review_reject'
        log_action(user=request.user, action=action_type, case=case)
        
        # 通知患者审核结果
        notify_patient_case_reviewed(case, decision, request.user)
        
        # 审核通过/修订时自动创建用药计划
        if decision in ['approved', 'revise']:
            MedicationPlan.objects.get_or_create(
                case=case,
                defaults={'patient': case.patient, 'is_active': True}
            )
        
        return Response({'ok': True})

    @action(detail=False, methods=['get'], url_path='patient-history/(?P<patient_id>[^/.]+)')
    def patient_history(self, request, patient_id=None):
        """
        GET /api/cases/patient-history/<patient_id>/
        获取指定患者的历史已审批病例数据（用于病程对比）
        """
        cases = Case.objects.filter(
            patient_id=patient_id,
            status='approved'
        ).order_by('created_at')

        history = []
        for c in cases:
            run = c.pipeline_runs.filter(status='success').order_by('-created_at').first()
            if not run:
                continue

            inference = run.inference_result_json or {}
            syndromes = []
            for s in inference.get('syndromes', []):
                syndromes.append({
                    'name': s.get('name', ''),
                    'score': round(s.get('confidence', 0), 4),
                })

            history.append({
                'case_id': str(c.id),
                'date': c.created_at.strftime('%Y-%m-%d'),
                'syndromes': syndromes,
            })

        return Response(history)

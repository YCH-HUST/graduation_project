"""
Patient management views for doctors.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q

from apps.accounts.models import User
from apps.cases.models import Case
from apps.audit.utils import log_action
from .serializers import (
    PatientListSerializer,
    PatientDetailSerializer,
    PatientCreateSerializer,
    PatientUpdateSerializer,
    PatientCaseSerializer,
)


class PatientListCreateView(APIView):
    """
    患者列表和创建
    GET /api/doctor/patients/ - 获取患者列表
    POST /api/doctor/patients/ - 创建新患者
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """获取患者列表（支持分页和搜索）"""
        # 验证是否为医生
        if request.user.role != 'doctor':
            return Response({'detail': '仅医生可访问此接口'}, status=status.HTTP_403_FORBIDDEN)
        
        # 获取查询参数
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        search = request.query_params.get('search', '').strip()
        
        # 查询所有患者用户
        queryset = User.objects.filter(role='patient').annotate(
            case_count=Count('cases')
        ).order_by('-date_joined')
        
        # 搜索
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        # 分页
        total = queryset.count()
        offset = (page - 1) * page_size
        patients = queryset[offset:offset + page_size]
        
        return Response({
            'items': PatientListSerializer(patients, many=True).data,
            'page': page,
            'page_size': page_size,
            'total': total,
        })
    
    def post(self, request):
        """创建新患者"""
        # 验证是否为医生
        if request.user.role != 'doctor':
            return Response({'detail': '仅医生可访问此接口'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = PatientCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        
        # 记录操作日志
        log_action(
            user=request.user,
            action='create_patient',
            details={'patient_id': patient.id, 'username': patient.username}
        )
        
        return Response(
            PatientListSerializer(patient).data,
            status=status.HTTP_201_CREATED
        )


class PatientDetailView(APIView):
    """
    患者详情、更新和删除
    GET /api/doctor/patients/{id}/ - 获取患者详情
    PUT /api/doctor/patients/{id}/ - 更新患者信息
    DELETE /api/doctor/patients/{id}/ - 删除患者
    """
    permission_classes = [IsAuthenticated]
    
    def get_patient(self, pk):
        """获取患者对象"""
        try:
            return User.objects.get(pk=pk, role='patient')
        except User.DoesNotExist:
            return None
    
    def get(self, request, pk):
        """获取患者详情及病例历史"""
        # 验证是否为医生
        if request.user.role != 'doctor':
            return Response({'detail': '仅医生可访问此接口'}, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_patient(pk)
        if not patient:
            return Response({'detail': '患者不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        # 获取患者的病例列表
        cases = Case.objects.filter(patient=patient).order_by('-created_at')
        
        return Response({
            'patient': PatientDetailSerializer(patient).data,
            'cases': PatientCaseSerializer(cases, many=True).data,
        })
    
    def put(self, request, pk):
        """更新患者信息"""
        # 验证是否为医生
        if request.user.role != 'doctor':
            return Response({'detail': '仅医生可访问此接口'}, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_patient(pk)
        if not patient:
            return Response({'detail': '患者不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = PatientUpdateSerializer(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # 记录操作日志
        log_action(
            user=request.user,
            action='update_patient',
            details={'patient_id': patient.id, 'fields': list(request.data.keys())}
        )
        
        return Response(PatientDetailSerializer(patient).data)
    
    def delete(self, request, pk):
        """删除患者"""
        # 验证是否为医生
        if request.user.role != 'doctor':
            return Response({'detail': '仅医生可访问此接口'}, status=status.HTTP_403_FORBIDDEN)
        
        patient = self.get_patient(pk)
        if not patient:
            return Response({'detail': '患者不存在'}, status=status.HTTP_404_NOT_FOUND)
        
        patient_info = {'patient_id': patient.id, 'username': patient.username}
        patient.delete()
        
        # 记录操作日志
        log_action(
            user=request.user,
            action='delete_patient',
            details=patient_info
        )
        
        return Response({'ok': True})

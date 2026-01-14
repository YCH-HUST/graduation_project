"""
Views for doctors API - 医生列表接口
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User
from .serializers import DoctorListSerializer


class DoctorListView(APIView):
    """
    获取医生列表
    GET /api/doctors/
    支持按科室筛选: ?department=internal
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # 获取所有医生
        queryset = User.objects.filter(role='doctor')
        
        # 按科室筛选
        department = request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        
        # 序列化返回
        serializer = DoctorListSerializer(queryset, many=True)
        return Response({
            'doctors': serializer.data,
            'total': queryset.count()
        })

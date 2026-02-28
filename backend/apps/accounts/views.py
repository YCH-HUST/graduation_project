"""
Views for accounts app.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer, ProfileUpdateSerializer
from apps.audit.utils import log_action


class LoginView(APIView):
    """
    用户登录接口
    POST /auth/login/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # 生成 JWT token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # 记录登录日志
        log_action(user=user, action='login', details={'ip': self.get_client_ip(request)})
        
        return Response({
            'token': access_token,
            'refresh': str(refresh),
            'role': user.role,
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    def get_client_ip(self, request):
        """获取客户端 IP"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '')


class RegisterView(APIView):
    """
    用户注册接口
    POST /auth/register/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        # 生成 JWT token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        return Response({
            'token': access_token,
            'role': user.role,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    """
    个人资料接口
    GET /api/profile/ - 获取当前用户资料
    PUT /api/profile/ - 更新当前用户资料
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """获取当前用户资料"""
        return Response(UserSerializer(request.user).data)
    
    def put(self, request):
        """更新当前用户资料"""
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # 记录操作日志
        log_action(user=request.user, action='update_profile', details={'fields': list(request.data.keys())})
        
        return Response(UserSerializer(request.user).data)


class RecentPatientsView(APIView):
    """
    医生最近患者列表
    GET /api/doctor/recent-patients/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """获取医生最近接诊的患者列表"""
        from apps.cases.models import Case
        
        # 验证是否为医生
        if request.user.role != 'doctor':
            return Response({'detail': '仅医生可访问此接口'}, status=status.HTTP_403_FORBIDDEN)
        
        # 获取最近审核过的病例（按更新时间倒序）
        recent_cases = Case.objects.filter(
            reviews__doctor=request.user
        ).select_related('patient').order_by('-updated_at').distinct()[:10]
        
        # 构建患者列表
        patients = []
        seen_patient_ids = set()
        for case in recent_cases:
            if case.patient_id not in seen_patient_ids:
                seen_patient_ids.add(case.patient_id)
                patients.append({
                    'id': case.patient.id,
                    'username': case.patient.username,
                    'full_name': case.patient.full_name or case.patient.username,
                    'case_id': case.id,
                    'case_status': case.status,
                    'chief_complaint': case.chief_complaint_text[:50] if case.chief_complaint_text else '',
                    'created_at': case.created_at.isoformat(),
                })
        
        return Response({
            'patients': patients,
            'total': len(patients)
        })


class ChangePasswordView(APIView):
    """
    修改密码接口
    POST /api/change-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not user.check_password(old_password):
            return Response({'detail': '原密码不正确'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'detail': '新密码长度不能少于 6 位'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'detail': '两次输入的密码不一致'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        log_action(user=user, action='change_password', details={})

        return Response({'detail': '密码修改成功'})


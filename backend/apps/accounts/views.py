"""
Views for accounts app.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
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

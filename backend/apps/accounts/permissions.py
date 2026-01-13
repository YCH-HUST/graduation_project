"""
Permission classes for role-based access control.
"""
from rest_framework.permissions import BasePermission


class IsPatient(BasePermission):
    """
    只允许患者角色访问
    """
    message = '只有患者可以执行此操作'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'


class IsDoctor(BasePermission):
    """
    只允许医生角色访问
    """
    message = '只有医生可以执行此操作'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'


class IsAdmin(BasePermission):
    """
    只允许管理员角色访问
    """
    message = '只有管理员可以执行此操作'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsPatientOrDoctorOrAdmin(BasePermission):
    """
    允许患者、医生或管理员访问
    """
    message = '需要登录后才能访问'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsCaseOwnerOrDoctorOrAdmin(BasePermission):
    """
    允许病例所有者（患者）、医生或管理员访问
    用于病例详情和流水线操作
    """
    message = '您没有权限访问此病例'
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        # 管理员可以访问所有
        if user.role == 'admin':
            return True
        # 医生可以访问所有
        if user.role == 'doctor':
            return True
        # 患者只能访问自己的病例
        if user.role == 'patient':
            return obj.patient == user
        return False

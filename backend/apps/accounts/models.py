"""
User model with role field.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    扩展的用户模型，添加角色字段
    """
    ROLE_CHOICES = [
        ('patient', '患者'),
        ('doctor', '医生'),
        ('admin', '管理员'),
    ]
    
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='patient',
        verbose_name='角色'
    )
    full_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='姓名'
    )
    
    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
        db_table = 'auth_user'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_patient(self):
        return self.role == 'patient'
    
    @property
    def is_doctor(self):
        return self.role == 'doctor'
    
    @property
    def is_admin_user(self):
        return self.role == 'admin'

"""
Audit log model.
"""
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    审计日志模型
    记录关键业务操作：登录、病例创建、流水线启动、医生审核
    """
    ACTION_CHOICES = [
        ('login', '用户登录'),
        ('case_create', '创建病例'),
        ('pipeline_start', '启动流水线'),
        ('review_approve', '审核通过'),
        ('review_reject', '审核驳回'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        verbose_name='操作用户'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        verbose_name='操作类型'
    )
    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='关联病例'
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='详细信息'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='操作时间'
    )
    
    class Meta:
        verbose_name = '审计日志'
        verbose_name_plural = '审计日志'
        ordering = ['-created_at']
        db_table = 'audit_log'
    
    def __str__(self):
        username = self.user.username if self.user else '未知用户'
        return f"{username} - {self.get_action_display()} - {self.created_at}"

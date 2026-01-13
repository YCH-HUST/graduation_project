"""
Notification models.
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    通知模型
    """
    TYPE_CHOICES = [
        ('new_case', '新病例待审'),
        ('case_approved', '病例已通过'),
        ('case_rejected', '病例已驳回'),
        ('system', '系统公告'),
    ]
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='接收者'
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name='通知类型'
    )
    title = models.CharField(
        max_length=100,
        verbose_name='标题'
    )
    content = models.TextField(
        blank=True,
        default='',
        verbose_name='内容'
    )
    related_case = models.ForeignKey(
        'cases.Case',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='关联病例'
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name='已读'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '通知'
        verbose_name_plural = '通知'
        ordering = ['-created_at']
        db_table = 'notification'
    
    def __str__(self):
        return f"{self.recipient.username} - {self.title}"

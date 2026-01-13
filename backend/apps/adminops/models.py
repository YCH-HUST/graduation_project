"""
Models for adminops app.
Data governance models for managing synonyms, tags, templates, and blacklists.
"""
from django.db import models
from django.conf import settings


class GovernanceItem(models.Model):
    """
    数据治理项目模型
    支持类型：synonym（同义词）、tag（标签）、template（模板）、blacklist（黑名单）
    """
    TYPE_CHOICES = [
        ('synonym', '同义词'),
        ('tag', '标签'),
        ('template', '模板'),
        ('blacklist', '黑名单'),
    ]
    
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name='类型'
    )
    value = models.TextField(
        verbose_name='内容'
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name='描述'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='governance_items',
        verbose_name='创建者'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '数据治理项'
        verbose_name_plural = '数据治理项'
        ordering = ['-created_at']
        db_table = 'governance_item'
    
    def __str__(self):
        return f"{self.get_type_display()}: {self.value[:50]}"

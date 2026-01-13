"""
PipelineRun model.
"""
from django.db import models
from apps.cases.models import Case


class PipelineRun(models.Model):
    """
    流水线运行记录
    """
    STATUS_CHOICES = [
        ('queued', '排队中'),
        ('running', '运行中'),
        ('success', '成功'),
        ('failed', '失败'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='pipeline_runs',
        verbose_name='病例'
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='queued',
        verbose_name='状态'
    )
    progress = models.IntegerField(
        default=0,
        verbose_name='进度 (0-100)'
    )
    yolo_result_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='YOLO 推理结果'
    )
    nlp_result_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='NLP 解析结果'
    )
    inference_result_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='辨证推理结果'
    )
    explanation_text = models.TextField(
        blank=True,
        default='',
        verbose_name='解释文本'
    )
    timing_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='各阶段耗时'
    )
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name='错误信息'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '流水线运行'
        verbose_name_plural = '流水线运行'
        ordering = ['-created_at']
        db_table = 'pipeline_run'
    
    def __str__(self):
        return f"Pipeline {self.id} - {self.case.id} - {self.status}"

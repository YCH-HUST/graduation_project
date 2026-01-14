"""
Models for cases app.
"""
import uuid
from django.db import models
from django.conf import settings


def case_asset_upload_path(instance, filename):
    """生成病例资源的上传路径"""
    return f'cases/{instance.case.id}/{instance.type}/{filename}'


class Case(models.Model):
    """
    病例模型
    """
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('running', '运行中'),
        ('pending_review', '待审核'),
        ('approved', '已通过'),
        ('rejected', '已驳回'),
        ('failed', '失败'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cases',
        verbose_name='患者'
    )
    assigned_doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cases',
        verbose_name='主诊医生'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='状态'
    )
    chief_complaint_text = models.TextField(
        blank=True,
        default='',
        verbose_name='主诉'
    )
    questionnaire_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='问诊问卷'
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
        verbose_name = '病例'
        verbose_name_plural = '病例'
        ordering = ['-created_at']
        db_table = 'case'
    
    def __str__(self):
        return f"病例 {self.id} - {self.patient.username}"


class CaseAsset(models.Model):
    """
    病例资源模型（图片等）
    """
    TYPE_CHOICES = [
        ('raw_image', '原始图像'),
        ('mask', '分割掩码'),
        ('heatmap', '热力图'),
        ('annotated', '标注图像'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='assets',
        verbose_name='病例'
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        verbose_name='资源类型'
    )
    file = models.FileField(
        upload_to=case_asset_upload_path,
        verbose_name='文件'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '病例资源'
        verbose_name_plural = '病例资源'
        ordering = ['-created_at']
        db_table = 'case_asset'
    
    def __str__(self):
        return f"{self.case.id} - {self.get_type_display()}"
    
    @property
    def url(self):
        if self.file:
            return self.file.url
        return None


class Review(models.Model):
    """
    审核记录模型
    """
    DECISION_CHOICES = [
        ('approved', '通过'),
        ('rejected', '驳回'),
        ('revise', '修订通过'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='病例'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='审核医生'
    )
    decision = models.CharField(
        max_length=10,
        choices=DECISION_CHOICES,
        verbose_name='审核决定'
    )
    edited_syndrome_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='修改后的证候'
    )
    edited_prescription_json = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='修改后的处方'
    )
    note = models.TextField(
        blank=True,
        default='',
        verbose_name='审核备注'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='审核时间'
    )
    
    class Meta:
        verbose_name = '审核记录'
        verbose_name_plural = '审核记录'
        ordering = ['-created_at']
        db_table = 'review'
    
    def __str__(self):
        return f"{self.case.id} - {self.doctor.username} - {self.get_decision_display()}"

"""
Models for followups app — 用药随访.
"""
from django.db import models
from django.conf import settings


class MedicationPlan(models.Model):
    """
    用药计划 — 当病例审核通过（approved / revise）时自动创建
    """
    case = models.OneToOneField(
        'cases.Case',
        on_delete=models.CASCADE,
        related_name='medication_plan',
        verbose_name='关联病例'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='medication_plans',
        verbose_name='患者'
    )
    is_active = models.BooleanField(default=True, verbose_name='是否激活')
    end_date = models.DateField(null=True, blank=True, verbose_name='计划结束日期')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '用药计划'
        verbose_name_plural = '用药计划'
        ordering = ['-created_at']
        db_table = 'medication_plan'

    def __str__(self):
        return f"用药计划 - 病例 {self.case_id} ({self.patient})"


class MedicationLog(models.Model):
    """
    用药打卡记录 — 患者每日分时段打卡 + 反馈
    """
    SLOT_CHOICES = [
        ('morning', '晨间'),
        ('afternoon', '午后'),
        ('evening', '晚间'),
    ]

    plan = models.ForeignKey(
        MedicationPlan,
        on_delete=models.CASCADE,
        related_name='logs',
        verbose_name='用药计划'
    )
    date = models.DateField(verbose_name='日期')
    slot = models.CharField(max_length=10, choices=SLOT_CHOICES, verbose_name='时段')
    taken = models.BooleanField(default=False, verbose_name='是否已服药')
    feedback = models.TextField(blank=True, default='', verbose_name='主观反馈')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '用药记录'
        verbose_name_plural = '用药记录'
        ordering = ['-date', 'slot']
        db_table = 'medication_log'
        unique_together = ['plan', 'date', 'slot']

    def __str__(self):
        return f"{self.date} {self.get_slot_display()} - {'已服' if self.taken else '未服'}"

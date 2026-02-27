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


# ─── AI 配置模型 ───────────────────────────────────────────────────────────────

# 默认配置值（首次初始化时写入数据库）
AI_CONFIG_DEFAULTS = {
    'llm_api_key': 'sk-rypfxvahaesmyaaloeevjgdszblhavnlstinhixzomntfnxt',
    'llm_model_name': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    'llm_api_url': 'https://api.siliconflow.cn/v1/chat/completions',
    'llm_temperature': '0.2',
    'prompt_symptom_extract_system': (
        "你是一名中医诊疗助手，负责从患者主诉和现病史中提取标准化中医症状。\n"
        "规则：\n"
        "1. 只能从以下症状词典中选择词条，不得自己创造新词：\n"
        "【症状词典】{symptom_list}\n"
        "2. 严格返回 JSON 格式，格式为：{\"symptoms\": [\"症状1\", \"症状2\", ...]}\n"
        "3. 只返回 JSON，不要有任何其他内容或解释。\n"
        "4. 如果找不到匹配的症状，返回：{\"symptoms\": []}"
    ),
    'prompt_analysis_system': (
        "你是一名资深中医师，请根据以下患者信息给出简洁的综合诊疗分析。\n"
        "输出格式（严格按此结构）：\n"
        "【证候分析】\n"
        "逐条说明主要证候及其辨证依据，每条不超过2句。\n\n"
        "【推荐用药】\n"
        "列出主要推荐药物及其功效，简明扼要，每味药一行。\n\n"
        "【调护建议】\n"
        "给出3条生活调护建议，面向患者，语言通俗易懂。\n\n"
        "注意：语言简洁专业，总字数不超过500字。"
    ),
}


class AIConfig(models.Model):
    """
    AI 流水线动态配置
    Key-value 形式存储 LLM 配置、Prompt 模版等，支持运行时热更新。
    """
    key = models.CharField(
        max_length=100,
        unique=True,
        verbose_name='配置键'
    )
    value = models.TextField(
        verbose_name='配置值'
    )
    description = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name='描述'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_config_updates',
        verbose_name='最后修改者'
    )

    class Meta:
        verbose_name = 'AI 配置'
        verbose_name_plural = 'AI 配置'
        db_table = 'ai_config'

    def __str__(self):
        return f"{self.key} = {self.value[:40]}"

    @classmethod
    def get(cls, key: str, default: str = '') -> str:
        """获取配置值，若不存在则返回 default"""
        try:
            obj = cls.objects.get(key=key)
            return obj.value
        except cls.DoesNotExist:
            return AI_CONFIG_DEFAULTS.get(key, default)

    @classmethod
    def set(cls, key: str, value: str, user=None) -> 'AIConfig':
        """设置配置值，不存在则创建"""
        obj, _ = cls.objects.update_or_create(
            key=key,
            defaults={'value': value, 'updated_by': user}
        )
        return obj

    @classmethod
    def get_all(cls) -> dict:
        """返回全部配置（DB 优先，缺失键用默认值补全）"""
        db_configs = {c.key: c.value for c in cls.objects.all()}
        result = dict(AI_CONFIG_DEFAULTS)
        result.update(db_configs)
        return result


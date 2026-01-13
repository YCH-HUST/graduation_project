"""
Pipeline app configuration.
"""
from django.apps import AppConfig


class PipelineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.pipeline'
    verbose_name = '流水线管理'

"""
Adminops app configuration.
"""
from django.apps import AppConfig


class AdminopsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.adminops'
    verbose_name = '管理员操作'

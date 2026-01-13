"""
Admin configuration for pipeline app.
"""
from django.contrib import admin
from .models import PipelineRun


@admin.register(PipelineRun)
class PipelineRunAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'status', 'progress', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['case__id']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']

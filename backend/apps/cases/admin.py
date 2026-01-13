"""
Admin configuration for cases app.
"""
from django.contrib import admin
from .models import Case, CaseAsset, Review


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'patient__username', 'chief_complaint_text']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(CaseAsset)
class CaseAssetAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'type', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['case__id']
    ordering = ['-created_at']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'doctor', 'decision', 'created_at']
    list_filter = ['decision', 'created_at']
    search_fields = ['case__id', 'doctor__username']
    ordering = ['-created_at']

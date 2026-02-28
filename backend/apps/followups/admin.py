from django.contrib import admin
from .models import MedicationPlan, MedicationLog

@admin.register(MedicationPlan)
class MedicationPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'case', 'patient', 'is_active', 'created_at']
    list_filter = ['is_active']

@admin.register(MedicationLog)
class MedicationLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'plan', 'date', 'slot', 'taken', 'created_at']
    list_filter = ['date', 'slot', 'taken']

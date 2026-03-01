"""
Serializers for followups app.
"""
from rest_framework import serializers
from .models import MedicationPlan, MedicationLog


class MedicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationLog
        fields = ['id', 'plan', 'date', 'slot', 'taken', 'feedback', 'created_at']
        read_only_fields = ['id', 'created_at']


class MedicationPlanSerializer(serializers.ModelSerializer):
    logs = MedicationLogSerializer(many=True, read_only=True)
    case_id = serializers.UUIDField(source='case.id', read_only=True)
    patient_id = serializers.IntegerField(source='patient.id', read_only=True)

    class Meta:
        model = MedicationPlan
        fields = ['id', 'case_id', 'patient_id', 'is_active', 'end_date', 'created_at', 'logs']
        read_only_fields = ['id', 'created_at']

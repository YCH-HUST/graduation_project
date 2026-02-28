"""
Views for followups app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import MedicationPlan, MedicationLog
from .serializers import MedicationPlanSerializer, MedicationLogSerializer


class MedicationPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """用药计划 ViewSet — 只读 + current 动作"""
    serializer_class = MedicationPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MedicationPlan.objects.filter(patient=self.request.user)

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """GET /api/followups/plans/current/ — 获取当前激活的用药计划"""
        plan = MedicationPlan.objects.filter(
            patient=request.user,
            is_active=True
        ).order_by('-created_at').first()

        if not plan:
            return Response(
                {'detail': '暂无激活的用药计划'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(plan)
        return Response(serializer.data)


class MedicationLogViewSet(viewsets.ModelViewSet):
    """用药记录 ViewSet"""
    serializer_class = MedicationLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MedicationLog.objects.filter(plan__patient=self.request.user)

    def perform_create(self, serializer):
        serializer.save()

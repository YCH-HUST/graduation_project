"""
Views for followups app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import MedicationPlan, MedicationLog
from .serializers import MedicationPlanSerializer, MedicationLogSerializer


class MedicationPlanViewSet(viewsets.ModelViewSet):
    """用药计划 ViewSet"""
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

    def create(self, request, *args, **kwargs):
        plan_id = request.data.get('plan')
        date = request.data.get('date')
        slot = request.data.get('slot')
        
        if plan_id and date and slot:
            from .models import MedicationPlan
            try:
                plan = MedicationPlan.objects.get(id=plan_id, patient=request.user)
            except MedicationPlan.DoesNotExist:
                return Response({'detail': '计划不存在或无权访问'}, status=status.HTTP_404_NOT_FOUND)
            
            taken = request.data.get('taken', False)
            feedback = request.data.get('feedback', '')
            
            # 使用 update_or_create 避免重复打卡时的唯一性冲突 (400错误)
            log, created = MedicationLog.objects.update_or_create(
                plan=plan,
                date=date,
                slot=slot,
                defaults={'taken': taken, 'feedback': feedback}
            )
            
            # 如果有反馈留言，自动通知负责评估该病例的医生
            if feedback:
                try:
                    latest_review = plan.case.reviews.latest('created_at')
                    doctor = latest_review.doctor
                    
                    from apps.notifications.models import Notification
                    Notification.objects.create(
                        recipient=doctor,
                        type='system',
                        title='患者发送了新用药反馈',
                        content=f"患者 {request.user.full_name or request.user.username} 提交了新的用药反馈：\n{feedback}",
                        related_case=plan.case
                    )
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"发送用药反馈通知失败: {e}")

            serializer = self.get_serializer(log)
            return Response(
                serializer.data, 
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
            
        return super().create(request, *args, **kwargs)

"""
Notification utility functions.
"""
from apps.accounts.models import User
from apps.notifications.models import Notification


def create_notification(
    recipient: User,
    notification_type: str,
    title: str,
    content: str = '',
    related_case=None
):
    """
    创建通知
    
    Args:
        recipient: 接收者用户
        notification_type: 通知类型 (new_case, case_approved, case_rejected, system)
        title: 标题
        content: 内容
        related_case: 关联的病例对象（可选）
    """
    return Notification.objects.create(
        recipient=recipient,
        type=notification_type,
        title=title,
        content=content,
        related_case=related_case
    )


def notify_doctors_new_case(case):
    """
    通知所有医生有新病例待审核
    """
    doctors = User.objects.filter(role='doctor', is_active=True)
    patient_name = case.patient.full_name or case.patient.username
    
    notifications = []
    for doctor in doctors:
        notifications.append(
            Notification(
                recipient=doctor,
                type='new_case',
                title='新病例待审核',
                content=f'患者 {patient_name} 提交了新病例，请及时审核。',
                related_case=case
            )
        )
    
    if notifications:
        Notification.objects.bulk_create(notifications)
        # bulk_create 不会触发 post_save signal，需手动触发缓存更新以推送 SSE
        from django.core.cache import cache
        import time
        for doctor in doctors:
            cache.set(f'unread_update_{doctor.id}', time.time(), timeout=None)


def notify_patient_case_reviewed(case, decision, doctor):
    """
    通知患者病例审核结果
    """
    patient = case.patient
    doctor_name = doctor.full_name or doctor.username
    
    if decision == 'approved':
        title = '病例已通过审核'
        content = f'您的病例已被 {doctor_name} 医生审核通过，请查看最终诊疗结果。'
        notification_type = 'case_approved'
    elif decision == 'revise':
        title = '医生已修订您的诊断结果'
        content = f'{doctor_name} 医生对您的病例进行了修订，已确认最终证候和处方，请查看详情。'
        notification_type = 'case_approved'
    else:
        title = '病例审核未通过'
        content = f'您的病例未通过 {doctor_name} 医生的审核，请查看详情。'
        notification_type = 'case_rejected'
    
    create_notification(
        recipient=patient,
        notification_type=notification_type,
        title=title,
        content=content,
        related_case=case
    )

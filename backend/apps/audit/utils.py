"""
Audit logging utility functions.
"""
from .models import AuditLog


def log_action(user, action, case=None, details=None):
    """
    记录审计日志
    
    Args:
        user: 操作用户
        action: 操作类型 (login, case_create, pipeline_start, review_approve, review_reject)
        case: 关联病例（可选）
        details: 额外详情（可选）
    """
    AuditLog.objects.create(
        user=user,
        action=action,
        case=case,
        details=details or {}
    )

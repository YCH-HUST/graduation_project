"""
自定义 DRF 异常处理器
将所有未处理异常统一返回 JSON，避免 Django 返回 HTML 错误页
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    自定义异常处理：
    - 先尝试 DRF 默认处理
    - 若未处理（如 500），返回标准 JSON 响应
    """
    # 调用 DRF 默认处理
    response = exception_handler(exc, context)

    if response is None:
        # DRF 未处理（通常是 500 级别异常）
        logger.error(
            "Unhandled exception in %s.%s: %s",
            context.get('view').__class__.__name__ if context.get('view') else 'unknown',
            context.get('request').method if context.get('request') else 'unknown',
            str(exc),
            exc_info=True,
        )
        response = Response(
            {'detail': '服务器内部错误，请稍后重试', 'error': str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response

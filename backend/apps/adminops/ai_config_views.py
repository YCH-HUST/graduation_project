"""
Admin AI Config and ML Model Management Views
GET/PUT  /api/admin/ai-config/       — 读写 AI 配置
POST     /api/admin/ai-config/test-llm/ — 测试 LLM 连接
GET      /api/admin/ml-models/        — 列出 ML 模型文件信息
POST     /api/admin/ml-models/{type}/ — 上传替换 ML 模型文件
"""
import os
import json
import requests as http_requests
from datetime import datetime

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from apps.accounts.permissions import IsAdmin
from apps.adminops.models import AIConfig

# ─── 模型文件路径映射 ────────────────────────────────────────────────────────
BASE = os.path.normpath(os.path.join(settings.BASE_DIR, '..'))

ML_MODEL_PATHS = {
    'yolo': {
        'label': 'YOLO 舌象检测模型',
        'path': os.path.join(settings.BASE_DIR, 'models', 'yolo', 'best.pt'),
        'ext': '.pt',
    },
    'syndrome': {
        'label': '证型预测模型',
        'path': os.path.join(BASE, 'machinelearning', 'tcm_syndrome_model', 'model.pkl'),
        'ext': '.pkl',
    },
    'herb': {
        'label': '中药预测模型',
        'path': os.path.join(BASE, 'machinelearning', 'tcm_herb_model', 'model.pkl'),
        'ext': '.pkl',
    },
}

# 敏感键（返回时遮蔽部分内容）
SENSITIVE_KEYS = {'llm_api_key'}

# AI 配置字段描述
CONFIG_DESCRIPTIONS = {
    'llm_api_key':                    'LLM API 密钥',
    'llm_model_name':                 'LLM 模型名称',
    'llm_api_url':                    'LLM API 地址',
    'llm_temperature':                'LLM Temperature（0-1）',
    'prompt_symptom_extract_system':  '症状提取 System Prompt',
    'prompt_analysis_system':         '综合分析 System Prompt',
}


def _mask_key(value: str) -> str:
    """遮蔽 API Key 中间部分，仅显示前6后4位"""
    if len(value) <= 10:
        return '***'
    return value[:6] + '*' * (len(value) - 10) + value[-4:]


class AIConfigView(APIView):
    """AI 配置读写接口"""
    permission_classes = [IsAdmin]

    def get(self, request):
        """GET /api/admin/ai-config/ — 返回所有配置（API Key 遮蔽）"""
        all_conf = AIConfig.get_all()
        result = []
        for key, value in all_conf.items():
            result.append({
                'key': key,
                'value': _mask_key(value) if key in SENSITIVE_KEYS else value,
                'description': CONFIG_DESCRIPTIONS.get(key, ''),
                'is_sensitive': key in SENSITIVE_KEYS,
                'updated_at': None,  # 简化：不查单条记录时间
            })
        # 补充 DB 中有记录的 updated_at
        for conf in AIConfig.objects.all():
            for item in result:
                if item['key'] == conf.key:
                    item['updated_at'] = conf.updated_at.isoformat()
        return Response({'configs': result})

    def put(self, request):
        """PUT /api/admin/ai-config/ — 批量更新配置
        Body: { "configs": [{"key": "...", "value": "..."}, ...] }
        """
        configs = request.data.get('configs', [])
        if not configs:
            return Response({'detail': '请提供要更新的配置项'}, status=status.HTTP_400_BAD_REQUEST)

        updated = []
        for item in configs:
            key = item.get('key', '').strip()
            value = item.get('value', '')
            if not key:
                continue
            # 如果是敏感键且 value 全是 * 则跳过（前端未修改）
            if key in SENSITIVE_KEYS and set(value) <= {'*'}:
                continue
            AIConfig.set(key, value, user=request.user)
            updated.append(key)

        # 热重载：清空 clients.py 中的缓存
        _invalidate_client_cache()

        return Response({'updated': updated, 'message': f'已更新 {len(updated)} 项配置'})


class TestLLMView(APIView):
    """测试 LLM API 连接"""
    permission_classes = [IsAdmin]

    def post(self, request):
        """POST /api/admin/ai-config/test-llm/ — 发送测试消息验证当前配置"""
        api_url   = AIConfig.get('llm_api_url')
        api_key   = AIConfig.get('llm_api_key')
        model     = AIConfig.get('llm_model_name')

        try:
            resp = http_requests.post(
                api_url,
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': '你好，只需回复"连接成功"四个字。'}],
                    'max_tokens': 20,
                    'enable_thinking': False,
                },
                timeout=15
            )
            if resp.status_code == 200:
                reply = resp.json()['choices'][0]['message']['content'].strip()
                return Response({
                    'success': True,
                    'model': model,
                    'reply': reply,
                    'message': '连接成功！',
                })
            else:
                try:
                    err = resp.json()
                    err_msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
                except Exception:
                    err_msg = resp.text
                return Response({
                    'success': False,
                    'message': f'API 返回错误 {resp.status_code}: {err_msg}',
                }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'请求失败: {str(e)}',
            }, status=status.HTTP_200_OK)


class MLModelListView(APIView):
    """列出 ML 模型文件信息"""
    permission_classes = [IsAdmin]

    def get(self, request):
        """GET /api/admin/ml-models/ — 返回三个模型的文件信息"""
        result = []
        for model_type, info in ML_MODEL_PATHS.items():
            path = info['path']
            if os.path.exists(path):
                stat = os.stat(path)
                result.append({
                    'type': model_type,
                    'label': info['label'],
                    'filename': os.path.basename(path),
                    'size_mb': round(stat.st_size / 1024 / 1024, 2),
                    'updated_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'exists': True,
                    'accepted_ext': info['ext'],
                })
            else:
                result.append({
                    'type': model_type,
                    'label': info['label'],
                    'filename': os.path.basename(path),
                    'size_mb': 0,
                    'updated_at': None,
                    'exists': False,
                    'accepted_ext': info['ext'],
                })
        return Response({'models': result})


class MLModelUploadView(APIView):
    """上传替换 ML 模型文件"""
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, model_type):
        """POST /api/admin/ml-models/{model_type}/ — 上传新模型文件"""
        if model_type not in ML_MODEL_PATHS:
            return Response(
                {'detail': f'未知模型类型: {model_type}，可用类型: {list(ML_MODEL_PATHS.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if 'file' not in request.FILES:
            return Response({'detail': '请上传模型文件'}, status=status.HTTP_400_BAD_REQUEST)

        info = ML_MODEL_PATHS[model_type]
        uploaded = request.FILES['file']
        target_path = info['path']

        # 确保目录存在
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        # 写入文件（覆盖原文件）
        with open(target_path, 'wb') as f:
            for chunk in uploaded.chunks():
                f.write(chunk)

        # 热重载：清空对应模型缓存
        _invalidate_model_cache(model_type)

        stat = os.stat(target_path)
        return Response({
            'success': True,
            'type': model_type,
            'label': info['label'],
            'filename': uploaded.name,
            'size_mb': round(stat.st_size / 1024 / 1024, 2),
            'updated_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'message': f'{info["label"]} 已成功更新',
        })


# ─── 热重载辅助函数 ─────────────────────────────────────────────────────────

def _invalidate_client_cache():
    """清空 LLM clients 的运行时缓存，使新配置立即生效"""
    try:
        from apps.pipeline import clients as c
        # 重置 LLM 相关配置缓存（clients 直接调用 AIConfig.get，无需缓存清空）
        # 如果有额外缓存对象，在此重置
        pass
    except Exception:
        pass


def _invalidate_model_cache(model_type: str):
    """清空 ML 模型单例缓存，使新上传的文件生效"""
    try:
        from apps.pipeline.clients import syndrome_client
        if model_type in ('syndrome', 'herb'):
            # 重置 MLInferenceClient 单例的已加载模型
            syndrome_client._syndrome_model = None
            syndrome_client._herb_model = None
            syndrome_client._syndrome_mlb_symptom = None
            syndrome_client._syndrome_mlb_yolo = None
            syndrome_client._syndrome_mlb_label = None
            syndrome_client._herb_mlb_symptom = None
            syndrome_client._herb_mlb_yolo = None
            syndrome_client._herb_mlb_herb = None
            syndrome_client._symptom_list = None
        if model_type == 'yolo':
            from apps.pipeline.yolo_views import _yolo_model
            import apps.pipeline.yolo_views as yv
            yv._yolo_model = None
    except Exception as e:
        print(f'[Cache Invalidation] {e}')

"""
Real clients for ML and LLM services.
- LLMSymptomExtractClient: 用 SiliconFlow LLM 从主诉提取标准化症状
- MLInferenceClient: 用 ML 模型预测证型 + 推荐中药
- LLMAnalysisClient: 用 SiliconFlow LLM 生成综合分析报告
"""
import os
import json
import pickle
import numpy as np
import requests
from typing import Dict, Any, List

from django.conf import settings

# ─── YOLO 中文类名 → ML 模型英文标签映射 ───
YOLO_LABEL_MAP = {
    "黑苔":     "black tongue coating",
    "地图舌":   "map tongue coating",
    "紫苔":     "purple tongue coating",
    "红舌黄厚腻苔": "red tongue yellow fur thick greasy fur",
    "红舌厚腻苔":   "The red tongue is thick and greasy",
    "白舌厚腻苔":   "The white tongue is thick and greasy",
}

# SiliconFlow API 配置从 DB 动态读取（保留默认备用，防止 DB 未初始化时就调用）
_DEFAULT_API_URL = 'https://api.siliconflow.cn/v1/chat/completions'
_DEFAULT_API_KEY = 'sk-rypfxvahaesmyaaloeevjgdszblhavnlstinhixzomntfnxt'
_DEFAULT_MODEL   = 'Qwen/Qwen3-235B-A22B-Instruct-2507'


def _get_llm_config() -> tuple[str, str, str, float]:
    """从 DB 读取当前 LLM 配置，返回 (api_url, api_key, model, temperature)"""
    try:
        from apps.adminops.models import AIConfig
        api_url = AIConfig.get('llm_api_url', _DEFAULT_API_URL)
        api_key = AIConfig.get('llm_api_key', _DEFAULT_API_KEY)
        model   = AIConfig.get('llm_model_name', _DEFAULT_MODEL)
        temperature = float(AIConfig.get('llm_temperature', '0.2'))
    except Exception:
        api_url, api_key, model, temperature = _DEFAULT_API_URL, _DEFAULT_API_KEY, _DEFAULT_MODEL, 0.2
    return api_url, api_key, model, temperature


def _call_llm(system_prompt: str, user_prompt: str, max_tokens: int = 1024) -> str:
    """调用 LLM API，配置实时从 DB 读取"""
    api_url, api_key, model, temperature = _get_llm_config()
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user',   'content': user_prompt},
        ],
        'max_tokens': max_tokens,
        'temperature': temperature,
        'stream': False,
        'enable_thinking': False,
    }
    resp = requests.post(api_url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']['content'].strip()


# ─────────────────────────────────────────────────────────────────────────────
# Client 1：症状提取（替换 MockNLPClient）
# ─────────────────────────────────────────────────────────────────────────────
class LLMSymptomExtractClient:
    """
    用 LLM 从主诉 + 现病史中提取标准化症状列表。
    输出只能包含症状词典（top_symptoms.json）中已有的词条。
    """

    def __init__(self):
        self._symptom_list: List[str] | None = None

    def _get_symptom_list(self) -> List[str]:
        if self._symptom_list is None:
            model_dir = os.path.join(settings.BASE_DIR, '..', 'machinelearning', 'tcm_syndrome_model')
            model_dir = os.path.normpath(model_dir)
            symptom_path = os.path.join(model_dir, 'top_symptoms.json')
            with open(symptom_path, encoding='utf-8') as f:
                self._symptom_list = json.load(f)
        return self._symptom_list

    def parse(self, chief_complaint: str, questionnaire: Dict) -> Dict[str, Any]:
        """
        解析主诉 + 现病史为标准化症状列表。

        Returns:
            {
                'success': True,
                'symptoms': ['咳嗽', '喘息', ...],   # 标准化症状名称列表
                'raw_text': '...'                    # 原始主诉文本（留存）
            }
        """
        symptom_list = self._get_symptom_list()
        symptom_str = "、".join(symptom_list)

        try:
            # 从 DB 读取 System Prompt 模版（支持 {symptom_list} 占位符）
            from apps.adminops.models import AIConfig
            system_template = AIConfig.get(
                'prompt_symptom_extract_system',
                (
                    "你是一名中医诊疗助手，负责从患者主诉和现病史中提取标准化中医症状。\n"
                    "规则：\n1. 只能从以下症状词典中选择词条：\n【症状词典】{symptom_list}\n"
                    "2. 返回 JSON：{{\"symptoms\": [...]}}\n3. 只返回 JSON。"
                )
            )
            system_prompt = system_template.replace('{symptom_list}', symptom_str)

            # 构建用户输入文本
            lines = []
            if chief_complaint:
                lines.append(f"主诉：{chief_complaint}")
            present_illness = questionnaire.get('present_illness', '') if questionnaire else ''
            if present_illness:
                lines.append(f"现病史：{present_illness}")
            user_prompt = "\n".join(lines) if lines else "（无主诉信息）"

            raw = _call_llm(system_prompt, user_prompt, max_tokens=512)
            # 尝试从回复中提取 JSON（防止 LLM 带多余文字）
            start = raw.find('{')
            end = raw.rfind('}') + 1
            if start >= 0 and end > start:
                parsed = json.loads(raw[start:end])
            else:
                parsed = {"symptoms": []}

            # 过滤：只保留词典中存在的症状
            valid_set = set(symptom_list)
            symptoms = [s for s in parsed.get('symptoms', []) if s in valid_set]
        except Exception as e:
            print(f"[LLMSymptomExtractClient] Error: {e}")
            symptoms = []

        return {
            'success': True,
            'symptoms': symptoms,
            'raw_text': user_prompt,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Client 2：ML 推理（替换 MockSyndromeClient）
# ─────────────────────────────────────────────────────────────────────────────
class MLInferenceClient:
    """
    加载证型预测模型和中药预测模型，对症状列表 + YOLO标签进行推理。
    """

    def __init__(self):
        self._syndrome_model = None
        self._herb_model = None
        self._syndrome_mlb_symptom = None
        self._syndrome_mlb_yolo = None
        self._syndrome_mlb_label = None
        self._herb_mlb_symptom = None
        self._herb_mlb_yolo = None
        self._herb_mlb_herb = None
        self._symptom_list = None

    def _load_models(self):
        if self._syndrome_model is not None:
            return

        base = os.path.normpath(os.path.join(settings.BASE_DIR, '..', 'machinelearning'))

        # 证型模型
        sdir = os.path.join(base, 'tcm_syndrome_model')
        with open(os.path.join(sdir, 'model.pkl'),       'rb') as f: self._syndrome_model       = pickle.load(f)
        with open(os.path.join(sdir, 'mlb_symptom.pkl'), 'rb') as f: self._syndrome_mlb_symptom = pickle.load(f)
        with open(os.path.join(sdir, 'mlb_yolo.pkl'),   'rb') as f: self._syndrome_mlb_yolo    = pickle.load(f)
        with open(os.path.join(sdir, 'mlb_label.pkl'),  'rb') as f: self._syndrome_mlb_label   = pickle.load(f)
        with open(os.path.join(sdir, 'top_symptoms.json'), encoding='utf-8') as f:
            self._symptom_list = json.load(f)

        # 中药模型
        hdir = os.path.join(base, 'tcm_herb_model')
        with open(os.path.join(hdir, 'model.pkl'),       'rb') as f: self._herb_model       = pickle.load(f)
        with open(os.path.join(hdir, 'mlb_symptom.pkl'), 'rb') as f: self._herb_mlb_symptom = pickle.load(f)
        with open(os.path.join(hdir, 'mlb_yolo.pkl'),   'rb') as f: self._herb_mlb_yolo    = pickle.load(f)
        with open(os.path.join(hdir, 'mlb_herb.pkl'),   'rb') as f: self._herb_mlb_herb    = pickle.load(f)

        print("[MLInferenceClient] Models loaded successfully.")

    def infer(self, symptoms: list, tongue_features: Dict, yolo_label: str = '') -> Dict[str, Any]:
        """
        执行 ML 推理。

        Args:
            symptoms:       标准化症状名称列表（字符串）
            tongue_features: YOLO 舌象特征字典（来自 yolo_result_json）
            yolo_label:     ML 模型使用的英文 YOLO 标签（可为空）

        Returns:
            {
                'success': True,
                'syndromes': [{'name': '痰热壅肺', 'confidence': 0.75}, ...],
                'herbs':     [{'herb': '茯苓', 'probability': 0.82}, ...],
            }
        """
        self._load_models()

        valid_set = set(self._symptom_list)
        valid_syms = [s for s in symptoms if s in valid_set]

        def build_X(mlb_symptom, mlb_yolo, syms, label):
            X_sym  = mlb_symptom.transform([[s for s in syms]])
            X_yolo = mlb_yolo.transform([[label.strip()] if label.strip() else []])
            return np.hstack([X_sym, X_yolo])

        # ── 证型预测 ──
        X_s = build_X(self._syndrome_mlb_symptom, self._syndrome_mlb_yolo, valid_syms, yolo_label)
        proba_s = self._syndrome_model.predict_proba(X_s)[0]
        syndromes = sorted(
            [{'name': l, 'confidence': round(float(p), 4)}
             for l, p in zip(self._syndrome_mlb_label.classes_, proba_s) if p >= 0.3],
            key=lambda x: -x['confidence']
        )

        # ── 中药预测 ──
        X_h = build_X(self._herb_mlb_symptom, self._herb_mlb_yolo, valid_syms, yolo_label)
        proba_h = self._herb_model.predict_proba(X_h)[0]
        herbs = sorted(
            [{'herb': h, 'probability': round(float(p), 4)}
             for h, p in zip(self._herb_mlb_herb.classes_, proba_h) if p >= 0.5],
            key=lambda x: -x['probability']
        )

        return {
            'success': True,
            'syndromes': syndromes,
            'herbs': herbs,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Client 3：AI 综合分析（替换 MockExplanationClient）
# ─────────────────────────────────────────────────────────────────────────────
class LLMAnalysisClient:
    """
    用 LLM 生成综合诊疗分析报告。
    输入：主诉、舌象、ML 预测的证型 + 中药
    """

    SYSTEM_PROMPT = (
        "你是一名资深中医师，请根据以下患者信息给出简洁的综合诊疗分析。\n"
        "输出格式（严格按此结构）：\n"
        "【证候分析】\n"
        "逐条说明主要证候及其辨证依据，每条不超过2句。\n\n"
        "【推荐用药】\n"
        "列出主要推荐药物及其功效，简明扼要，每味药一行。\n\n"
        "【调护建议】\n"
        "给出3条生活调护建议，面向患者，语言通俗易懂。\n\n"
        "注意：语言简洁专业，总字数不超过500字。"
    )

    def generate(self, syndromes: list, herbs: list, symptoms: list,
                 chief_complaint: str = '', yolo_label: str = '') -> str:
        """
        生成综合分析文本。

        Args:
            syndromes: 证型列表 [{'name': ..., 'confidence': ...}]
            herbs:     中药列表 [{'herb': ..., 'probability': ...}]
            symptoms:  标准化症状列表
            chief_complaint: 主诉原文
            yolo_label: YOLO 舌象标签（英文）

        Returns:
            综合分析文本字符串
        """
        # 从 DB 实时读取 System Prompt
        try:
            from apps.adminops.models import AIConfig
            system_prompt = AIConfig.get('prompt_analysis_system', (
                "你是一名资深中医师，请根据以下患者信息给出简洁的综合诊疗分析。\n"
                "输出格式（严格按此结构）：\n"
                "【证候分析】\n逐条说明主要证候及其辨证依据，每条不超过2句。\n\n"
                "【推荐用药】\n列出主要推荐药物及其功效，简明扼要，每味药一行。\n\n"
                "【调护建议】\n给出3条生活调护建议，面向患者，语言通俗易懂。\n\n"
                "注意：语言简洁专业，总字数不超过500字。"
            ))
        except Exception:
            system_prompt = self.SYSTEM_PROMPT or (
                "你是一名资深中医师，请根据以下患者信息给出综合诊疗分析建议。"
            )

        # 构建用户输入
        syndrome_text = "、".join(
            [f"{s['name']}（{int(s['confidence']*100)}%）" for s in syndromes[:5]]
        ) or "暂无"

        herb_text = "、".join([h['herb'] for h in herbs[:20]]) or "暂无"
        symptom_text = "、".join(symptoms[:15]) or "暂无"

        # YOLO 标签中文化
        yolo_cn_map = {v: k for k, v in YOLO_LABEL_MAP.items()}
        tongue_text = yolo_cn_map.get(yolo_label, yolo_label or "未检测到")

        user_prompt = (
            f"患者主诉：{chief_complaint or '无'}\n"
            f"主要症状：{symptom_text}\n"
            f"舌象：{tongue_text}\n"
            f"AI 辨证结果：{syndrome_text}\n"
            f"推荐药物：{herb_text}"
        )

        try:
            return _call_llm(system_prompt, user_prompt, max_tokens=800)
        except Exception as e:
            print(f"[LLMAnalysisClient] Error: {e}")
            return f"【证候分析】\n{syndrome_text}\n\n【推荐用药】\n{herb_text}\n\n【调护建议】\n请遵医嘱。"


# ─────────────────────────────────────────────────────────────────────────────
# 单例实例
# ─────────────────────────────────────────────────────────────────────────────
nlp_client = LLMSymptomExtractClient()
syndrome_client = MLInferenceClient()
explanation_client = LLMAnalysisClient()


# 保留 yolo_client（Mock 保持不变，真实 YOLO 走 yolo_views.py）
import time
import random
from typing import Dict, Any


class MockYOLOClient:
    """YOLO Mock（仅在无真实图像时作为后备）"""

    def predict(self, image_path: str) -> Dict[str, Any]:
        time.sleep(random.uniform(0.1, 0.3))
        return {
            'success': True,
            'detections': [],
            'tongue_features': {},
            'confidence_score': 0.0,
        }


yolo_client = MockYOLOClient()

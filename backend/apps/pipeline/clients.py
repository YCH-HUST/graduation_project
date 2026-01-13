"""
Mock clients for external ML services.
These clients simulate responses from YOLO, NLP, Syndrome, and Explanation services.
Replace with real HTTP clients when actual services are available.
"""
import time
import random
from typing import Dict, Any


class MockYOLOClient:
    """
    模拟 YOLO 舌象分析服务
    产出：舌象分割掩码、标注图像、分析结果
    """
    
    def predict(self, image_path: str) -> Dict[str, Any]:
        """
        模拟 YOLO 推理
        
        Args:
            image_path: 原始舌象图片路径
            
        Returns:
            包含分析结果的字典
        """
        # 模拟处理延迟
        time.sleep(random.uniform(0.5, 1.5))
        
        return {
            'success': True,
            'detections': [
                {
                    'class': 'tongue',
                    'confidence': 0.95,
                    'bbox': [100, 50, 400, 350],
                },
                {
                    'class': 'coating',
                    'confidence': 0.88,
                    'type': '薄白苔',
                }
            ],
            'tongue_features': {
                'color': '淡红',
                'shape': '正常',
                'coating_color': '白',
                'coating_thickness': '薄',
                'moisture': '润',
                'cracks': False,
                'teeth_marks': False,
            },
            'confidence_score': 0.92,
        }


class MockNLPClient:
    """
    模拟 LLM 问诊解析服务
    将问诊问卷和主诉解析为结构化症状
    """
    
    def parse(self, chief_complaint: str, questionnaire: Dict) -> Dict[str, Any]:
        """
        解析问诊信息为结构化症状
        
        Args:
            chief_complaint: 主诉文本
            questionnaire: 问诊问卷 JSON
            
        Returns:
            结构化症状信息
        """
        # 模拟处理延迟
        time.sleep(random.uniform(0.3, 0.8))
        
        return {
            'success': True,
            'symptoms': [
                {'name': '头痛', 'severity': '轻度', 'duration': '3天'},
                {'name': '失眠', 'severity': '中度', 'duration': '1周'},
                {'name': '口干', 'severity': '轻度', 'duration': '3天'},
                {'name': '乏力', 'severity': '轻度', 'duration': '1周'},
            ],
            'chief_complaint_parsed': {
                'main_symptom': '头痛',
                'onset': '3天前',
                'character': '胀痛',
                'location': '两侧太阳穴',
            },
            'tongue_description': '舌淡红，苔薄白',
            'pulse_description': '脉弦细',
        }


class MockSyndromeClient:
    """
    模拟辨证推理服务
    根据症状和舌象进行证候辨识
    """
    
    def infer(self, symptoms: list, tongue_features: Dict) -> Dict[str, Any]:
        """
        辨证推理
        
        Args:
            symptoms: 症状列表
            tongue_features: 舌象特征
            
        Returns:
            证候诊断结果和方剂推荐
        """
        # 模拟处理延迟
        time.sleep(random.uniform(0.5, 1.0))
        
        return {
            'success': True,
            'syndromes': [
                {
                    'name': '肝郁气滞',
                    'confidence': 0.85,
                    'key_symptoms': ['头痛', '胀痛', '情志不舒'],
                },
                {
                    'name': '心脾两虚',
                    'confidence': 0.72,
                    'key_symptoms': ['失眠', '乏力', '心悸'],
                },
                {
                    'name': '阴虚火旺',
                    'confidence': 0.58,
                    'key_symptoms': ['口干', '失眠'],
                },
            ],
            'prescriptions': [
                {
                    'name': '逍遥散',
                    'score': 0.88,
                    'composition': ['柴胡', '白芍', '当归', '茯苓', '白术', '甘草', '薄荷', '生姜'],
                    'indication': '肝郁气滞，疏肝解郁',
                },
                {
                    'name': '归脾汤',
                    'score': 0.75,
                    'composition': ['人参', '白术', '茯神', '黄芪', '龙眼肉', '酸枣仁', '当归', '远志'],
                    'indication': '心脾两虚，益气补血',
                },
            ],
            'treatment_principle': '疏肝解郁，养心安神',
        }


class MockExplanationClient:
    """
    模拟 LLM 解释生成服务
    生成诊断解释和用药建议
    """
    
    def generate(self, syndromes: list, prescriptions: list, symptoms: list) -> str:
        """
        生成诊断解释
        
        Args:
            syndromes: 证候列表
            prescriptions: 方剂列表
            symptoms: 症状列表
            
        Returns:
            条目化的诊断解释文本
        """
        # 模拟处理延迟
        time.sleep(random.uniform(0.8, 1.5))
        
        explanation = """
【诊断分析】
1. 主要证候：肝郁气滞证
   - 患者表现为头痛（胀痛性质）、失眠、口干等症状
   - 舌象显示舌淡红、苔薄白，符合肝郁气滞的典型表现
   - 综合分析，肝气郁结是主要病机

2. 次要证候：心脾两虚证
   - 乏力、失眠等症状提示心脾功能不足
   - 需要在主方基础上兼顾补益

【治疗方案】
1. 治法：疏肝解郁，养心安神
2. 主方：逍遥散加减
   - 柴胡 10g（疏肝解郁）
   - 白芍 15g（养血柔肝）
   - 当归 10g（养血和营）
   - 茯苓 15g（健脾宁心）
   - 白术 10g（健脾益气）
   - 甘草 6g（调和诸药）
   - 薄荷 3g（疏散郁热）
   - 生姜 3片（温中和胃）

【注意事项】
1. 调畅情志，保持心情舒畅
2. 规律作息，避免熬夜
3. 饮食清淡，忌辛辣刺激
4. 适当运动，以散步、太极拳为宜
"""
        return explanation.strip()


# 创建客户端单例
yolo_client = MockYOLOClient()
nlp_client = MockNLPClient()
syndrome_client = MockSyndromeClient()
explanation_client = MockExplanationClient()

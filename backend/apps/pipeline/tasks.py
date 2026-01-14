"""
Pipeline task executor using threading.
Runs pipeline stages sequentially and updates progress.
"""
import threading
import time
import traceback
from django.db import transaction
from django.core.files.base import ContentFile
from PIL import Image
import io

from apps.cases.models import Case, CaseAsset
from apps.pipeline.models import PipelineRun
from apps.pipeline.clients import yolo_client, nlp_client, syndrome_client, explanation_client
from apps.pipeline.yolo_views import run_yolo_detection
import cv2
import numpy as np


def run_pipeline(case_id: str, pipeline_run_id: int):
    """
    执行流水线任务（在后台线程中运行）
    
    流程：
    1. YOLO 推理 (10->40%)
    2. LLM 解析问诊 (40->60%)
    3. 辨证模型 (60->85%)
    4. LLM 解释 (85->100%)
    
    Args:
        case_id: 病例 UUID
        pipeline_run_id: 流水线运行记录 ID
    """
    timing = {}
    
    try:
        # 获取病例和流水线记录
        case = Case.objects.get(pk=case_id)
        pipeline_run = PipelineRun.objects.get(pk=pipeline_run_id)
        
        # 更新状态为运行中
        pipeline_run.status = 'running'
        pipeline_run.progress = 10
        pipeline_run.save()
        
        case.status = 'running'
        case.save()
        
        # 获取原始图像
        raw_image_asset = case.assets.filter(type='raw_image').first()
        image_path = raw_image_asset.file.path if raw_image_asset else None
        
        # ========== 阶段 1: YOLO 推理 (10->40%) ==========
        stage_start = time.time()
        pipeline_run.progress = 20
        pipeline_run.save()
        
        # 先生成资产（执行真实检测）
        real_detections = []
        if raw_image_asset and raw_image_asset.file:
            try:
                real_detections = _generate_assets(case, raw_image_asset)
            except Exception as e:
                print(f"Warning: Failed to generate assets: {e}")
                traceback.print_exc()

        #以此为基础合并 Mock 数据（保留特征分析）
        yolo_result = yolo_client.predict(image_path)
        if real_detections:
            yolo_result['detections'] = real_detections
        
        pipeline_run.yolo_result_json = yolo_result
        pipeline_run.progress = 40
        pipeline_run.save()
        timing['yolo'] = round(time.time() - stage_start, 2)
        
        # ========== 阶段 2: NLP 解析 (40->60%) ==========
        stage_start = time.time()
        pipeline_run.progress = 50
        pipeline_run.save()
        
        nlp_result = nlp_client.parse(
            case.chief_complaint_text,
            case.questionnaire_json
        )
        
        pipeline_run.nlp_result_json = nlp_result
        pipeline_run.progress = 60
        pipeline_run.save()
        timing['nlp'] = round(time.time() - stage_start, 2)
        
        # ========== 阶段 3: 辨证推理 (60->85%) ==========
        stage_start = time.time()
        pipeline_run.progress = 70
        pipeline_run.save()
        
        symptoms = nlp_result.get('symptoms', [])
        tongue_features = yolo_result.get('tongue_features', {})
        
        inference_result = syndrome_client.infer(symptoms, tongue_features)
        
        pipeline_run.inference_result_json = inference_result
        pipeline_run.progress = 85
        pipeline_run.save()
        timing['inference'] = round(time.time() - stage_start, 2)
        
        # ========== 阶段 4: LLM 解释 (85->100%) ==========
        stage_start = time.time()
        pipeline_run.progress = 90
        pipeline_run.save()
        
        syndromes = inference_result.get('syndromes', [])
        prescriptions = inference_result.get('prescriptions', [])
        
        explanation_text = explanation_client.generate(syndromes, prescriptions, symptoms)
        
        pipeline_run.explanation_text = explanation_text
        pipeline_run.progress = 100
        pipeline_run.timing_json = timing
        pipeline_run.status = 'success'
        pipeline_run.save()
        timing['explanation'] = round(time.time() - stage_start, 2)
        
        # 更新病例状态为待审核
        case.status = 'pending_review'
        case.save()
        
    except Exception as e:
        # 处理异常
        try:
            pipeline_run = PipelineRun.objects.get(pk=pipeline_run_id)
            pipeline_run.status = 'failed'
            pipeline_run.error_message = str(e) + '\n' + traceback.format_exc()
            pipeline_run.save()
            
            case = Case.objects.get(pk=case_id)
            case.status = 'failed'
            case.save()
        except Exception as inner_e:
            print(f"Error updating failure status: {inner_e}")


def _generate_assets(case: Case, raw_asset: CaseAsset) -> list:
    """
    生成分割掩码和标注图像（使用真实 YOLO）
    返回检测结果列表
    """
    # 打开原始图像 (PIL)
    img_pil = Image.open(raw_asset.file)
    
    # 转为 OpenCV 格式 (BGR)
    img_np = np.array(img_pil)
    if img_pil.mode == 'RGB':
        img_cv = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    elif img_pil.mode == 'RGBA':
        img_cv = cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
    else:
        # 处理灰度等其他情况
        img_cv = cv2.cvtColor(img_np, cv2.COLOR_GRAY2BGR)

    # 1. 运行 YOLO 检测
    detections, annotated_image_cv = run_yolo_detection(img_cv)
    
    # Saving Annotated Image
    # encode to buffer
    _, buffer = cv2.imencode('.jpg', annotated_image_cv)
    annotated_io = io.BytesIO(buffer.tobytes())
    
    CaseAsset.objects.create(
        case=case,
        type='annotated',
        file=ContentFile(annotated_io.read(), name='annotated.jpg')
    )

    # 2. 生成模拟的掩码图像（灰度图）- 暂时仍用模拟，直到 YOLO 返回掩码
    # 此处简单做个灰度处理
    mask_img = img_pil.convert('L')
    mask_buffer = io.BytesIO()
    mask_img.save(mask_buffer, format='PNG')
    mask_buffer.seek(0)
    
    CaseAsset.objects.create(
        case=case,
        type='mask',
        file=ContentFile(mask_buffer.read(), name='mask.png')
    )
    
    return detections


def start_pipeline_async(case_id: str, pipeline_run_id: int):
    """
    在后台线程中启动流水线
    
    Args:
        case_id: 病例 UUID
        pipeline_run_id: 流水线运行记录 ID
    """
    thread = threading.Thread(
        target=run_pipeline,
        args=(case_id, pipeline_run_id),
        daemon=True
    )
    thread.start()

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
        
        yolo_result = yolo_client.predict(image_path)
        
        # 生成模拟的 mask 和 annotated 图像
        if raw_image_asset and raw_image_asset.file:
            try:
                _generate_mock_assets(case, raw_image_asset)
            except Exception as e:
                print(f"Warning: Failed to generate mock assets: {e}")
        
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


def _generate_mock_assets(case: Case, raw_asset: CaseAsset):
    """
    生成模拟的分割掩码和标注图像
    在实际应用中，这些会由 YOLO 服务生成
    """
    try:
        # 打开原始图像
        img = Image.open(raw_asset.file)
        
        # 生成模拟的掩码图像（灰度图）
        mask_img = img.convert('L')
        mask_buffer = io.BytesIO()
        mask_img.save(mask_buffer, format='PNG')
        mask_buffer.seek(0)
        
        CaseAsset.objects.create(
            case=case,
            type='mask',
            file=ContentFile(mask_buffer.read(), name='mask.png')
        )
        
        # 生成模拟的标注图像（添加简单标记）
        annotated_img = img.copy()
        if annotated_img.mode != 'RGB':
            annotated_img = annotated_img.convert('RGB')
        
        annotated_buffer = io.BytesIO()
        annotated_img.save(annotated_buffer, format='PNG')
        annotated_buffer.seek(0)
        
        CaseAsset.objects.create(
            case=case,
            type='annotated',
            file=ContentFile(annotated_buffer.read(), name='annotated.png')
        )
        
    except Exception as e:
        print(f"Error generating mock assets: {e}")


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

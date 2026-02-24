/**
 * 病例 API
 */
import { request, uploadFile, uploadForDetection } from '../utils/request'
import type { CaseStatus } from '../utils/constants'

// ===== 类型定义 =====

export interface QuestionnaireData {
    chief_complaint: string
    present_illness: string
    past_history?: string
    sleep_quality?: string
    appetite?: string
    bowel_movement?: string
    urination?: string
    additional_notes?: string
}

export interface CreateCaseResponse {
    case_id: string
}

export interface PipelineStatusResponse {
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: number
    current_stage: string
    result_available: boolean
}

export interface Syndrome {
    name: string
    score: number
    description?: string
}

export interface Formula {
    name: string
    score: number
    composition?: string
    indication?: string
}

export interface DiagnosisResult {
    syndromes: Syndrome[]
    formulas: Formula[]
    evidence_points: string[]
    llm_explanation: string
    confidence_score: number
}

export interface PipelineRun {
    id: number
    case_id: string
    status: string
    progress: number
    current_stage: string
    result_available: boolean
    diagnosis_result?: DiagnosisResult
    created_at: string
    completed_at?: string
}

export interface CaseData {
    id: string
    patient_id: number
    patient_name: string
    tongue_image: string
    questionnaire: QuestionnaireData
    status: CaseStatus
    created_at: string
    updated_at: string
}

export interface Asset {
    id: number
    type: 'raw' | 'mask' | 'heatmap' | 'annotated'
    url: string
    description?: string
}

export interface CaseDetailResponse {
    case: CaseData
    latest_run: PipelineRun | null
    assets: Asset[]
}

export interface CaseListItem {
    id: string
    patient_id: number
    patient_name: string
    questionnaire: QuestionnaireData
    status: CaseStatus
    created_at: string
}

export interface CaseListResponse {
    items: CaseListItem[]
    page: number
    page_size: number
    total: number
}

export interface YoloDetection {
    class_id: number
    class_name: string
    confidence: number
    bbox: number[]
}

export interface YoloDetectResponse {
    success: boolean
    detections: YoloDetection[]
    annotated_image: string
    detail?: string
}

// ===== API 函数 =====

/**
 * 创建病例（上传舌象 + 问诊数据）
 */
export function createCase(
    imagePath: string,
    questionnaire: QuestionnaireData,
    doctorId?: number
): Promise<CreateCaseResponse> {
    const formData: Record<string, string> = {
        questionnaire: JSON.stringify(questionnaire),
    }
    if (doctorId !== undefined) {
        formData['doctor_id'] = String(doctorId)
    }
    return uploadFile<CreateCaseResponse>('/api/cases/', imagePath, formData)
}

/**
 * 触发流水线
 */
export function runPipeline(caseId: string): Promise<PipelineStatusResponse> {
    return request<PipelineStatusResponse>(`/api/cases/${caseId}/run_pipeline/`, {
        method: 'POST',
    })
}

/**
 * 查询流水线状态
 */
export function getPipelineStatus(caseId: string): Promise<PipelineStatusResponse> {
    return request<PipelineStatusResponse>(`/api/cases/${caseId}/run_pipeline/`)
}

/**
 * 获取病例详情
 */
export function getCaseDetail(caseId: string): Promise<CaseDetailResponse> {
    return request<CaseDetailResponse>(`/api/cases/${caseId}/`)
}

/**
 * 获取病例列表
 */
export function getCaseList(params: {
    page?: number
    page_size?: number
    status?: string
}): Promise<CaseListResponse> {
    return request<CaseListResponse>('/api/cases/', { data: params })
}

/**
 * YOLO 舌象检测
 */
export function detectTongue(imagePath: string): Promise<YoloDetectResponse> {
    return uploadForDetection<YoloDetectResponse>('/api/yolo/detect/', imagePath)
}

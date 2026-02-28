/**
 * 病例 API
 */
import apiClient from './client'
import { isMockMode, delay } from '@/lib/utils'
import {
    mockCases,
    mockPipelineRun,
    mockAssets,
    mockDiagnosisResult,
    getMockPipelineStatus,
    resetMockPipelineProgress,
} from '@/lib/mock/data'
import type {
    CreateCaseResponse,
    PipelineStatusResponse,
    CaseDetailResponse,
    PendingCasesRequest,
    PendingCasesResponse,
    ReviewPayload,
    ReviewResponse,
    QuestionnaireData,
} from '@/types'

/**
 * 创建病例（上传舌象 + 问诊数据）
 * @param doctorId 可选，指定主诊医生ID
 */
export async function createCase(
    image: File,
    questionnaire: QuestionnaireData,
    doctorId?: number
): Promise<CreateCaseResponse> {
    if (isMockMode()) {
        await delay(1000)
        return { case_id: Date.now().toString() }
    }

    const formData = new FormData()
    formData.append('tongue_image', image)
    formData.append('questionnaire', JSON.stringify(questionnaire))
    if (doctorId) {
        formData.append('doctor_id', doctorId.toString())
    }

    const response = await apiClient.post<CreateCaseResponse>('/api/cases/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

/**
 * 触发流水线运行
 */
export async function runPipeline(caseId: string): Promise<PipelineStatusResponse> {
    if (isMockMode()) {
        resetMockPipelineProgress()
        await delay(500)
        return {
            status: 'running',
            progress: 0,
            current_stage: 'preprocessing',
            result_available: false,
        }
    }

    const response = await apiClient.post<PipelineStatusResponse>(
        `/api/cases/${caseId}/run_pipeline/`
    )
    return response.data
}

/**
 * 查询流水线状态
 */
export async function getPipelineStatus(caseId: string): Promise<PipelineStatusResponse> {
    if (isMockMode()) {
        await delay(500)
        // Mock ID 可能是数字，这里做个转换
        const mockId = typeof caseId === 'string' ? parseInt(caseId) : caseId
        return getMockPipelineStatus(mockId as number || 1)
    }

    const response = await apiClient.get<PipelineStatusResponse>(
        `/api/cases/${caseId}/run_pipeline/`
    )
    return response.data
}

/**
 * 获取病例详情
 */
export async function getCaseDetail(caseId: string): Promise<CaseDetailResponse> {
    if (isMockMode()) {
        await delay(500)
        const mockId = typeof caseId === 'string' ? parseInt(caseId) : caseId
        const mockCase = mockCases.find(c => String(c.id) === String(caseId)) || {
            ...mockCases[0],
            id: caseId,
        }
        return {
            case: mockCase as any, // Mock 数据类型需调整，暂时绕过
            latest_run: {
                ...mockPipelineRun,
                case_id: caseId, // 更新 mock 数据以匹配
                diagnosis_result: mockDiagnosisResult,
            },
            assets: mockAssets,
        }
    }

    const response = await apiClient.get<CaseDetailResponse>(`/api/cases/${caseId}/`)
    return response.data
}

/**
 * 获取待审核病例列表
 */
export async function getPendingCases(params: PendingCasesRequest): Promise<PendingCasesResponse> {
    if (isMockMode()) {
        await delay(500)
        const filteredCases = mockCases.filter(c =>
            !params.status || c.status === params.status
        )
        return {
            items: filteredCases as any[],
            page: params.page || 1,
            page_size: params.page_size || 10,
            total: filteredCases.length,
        }
    }

    const response = await apiClient.get<PendingCasesResponse>('/api/cases/', {
        params,
    })
    return response.data
}

/**
 * 提交审核
 */
export async function submitReview(
    caseId: string,
    payload: ReviewPayload
): Promise<ReviewResponse> {
    if (isMockMode()) {
        await delay(500)
        return { ok: true }
    }

    const response = await apiClient.post<ReviewResponse>(
        `/api/cases/${caseId}/review/`,
        payload
    )
    return response.data
}

/**
 * 获取患者历史病例数据（病程对比用）
 */
export async function getPatientHistory(patientId: number): Promise<any[]> {
    if (isMockMode()) {
        await delay(300)
        return []
    }

    const response = await apiClient.get(`/api/cases/patient-history/${patientId}/`)
    return response.data
}

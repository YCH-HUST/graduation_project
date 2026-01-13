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
 */
export async function createCase(
    image: File,
    questionnaire: QuestionnaireData
): Promise<CreateCaseResponse> {
    if (isMockMode()) {
        await delay(1000)
        return { case_id: Date.now() }
    }

    const formData = new FormData()
    formData.append('tongue_image', image)
    formData.append('questionnaire', JSON.stringify(questionnaire))

    const response = await apiClient.post<CreateCaseResponse>('/api/cases/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

/**
 * 触发流水线运行
 */
export async function runPipeline(caseId: number): Promise<PipelineStatusResponse> {
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
export async function getPipelineStatus(caseId: number): Promise<PipelineStatusResponse> {
    if (isMockMode()) {
        await delay(500)
        return getMockPipelineStatus(caseId)
    }

    const response = await apiClient.get<PipelineStatusResponse>(
        `/api/cases/${caseId}/run_pipeline/`
    )
    return response.data
}

/**
 * 获取病例详情
 */
export async function getCaseDetail(caseId: number): Promise<CaseDetailResponse> {
    if (isMockMode()) {
        await delay(500)
        const mockCase = mockCases.find(c => c.id === caseId) || {
            ...mockCases[0],
            id: caseId,
        }
        return {
            case: mockCase,
            latest_run: {
                ...mockPipelineRun,
                case_id: caseId,
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
            items: filteredCases,
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
    caseId: number,
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

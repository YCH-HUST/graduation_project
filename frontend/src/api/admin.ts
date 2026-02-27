/**
 * 管理员 API
 */
import apiClient from './client'
import { isMockMode, delay } from '@/lib/utils'
import { mockServiceHealth } from '@/lib/mock/data'
import type {
    HealthResponse,
    GovernanceItem,
    AdminUserListResponse,
    AdminUser,
    AdminUserCreateRequest,
    AdminCaseListResponse,
    AdminStatistics
} from '@/types'

/**
 * 获取服务健康状态
 */
export async function getHealth(): Promise<HealthResponse> {
    if (isMockMode()) {
        await delay(500)
        const services = mockServiceHealth
        const hasUnhealthy = services.some(s => s.status === 'unhealthy')
        const hasDegraded = services.some(s => s.status === 'degraded')

        return {
            services,
            overall_status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
        }
    }

    const response = await apiClient.get<HealthResponse>('/api/admin/health/')
    return response.data
}

/**
 * 获取治理项列表
 */
export async function getGovernanceItems(type?: string): Promise<GovernanceItem[]> {
    if (isMockMode()) {
        await delay(500)
        const mockItems: GovernanceItem[] = [
            { id: 1, type: 'synonym', value: '肝郁=肝气郁结', created_at: '2024-01-01T00:00:00Z' },
            { id: 2, type: 'tag', value: '证候', description: '证候相关标签', created_at: '2024-01-01T00:00:00Z' },
            { id: 3, type: 'template', value: '问诊模板1', description: '通用问诊模板', created_at: '2024-01-01T00:00:00Z' },
            { id: 4, type: 'blacklist', value: '敏感词1', created_at: '2024-01-01T00:00:00Z' },
        ]
        return type ? mockItems.filter(i => i.type === type) : mockItems
    }

    const response = await apiClient.get<GovernanceItem[]>('/api/admin/governance/', {
        params: { type },
    })
    return response.data
}

/**
 * 创建治理项
 */
export async function createGovernanceItem(
    item: Omit<GovernanceItem, 'id' | 'created_at'>
): Promise<GovernanceItem> {
    if (isMockMode()) {
        await delay(500)
        return {
            ...item,
            id: Date.now(),
            created_at: new Date().toISOString(),
        }
    }

    const response = await apiClient.post<GovernanceItem>('/api/admin/governance/', item)
    return response.data
}

/**
 * 删除治理项
 */
export async function deleteGovernanceItem(id: number): Promise<void> {
    if (isMockMode()) {
        await delay(500)
        return
    }

    await apiClient.delete(`/api/admin/governance/${id}/`)
}

// ============ 用户管理 API ============

/**
 * 获取用户列表
 */
export async function getUsers(params: {
    page?: number
    page_size?: number
    role?: string
    search?: string
}): Promise<AdminUserListResponse> {
    const response = await apiClient.get<AdminUserListResponse>('/api/admin/users/', { params })
    return response.data
}

/**
 * 获取用户详情
 */
export async function getUser(id: number): Promise<AdminUser> {
    const response = await apiClient.get<AdminUser>(`/api/admin/users/${id}/`)
    return response.data
}

/**
 * 创建用户
 */
export async function createUser(data: AdminUserCreateRequest): Promise<AdminUser> {
    const response = await apiClient.post<AdminUser>('/api/admin/users/', data)
    return response.data
}

/**
 * 更新用户
 */
export async function updateUser(id: number, data: Partial<AdminUser & { password?: string }>): Promise<AdminUser> {
    const response = await apiClient.put<AdminUser>(`/api/admin/users/${id}/`, data)
    return response.data
}

/**
 * 删除用户
 */
export async function deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/users/${id}/`)
}

// ============ 病例管理 API ============

/**
 * 获取病例列表
 */
export async function getCases(params: {
    page?: number
    page_size?: number
    status?: string
    search?: string
}): Promise<AdminCaseListResponse> {
    const response = await apiClient.get<AdminCaseListResponse>('/api/admin/cases/', { params })
    return response.data
}

/**
 * 删除病例
 */
export async function deleteCase(id: string): Promise<void> {
    await apiClient.delete(`/api/admin/cases/${id}/`)
}

// ============ 统计 API ============

/**
 * 获取系统统计
 */
export async function getStatistics(): Promise<AdminStatistics> {
    const response = await apiClient.get<AdminStatistics>('/api/admin/statistics/')
    return response.data
}


// ============ AI 配置 API ============

export interface AIConfigResponse { configs: import('@/types').AIConfigItem[] }
export interface TestLLMResponse { success: boolean; message: string; reply?: string; model?: string }
export interface MLModelsResponse { models: import('@/types').MLModelInfo[] }
export interface MLUploadResponse { success: boolean; message: string; size_mb?: number; updated_at?: string }

/**
 * 获取全部 AI 配置
 */
export async function getAIConfig(): Promise<AIConfigResponse> {
    const res = await apiClient.get<AIConfigResponse>('/api/admin/ai-config/')
    return res.data
}

/**
 * 批量保存 AI 配置
 */
export async function saveAIConfig(configs: { key: string; value: string }[]): Promise<{ updated: string[] }> {
    const res = await apiClient.put<{ updated: string[] }>('/api/admin/ai-config/', { configs })
    return res.data
}

/**
 * 测试 LLM 连接
 */
export async function testLLM(): Promise<TestLLMResponse> {
    const res = await apiClient.post<TestLLMResponse>('/api/admin/ai-config/test-llm/')
    return res.data
}

/**
 * 获取 ML 模型文件信息
 */
export async function getMLModels(): Promise<MLModelsResponse> {
    const res = await apiClient.get<MLModelsResponse>('/api/admin/ml-models/')
    return res.data
}

/**
 * 上传替换 ML 模型文件
 */
export async function uploadMLModel(modelType: string, file: File): Promise<MLUploadResponse> {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<MLUploadResponse>(
        `/api/admin/ml-models/${modelType}/`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return res.data
}

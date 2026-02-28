/**
 * 用药随访 API
 */
import { request } from '../utils/request'

// ===== 类型定义 =====

export interface MedicationLog {
    id?: number
    plan: number
    date: string
    slot: 'morning' | 'afternoon' | 'evening'
    taken: boolean
    feedback?: string
}

export interface MedicationPlan {
    id: number
    case_id: string
    patient_id: number
    is_active: boolean
    created_at: string
    logs: MedicationLog[]
}

// ===== API 函数 =====

/**
 * 获取当前激活的用药计划
 */
export function getCurrentPlan(): Promise<MedicationPlan> {
    return request<MedicationPlan>('/api/followups/plans/current/')
}

/**
 * 提交用药记录（打卡 / 反馈）
 */
export function submitMedicationLog(data: {
    plan: number
    date: string
    slot: 'morning' | 'afternoon' | 'evening'
    taken: boolean
    feedback?: string
}): Promise<MedicationLog> {
    return request<MedicationLog>('/api/followups/logs/', {
        method: 'POST',
        data,
    })
}

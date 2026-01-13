/**
 * Statistics API - 统计数据接口
 */
import apiClient from './client'
import { isMockMode } from '@/lib/utils'

// 概览统计
export interface StatisticsOverview {
    total_reviews: number
    approved_count: number
    rejected_count: number
    approval_rate: number
    pending_count: number
}

// 趋势数据项
export interface TrendItem {
    date: string
    count: number
}

// 证候分布项
export interface SyndromeItem {
    name: string
    count: number
}

// 最近审核记录
export interface RecentReview {
    id: number
    case_id: string
    patient_name: string
    decision: 'approved' | 'rejected'
    created_at: string
}

// 统计数据响应
export interface StatisticsResponse {
    overview: StatisticsOverview
    trend: TrendItem[]
    syndromes: SyndromeItem[]
    recent_reviews: RecentReview[]
}

/**
 * 获取统计数据
 */
export async function getStatistics(): Promise<StatisticsResponse> {
    if (isMockMode()) {
        return mockGetStatistics()
    }
    const response = await apiClient.get<StatisticsResponse>('/api/doctor/statistics/')
    return response.data
}

// ============ Mock 实现 ============

async function mockGetStatistics(): Promise<StatisticsResponse> {
    await new Promise(resolve => setTimeout(resolve, 500))

    // 生成近7天日期
    const trend: TrendItem[] = []
    for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        trend.push({
            date: `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            count: Math.floor(Math.random() * 15) + 5,
        })
    }

    return {
        overview: {
            total_reviews: 156,
            approved_count: 120,
            rejected_count: 36,
            approval_rate: 76.9,
            pending_count: 8,
        },
        trend,
        syndromes: [
            { name: '肝郁脾虚证', count: 25 },
            { name: '气滞血瘀证', count: 18 },
            { name: '湿热蕴结证', count: 15 },
            { name: '心肾不交证', count: 12 },
            { name: '肾阳虚证', count: 10 },
            { name: '脾胃虚弱证', count: 8 },
            { name: '肝肾阴虚证', count: 7 },
            { name: '痰湿阻滞证', count: 6 },
        ],
        recent_reviews: [
            {
                id: 1,
                case_id: 'case-001',
                patient_name: '张三',
                decision: 'approved',
                created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
                id: 2,
                case_id: 'case-002',
                patient_name: '李四',
                decision: 'approved',
                created_at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
                id: 3,
                case_id: 'case-003',
                patient_name: '王五',
                decision: 'rejected',
                created_at: new Date(Date.now() - 86400000).toISOString(),
            },
        ],
    }
}

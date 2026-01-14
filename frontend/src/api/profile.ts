/**
 * Profile API - 个人资料相关接口
 */
import apiClient from './client'
import { isMockMode } from '@/lib/utils'
import type { User } from '@/types'

// 最近患者接口
export interface RecentPatient {
    id: number
    username: string
    full_name: string
    case_id: number
    case_status: string
    chief_complaint: string
    created_at: string
}

export interface RecentPatientsResponse {
    patients: RecentPatient[]
    total: number
}

// Profile 更新请求
export interface ProfileUpdateRequest {
    full_name?: string
    email?: string
    hospital?: string
    department?: string
    job_title?: string
    years_of_experience?: number
    gender?: 'male' | 'female' | ''
    age?: number
}

/**
 * 获取当前用户资料
 */
export async function getProfile(): Promise<User> {
    if (isMockMode()) {
        return mockGetProfile()
    }
    const response = await apiClient.get<User>('/api/profile/')
    return response.data
}

/**
 * 更新当前用户资料
 */
export async function updateProfile(data: ProfileUpdateRequest): Promise<User> {
    if (isMockMode()) {
        return mockUpdateProfile(data)
    }
    const response = await apiClient.put<User>('/api/profile/', data)
    return response.data
}

/**
 * 获取医生最近患者列表
 */
export async function getRecentPatients(): Promise<RecentPatientsResponse> {
    if (isMockMode()) {
        return mockGetRecentPatients()
    }
    const response = await apiClient.get<RecentPatientsResponse>('/api/doctor/recent-patients/')
    return response.data
}

// ============ Mock 实现 ============

let mockDoctorProfile: User = {
    id: 2,
    username: 'doctor1',
    email: 'doctor@example.com',
    role: 'doctor',
    full_name: '张医生',
    hospital: '',
    job_title: '',
    years_of_experience: undefined,
    gender: '',
    age: undefined,
}

async function mockGetProfile(): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { ...mockDoctorProfile }
}

async function mockUpdateProfile(data: ProfileUpdateRequest): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 500))
    mockDoctorProfile = { ...mockDoctorProfile, ...data }
    return { ...mockDoctorProfile }
}

async function mockGetRecentPatients(): Promise<RecentPatientsResponse> {
    await new Promise(resolve => setTimeout(resolve, 400))
    return {
        patients: [
            {
                id: 1,
                username: 'patient1',
                full_name: '李患者',
                case_id: 101,
                case_status: 'approved',
                chief_complaint: '头痛三天，伴有失眠',
                created_at: new Date(Date.now() - 86400000).toISOString(),
            },
            {
                id: 3,
                username: 'patient2',
                full_name: '王患者',
                case_id: 102,
                case_status: 'pending_review',
                chief_complaint: '胃痛一周，食欲不振',
                created_at: new Date(Date.now() - 172800000).toISOString(),
            },
            {
                id: 4,
                username: 'patient3',
                full_name: '赵患者',
                case_id: 103,
                case_status: 'approved',
                chief_complaint: '咳嗽半月，有痰',
                created_at: new Date(Date.now() - 259200000).toISOString(),
            },
        ],
        total: 3,
    }
}

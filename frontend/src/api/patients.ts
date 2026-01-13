/**
 * Patients API - 患者管理接口
 */
import apiClient from './client'
import { isMockMode } from '@/lib/utils'

// 患者列表项
export interface PatientListItem {
    id: number
    username: string
    full_name: string
    email: string
    gender: string
    age: number | null
    case_count: number
    date_joined: string
}

// 患者详情
export interface PatientDetail {
    id: number
    username: string
    full_name: string
    email: string
    gender: string
    age: number | null
    hospital: string
    job_title: string
    years_of_experience: number | null
    date_joined: string
}

// 患者病例
export interface PatientCase {
    id: string
    chief_complaint: string
    status: string
    created_at: string
}

// 患者列表响应
export interface PatientsListResponse {
    items: PatientListItem[]
    page: number
    page_size: number
    total: number
}

// 患者详情响应
export interface PatientDetailResponse {
    patient: PatientDetail
    cases: PatientCase[]
}

// 创建患者请求
export interface CreatePatientRequest {
    username: string
    password: string
    full_name?: string
    email?: string
    gender?: 'male' | 'female' | ''
    age?: number | null
}

// 更新患者请求
export interface UpdatePatientRequest {
    full_name?: string
    email?: string
    gender?: 'male' | 'female' | ''
    age?: number | null
}

// 查询参数
export interface PatientsQueryParams {
    page?: number
    page_size?: number
    search?: string
}

/**
 * 获取患者列表
 */
export async function getPatients(params: PatientsQueryParams = {}): Promise<PatientsListResponse> {
    if (isMockMode()) {
        return mockGetPatients(params)
    }
    const response = await apiClient.get<PatientsListResponse>('/api/doctor/patients/', { params })
    return response.data
}

/**
 * 获取患者详情
 */
export async function getPatientDetail(id: number): Promise<PatientDetailResponse> {
    if (isMockMode()) {
        return mockGetPatientDetail(id)
    }
    const response = await apiClient.get<PatientDetailResponse>(`/api/doctor/patients/${id}/`)
    return response.data
}

/**
 * 创建患者
 */
export async function createPatient(data: CreatePatientRequest): Promise<PatientListItem> {
    if (isMockMode()) {
        return mockCreatePatient(data)
    }
    const response = await apiClient.post<PatientListItem>('/api/doctor/patients/', data)
    return response.data
}

/**
 * 更新患者
 */
export async function updatePatient(id: number, data: UpdatePatientRequest): Promise<PatientDetail> {
    if (isMockMode()) {
        return mockUpdatePatient(id, data)
    }
    const response = await apiClient.put<PatientDetail>(`/api/doctor/patients/${id}/`, data)
    return response.data
}

/**
 * 删除患者
 */
export async function deletePatient(id: number): Promise<{ ok: boolean }> {
    if (isMockMode()) {
        return mockDeletePatient(id)
    }
    const response = await apiClient.delete<{ ok: boolean }>(`/api/doctor/patients/${id}/`)
    return response.data
}

// ============ Mock 实现 ============

let mockPatients: PatientListItem[] = [
    {
        id: 1,
        username: 'patient1',
        full_name: '张三',
        email: 'patient1@example.com',
        gender: 'male',
        age: 35,
        case_count: 3,
        date_joined: '2024-01-01T00:00:00Z',
    },
    {
        id: 4,
        username: 'patient2',
        full_name: '李四',
        email: 'patient2@example.com',
        gender: 'female',
        age: 28,
        case_count: 1,
        date_joined: '2024-01-05T00:00:00Z',
    },
    {
        id: 5,
        username: 'patient3',
        full_name: '王五',
        email: 'patient3@example.com',
        gender: 'male',
        age: 45,
        case_count: 2,
        date_joined: '2024-01-10T00:00:00Z',
    },
]

let mockPatientIdCounter = 100

async function mockGetPatients(params: PatientsQueryParams): Promise<PatientsListResponse> {
    await new Promise(resolve => setTimeout(resolve, 300))

    let filtered = [...mockPatients]
    if (params.search) {
        const search = params.search.toLowerCase()
        filtered = filtered.filter(p =>
            p.username.toLowerCase().includes(search) ||
            p.full_name.toLowerCase().includes(search) ||
            p.email.toLowerCase().includes(search)
        )
    }

    const page = params.page || 1
    const pageSize = params.page_size || 10
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return {
        items,
        page,
        page_size: pageSize,
        total: filtered.length,
    }
}

async function mockGetPatientDetail(id: number): Promise<PatientDetailResponse> {
    await new Promise(resolve => setTimeout(resolve, 300))

    const patient = mockPatients.find(p => p.id === id)
    if (!patient) {
        throw new Error('患者不存在')
    }

    return {
        patient: {
            ...patient,
            hospital: '',
            job_title: '',
            years_of_experience: null,
        },
        cases: [
            {
                id: 'case-001',
                chief_complaint: '头痛三天',
                status: 'approved',
                created_at: '2024-01-10T10:00:00Z',
            },
            {
                id: 'case-002',
                chief_complaint: '失眠一周',
                status: 'pending_review',
                created_at: '2024-01-12T14:00:00Z',
            },
        ],
    }
}

async function mockCreatePatient(data: CreatePatientRequest): Promise<PatientListItem> {
    await new Promise(resolve => setTimeout(resolve, 500))

    if (mockPatients.some(p => p.username === data.username)) {
        throw new Error('用户名已存在')
    }

    const newPatient: PatientListItem = {
        id: mockPatientIdCounter++,
        username: data.username,
        full_name: data.full_name || '',
        email: data.email || '',
        gender: data.gender || '',
        age: data.age ?? null,
        case_count: 0,
        date_joined: new Date().toISOString(),
    }

    mockPatients.unshift(newPatient)
    return newPatient
}

async function mockUpdatePatient(id: number, data: UpdatePatientRequest): Promise<PatientDetail> {
    await new Promise(resolve => setTimeout(resolve, 500))

    const index = mockPatients.findIndex(p => p.id === id)
    if (index === -1) {
        throw new Error('患者不存在')
    }

    mockPatients[index] = { ...mockPatients[index], ...data }

    return {
        ...mockPatients[index],
        hospital: '',
        job_title: '',
        years_of_experience: null,
    }
}

async function mockDeletePatient(id: number): Promise<{ ok: boolean }> {
    await new Promise(resolve => setTimeout(resolve, 500))

    const index = mockPatients.findIndex(p => p.id === id)
    if (index === -1) {
        throw new Error('患者不存在')
    }

    mockPatients.splice(index, 1)
    return { ok: true }
}

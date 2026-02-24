/**
 * 医生 API
 */
import { request } from '../utils/request'

export interface Doctor {
    id: number
    username: string
    full_name: string
    hospital: string
    department: string
    department_display: string
    job_title: string
    years_of_experience?: number
}

export interface DoctorsResponse {
    doctors: Doctor[]
    total: number
}

export function getDoctors(department?: string): Promise<DoctorsResponse> {
    const params = department ? { department } : {}
    return request<DoctorsResponse>('/api/doctors/', { data: params })
}

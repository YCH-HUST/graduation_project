/**
 * 个人资料 API
 */
import { request } from '../utils/request'

export interface Profile {
    id: number
    username: string
    email?: string
    full_name?: string
    role: string
    gender?: string
    age?: number
    hospital?: string
    job_title?: string
    years_of_experience?: number
}

export interface ProfileUpdateRequest {
    full_name?: string
    email?: string
    gender?: string
    age?: number
}

export function getProfile(): Promise<Profile> {
    return request<Profile>('/api/profile/')
}

export function updateProfile(data: ProfileUpdateRequest): Promise<Profile> {
    return request<Profile>('/api/profile/', {
        method: 'PUT',
        data,
    })
}

/**
 * 认证 API
 */
import { request } from '../utils/request'

export interface LoginRequest {
    username: string
    password: string
}

export interface RegisterRequest {
    username: string
    password: string
    email?: string
    full_name?: string
    role?: 'patient' | 'doctor' | 'admin'
}

export interface AuthResponse {
    token: string
    role: 'patient' | 'doctor' | 'admin'
    user: {
        id: number
        username: string
        email?: string
        full_name?: string
        role: string
    }
}

export function login(data: LoginRequest): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
        method: 'POST',
        data,
        auth: false,
    })
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
        method: 'POST',
        data: { ...data, role: data.role ?? 'patient' },
        auth: false,
    })
}

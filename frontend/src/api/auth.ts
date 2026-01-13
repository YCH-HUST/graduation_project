/**
 * 认证 API
 */
import apiClient from './client'
import { isMockMode } from '@/lib/utils'
import { mockUsers, generateMockToken, addMockUser } from '@/lib/mock/data'
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@/types'

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
    // Mock 模式
    if (isMockMode()) {
        return mockLogin(data)
    }

    // 真实 API 调用
    const response = await apiClient.post<LoginResponse>('/auth/login', data)
    return response.data
}

/**
 * Mock 登录实现
 */
async function mockLogin(data: LoginRequest): Promise<LoginResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    const mockUser = mockUsers[data.username]

    if (!mockUser || mockUser.password !== data.password) {
        throw new Error('用户名或密码错误')
    }

    return {
        token: generateMockToken(mockUser.user.id),
        role: mockUser.user.role,
        user: mockUser.user,
    }
}

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
    // Mock 模式
    if (isMockMode()) {
        return mockRegister(data)
    }

    // 真实 API 调用
    const response = await apiClient.post<RegisterResponse>('/auth/register', data)
    return response.data
}

/**
 * Mock 注册实现
 */
async function mockRegister(data: RegisterRequest): Promise<RegisterResponse> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500))

    // 检查用户名是否已存在
    if (mockUsers[data.username]) {
        throw new Error('用户名已存在')
    }

    // 创建新用户
    const newUser = addMockUser(data)

    return {
        token: generateMockToken(newUser.id),
        role: newUser.role,
        user: newUser,
    }
}

/**
 * 登出（清除本地存储）
 */
export function logout(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('role')
        window.location.href = '/login'
    }
}

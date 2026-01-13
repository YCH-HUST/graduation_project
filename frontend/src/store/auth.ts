/**
 * 认证状态管理 (Zustand)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'

interface AuthState {
    // 状态
    token: string | null
    user: User | null
    role: UserRole | null
    isAuthenticated: boolean

    // Actions
    login: (token: string, user: User, role: UserRole) => void
    logout: () => void
    setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            // 初始状态
            token: null,
            user: null,
            role: null,
            isAuthenticated: false,

            // 登录
            login: (token, user, role) => {
                set({
                    token,
                    user,
                    role,
                    isAuthenticated: true,
                })
                // 同步到 localStorage（用于 API 客户端读取）
                if (typeof window !== 'undefined') {
                    localStorage.setItem('token', token)
                    localStorage.setItem('user', JSON.stringify(user))
                    localStorage.setItem('role', role)
                }
            },

            // 登出
            logout: () => {
                set({
                    token: null,
                    user: null,
                    role: null,
                    isAuthenticated: false,
                })
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    localStorage.removeItem('role')
                }
            },

            // 更新用户信息
            setUser: (user) => {
                set({ user })
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(user))
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                role: state.role,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
)

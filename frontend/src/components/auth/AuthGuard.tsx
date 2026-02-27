"use client"

/**
 * 路由守卫组件
 * - 验证用户登录状态
 * - 验证用户角色权限
 */
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import type { UserRole } from '@/types'

interface AuthGuardProps {
    children: React.ReactNode
    allowedRoles?: UserRole[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { isAuthenticated, role } = useAuthStore()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // 等待客户端 hydration 完成
        const checkAuth = () => {
            // 未登录，跳转到登录页
            if (!isAuthenticated) {
                router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
                return
            }

            // 已登录但角色不匹配，跳转到对应首页或显示无权限
            if (allowedRoles && role && !allowedRoles.includes(role)) {
                const roleRedirects: Record<UserRole, string> = {
                    patient: '/login',  // 患者端已迁移至微信小程序
                    doctor: '/doctor/dashboard',
                    admin: '/admin/health',
                }
                router.replace(roleRedirects[role] || '/login')
                return
            }

            setIsChecking(false)
        }

        // 延迟检查以确保 store hydration 完成
        const timer = setTimeout(checkAuth, 100)
        return () => clearTimeout(timer)
    }, [isAuthenticated, role, allowedRoles, router, pathname])

    // 检查中显示加载状态
    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 dark:text-slate-400">验证登录状态...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

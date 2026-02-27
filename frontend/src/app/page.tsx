"use client"

/**
 * 首页 - 根据登录状态和角色重定向
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import type { UserRole } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, role } = useAuthStore()

  useEffect(() => {
    // 延迟以确保 hydration 完成
    const redirect = () => {
      if (!isAuthenticated) {
        router.replace('/login')
        return
      }

      const roleRedirects: Record<UserRole, string> = {
        patient: '/login',  // 患者端已迁移至微信小程序
        doctor: '/doctor/dashboard',
        admin: '/admin/health',
      }

      if (role) {
        router.replace(roleRedirects[role])
      } else {
        router.replace('/login')
      }
    }

    const timer = setTimeout(redirect, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, role, router])

  // 显示加载状态
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pulse-glow">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">正在加载...</p>
      </div>
    </div>
  )
}

"use client"

/**
 * 侧边导航栏组件
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import {
    Home,
    Plus,
    FileText,
    ClipboardCheck,
    Settings,
    Activity,
    LogOut,
    Database,
    User,
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
}

const navItems: Record<UserRole, NavItem[]> = {
    patient: [
        { label: '新建病例', href: '/patient/new-case', icon: <Plus className="w-5 h-5" /> },
    ],
    doctor: [
        { label: '待审列表', href: '/doctor/dashboard', icon: <ClipboardCheck className="w-5 h-5" /> },
    ],
    admin: [
        { label: '健康检查', href: '/admin/health', icon: <Activity className="w-5 h-5" /> },
        { label: '数据治理', href: '/admin/governance', icon: <Database className="w-5 h-5" /> },
    ],
}

const roleLabels: Record<UserRole, string> = {
    patient: '患者端',
    doctor: '医生端',
    admin: '管理员',
}

export function Sidebar() {
    const pathname = usePathname()
    const { user, role, logout } = useAuthStore()

    if (!role) return null

    const items = navItems[role] || []

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50 flex flex-col shadow-xl shadow-slate-200/20">
            {/* Logo */}
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100">中医智能诊疗</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabels[role]}</p>
                    </div>
                </div>
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1 p-4 space-y-2">
                {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                isActive
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                            )}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* 用户信息 */}
            <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {user?.full_name || user?.username || '用户'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user?.email || ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    退出登录
                </button>
            </div>
        </aside>
    )
}

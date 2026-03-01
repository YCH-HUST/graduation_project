"use client"

/**
 * 侧边导航栏组件 - 支持移动端响应式
 * 医生端"消息通知"菜单项实时显示未读数量角标
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { getUnreadCount } from '@/api/notifications'
import {
    Home,
    Plus,
    FileText,
    ClipboardCheck,
    Settings,
    Activity,
    LogOut,
    User,
    Users,
    BarChart3,
    Bell,
    Menu,
    X,
    Settings2,
    ScrollText,
    MessageCircle,
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
    badgeKey?: string  // 若设置，则从 badge 状态读取角标数量
}

const navItems: Record<UserRole, NavItem[]> = {
    patient: [],  // 患者端已迁移至微信小程序
    doctor: [
        { label: '首页', href: '/doctor/home', icon: <Home className="w-5 h-5" /> },
        { label: '病例管理', href: '/doctor/dashboard', icon: <ClipboardCheck className="w-5 h-5" /> },
        { label: '消息对话', href: '/doctor/chats', icon: <MessageCircle className="w-5 h-5" />, badgeKey: 'unreadChat' },
        { label: '患者管理', href: '/doctor/patients', icon: <Users className="w-5 h-5" /> },
        { label: '数据统计', href: '/doctor/statistics', icon: <BarChart3 className="w-5 h-5" /> },
        { label: '系统通知', href: '/doctor/notifications', icon: <Bell className="w-5 h-5" />, badgeKey: 'unread' },
        { label: '个人资料', href: '/doctor/profile', icon: <Settings className="w-5 h-5" /> },
    ],
    admin: [
        { label: '仪表盘', href: '/admin/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
        { label: '用户管理', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
        { label: '病例管理', href: '/admin/cases', icon: <FileText className="w-5 h-5" /> },
        { label: '健康检查', href: '/admin/health', icon: <Activity className="w-5 h-5" /> },
        { label: 'AI 配置', href: '/admin/ai-config', icon: <Settings2 className="w-5 h-5" /> },
        { label: '系统日志', href: '/admin/logs', icon: <ScrollText className="w-5 h-5" /> },
        { label: '个人设置', href: '/admin/profile', icon: <Settings className="w-5 h-5" /> },
    ],
}

const roleLabels: Record<UserRole, string> = {
    patient: '患者端',
    doctor: '医生端',
    admin: '管理员',
}

const roleColors: Record<UserRole, string> = {
    patient: 'from-emerald-500 to-teal-500',
    doctor: 'from-blue-500 to-indigo-500',
    admin: 'from-purple-500 to-pink-500',
}

export function Sidebar() {
    const pathname = usePathname()
    const { user, role, token, logout } = useAuthStore()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [unreadChatCount, setUnreadChatCount] = useState(0)
    const prevUnreadRef = useRef(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // 路由变化时关闭移动端菜单
    useEffect(() => {
        setIsMobileOpen(false)
    }, [pathname])

    // 阻止移动端菜单打开时的背景滚动
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isMobileOpen])

    // 当未读数量增加时，向整个应用广播
    useEffect(() => {
        if (unreadCount > prevUnreadRef.current) {
            window.dispatchEvent(new CustomEvent('new-notification-arrived'))
        }
        prevUnreadRef.current = unreadCount
    }, [unreadCount])

    // 医生端：建立 SSE 长连接，监听未读通知数量
    useEffect(() => {
        if (role !== 'doctor' || !token) return

        const abortController = new AbortController()
        let retryTimeout: NodeJS.Timeout

        const connectSSE = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const response = await fetch(`${apiUrl}/api/notifications/stream/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal: abortController.signal
                })

                if (!response.ok) {
                    throw new Error(`SSE error: ${response.status}`)
                }

                if (!response.body) return

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim()
                            if (!dataStr) continue
                            try {
                                const data = JSON.parse(dataStr)
                                if (data.unread_count !== undefined) {
                                    setUnreadCount(data.unread_count)
                                }
                            } catch (e) { }
                        }
                    }
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return
                // 网络异常或断开时，5秒后自动重连
                retryTimeout = setTimeout(connectSSE, 5000)
            }
        }

        connectSSE()

        // 当用户在通知页面主动标记已读时，为了UI“秒消失”立刻主动拉取一次
        const handleLocalRead = async () => {
            try {
                const count = await getUnreadCount()
                setUnreadCount(count)
            } catch (_) { }
        }
        window.addEventListener('notifications-read', handleLocalRead)

        return () => {
            abortController.abort()
            clearTimeout(retryTimeout)
            window.removeEventListener('notifications-read', handleLocalRead)
        }
    }, [role, token])

    // 医生端：建立全局聊天 SSE 长连接
    useEffect(() => {
        if (role !== 'doctor' || !token) return

        const abortController = new AbortController()
        let retryTimeout: NodeJS.Timeout

        const connectChatSSE = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const response = await fetch(`${apiUrl}/api/chat/stream/global/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal: abortController.signal
                })

                if (!response.ok) {
                    throw new Error(`Chat SSE error: ${response.status}`)
                }

                if (!response.body) return

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim()
                            if (!dataStr) continue
                            try {
                                const data = JSON.parse(dataStr)
                                if (data.type === 'unread_count' && data.count !== undefined) {
                                    setUnreadChatCount(data.count)
                                }
                            } catch (e) { }
                        }
                    }
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return
                retryTimeout = setTimeout(connectChatSSE, 5000)
            }
        }

        connectChatSSE()

        // 当用户主动标记聊天已读时，为了UI“立刻消失”主动收到的事件
        const handleChatLocalRead = () => {
            // Just let SSE naturally poll back, or decrement speculatively.
            // For now, we will wait for SSE to push if we don't have get global unread direct api,
            // but SSE triggers fast enough.
        }
        window.addEventListener('chat-read', handleChatLocalRead)

        return () => {
            abortController.abort()
            clearTimeout(retryTimeout)
            window.removeEventListener('chat-read', handleChatLocalRead)
        }
    }, [role, token])

    if (!role) return null

    const items = navItems[role] || []
    const gradientColor = roleColors[role]

    const badges: Record<string, number> = {
        unread: unreadCount,
        unreadChat: unreadChatCount,
    }

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-5 md:p-6 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                        gradientColor,
                        role === 'patient' && 'shadow-emerald-500/30',
                        role === 'doctor' && 'shadow-blue-500/30',
                        role === 'admin' && 'shadow-purple-500/30'
                    )}>
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                            中医智能诊疗
                        </h1>
                        <p className={cn(
                            "text-xs font-medium",
                            role === 'patient' && 'text-emerald-600 dark:text-emerald-400',
                            role === 'doctor' && 'text-blue-600 dark:text-blue-400',
                            role === 'admin' && 'text-purple-600 dark:text-purple-400'
                        )}>
                            {roleLabels[role]}
                        </p>
                    </div>
                </div>
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1 p-3 md:p-4 space-y-1.5">
                {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const badgeNum = item.badgeKey ? (badges[item.badgeKey] || 0) : 0
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150',
                                isActive
                                    ? cn('bg-gradient-to-r text-white shadow-md', gradientColor)
                                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                            )}
                        >
                            <span className="relative">
                                {item.icon}
                                {badgeNum > 0 && !isActive && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                                        {badgeNum > 99 ? '99+' : badgeNum}
                                    </span>
                                )}
                            </span>
                            {item.label}
                            {badgeNum > 0 && isActive && (
                                <span className="ml-auto bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                                    {badgeNum}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* 用户信息 */}
            <div className="p-3 md:p-4 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50">
                    <div className={cn(
                        "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                        gradientColor
                    )}>
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {user?.full_name || user?.username || '用户'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user?.email || roleLabels[role]}
                        </p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/50 transition-all duration-200"
                >
                    <LogOut className="w-4 h-4" />
                    退出登录
                </button>
            </div>
        </>
    )

    return (
        <>
            {/* 移动端汉堡按钮 */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/90 backdrop-blur-lg border border-slate-200/50 shadow-lg shadow-slate-200/20 dark:bg-slate-800/90 dark:border-slate-700/50 dark:shadow-slate-900/20 transition-transform active:scale-95"
                aria-label="打开菜单"
            >
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>

            {/* 移动端遮罩 */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in-scale"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* 移动端侧边栏 */}
            <aside
                className={cn(
                    "md:hidden fixed left-0 top-0 h-screen w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/50 dark:bg-slate-900/95 dark:border-slate-700/50 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-out",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* 关闭按钮 */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="关闭菜单"
                >
                    <X className="w-5 h-5 text-slate-500" />
                </button>
                <SidebarContent />
            </aside>

            {/* 桌面端侧边栏 */}
            <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50 flex-col shadow-xl shadow-slate-200/20 dark:shadow-slate-900/20">
                <SidebarContent />
            </aside>
        </>
    )
}

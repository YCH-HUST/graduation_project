"use client"

/**
 * 医生端布局 - 响应式
 */
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DoctorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard allowedRoles={['doctor']}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <Sidebar />
                {/* 主内容区：移动端无左边距，桌面端有侧边栏宽度的左边距 */}
                <main className="md:pl-64 transition-all duration-300">
                    <div className="p-4 pt-16 md:pt-8 md:p-8 max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGuard>
    )
}

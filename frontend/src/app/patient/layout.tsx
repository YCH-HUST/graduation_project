"use client"

/**
 * 患者端布局
 */
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Sidebar } from '@/components/layout/Sidebar'

export default function PatientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard allowedRoles={['patient']}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <Sidebar />
                <main className="pl-64">
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </AuthGuard>
    )
}

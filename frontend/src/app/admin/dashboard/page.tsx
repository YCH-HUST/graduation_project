"use client"

/**
 * 管理员端 - 系统仪表盘
 */
import { useEffect, useState, useCallback } from 'react'
import { getStatistics } from '@/api/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Loader2,
    Users,
    FileText,
    UserCheck,
    Stethoscope,
    ShieldCheck,
    Clock,
    TrendingUp,
    CheckCircle2,
    XCircle,
    AlertCircle,
} from 'lucide-react'
import type { AdminStatistics } from '@/types'

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStatistics | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const fetchStats = useCallback(async () => {
        try {
            setIsLoading(true)
            const data = await getStatistics()
            setStats(data)
        } catch (err: any) {
            console.error('Fetch statistics error:', err)
            toast.error('获取统计数据失败', {
                description: err.message || '请重试',
            })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="text-center py-12 text-slate-500">
                暂无数据
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                    系统仪表盘
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    系统整体运行状况概览
                </p>
            </div>

            {/* 用户统计 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">总用户</p>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.users.total}</p>
                            </div>
                            <Users className="w-10 h-10 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">患者</p>
                                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.users.patient}</p>
                            </div>
                            <UserCheck className="w-10 h-10 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">医生</p>
                                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">{stats.users.doctor}</p>
                            </div>
                            <Stethoscope className="w-10 h-10 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">管理员</p>
                                <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.users.admin}</p>
                            </div>
                            <ShieldCheck className="w-10 h-10 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 病例统计 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-500" />
                            病例统计
                        </CardTitle>
                        <CardDescription>各状态病例数量</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                                    <span className="text-slate-600 dark:text-slate-400">草稿</span>
                                </div>
                                <span className="font-medium">{stats.cases.draft}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-slate-600 dark:text-slate-400">处理中</span>
                                </div>
                                <span className="font-medium">{stats.cases.running}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <span className="text-slate-600 dark:text-slate-400">待审核</span>
                                </div>
                                <span className="font-medium">{stats.cases.pending_review}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-slate-600 dark:text-slate-400">已通过</span>
                                </div>
                                <span className="font-medium">{stats.cases.approved}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-slate-600 dark:text-slate-400">已驳回</span>
                                </div>
                                <span className="font-medium">{stats.cases.rejected}</span>
                            </div>
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between font-medium">
                                    <span>总计</span>
                                    <span className="text-lg">{stats.cases.total}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            本周趋势
                        </CardTitle>
                        <CardDescription>近7天病例创建数量</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.trend.map((item, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <span className="w-12 text-sm text-slate-500">{item.date}</span>
                                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                                            style={{
                                                width: `${Math.max(5, (item.count / Math.max(...stats.trend.map(t => t.count), 1)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <span className="w-8 text-sm font-medium text-right">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 今日数据 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-500" />
                        今日数据
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="text-center p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{stats.today.users}</p>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">新增用户</p>
                        </div>
                        <div className="text-center p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{stats.today.cases}</p>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">新增病例</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

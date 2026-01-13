"use client"

/**
 * 医生端 - 数据统计仪表盘
 */
import { useEffect, useState } from 'react'
import {
    getStatistics,
    StatisticsResponse,
} from '@/api/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
    BarChart3,
    Check,
    X,
    Clock,
    TrendingUp,
    Loader2,
    FileText,
    PieChart,
} from 'lucide-react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from 'recharts'

// 定义颜色
const COLORS = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

export default function StatisticsPage() {
    const [data, setData] = useState<StatisticsResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadStatistics()
    }, [])

    const loadStatistics = async () => {
        try {
            setIsLoading(true)
            const response = await getStatistics()
            setData(response)
        } catch (err: any) {
            console.error('Load statistics error:', err)
            toast.error('加载失败', { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">加载数据失败，请刷新重试</p>
            </div>
        )
    }

    const { overview, trend, syndromes, recent_reviews } = data

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                    数据统计
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    查看您的工作成果和诊疗数据
                </p>
            </div>

            {/* 概览卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400">审核总数</p>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                    {overview.total_reviews}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400">通过数</p>
                                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                                    {overview.approved_count}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 dark:text-red-400">驳回数</p>
                                <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                                    {overview.rejected_count}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 dark:text-purple-400">通过率</p>
                                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                                    {overview.approval_rate}%
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 待审核提示 */}
            {overview.pending_count > 0 && (
                <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <p className="text-amber-700 dark:text-amber-300">
                                当前有 <strong>{overview.pending_count}</strong> 个病例待审核
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 审核趋势 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            近7天审核趋势
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12 }}
                                        stroke="#94a3b8"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        stroke="#94a3b8"
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                        name="审核数"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 证候分布 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-purple-500" />
                            证候分布 Top {syndromes.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={syndromes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 12 }}
                                        stroke="#94a3b8"
                                        allowDecimals={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={100}
                                        tick={{ fontSize: 11 }}
                                        stroke="#94a3b8"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="count" name="病例数" radius={[0, 4, 4, 0]}>
                                        {syndromes.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 最近审核记录 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        最近审核记录
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recent_reviews.length > 0 ? (
                        <div className="space-y-3">
                            {recent_reviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${review.decision === 'approved'
                                                ? 'bg-green-100 dark:bg-green-900/30'
                                                : 'bg-red-100 dark:bg-red-900/30'
                                            }`}>
                                            {review.decision === 'approved' ? (
                                                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                {review.patient_name}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                病例 #{review.case_id.slice(0, 8)}...
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge
                                            variant={review.decision === 'approved' ? 'success' : 'destructive'}
                                        >
                                            {review.decision === 'approved' ? '通过' : '驳回'}
                                        </Badge>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {formatDateTime(review.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            暂无审核记录
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

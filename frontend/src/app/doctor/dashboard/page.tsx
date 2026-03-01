"use client"

/**
 * 医生端 - 病例管理（原待审病例列表）
 * 增强版：统计卡片 + Tab状态筛选 + 智能操作按钮
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getPendingCases } from '@/api/cases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCaseStatus, cn } from '@/lib/utils'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
    Loader2,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    ClipboardCheck,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    FolderOpen,
} from 'lucide-react'
import type { Case, PendingCasesResponse } from '@/types'

// 状态筛选Tab配置
const STATUS_TABS = [
    { key: 'all', label: '全部', icon: FolderOpen, color: 'text-slate-600 dark:text-slate-400' },
    { key: 'pending_review', label: '待审核', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'running', label: '诊断中', icon: ClipboardCheck, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'approved', label: '已通过', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
    { key: 'rejected', label: '已驳回', icon: XCircle, color: 'text-red-600 dark:text-red-400' },
]

export default function DoctorDashboardPage() {
    const router = useRouter()

    const [data, setData] = useState<PendingCasesResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all') // 默认显示全部
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10

    // 统计数据
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
    })

    const fetchCases = useCallback(async () => {
        try {
            setIsLoading(true)
            const params: any = {
                page: currentPage,
                page_size: pageSize,
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: searchQuery || undefined,
            }

            if (dateRange?.from) {
                params.start_date = format(dateRange.from, 'yyyy-MM-dd')
            }
            if (dateRange?.to) {
                params.end_date = format(dateRange.to, 'yyyy-MM-dd')
            }

            const response = await getPendingCases(params)
            setData(response)
        } catch (err: any) {
            console.error('Fetch cases error:', err)
            toast.error('加载失败', {
                description: err.message || '请刷新页面重试',
            })
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, searchQuery, statusFilter, dateRange])

    // 获取统计数据（全部状态）
    const fetchStats = useCallback(async () => {
        try {
            // 分别获取各状态的数量
            const [allRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
                getPendingCases({ page: 1, page_size: 1 }),
                getPendingCases({ page: 1, page_size: 1, status: 'pending_review' }),
                getPendingCases({ page: 1, page_size: 1, status: 'approved' }),
                getPendingCases({ page: 1, page_size: 1, status: 'rejected' }),
            ])
            setStats({
                total: allRes.total,
                pending: pendingRes.total,
                approved: approvedRes.total,
                rejected: rejectedRes.total,
            })
        } catch (err) {
            console.error('Fetch stats error:', err)
        }
    }, [])

    useEffect(() => {
        fetchCases()
    }, [fetchCases])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchCases()
    }

    const handleReset = () => {
        setSearchQuery('')
        setStatusFilter('all')
        setDateRange(undefined)
        setCurrentPage(1)
    }

    const handleRefresh = () => {
        fetchCases()
        fetchStats()
    }

    const handleStatusChange = (status: string) => {
        setStatusFilter(status)
        setCurrentPage(1)
    }

    const handleViewCase = (caseId: string) => {
        router.push(`/doctor/review/${caseId}`)
    }

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

    // 统计卡片配置
    const statCards = useMemo(() => [
        {
            label: '全部病例',
            value: stats.total,
            icon: FolderOpen,
            color: 'from-slate-500 to-slate-600',
            bgColor: 'bg-slate-50 dark:bg-slate-800/50',
            textColor: 'text-slate-600 dark:text-slate-400',
        },
        {
            label: '待审核',
            value: stats.pending,
            icon: Clock,
            color: 'from-amber-500 to-orange-500',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            textColor: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: '已通过',
            value: stats.approved,
            icon: CheckCircle2,
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            textColor: 'text-green-600 dark:text-green-400',
        },
        {
            label: '已驳回',
            value: stats.rejected,
            icon: XCircle,
            color: 'from-red-500 to-rose-500',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            textColor: 'text-red-600 dark:text-red-400',
        },
    ], [stats])

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        病例管理
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        查看和审核所有患者病例
                    </p>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新
                </Button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <Card key={card.label} className={cn("border-0 shadow-sm", card.bgColor)}>
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={cn("text-sm font-medium", card.textColor)}>{card.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                                        {card.value}
                                    </p>
                                </div>
                                <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", card.color)}>
                                    <card.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tab状态筛选 + 搜索栏 */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    {/* Tab状态筛选 */}
                    <div className="flex flex-wrap gap-2">
                        {STATUS_TABS.map((tab) => {
                            const isActive = statusFilter === tab.key
                            const TabIcon = tab.icon
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => handleStatusChange(tab.key)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-blue-500 text-white shadow-md shadow-blue-500/30"
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400"
                                    )}
                                >
                                    <TabIcon className="w-4 h-4" />
                                    {tab.label}
                                    {tab.key === 'pending_review' && stats.pending > 0 && (
                                        <Badge variant={isActive ? "secondary" : "destructive"} className="ml-1 px-1.5 py-0.5 text-xs">
                                            {stats.pending}
                                        </Badge>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* 搜索和日期筛选 */}
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-[300px]">
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={(date) => { setDateRange(date); setCurrentPage(1) }}
                            />
                        </div>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="搜索患者ID、姓名或主诉..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                                搜索
                            </Button>
                            <Button type="button" variant="ghost" onClick={handleReset}>
                                重置
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* 病例列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        病例列表
                        {data && (
                            <Badge variant="secondary" className="ml-2">
                                共 {data.total} 条
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : data && data.items.length > 0 ? (
                        <div className="space-y-4">
                            {/* 表格 */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                                病例 ID
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                                患者
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                                主诉
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                                创建时间
                                            </th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                                状态
                                            </th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                                操作
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((caseItem) => {
                                            const statusInfo = formatCaseStatus(caseItem.status)
                                            const isPending = caseItem.status === 'pending_review'
                                            return (
                                                <tr
                                                    key={caseItem.id}
                                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <td className="py-4 px-4">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            #{String(caseItem.id).slice(0, 8)}...
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                                {caseItem.patient_name || '未知'}
                                                            </p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                                ID: {caseItem.patient_id}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <p className="text-slate-700 dark:text-slate-300 max-w-xs truncate">
                                                            {caseItem.questionnaire.chief_complaint || '-'}
                                                        </p>
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                                        {formatDateTime(caseItem.created_at)}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <Badge
                                                            variant={
                                                                caseItem.status === 'pending_review'
                                                                    ? 'warning'
                                                                    : caseItem.status === 'approved'
                                                                        ? 'success'
                                                                        : caseItem.status === 'rejected'
                                                                            ? 'destructive'
                                                                            : 'secondary'
                                                            }
                                                        >
                                                            {statusInfo.text}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant={isPending ? "default" : "outline"}
                                                            onClick={() => handleViewCase(caseItem.id)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            {isPending ? '进入审核' : '查看详情'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, data.total)} 条，共 {data.total} 条
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            上一页
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            下一页
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                {statusFilter === 'pending_review' ? '暂无待审病例' : '暂无病例'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                {statusFilter === 'pending_review'
                                    ? '所有病例都已审核完成'
                                    : '当前筛选条件下没有病例'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

/**
 * 医生端 - 待审病例列表
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getPendingCases } from '@/api/cases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCaseStatus } from '@/lib/utils'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import {
    Loader2,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    ClipboardCheck,
} from 'lucide-react'
import type { Case, PendingCasesResponse } from '@/types'

export default function DoctorDashboardPage() {
    const router = useRouter()

    const [data, setData] = useState<PendingCasesResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('pending_review')
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10

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

    useEffect(() => {
        fetchCases()
    }, [fetchCases])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchCases()
    }

    // 重置所有筛选
    const handleReset = () => {
        setSearchQuery('')
        setStatusFilter('pending_review')
        setDateRange(undefined)
        setCurrentPage(1)
    }

    const handleRefresh = () => {
        fetchCases()
    }

    const handleReview = (caseId: number) => {
        router.push(`/doctor/review/${caseId}`)
    }

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        待审病例
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        审核患者提交的诊断结果
                    </p>
                </div>
                <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新
                </Button>
            </div>

            {/* 搜索和筛选栏 */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        {/* 状态筛选 */}
                        <div className="w-[180px]">
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="病例状态" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending_review">待审核</SelectItem>
                                    <SelectItem value="approved">已通过</SelectItem>
                                    <SelectItem value="rejected">已驳回</SelectItem>
                                    <SelectItem value="all">全部状态</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 日期筛选 */}
                        <div className="w-[300px]">
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={(date) => { setDateRange(date); setCurrentPage(1) }}
                            />
                        </div>

                        {/* 关键词搜索 */}
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
                        <ClipboardCheck className="w-5 h-5 text-blue-500" />
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
                                            return (
                                                <tr
                                                    key={caseItem.id}
                                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                                >
                                                    <td className="py-4 px-4">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            #{caseItem.id}
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
                                                                        : 'secondary'
                                                            }
                                                        >
                                                            {statusInfo.text}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleReview(caseItem.id)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            进入审核
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
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        第 {currentPage} / {totalPages} 页
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
                                暂无待审病例
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                所有病例都已审核完成
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

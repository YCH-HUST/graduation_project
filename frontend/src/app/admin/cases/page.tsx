"use client"

/**
 * 管理员端 - 病例管理
 */
import { useEffect, useState, useCallback } from 'react'
import { getCases, deleteCase } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import {
    Loader2,
    Trash2,
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
} from 'lucide-react'
import type { AdminCase, CaseStatus } from '@/types'

const statusLabels: Record<CaseStatus, string> = {
    created: '已创建',
    running: '处理中',
    pending_review: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    failed: '失败',
}

const statusColors: Record<CaseStatus, string> = {
    created: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
}

export default function AdminCasesPage() {
    const [cases, setCases] = useState<AdminCase[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const pageSize = 10

    // 删除确认
    const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchCases = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await getCases({
                page,
                page_size: pageSize,
                status: statusFilter === 'all' ? undefined : statusFilter,
                search: search || undefined,
            })
            setCases(response.items)
            setTotal(response.total)
        } catch (err: any) {
            console.error('Fetch cases error:', err)
            toast.error('获取病例列表失败')
        } finally {
            setIsLoading(false)
        }
    }, [page, statusFilter, search])

    useEffect(() => {
        fetchCases()
    }, [fetchCases])

    const handleDelete = async () => {
        if (!deleteCaseId) return
        try {
            setIsDeleting(true)
            await deleteCase(deleteCaseId)
            toast.success('病例已删除')
            setDeleteCaseId(null)
            fetchCases()
        } catch (err: any) {
            toast.error('删除失败', { description: err.response?.data?.detail || err.message })
        } finally {
            setIsDeleting(false)
        }
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                    病例管理
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    查看和管理系统中的所有病例
                </p>
            </div>

            {/* 搜索和筛选 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                className="pl-10"
                                placeholder="搜索患者姓名或主诉..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setPage(1)
                                }}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="状态" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部</SelectItem>
                                <SelectItem value="pending_review">待审核</SelectItem>
                                <SelectItem value="approved">已通过</SelectItem>
                                <SelectItem value="rejected">已驳回</SelectItem>
                                <SelectItem value="running">处理中</SelectItem>
                                <SelectItem value="failed">失败</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* 病例列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-500" />
                        病例列表
                    </CardTitle>
                    <CardDescription>共 {total} 个病例</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : cases.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">暂无病例</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">患者</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">主诉</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">医生</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">审核次数</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">创建时间</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cases.map((caseItem) => (
                                            <tr key={caseItem.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <p className="font-medium">{caseItem.patient_name || '-'}</p>
                                                        <p className="text-xs text-slate-500">@{caseItem.patient_username}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 max-w-xs truncate">
                                                    {caseItem.chief_complaint_text || '-'}
                                                </td>
                                                <td className="py-3 px-4">{caseItem.doctor_name || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <Badge className={statusColors[caseItem.status]}>
                                                        {statusLabels[caseItem.status]}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">{caseItem.review_count}</td>
                                                <td className="py-3 px-4 text-sm text-slate-500">
                                                    {formatDateTime(caseItem.created_at)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => setDeleteCaseId(caseItem.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <span className="text-sm text-slate-500">
                                        第 {page} 页，共 {totalPages} 页
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 删除确认对话框 */}
            <Dialog open={!!deleteCaseId} onOpenChange={() => setDeleteCaseId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                    </DialogHeader>
                    <p className="py-4">确定要删除此病例吗？此操作不可撤销，相关的审核记录和资源也将被删除。</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteCaseId(null)}>取消</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

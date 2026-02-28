"use client"

/**
 * 管理员端 - 系统操作日志
 */
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import apiClient from '@/api/client'
import {
    ScrollText,
    Loader2,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    User,
    FileText,
    LogIn,
    ShieldCheck,
    ShieldX,
    Play,
    Lock,
} from 'lucide-react'

interface AuditLogItem {
    id: number
    user: string
    user_role: string
    action: string
    action_display: string
    case_id: number | null
    details: Record<string, any>
    created_at: string
}

interface AuditLogResponse {
    items: AuditLogItem[]
    total: number
    page: number
    page_size: number
}

const ACTION_OPTIONS = [
    { value: '', label: '全部操作' },
    { value: 'login', label: '用户登录' },
    { value: 'case_create', label: '创建病例' },
    { value: 'pipeline_start', label: '启动流水线' },
    { value: 'review_approve', label: '审核通过' },
    { value: 'review_reject', label: '审核驳回' },
    { value: 'update_profile', label: '更新资料' },
    { value: 'change_password', label: '修改密码' },
]

const ACTION_STYLES: Record<string, { icon: React.ReactNode; variant: string; color: string }> = {
    login: { icon: <LogIn className="w-4 h-4" />, variant: 'secondary', color: 'text-blue-600' },
    case_create: { icon: <FileText className="w-4 h-4" />, variant: 'secondary', color: 'text-green-600' },
    pipeline_start: { icon: <Play className="w-4 h-4" />, variant: 'secondary', color: 'text-purple-600' },
    review_approve: { icon: <ShieldCheck className="w-4 h-4" />, variant: 'success', color: 'text-emerald-600' },
    review_reject: { icon: <ShieldX className="w-4 h-4" />, variant: 'destructive', color: 'text-red-600' },
    update_profile: { icon: <User className="w-4 h-4" />, variant: 'secondary', color: 'text-slate-600' },
    change_password: { icon: <Lock className="w-4 h-4" />, variant: 'secondary', color: 'text-amber-600' },
}

export default function AuditLogsPage() {
    const [data, setData] = useState<AuditLogResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [username, setUsername] = useState('')
    const [actionFilter, setActionFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 20

    const fetchLogs = useCallback(async (page: number = currentPage) => {
        try {
            setIsLoading(true)
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(pageSize),
                ...(username && { username }),
                ...(actionFilter && { action: actionFilter }),
                ...(startDate && { start_date: startDate }),
                ...(endDate && { end_date: endDate }),
            })
            const res = await apiClient.get<AuditLogResponse>(`/api/admin/audit-logs/?${params}`)
            setData(res.data)
        } catch (err: any) {
            toast.error('加载失败', { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, username, actionFilter, startDate, endDate])

    useEffect(() => {
        fetchLogs(currentPage)
    }, [currentPage])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchLogs(1)
    }

    const handleReset = () => {
        setUsername('')
        setActionFilter('')
        setStartDate('')
        setEndDate('')
        setCurrentPage(1)
        setTimeout(() => fetchLogs(1), 0)
    }

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

    const formatTime = (iso: string) => {
        const d = new Date(iso)
        return d.toLocaleString('zh-CN', { hour12: false })
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        系统操作日志
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">查看所有用户的操作记录</p>
                </div>
                <Button variant="outline" onClick={() => fetchLogs(currentPage)} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新
                </Button>
            </div>

            {/* 搜索筛选 */}
            <Card>
                <CardContent className="pt-5">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[160px] space-y-1">
                            <label className="text-xs font-medium text-slate-500">用户名</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input placeholder="搜索用户名..." value={username} onChange={e => setUsername(e.target.value)} className="pl-9" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">操作类型</label>
                            <select
                                value={actionFilter}
                                onChange={e => setActionFilter(e.target.value)}
                                className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">开始日期</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">结束日期</label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">查询</Button>
                            <Button type="button" variant="ghost" onClick={handleReset}>重置</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* 日志列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-purple-500" />
                        操作记录
                        {data && <Badge variant="secondary" className="ml-2">共 {data.total} 条</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    ) : data && data.items.length > 0 ? (
                        <div className="space-y-2">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                            <th className="text-left py-3 px-3 font-medium">时间</th>
                                            <th className="text-left py-3 px-3 font-medium">用户</th>
                                            <th className="text-left py-3 px-3 font-medium">操作</th>
                                            <th className="text-left py-3 px-3 font-medium">关联病例</th>
                                            <th className="text-left py-3 px-3 font-medium">详情</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map(log => {
                                            const style = ACTION_STYLES[log.action] || { icon: <ScrollText className="w-4 h-4" />, variant: 'secondary', color: 'text-slate-600' }
                                            return (
                                                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                                                    <td className="py-3 px-3">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">{log.user}</span>
                                                        {log.user_role && <span className="ml-2 text-xs text-slate-400">({log.user_role === 'doctor' ? '医生' : log.user_role === 'patient' ? '患者' : '管理员'})</span>}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={`flex items-center gap-1.5 font-medium ${style.color}`}>
                                                            {style.icon}
                                                            {log.action_display || log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-500">
                                                        {log.case_id ? `#${log.case_id}` : '—'}
                                                    </td>
                                                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                                                        {Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : '—'}
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
                                    <p className="text-sm text-slate-500">
                                        显示 {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.total)} 条，共 {data.total} 条
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                            <ChevronLeft className="w-4 h-4" />上一页
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                            下一页<ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">暂无操作日志</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

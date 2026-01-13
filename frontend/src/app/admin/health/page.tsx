"use client"

/**
 * 管理员端 - 服务健康检查页面
 */
import { useEffect, useState, useCallback } from 'react'
import { getHealth } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Loader2,
    RefreshCw,
    Activity,
    CheckCircle2,
    AlertTriangle,
    XCircle,
} from 'lucide-react'
import type { HealthResponse, ServiceHealth } from '@/types'

export default function AdminHealthPage() {
    const [data, setData] = useState<HealthResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

    const fetchHealth = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await getHealth()
            setData(response)
            setLastRefresh(new Date())
        } catch (err: any) {
            console.error('Fetch health error:', err)
            toast.error('获取健康状态失败', {
                description: err.message || '请重试',
            })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchHealth()
    }, [fetchHealth])

    const getStatusIcon = (status: ServiceHealth['status']) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'degraded':
                return <AlertTriangle className="w-5 h-5 text-amber-500" />
            case 'unhealthy':
                return <XCircle className="w-5 h-5 text-red-500" />
        }
    }

    const getStatusBadge = (status: ServiceHealth['status']) => {
        switch (status) {
            case 'healthy':
                return <Badge variant="success">健康</Badge>
            case 'degraded':
                return <Badge variant="warning">降级</Badge>
            case 'unhealthy':
                return <Badge variant="destructive">异常</Badge>
        }
    }

    const getOverallIcon = (status?: HealthResponse['overall_status']) => {
        switch (status) {
            case 'healthy':
                return (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                )
            case 'degraded':
                return (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-amber-500" />
                    </div>
                )
            case 'unhealthy':
                return (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                )
            default:
                return (
                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <Activity className="w-10 h-10 text-slate-400" />
                    </div>
                )
        }
    }

    const getOverallText = (status?: HealthResponse['overall_status']) => {
        switch (status) {
            case 'healthy':
                return { text: '系统运行正常', color: 'text-green-600 dark:text-green-400' }
            case 'degraded':
                return { text: '系统部分降级', color: 'text-amber-600 dark:text-amber-400' }
            case 'unhealthy':
                return { text: '系统存在异常', color: 'text-red-600 dark:text-red-400' }
            default:
                return { text: '加载中...', color: 'text-slate-500' }
        }
    }

    const overallInfo = getOverallText(data?.overall_status)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        健康检查
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        监控系统各项服务的运行状态
                    </p>
                </div>
                <Button variant="outline" onClick={fetchHealth} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新
                </Button>
            </div>

            {/* 总体状态 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            {getOverallIcon(data?.overall_status)}
                            <div>
                                <h2 className={`text-2xl font-bold ${overallInfo.color}`}>
                                    {overallInfo.text}
                                </h2>
                                {lastRefresh && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        最后更新: {formatDateTime(lastRefresh.toISOString())}
                                    </p>
                                )}
                            </div>
                        </div>
                        {data && (
                            <div className="text-right">
                                <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                                    {data.services.filter(s => s.status === 'healthy').length}/{data.services.length}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">服务正常</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 服务列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        服务状态
                    </CardTitle>
                    <CardDescription>各项后端服务的详细运行状态</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    ) : data ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            服务名称
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            状态
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            响应延迟
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            最后检查
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                            备注
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.services.map((service, index) => (
                                        <tr
                                            key={index}
                                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    {getStatusIcon(service.status)}
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                        {service.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">{getStatusBadge(service.status)}</td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={
                                                        service.latency_ms && service.latency_ms > 1000
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : 'text-slate-700 dark:text-slate-300'
                                                    }
                                                >
                                                    {service.latency_ms ? `${service.latency_ms}ms` : '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                                {formatDateTime(service.last_check)}
                                            </td>
                                            <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                                                {service.message || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            暂无数据
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

"use client"

/**
 * 医生端 - 消息通知中心
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    NotificationItem,
    NotificationsResponse,
} from '@/api/notifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Bell,
    Check,
    CheckCheck,
    Loader2,
    FileText,
    Info,
    AlertCircle,
    RefreshCw,
} from 'lucide-react'

export default function NotificationsPage() {
    const router = useRouter()
    const [data, setData] = useState<NotificationsResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
    const [markingAll, setMarkingAll] = useState(false)

    const loadNotifications = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await getNotifications()
            setData(response)
        } catch (err: any) {
            console.error('Load notifications error:', err)
            toast.error('加载失败', { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadNotifications()

        // 监听来自 SSE (Sidebar.tsx) 的新消息事件
        window.addEventListener('new-notification-arrived', loadNotifications)

        return () => {
            window.removeEventListener('new-notification-arrived', loadNotifications)
        }
    }, [loadNotifications])

    const handleMarkAsRead = async (notification: NotificationItem) => {
        if (notification.is_read) return

        try {
            await markAsRead(notification.id)
            // 更新本地状态
            if (data) {
                setData({
                    ...data,
                    items: data.items.map(n =>
                        n.id === notification.id ? { ...n, is_read: true } : n
                    ),
                    unread_count: Math.max(0, data.unread_count - 1),
                })
            }
            window.dispatchEvent(new Event('notifications-read'))
        } catch (err: any) {
            toast.error('操作失败', { description: err.message })
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            setMarkingAll(true)
            await markAllAsRead()
            // 更新本地状态
            if (data) {
                setData({
                    ...data,
                    items: data.items.map(n => ({ ...n, is_read: true })),
                    unread_count: 0,
                })
            }
            window.dispatchEvent(new Event('notifications-read'))
            toast.success('已全部标记为已读')
        } catch (err: any) {
            toast.error('操作失败', { description: err.message })
        } finally {
            setMarkingAll(false)
        }
    }

    const handleNotificationClick = (notification: NotificationItem) => {
        handleMarkAsRead(notification)

        // 如果有关联病例，跳转到病例详情
        if (notification.related_case_id) {
            router.push(`/doctor/review/${notification.related_case_id}`)
        }
    }

    const getNotificationIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'new_case':
                return <FileText className="w-5 h-5 text-blue-500" />
            case 'case_approved':
                return <Check className="w-5 h-5 text-green-500" />
            case 'case_rejected':
                return <AlertCircle className="w-5 h-5 text-red-500" />
            case 'system':
                return <Info className="w-5 h-5 text-purple-500" />
            default:
                return <Bell className="w-5 h-5 text-slate-500" />
        }
    }

    const getNotificationTypeLabel = (type: NotificationItem['type']) => {
        switch (type) {
            case 'new_case':
                return '新病例'
            case 'case_approved':
                return '已通过'
            case 'case_rejected':
                return '已驳回'
            case 'system':
                return '系统'
            default:
                return '通知'
        }
    }

    // 过滤通知
    const filteredItems = data?.items.filter(n => {
        if (filter === 'unread') return !n.is_read
        if (filter === 'read') return n.is_read
        return true
    }) || []

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        消息通知
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        查看系统通知和病例动态
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => loadNotifications()} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        刷新
                    </Button>
                    {data && data.unread_count > 0 && (
                        <Button onClick={handleMarkAllAsRead} disabled={markingAll}>
                            {markingAll ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCheck className="w-4 h-4" />
                            )}
                            全部已读
                        </Button>
                    )}
                </div>
            </div>

            {/* 筛选标签 */}
            <div className="flex gap-2">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    全部
                </Button>
                <Button
                    variant={filter === 'unread' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('unread')}
                >
                    未读
                    {data && data.unread_count > 0 && (
                        <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                            {data.unread_count}
                        </Badge>
                    )}
                </Button>
                <Button
                    variant={filter === 'read' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('read')}
                >
                    已读
                </Button>
            </div>

            {/* 通知列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-500" />
                        通知列表
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="space-y-3">
                            {filteredItems.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`
                                        flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-colors
                                        ${notification.is_read
                                            ? 'bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                            : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-l-4 border-blue-500'
                                        }
                                    `}
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="secondary" className="text-xs">
                                                {getNotificationTypeLabel(notification.type)}
                                            </Badge>
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                        <h3 className={`font-medium ${notification.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {notification.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                            {notification.content}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {formatDateTime(notification.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                {filter === 'unread' ? '没有未读通知' : filter === 'read' ? '没有已读通知' : '暂无通知'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                {filter === 'unread' ? '所有通知都已读' : '当有新消息时会在这里显示'}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

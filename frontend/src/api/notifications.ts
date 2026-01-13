/**
 * Notifications API - 通知接口
 */
import apiClient from './client'
import { isMockMode } from '@/lib/utils'

// 通知项
export interface NotificationItem {
    id: number
    type: 'new_case' | 'case_approved' | 'case_rejected' | 'system'
    title: string
    content: string
    related_case_id: string | null
    is_read: boolean
    created_at: string
}

// 通知列表响应
export interface NotificationsResponse {
    items: NotificationItem[]
    unread_count: number
}

/**
 * 获取通知列表
 */
export async function getNotifications(isRead?: boolean): Promise<NotificationsResponse> {
    if (isMockMode()) {
        return mockGetNotifications()
    }
    const params: Record<string, string> = {}
    if (isRead !== undefined) {
        params.is_read = isRead.toString()
    }
    const response = await apiClient.get<NotificationsResponse>('/api/notifications/', { params })
    return response.data
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(): Promise<number> {
    if (isMockMode()) {
        return mockUnreadCount
    }
    const response = await apiClient.get<{ count: number }>('/api/notifications/unread-count/')
    return response.data.count
}

/**
 * 标记单条通知已读
 */
export async function markAsRead(id: number): Promise<void> {
    if (isMockMode()) {
        return mockMarkAsRead(id)
    }
    await apiClient.put(`/api/notifications/${id}/read/`)
}

/**
 * 标记所有通知已读
 */
export async function markAllAsRead(): Promise<void> {
    if (isMockMode()) {
        return mockMarkAllAsRead()
    }
    await apiClient.put('/api/notifications/read-all/')
}

// ============ Mock 实现 ============

let mockUnreadCount = 3

let mockNotifications: NotificationItem[] = [
    {
        id: 1,
        type: 'new_case',
        title: '新病例待审核',
        content: '患者张三提交了新病例，请及时审核。',
        related_case_id: 'case-001',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 2,
        type: 'new_case',
        title: '新病例待审核',
        content: '患者李四提交了新病例，请及时审核。',
        related_case_id: 'case-002',
        is_read: false,
        created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
        id: 3,
        type: 'system',
        title: '系统公告',
        content: '系统将于今晚 22:00-23:00 进行维护升级。',
        related_case_id: null,
        is_read: false,
        created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 4,
        type: 'new_case',
        title: '新病例待审核',
        content: '患者王五提交了新病例，请及时审核。',
        related_case_id: 'case-003',
        is_read: true,
        created_at: new Date(Date.now() - 172800000).toISOString(),
    },
]

async function mockGetNotifications(): Promise<NotificationsResponse> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
        items: mockNotifications,
        unread_count: mockNotifications.filter(n => !n.is_read).length,
    }
}

async function mockMarkAsRead(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    const notification = mockNotifications.find(n => n.id === id)
    if (notification) {
        notification.is_read = true
        mockUnreadCount = mockNotifications.filter(n => !n.is_read).length
    }
}

async function mockMarkAllAsRead(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300))
    mockNotifications.forEach(n => n.is_read = true)
    mockUnreadCount = 0
}

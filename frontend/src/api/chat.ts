import apiClient from './client'
import { isMockMode } from '@/lib/utils'

export interface ChatMessage {
    id: number
    patient: number
    sender: number
    sender_name: string
    sender_role: string
    content: string
    is_read: boolean
    created_at: string
}

export interface ChatConversation {
    patient_id: number
    name: string
    latest_message: string
    updated_at: string
    unread_count: number
}

/**
 * 获取会话列表
 */
export async function getConversationList(): Promise<ChatConversation[]> {
    if (isMockMode()) return []
    const response = await apiClient.get<ChatConversation[]>('/api/chat/conversations/')
    return response.data
}

/**
 * 获取某个患者的历史聊天记录
 */
export async function getChatMessages(patientId: number): Promise<ChatMessage[]> {
    if (isMockMode()) return []
    const response = await apiClient.get<ChatMessage[]>(`/api/chat/${patientId}/messages/`)
    return response.data
}

/**
 * 发送一条聊天消息
 */
export async function sendChatMessage(patientId: number, content: string): Promise<ChatMessage> {
    if (isMockMode()) throw new Error('Mock mode not supported')
    const response = await apiClient.post<ChatMessage>(`/api/chat/${patientId}/messages/`, { content })
    return response.data
}

/**
 * 标记某个患者的所有收到消息为已读
 */
export async function markChatAsRead(patientId: number): Promise<void> {
    if (isMockMode()) return
    await apiClient.put(`/api/chat/${patientId}/read/`)
}

/**
 * 获取全局未读聊天数量
 */
export async function getChatUnreadCount(): Promise<number> {
    if (isMockMode()) return 0
    const response = await apiClient.get<{ count: number }>('/api/chat/unread-count/')
    return response.data.count
}

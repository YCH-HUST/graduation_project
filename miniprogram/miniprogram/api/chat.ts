import { request } from '../utils/request'

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

export const getConversationList = (): Promise<ChatConversation[]> => {
    return request<ChatConversation[]>('/api/chat/conversations/', { method: 'GET' })
}

export const getChatMessages = (patientId: string): Promise<ChatMessage[]> => {
    return request<ChatMessage[]>(`/api/chat/${patientId}/messages/`, { method: 'GET' })
}

export const sendChatMessage = (patientId: string, content: string): Promise<ChatMessage> => {
    return request<ChatMessage>(`/api/chat/${patientId}/messages/`, {
        method: 'POST',
        data: { content }
    })
}

// 注意：由于小程序对 SSE 支持需要特殊写法，可以在页面内使用 wx.request({ enableChunked: true })

export const markChatAsRead = (patientId: string | number): Promise<void> => {
    return request<void>(`/api/chat/${patientId}/read/`, { method: 'PUT' })
}

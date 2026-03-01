"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, User } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { getConversationList, markChatAsRead, ChatConversation } from '@/api/chat'
import { DoctorChatBox } from '@/components/chat/DoctorChatBox'

export default function DoctorChatsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [conversations, setConversations] = useState<ChatConversation[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // 从 URL 参数获取当前选中的 patientId
    const currentPatientId = searchParams.get('patientId') ? Number(searchParams.get('patientId')) : null

    const fetchConversations = async () => {
        try {
            const list = await getConversationList()
            setConversations(list)
        } catch (err) {
            console.error('获取会话列表失败', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchConversations()

        // 也可以加一个轮询，或者复用全局 SSE 收到未读更新时重新拉列表
        const handleNewNotification = () => fetchConversations()
        window.addEventListener('new-notification-arrived', handleNewNotification)
        window.addEventListener('new-chat-message-arrived', handleNewNotification)

        // 保底轮询
        const interval = setInterval(fetchConversations, 10000)

        return () => {
            window.removeEventListener('new-notification-arrived', handleNewNotification)
            window.removeEventListener('new-chat-message-arrived', handleNewNotification)
            clearInterval(interval)
        }
    }, [])

    const handleSelectConversation = async (patientId: number) => {
        router.push(`/doctor/chats?patientId=${patientId}`)
        // 选中时立刻标记为已读
        try {
            await markChatAsRead(patientId)
            // 更新本地列表红点
            setConversations(prev => prev.map(c =>
                c.patient_id === patientId ? { ...c, unread_count: 0 } : c
            ))
            // 通知全局红点减弱
            window.dispatchEvent(new Event('chat-read'))
        } catch (err) {
            console.error('标记已读失败', err)
        }
    }

    const selectedConv = conversations.find(c => c.patient_id === currentPatientId)

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4">
            {/* 左侧：联系人列表 */}
            <Card className="w-80 flex-shrink-0 flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-500" />
                        消息对话
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-slate-500">加载中...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            暂无历史对话
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {conversations.map((conv) => (
                                <div
                                    key={conv.patient_id}
                                    onClick={() => handleSelectConversation(conv.patient_id)}
                                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${currentPatientId === conv.patient_id
                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                        : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-medium flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            {conv.name}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {formatDateTime(conv.updated_at)}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pl-10">
                                        <div className="text-sm text-slate-500 truncate pr-4">
                                            {conv.latest_message}
                                        </div>
                                        {conv.unread_count > 0 && (
                                            <div className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                                                {conv.unread_count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* 右侧：聊天窗口 */}
            <Card className="flex-1 overflow-hidden bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 flex flex-col">
                {currentPatientId ? (
                    <DoctorChatBox
                        patientId={currentPatientId}
                        patientName={selectedConv?.name || '患者'}
                        mode="inline"
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <MessageCircle className="w-16 h-16 opacity-20" />
                        <p>请在左侧选择一个联系人开始对话</p>
                    </div>
                )}
            </Card>
        </div>
    )
}

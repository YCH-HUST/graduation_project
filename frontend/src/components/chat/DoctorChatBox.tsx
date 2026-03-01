"use client"

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, Send, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getChatMessages, sendChatMessage, ChatMessage } from '@/api/chat'
import { formatDateTime } from '@/lib/utils'

interface DoctorChatBoxProps {
    patientId: number
    patientName: string
    mode?: 'floating' | 'inline'
    initOpen?: boolean
}

export function DoctorChatBox({ patientId, patientName, mode = 'floating', initOpen = false }: DoctorChatBoxProps) {
    const { user, token } = useAuthStore()
    const [isOpen, setIsOpen] = useState(mode === 'inline' || initOpen)

    useEffect(() => {
        if (initOpen && mode === 'floating') {
            setIsOpen(true)
        }
    }, [initOpen, mode])
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputMsg, setInputMsg] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) {
            scrollToBottom()
        }
    }, [messages, isOpen])

    // Fetch initial messages and connect SSE
    useEffect(() => {
        if (!isOpen || !patientId || !token) return

        let abortController = new AbortController()

        const initChat = async () => {
            try {
                setIsLoading(true)
                // 1. Fetch history
                const history = await getChatMessages(patientId)
                setMessages(history)
                setIsLoading(false)

                // 2. Connect SSE
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const response = await fetch(`${apiUrl}/api/chat/${patientId}/stream/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    signal: abortController.signal
                })

                if (!response.body) return

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim()
                            if (!dataStr) continue
                            try {
                                const data = JSON.parse(dataStr)
                                if (data.type === 'new_messages') {
                                    setMessages(prev => {
                                        // 过滤掉已存在的 (利用 ID)
                                        const newMsgs = data.messages.filter(
                                            (m: ChatMessage) => !prev.find(p => p.id === m.id)
                                        )
                                        return [...prev, ...newMsgs]
                                    })
                                }
                            } catch (e) { }
                        }
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('SSE Error:', err)
                }
                setIsLoading(false)
            }
        }

        initChat()

        return () => {
            abortController.abort()
        }
    }, [isOpen, patientId, token, mode])

    const handleSend = async () => {
        if (!inputMsg.trim()) return
        try {
            setIsSending(true)
            const newMsg = await sendChatMessage(patientId, inputMsg)
            setMessages(prev => {
                if (prev.find(p => p.id === newMsg.id)) return prev
                return [...prev, newMsg]
            })
            setInputMsg('')
        } catch (err) {
            console.error(err)
        } finally {
            setIsSending(false)
        }
    }

    if (!isOpen && mode === 'floating') {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 rounded-full shadow-lg gap-2 z-40"
                size="lg"
            >
                <MessageSquare className="w-5 h-5" />
                医患交流
            </Button>
        )
    }

    const containerClasses = mode === 'inline'
        ? "w-full h-full flex flex-col border-none shadow-none bg-transparent"
        : "fixed bottom-6 right-6 w-96 h-[600px] max-h-[calc(100vh-120px)] flex flex-col z-50 shadow-2xl overflow-hidden border-slate-200 dark:border-slate-800"

    const headerClasses = mode === 'inline'
        ? "p-4 border-b flex flex-row items-center justify-between space-y-0 bg-transparent shrink-0"
        : "p-4 border-b flex flex-row items-center justify-between space-y-0 bg-white dark:bg-slate-950/80 backdrop-blur-md shrink-0"

    const messagesClasses = "flex-1 min-h-0 p-4 space-y-4 overflow-y-auto w-full overscroll-contain"

    return (
        <Card className={containerClasses}>
            <CardHeader className={headerClasses}>
                <CardTitle className="text-base flex items-center gap-2">
                    {mode === 'inline' ? (
                        <>
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            {patientName}
                        </>
                    ) : (
                        <>
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            与 {patientName} 沟通中
                        </>
                    )}
                </CardTitle>
                {mode === 'floating' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIsOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className={`p-0 flex-1 min-h-0 flex flex-col ${mode === 'inline' ? '' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                <div className={messagesClasses}>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-slate-400 mt-10 text-sm">
                            暂无消息，可以发送以开始沟通
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender === user?.id
                            return (
                                <div key={msg.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] pb-1`}>
                                        <div className={`p-3 text-sm shadow-sm break-words ${isMe
                                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                            : 'bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{formatDateTime(msg.created_at)}</span>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 bg-white dark:bg-slate-950 border-t flex flex-row items-center gap-3">
                    <Input
                        placeholder="输入消息..."
                        className="flex-1"
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSend()
                        }}
                    />
                    <Button onClick={handleSend} disabled={isSending || !inputMsg.trim()} size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

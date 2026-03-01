import { getChatMessages, sendChatMessage, markChatAsRead, ChatMessage } from '../../api/chat'
import { formatTime } from '../../utils/util'
import { getUser } from '../../utils/storage'

const app = getApp<{ globalData: { baseUrl?: string } }>()

// 简易 UTF-8 ArrayBuffer 到 String 转换
function decodeUTF8(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let out = '';
    let i = 0;
    while (i < bytes.length) {
        let c = bytes[i++];
        if (c < 128) {
            out += String.fromCharCode(c);
        } else if (c > 191 && c < 224) {
            let c2 = bytes[i++];
            out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        } else if (c > 223 && c < 240) {
            let c2 = bytes[i++];
            let c3 = bytes[i++];
            out += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        } else {
            let c2 = bytes[i++];
            let c3 = bytes[i++];
            let c4 = bytes[i++];
            let cp = ((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63);
            if (cp > 0xFFFF) {
                cp -= 0x10000;
                out += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
            } else {
                out += String.fromCharCode(cp);
            }
        }
    }
    return out;
}

Page({
    data: {
        patientId: '',
        messages: [] as (ChatMessage & { formatTime: string })[],
        myUserId: 0,
        inputValue: '',
        isLoading: true,
        isSending: false,
        scrollToMessage: ''
    },

    requestTask: null as WechatMiniprogram.RequestTask | null,

    onLoad(options: Record<string, string | undefined>) {
        const { patient_id } = options
        if (patient_id) {
            this.setData({ patientId: patient_id })
            this.initUser()
            this.loadHistoryAndConnectSSE(patient_id)
            // mark unread as clear
            markChatAsRead(patient_id).catch(() => { })
        } else {
            wx.showToast({ title: '参数错误', icon: 'error' })
        }
    },

    onUnload() {
        if (this.requestTask) {
            this.requestTask.abort()
            this.requestTask = null
        }
    },

    initUser() {
        const userInfo = getUser()
        if (userInfo && userInfo.id) {
            this.setData({ myUserId: userInfo.id })
        }
    },

    async loadHistoryAndConnectSSE(patientId: string) {
        try {
            this.setData({ isLoading: true })
            const history = await getChatMessages(patientId)

            const formattedHistory = history.map(msg => ({
                ...msg,
                formatTime: formatTime(new Date(msg.created_at))
            }))

            this.setData({
                messages: formattedHistory,
                isLoading: false
            }, () => {
                this.scrollToBottom()
            })

            // 建立 SSE (使用 wx.request enableChunked)
            this.connectSSE(patientId)

        } catch (err) {
            console.error('加载历史记录失败:', err)
            this.setData({ isLoading: false })
            wx.showToast({ title: '加载失败', icon: 'none' })
        }
    },

    connectSSE(patientId: string) {
        // 处理开发环境和生产环境的基础URL
        const baseUrl = (app && app.globalData && app.globalData.baseUrl) ? app.globalData.baseUrl : 'http://localhost:8000'
        const token = wx.getStorageSync('token')

        if (this.requestTask) {
            this.requestTask.abort()
        }

        // Cast to any because miniprogram-api-typings lacks enableChunked
        this.requestTask = (wx.request as any)({
            url: `${baseUrl}/api/chat/${patientId}/stream/`,
            method: 'GET',
            enableChunked: true,
            header: {
                'Authorization': `Bearer ${token}`
            },
            success: () => {
                console.log('SSE closed normally')
            },
            fail: (err: any) => {
                if (err.errMsg.indexOf('abort') > -1) return
                console.error('SSE Error:', err)
                setTimeout(() => {
                    if (this.data.patientId) this.connectSSE(patientId)
                }, 5000)
            }
        })

        let buffer = ''
        if (this.requestTask) {
            (this.requestTask as any).onChunkReceived((res: any) => {
                try {
                    const textChunk = decodeUTF8(res.data)
                    buffer += textChunk

                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim()
                            if (!dataStr) continue
                            try {
                                const parsed = JSON.parse(dataStr)
                                if (parsed.type === 'new_messages') {
                                    const newFormatted = parsed.messages.map((m: ChatMessage) => ({
                                        ...m,
                                        formatTime: formatTime(new Date(m.created_at))
                                    }))

                                    const prev = this.data.messages
                                    const filteredNew = newFormatted.filter(
                                        (nm: ChatMessage) => !prev.find(p => p.id === nm.id)
                                    )

                                    if (filteredNew.length > 0) {
                                        this.setData({
                                            messages: [...prev, ...filteredNew]
                                        }, () => {
                                            this.scrollToBottom()
                                        })
                                    }
                                }
                            } catch (e) { }
                        }
                    }
                } catch (err) { }
            })
        }
    },

    onInput(e: any) {
        this.setData({ inputValue: e.detail.value })
    },

    async onSend() {
        const content = this.data.inputValue.trim()
        if (!content || this.data.isSending) return

        try {
            this.setData({ isSending: true })
            const newMsg = await sendChatMessage(this.data.patientId, content)

            const formattedMsg = {
                ...newMsg,
                formatTime: formatTime(new Date(newMsg.created_at))
            }

            // 发送成功后立刻添加到本地列表，解决发信后不显示的问题
            const currentMessages = this.data.messages || []
            // 防重处理，万一SSE跑得比这还快
            if (!currentMessages.find(p => p.id === formattedMsg.id)) {
                this.setData({
                    inputValue: '',
                    isSending: false,
                    messages: [...currentMessages, formattedMsg]
                }, () => {
                    this.scrollToBottom()
                })
            } else {
                this.setData({ inputValue: '', isSending: false })
            }
        } catch (err) {
            console.error(err)
            this.setData({ isSending: false })
            wx.showToast({ title: '发送失败', icon: 'none' })
        }
    },

    scrollToBottom() {
        const msgs = this.data.messages
        if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1]
            this.setData({
                scrollToMessage: `msg-${lastMsg.id}`
            })
        }
    }
})

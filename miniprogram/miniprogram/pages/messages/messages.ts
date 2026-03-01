import { getConversationList, ChatConversation } from '../../api/chat'
import { formatTime } from '../../utils/util'

const app = getApp<{ globalData: { baseUrl?: string } }>()

Page({
    data: {
        conversations: [] as (ChatConversation & { formatTime: string })[],
        isLoading: true,
    },

    requestTask: null as WechatMiniprogram.RequestTask | null,

    onLoad() {
        this.fetchConversations()
    },

    onShow() {
        this.fetchConversations()
        if (!this.requestTask) {
            this.connectGlobalSSE()
        }
    },

    onHide() {
        if (this.requestTask) {
            this.requestTask.abort()
            this.requestTask = null
        }
    },

    onUnload() {
        if (this.requestTask) {
            this.requestTask.abort()
            this.requestTask = null
        }
    },

    async fetchConversations() {
        try {
            const list = await getConversationList()
            const formatted = list.map(item => ({
                ...item,
                formatTime: formatTime(new Date(item.updated_at))
            }))
            this.setData({ conversations: formatted, isLoading: false })

            const totalUnread = list.reduce((sum, item) => sum + item.unread_count, 0)
            this.updateBadge(totalUnread)
        } catch (err) {
            console.error(err)
            this.setData({ isLoading: false })
        }
    },

    connectGlobalSSE() {
        const baseUrl = (app && app.globalData && app.globalData.baseUrl) ? app.globalData.baseUrl : 'http://localhost:8000'
        const token = wx.getStorageSync('token')
        if (!token) return

        if (this.requestTask) {
            this.requestTask.abort()
        }

        // using any because enableChunked varies across miniprogram compilation types
        this.requestTask = (wx.request as any)({
            url: `${baseUrl}/api/chat/stream/global/`,
            method: 'GET',
            enableChunked: true,
            header: {
                'Authorization': `Bearer ${token}`
            },
            success: () => {
                console.log('Global SSE closed normally')
                this.requestTask = null
            },
            fail: (err: any) => {
                if (err.errMsg.indexOf('abort') > -1) return
                console.error('Global SSE Error:', err)
                this.requestTask = null
                setTimeout(() => {
                    this.connectGlobalSSE()
                }, 5000)
            }
        })

        let buffer = ''
        if (this.requestTask) {
            (this.requestTask as any).onChunkReceived((res: any) => {
                try {
                    const bytes = new Uint8Array(res.data)
                    let textChunk = ''
                    for (let i = 0; i < bytes.length; i++) {
                        textChunk += String.fromCharCode(bytes[i])
                    }

                    buffer += textChunk
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim()
                            if (!dataStr) continue
                            try {
                                const parsed = JSON.parse(dataStr)
                                if (parsed.type === 'unread_count' && parsed.count !== undefined) {
                                    this.updateBadge(parsed.count)
                                    // reload conv list softly
                                    this.fetchConversations()
                                }
                            } catch (e) { }
                        }
                    }
                } catch (err) { }
            })
        }
    },

    updateBadge(count: number) {
        if (count > 0) {
            wx.setTabBarBadge({
                index: 1, // index 1 is '消息' currently
                text: count > 99 ? '99+' : String(count)
            }).catch(() => { })
        } else {
            wx.removeTabBarBadge({
                index: 1
            }).catch(() => { })
        }
    },

    goToChat(e: WechatMiniprogram.TouchEvent) {
        const patientId = e.currentTarget.dataset.id
        wx.navigateTo({
            url: `/pages/chat/chat?patient_id=${patientId}`
        })
    }
})

// pages/home/home.ts
import { getProfile } from '../../api/profile'
import { getCaseList } from '../../api/cases'
import { getUser, isLoggedIn } from '../../utils/storage'
import { STATUS_TEXT, STATUS_COLOR } from '../../utils/constants'
import type { CaseListItem } from '../../api/cases'

Page({
    data: {
        userInfo: null as any,
        userInitial: '' as string,
        recentCases: [] as CaseListItem[],
        stats: {
            pending_review: 0,
            running: 0,
            approved: 0,
        },
        isLoading: true,
        casesLoading: true,
    },

    onLoad() {
        if (!isLoggedIn()) {
            wx.reLaunch({ url: '/pages/login/login' })
            return
        }
        // 先用缓存快速展示
        const cached = getUser()
        if (cached) this.setData({ userInfo: cached })
        this.loadData()
    },

    onShow() {
        if (!isLoggedIn()) {
            wx.reLaunch({ url: '/pages/login/login' })
            return
        }
        // 每次显示时刷新数据（从 profile 页返回后更新姓名等）
        this.loadData()
    },

    async loadData() {
        this.setData({ isLoading: true, casesLoading: true })
        try {
            const [profile, casesRes] = await Promise.all([
                getProfile(),
                getCaseList({ page: 1, page_size: 5 }),
            ])
            const cases = casesRes.items

            // 统计
            const stats = { pending_review: 0, running: 0, approved: 0 }
            cases.forEach((c) => {
                if (c.status === 'pending_review') stats.pending_review++
                if (c.status === 'running' || c.status === 'created') stats.running++
                if (c.status === 'approved') stats.approved++
            })

            // 格式化列表
            const formattedCases = cases.map((c) => ({
                ...c,
                chief_complaint: c.questionnaire?.chief_complaint || '无主诉',
                statusText: STATUS_TEXT[c.status] || c.status,
                statusColor: STATUS_COLOR[c.status] || '#94a3b8',
                statusBgClass: `badge-${c.status}`,
                timeText: this.formatTime(c.created_at),
            }))

            this.setData({
                userInfo: profile,
                userInitial: (profile.full_name || profile.username || '?').charAt(0),
                recentCases: formattedCases as any,
                stats,
                isLoading: false,
                casesLoading: false,
            })
        } catch (err: any) {
            wx.showToast({ title: err.message || '加载失败', icon: 'none' })
            this.setData({ isLoading: false, casesLoading: false })
        }
    },

    formatTime(isoStr: string): string {
        try {
            const d = new Date(isoStr)
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const hour = String(d.getHours()).padStart(2, '0')
            const min = String(d.getMinutes()).padStart(2, '0')
            return `${month}-${day} ${hour}:${min}`
        } catch {
            return ''
        }
    },

    onViewCase(e: WechatMiniprogram.TouchEvent) {
        const caseId = e.currentTarget.dataset.id
        wx.navigateTo({ url: `/pages/case-detail/case-detail?id=${caseId}` })
    },

    onNewCase() {
        wx.navigateTo({ url: '/pages/new-case/new-case' })
    },

    onProfile() {
        wx.switchTab({ url: '/pages/profile/profile' })
    },

    onMedication() {
        wx.navigateTo({ url: '/pages/medication/medication' })
    },

    onPullDownRefresh() {
        this.loadData().then(() => wx.stopPullDownRefresh())
    },
})

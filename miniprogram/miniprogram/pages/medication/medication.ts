import { getCurrentPlan, submitMedicationLog } from '../../api/followups'

Page({
    data: {
        plan: null as any,
        isLoading: true,
        today: '',
        feedback: '',
        slots: [
            { key: 'morning', name: '晨间服药', icon: '🌅', taken: false },
            { key: 'afternoon', name: '午后服药', icon: '☀️', taken: false },
            { key: 'evening', name: '晚间服药', icon: '🌙', taken: false }
        ]
    },

    onLoad() {
        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        this.setData({ today: todayStr })
        this.refreshData()
    },

    onPullDownRefresh() {
        this.refreshData().then(() => wx.stopPullDownRefresh())
    },

    async refreshData() {
        this.setData({ isLoading: true })
        try {
            const plan = await getCurrentPlan()

            // 处理今日已打卡记录
            const todayLogs = (plan.logs || []).filter((l: any) => l.date === this.data.today)
            const newSlots = this.data.slots.map(s => {
                const log = todayLogs.find((l: any) => l.slot === s.key)
                return { ...s, taken: log ? log.taken : false }
            })

            // 找今日的反馈
            const lastFeedback = todayLogs.find((l: any) => l.feedback)?.feedback || ''

            this.setData({
                plan,
                slots: newSlots,
                feedback: lastFeedback,
                isLoading: false
            })
        } catch (_err) {
            // 404 = 没有计划，属于正常业务
            this.setData({ plan: null, isLoading: false })
        }
    },

    async onToggleCheck(e: any) {
        const { slot, taken } = e.currentTarget.dataset
        if (taken) return

        wx.showLoading({ title: '提交中' })
        try {
            await submitMedicationLog({
                plan: this.data.plan.id,
                date: this.data.today,
                slot: slot,
                taken: true
            })
            wx.hideLoading()
            wx.showToast({ title: '打卡成功', icon: 'success' })
            this.refreshData()
        } catch (err: any) {
            wx.hideLoading()
            wx.showToast({ title: err.message || '打卡失败', icon: 'error' })
        }
    },

    onFeedbackInput(e: any) {
        this.setData({ feedback: e.detail.value })
    },

    async onSubmitFeedback() {
        if (!this.data.feedback.trim()) {
            wx.showToast({ title: '请输入内容', icon: 'none' })
            return
        }

        wx.showLoading({ title: '保存中' })
        try {
            // 优先使用已打卡的时段；若均未打卡，则以 morning 存储反馈（不强制 taken=true）
            const takenSlot = this.data.slots.find(s => s.taken)
            const targetSlot = takenSlot?.key || 'morning'

            await submitMedicationLog({
                plan: this.data.plan.id,
                date: this.data.today,
                slot: targetSlot as any,
                taken: takenSlot ? true : false,
                feedback: this.data.feedback
            })
            wx.hideLoading()
            wx.showToast({ title: '反馈已保存', icon: 'success' })
            // 刷新数据使 UI 与后端同步
            this.refreshData()
        } catch (err: any) {
            wx.hideLoading()
            wx.showToast({ title: err.message || '保存失败', icon: 'none' })
        }
    }
})

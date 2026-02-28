// pages/profile/profile.ts
import { getProfile, updateProfile, changePassword } from '../../api/profile'
import { setUser, clearAuth, isLoggedIn } from '../../utils/storage'

Page({
    data: {
        profile: null as any,
        userInitial: '' as string,
        formData: {
            full_name: '',
            email: '',
            gender: '',
            age: '' as string | number,
        },
        pwForm: {
            old_password: '',
            new_password: '',
            confirm_password: '',
        },
        isLoading: true,
        isSaving: false,
        isChangingPw: false,
        username: '',
    },

    onLoad() {
        if (!isLoggedIn()) {
            wx.reLaunch({ url: '/pages/login/login' })
            return
        }
        this.loadProfile()
    },

    onShow() {
        if (!isLoggedIn()) {
            wx.reLaunch({ url: '/pages/login/login' })
        }
    },

    async loadProfile() {
        this.setData({ isLoading: true })
        try {
            const profile = await getProfile()
            this.setData({
                profile,
                username: profile.username,
                userInitial: (profile.full_name || profile.username || '?').charAt(0),
                formData: {
                    full_name: profile.full_name || '',
                    email: profile.email || '',
                    gender: profile.gender || '',
                    age: profile.age ?? '',
                },
                isLoading: false,
            })
        } catch (err: any) {
            wx.showToast({ title: err.message || '加载失败', icon: 'none' })
            this.setData({ isLoading: false })
        }
    },

    onInput(e: WechatMiniprogram.Input) {
        const field = e.currentTarget.dataset.field
        this.setData({ [`formData.${field}`]: e.detail.value })
    },

    onGenderSelect(e: WechatMiniprogram.TouchEvent) {
        this.setData({ 'formData.gender': e.currentTarget.dataset.gender })
    },

    async onSave() {
        this.setData({ isSaving: true })
        try {
            const { formData } = this.data
            const updateData: any = {
                full_name: formData.full_name || undefined,
                email: formData.email || undefined,
                gender: formData.gender || undefined,
                age: formData.age ? Number(formData.age) : undefined,
            }
            const updated = await updateProfile(updateData)
            setUser(updated as any)
            // 立即更新头像首字和 profile，无需重进页面
            this.setData({
                profile: updated,
                userInitial: (updated.full_name || updated.username || '?').charAt(0),
            })
            wx.showToast({ title: '保存成功', icon: 'success' })
        } catch (err: any) {
            wx.showToast({ title: err.message || '保存失败', icon: 'none' })
        } finally {
            this.setData({ isSaving: false })
        }
    },

    onPwInput(e: WechatMiniprogram.Input) {
        const field = e.currentTarget.dataset.field
        this.setData({ [`pwForm.${field}`]: e.detail.value })
    },

    async onChangePassword() {
        const { old_password, new_password, confirm_password } = this.data.pwForm
        if (!old_password || !new_password || !confirm_password) {
            wx.showToast({ title: '请填写所有字段', icon: 'none' })
            return
        }
        this.setData({ isChangingPw: true })
        try {
            const res = await changePassword({ old_password, new_password, confirm_password })
            wx.showToast({ title: res.detail || '修改成功', icon: 'success' })
            this.setData({ pwForm: { old_password: '', new_password: '', confirm_password: '' } })
        } catch (err: any) {
            wx.showToast({ title: err.message || '修改失败', icon: 'none' })
        } finally {
            this.setData({ isChangingPw: false })
        }
    },

    onLogout() {
        wx.showModal({
            title: '退出登录',
            content: '确定要退出登录吗？',
            success: (res) => {
                if (res.confirm) {
                    clearAuth()
                    wx.reLaunch({ url: '/pages/login/login' })
                }
            },
        })
    },

    onPullDownRefresh() {
        this.loadProfile().then(() => wx.stopPullDownRefresh())
    },
})

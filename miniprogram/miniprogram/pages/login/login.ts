// pages/login/login.ts
import { login, register } from '../../api/auth'
import { setToken, setUser, setRole } from '../../utils/storage'

type TabType = 'login' | 'register'
type GenderType = 'male' | 'female' | ''

Page({
    data: {
        activeTab: 'login' as TabType,
        // 登录表单
        loginForm: {
            username: '',
            password: '',
        },
        // 注册表单
        registerForm: {
            username: '',
            password: '',
            full_name: '',
            email: '',
            gender: '' as GenderType,
        },
        isLoading: false,
        loginError: '',
        registerError: '',
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
        const tab = e.currentTarget.dataset.tab as TabType
        this.setData({ activeTab: tab, loginError: '', registerError: '' })
    },

    onLoginInput(e: WechatMiniprogram.Input) {
        const field = e.currentTarget.dataset.field as string
        this.setData({ [`loginForm.${field}`]: e.detail.value })
    },

    onRegisterInput(e: WechatMiniprogram.Input) {
        const field = e.currentTarget.dataset.field as string
        this.setData({ [`registerForm.${field}`]: e.detail.value })
    },

    onGenderChange(e: WechatMiniprogram.TouchEvent) {
        this.setData({ 'registerForm.gender': e.currentTarget.dataset.gender as GenderType })
    },

    async onLogin() {
        const { username, password } = this.data.loginForm
        if (!username.trim()) {
            this.setData({ loginError: '请输入用户名' })
            return
        }
        if (!password) {
            this.setData({ loginError: '请输入密码' })
            return
        }

        this.setData({ isLoading: true, loginError: '' })
        try {
            const res = await login({ username: username.trim(), password })
            if (res.role !== 'patient') {
                this.setData({ loginError: '该账号不是患者账号，请使用患者账号登录' })
                return
            }
            setToken(res.token)
            setUser(res.user as any)
            setRole(res.role)
            wx.showToast({ title: '登录成功', icon: 'success' })
            setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 500)
        } catch (err: any) {
            this.setData({ loginError: err.message || '登录失败，请检查用户名和密码' })
        } finally {
            this.setData({ isLoading: false })
        }
    },

    async onRegister() {
        const { username, password, full_name, email } = this.data.registerForm
        if (!username.trim()) {
            this.setData({ registerError: '请输入用户名' })
            return
        }
        if (password.length < 6) {
            this.setData({ registerError: '密码至少 6 位' })
            return
        }

        this.setData({ isLoading: true, registerError: '' })
        try {
            const res = await register({
                username: username.trim(),
                password,
                full_name: full_name.trim() || undefined,
                email: email.trim() || undefined,
                role: 'patient',
            })
            setToken(res.token)
            setUser(res.user as any)
            setRole(res.role)
            wx.showToast({ title: '注册成功', icon: 'success' })
            setTimeout(() => wx.switchTab({ url: '/pages/home/home' }), 500)
        } catch (err: any) {
            this.setData({ registerError: err.message || '注册失败，请稍后重试' })
        } finally {
            this.setData({ isLoading: false })
        }
    },
})

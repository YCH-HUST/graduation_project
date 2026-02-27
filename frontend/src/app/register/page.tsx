"use client"

/**
 * 注册页面
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { register as registerApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { Activity, Eye, EyeOff, Loader2, UserPlus, User, Stethoscope } from 'lucide-react'
import type { UserRole } from '@/types'

export default function RegisterPage() {
    const router = useRouter()
    const { login } = useAuthStore()

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        full_name: '',
        role: 'patient' as UserRole,
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // 更新表单字段
    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    // 表单校验
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.username.trim()) {
            newErrors.username = '请输入用户名'
        } else if (formData.username.length < 3) {
            newErrors.username = '用户名至少 3 个字符'
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = '用户名只能包含字母、数字和下划线'
        }

        if (!formData.password) {
            newErrors.password = '请输入密码'
        } else if (formData.password.length < 6) {
            newErrors.password = '密码至少 6 个字符'
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = '请确认密码'
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '两次密码输入不一致'
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = '邮箱格式不正确'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // 提交注册
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setIsLoading(true)

        try {
            const response = await registerApi({
                username: formData.username,
                password: formData.password,
                email: formData.email || undefined,
                full_name: formData.full_name || undefined,
                role: formData.role,
            })

            // 存储登录信息
            login(response.token, response.user, response.role)

            toast.success('注册成功', {
                description: `欢迎加入，${response.user.full_name || response.user.username}`,
            })

            // 根据角色跳转到对应首页
            const roleRedirects: Record<UserRole, string> = {
                patient: '/login',  // 患者端已迁移至微信小程序
                doctor: '/doctor/dashboard',
                admin: '/admin/health',
            }
            router.push(roleRedirects[response.role])
        } catch (error: any) {
            console.error('Register error:', error)
            toast.error('注册失败', {
                description: error.message || '请稍后重试',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* 背景装饰 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative">
                <CardHeader className="text-center pb-2">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-float">
                            <Activity className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">注册账号</CardTitle>
                    <CardDescription className="mt-2">
                        创建账号以使用中医智能诊疗系统
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 用户名 */}
                        <div className="space-y-2">
                            <Label htmlFor="username">
                                用户名 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="请输入用户名"
                                value={formData.username}
                                onChange={(e) => updateField('username', e.target.value)}
                                disabled={isLoading}
                                className={errors.username ? 'border-red-500 focus-visible:border-red-500' : ''}
                            />
                            {errors.username && (
                                <p className="text-sm text-red-500">{errors.username}</p>
                            )}
                        </div>

                        {/* 密码 */}
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                密码 <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="请输入密码（至少6位）"
                                    value={formData.password}
                                    onChange={(e) => updateField('password', e.target.value)}
                                    disabled={isLoading}
                                    className={errors.password ? 'border-red-500 focus-visible:border-red-500 pr-10' : 'pr-10'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-red-500">{errors.password}</p>
                            )}
                        </div>

                        {/* 确认密码 */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                确认密码 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="请再次输入密码"
                                value={formData.confirmPassword}
                                onChange={(e) => updateField('confirmPassword', e.target.value)}
                                disabled={isLoading}
                                className={errors.confirmPassword ? 'border-red-500 focus-visible:border-red-500' : ''}
                            />
                            {errors.confirmPassword && (
                                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                            )}
                        </div>

                        {/* 邮箱 */}
                        <div className="space-y-2">
                            <Label htmlFor="email">邮箱</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="选填，用于接收通知"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                disabled={isLoading}
                                className={errors.email ? 'border-red-500 focus-visible:border-red-500' : ''}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email}</p>
                            )}
                        </div>

                        {/* 姓名 */}
                        <div className="space-y-2">
                            <Label htmlFor="full_name">姓名</Label>
                            <Input
                                id="full_name"
                                type="text"
                                placeholder="选填，用于显示"
                                value={formData.full_name}
                                onChange={(e) => updateField('full_name', e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* 角色选择 */}
                        <div className="space-y-2">
                            <Label>注册身份 <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, role: 'patient' }))}
                                    disabled={isLoading}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.role === 'patient'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <User className="w-5 h-5" />
                                    <span className="font-medium">患者</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, role: 'doctor' }))}
                                    disabled={isLoading}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.role === 'doctor'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <Stethoscope className="w-5 h-5" />
                                    <span className="font-medium">医生</span>
                                </button>
                            </div>
                        </div>

                        {/* 注册按钮 */}
                        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    注册中...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    注册
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        已有账号？{' '}
                        <Link
                            href="/login"
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
                        >
                            立即登录
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}

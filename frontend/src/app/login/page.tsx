"use client"

/**
 * 登录页面
 */
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { login as loginApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { UserRole } from '@/types'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { login } = useAuthStore()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{ username?: string; password?: string }>({})

    // 表单校验
    const validate = (): boolean => {
        const newErrors: { username?: string; password?: string } = {}

        if (!username.trim()) {
            newErrors.username = '请输入用户名'
        } else if (username.length < 3) {
            newErrors.username = '用户名至少 3 个字符'
        }

        if (!password) {
            newErrors.password = '请输入密码'
        } else if (password.length < 6) {
            newErrors.password = '密码至少 6 个字符'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // 提交登录
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setIsLoading(true)

        try {
            const response = await loginApi({ username, password })

            // 存储登录信息
            login(response.token, response.user, response.role)

            toast.success('登录成功', {
                description: `欢迎回来，${response.user.full_name || response.user.username}`,
            })

            // 跳转到目标页面或角色首页
            const redirectUrl = searchParams.get('redirect')
            if (redirectUrl && !redirectUrl.startsWith('/login')) {
                router.push(redirectUrl)
            } else {
                const roleRedirects: Record<UserRole, string> = {
                    patient: '/login',  // 患者端已迁移至微信小程序
                    doctor: '/doctor/dashboard',
                    admin: '/admin/health',
                }
                router.push(roleRedirects[response.role])
            }
        } catch (error: any) {
            toast.error('登录失败', {
                description: error.message || '用户名或密码错误',
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名 */}
            <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value)
                        if (errors.username) setErrors({ ...errors, username: undefined })
                    }}
                    disabled={isLoading}
                    className={errors.username ? 'border-red-500 focus-visible:border-red-500' : ''}
                />
                {errors.username && (
                    <p className="text-sm text-red-500">{errors.username}</p>
                )}
            </div>

            {/* 密码 */}
            <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value)
                            if (errors.password) setErrors({ ...errors, password: undefined })
                        }}
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

            {/* 登录按钮 */}
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        登录中...
                    </>
                ) : (
                    '登录'
                )}
            </Button>
        </form>
    )
}

export default function LoginPage() {
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
                    <CardTitle className="text-2xl">中医智能辅助诊疗系统</CardTitle>
                    <CardDescription className="mt-2">
                        请登录以继续使用系统
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        </div>
                    }>
                        <LoginForm />
                    </Suspense>

                    {/* Mock 模式提示 */}
                    {process.env.NEXT_PUBLIC_USE_MOCK === 'true' && (
                        <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                                🧪 Mock 模式已启用
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                测试账号：<br />
                                患者：patient1 / password123<br />
                                医生：doctor1 / password123<br />
                                管理员：admin1 / password123
                            </p>
                        </div>
                    )}

                    {/* 注册链接 */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            还没有账号？{' '}
                            <a
                                href="/register"
                                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
                            >
                                立即注册
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}


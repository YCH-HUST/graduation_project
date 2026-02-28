"use client"

/**
 * 管理员端 - 个人资料与密码修改
 */
import { useState } from 'react'
import { changePassword } from '@/api/profile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Lock, Loader2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function AdminProfilePage() {
    const { user } = useAuthStore()

    const [isChangingPw, setIsChangingPw] = useState(false)
    const [pwForm, setPwForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    })

    const handleChangePassword = async () => {
        const { old_password, new_password, confirm_password } = pwForm
        if (!old_password || !new_password || !confirm_password) {
            toast.error('请填写所有密码字段')
            return
        }
        try {
            setIsChangingPw(true)
            const res = await changePassword({ old_password, new_password, confirm_password })
            toast.success(res.detail || '密码修改成功')
            setPwForm({ old_password: '', new_password: '', confirm_password: '' })
        } catch (err: any) {
            toast.error('修改密码失败', {
                description: err.response?.data?.detail || err.message || '请稍后重试',
            })
        } finally {
            setIsChangingPw(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    个人设置
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">管理您的账号信息</p>
            </div>

            {/* 账号信息卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-purple-500" />
                        账号信息
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-500">用户名</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.username || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-500">姓名</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-500">邮箱</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.email || '—'}</span>
                    </div>
                </CardContent>
            </Card>

            {/* 修改密码卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500" />
                        修改密码
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">原密码</label>
                        <Input
                            type="password"
                            placeholder="请输入原密码"
                            value={pwForm.old_password}
                            onChange={(e) => setPwForm(p => ({ ...p, old_password: e.target.value }))}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">新密码</label>
                            <Input
                                type="password"
                                placeholder="至少 6 位"
                                value={pwForm.new_password}
                                onChange={(e) => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">确认新密码</label>
                            <Input
                                type="password"
                                placeholder="再次输入新密码"
                                value={pwForm.confirm_password}
                                onChange={(e) => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={handleChangePassword}
                            disabled={isChangingPw}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isChangingPw
                                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中...</>
                                : <><Lock className="w-4 h-4 mr-2" />确认修改密码</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

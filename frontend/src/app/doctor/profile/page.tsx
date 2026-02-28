"use client"

/**
 * 医生端 - 个人资料编辑页面
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getProfile, updateProfile, changePassword, ProfileUpdateRequest } from '@/api/profile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
    User,
    Building2,
    Award,
    Calendar,
    Mail,
    Loader2,
    Save,
    ArrowLeft,
    Lock,
} from 'lucide-react'

export default function DoctorProfilePage() {
    const router = useRouter()
    const { setUser } = useAuthStore()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isChangingPw, setIsChangingPw] = useState(false)

    const [formData, setFormData] = useState<ProfileUpdateRequest>({
        full_name: '',
        email: '',
        hospital: '',
        department: '',
        job_title: '',
        years_of_experience: undefined,
        gender: '',
        age: undefined,
    })

    const [pwForm, setPwForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    })

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            setIsLoading(true)
            const profile = await getProfile()
            setFormData({
                full_name: profile.full_name || '',
                email: profile.email || '',
                hospital: profile.hospital || '',
                department: profile.department || '',
                job_title: profile.job_title || '',
                years_of_experience: profile.years_of_experience,
                gender: profile.gender || '',
                age: profile.age,
            })
        } catch (err: any) {
            toast.error('加载个人资料失败', { description: err.message || '请刷新页面重试' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (field: keyof ProfileUpdateRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsSaving(true)
            const updateData: ProfileUpdateRequest = {
                ...formData,
                years_of_experience: formData.years_of_experience ? Number(formData.years_of_experience) : undefined,
                age: formData.age ? Number(formData.age) : undefined,
            }
            const updatedProfile = await updateProfile(updateData)
            setUser(updatedProfile)
            toast.success('保存成功', { description: '个人资料已更新' })
            router.push('/doctor/home')
        } catch (err: any) {
            toast.error('保存失败', { description: err.message || '请稍后重试' })
        } finally {
            setIsSaving(false)
        }
    }

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
            toast.error('修改密码失败', { description: err.response?.data?.detail || err.message || '请稍后重试' })
        } finally {
            setIsChangingPw(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    返回
                </Button>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        编辑个人资料
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">完善您的个人信息</p>
                </div>
            </div>

            {/* 基本信息表单 */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-500" />
                            基本信息
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <User className="w-4 h-4" /> 姓名
                            </label>
                            <Input value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} placeholder="请输入您的姓名" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Mail className="w-4 h-4" /> 邮箱
                            </label>
                            <Input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="请输入邮箱地址" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> 所属医院
                            </label>
                            <Input value={formData.hospital} onChange={(e) => handleInputChange('hospital', e.target.value)} placeholder="请输入所属医院名称" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Award className="w-4 h-4" /> 科室
                            </label>
                            <select
                                value={formData.department || ''}
                                onChange={(e) => handleInputChange('department', e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            >
                                <option value="">请选择科室</option>
                                <option value="internal">内科</option>
                                <option value="surgery">外科</option>
                                <option value="gynecology">妇科</option>
                                <option value="pediatrics">儿科</option>
                                <option value="orthopedics">骨伤科</option>
                                <option value="ent">耳鼻喉科</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Award className="w-4 h-4" /> 职称
                            </label>
                            <Input value={formData.job_title} onChange={(e) => handleInputChange('job_title', e.target.value)} placeholder="如：主任医师、副主任医师" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> 从业年限
                            </label>
                            <Input type="number" min="0" max="60" value={formData.years_of_experience ?? ''} onChange={(e) => handleInputChange('years_of_experience', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="请输入从业年限" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">性别</label>
                            <div className="flex gap-4">
                                {['male', 'female'].map((g) => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={(e) => handleInputChange('gender', e.target.value)} className="w-4 h-4 text-blue-500" />
                                        <span className="text-slate-700 dark:text-slate-300">{g === 'male' ? '男' : '女'}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">年龄</label>
                            <Input type="number" min="18" max="100" value={formData.age ?? ''} onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="请输入年龄" />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4 mt-6">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>取消</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</> : <><Save className="w-4 h-4 mr-2" />保存修改</>}
                    </Button>
                </div>
            </form>

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
                        <Input type="password" placeholder="请输入原密码" value={pwForm.old_password} onChange={(e) => setPwForm(p => ({ ...p, old_password: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">新密码</label>
                            <Input type="password" placeholder="至少 6 位" value={pwForm.new_password} onChange={(e) => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">确认新密码</label>
                            <Input type="password" placeholder="再次输入新密码" value={pwForm.confirm_password} onChange={(e) => setPwForm(p => ({ ...p, confirm_password: e.target.value }))} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleChangePassword} disabled={isChangingPw} className="bg-amber-500 hover:bg-amber-600 text-white">
                            {isChangingPw ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中...</> : <><Lock className="w-4 h-4 mr-2" />确认修改密码</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

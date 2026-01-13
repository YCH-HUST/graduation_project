"use client"

/**
 * 医生端 - 首页
 * 显示医生基本信息和最近患者列表
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getProfile, getRecentPatients, RecentPatient } from '@/api/profile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCaseStatus } from '@/lib/utils'
import { toast } from 'sonner'
import {
    User,
    Building2,
    Award,
    Calendar,
    Users,
    Clock,
    Loader2,
    Edit,
    Eye,
    ClipboardCheck,
    Stethoscope,
} from 'lucide-react'
import type { User as UserType } from '@/types'

export default function DoctorHomePage() {
    const router = useRouter()
    const { user: authUser, setUser } = useAuthStore()

    const [profile, setProfile] = useState<UserType | null>(null)
    const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [patientsLoading, setPatientsLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setIsLoading(true)
            setPatientsLoading(true)

            // 并行加载数据
            const [profileData, patientsData] = await Promise.all([
                getProfile(),
                getRecentPatients(),
            ])

            setProfile(profileData)
            setUser(profileData) // 更新全局用户信息
            setRecentPatients(patientsData.patients)
        } catch (err: any) {
            console.error('Load data error:', err)
            toast.error('加载数据失败', {
                description: err.message || '请刷新页面重试',
            })
        } finally {
            setIsLoading(false)
            setPatientsLoading(false)
        }
    }

    const handleEditProfile = () => {
        router.push('/doctor/profile')
    }

    const handleReviewCase = (caseId: number) => {
        router.push(`/doctor/review/${caseId}`)
    }

    // 获取性别显示文本
    const getGenderText = (gender?: string) => {
        if (gender === 'male') return '男'
        if (gender === 'female') return '女'
        return '未设置'
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        欢迎回来，{profile?.full_name || profile?.username || '医生'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        中医智能辅助诊疗系统 · 医生端
                    </p>
                </div>
            </div>

            {/* 个人信息卡片 */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-20 relative">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-4 right-4"
                        onClick={handleEditProfile}
                    >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑资料
                    </Button>
                </div>
                <CardContent className="pt-6 pb-6">
                    {/* 头像和姓名区域 - 水平布局 */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center shrink-0">
                            <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {profile?.full_name || '未设置姓名'}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">
                                @{profile?.username}
                            </p>
                        </div>
                    </div>

                    {/* 信息卡片区域 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">所属医院</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {profile?.hospital || '未设置'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">职称</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {profile?.job_title || '未设置'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">从业年限</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {profile?.years_of_experience ? `${profile.years_of_experience} 年` : '未设置'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">性别</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {getGenderText(profile?.gender)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                                <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">年龄</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {profile?.age ? `${profile.age} 岁` : '未设置'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 最近患者列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        最近接诊患者
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {patientsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                    ) : recentPatients.length > 0 ? (
                        <div className="space-y-3">
                            {recentPatients.map((patient) => {
                                const statusInfo = formatCaseStatus(patient.case_status as any)
                                return (
                                    <div
                                        key={`${patient.id}-${patient.case_id}`}
                                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {patient.full_name}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {patient.chief_complaint || '无主诉'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <Badge
                                                    variant={
                                                        patient.case_status === 'pending_review'
                                                            ? 'warning'
                                                            : patient.case_status === 'approved'
                                                                ? 'success'
                                                                : 'secondary'
                                                    }
                                                >
                                                    {statusInfo.text}
                                                </Badge>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatDateTime(patient.created_at)}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReviewCase(patient.case_id)}
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                查看
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                暂无接诊记录
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                审核病例后将在这里显示最近的患者
                            </p>
                            <Button
                                className="mt-4"
                                onClick={() => router.push('/doctor/dashboard')}
                            >
                                前往待审列表
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

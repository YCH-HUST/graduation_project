"use client"

/**
 * 患者端 - 首页
 * 显示患者基本信息、最近病例和待处理事项
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getProfile } from '@/api/profile'
import { getPendingCases } from '@/api/cases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCaseStatus } from '@/lib/utils'
import { toast } from 'sonner'
import {
    User,
    Mail,
    Calendar,
    Loader2,
    Edit,
    Eye,
    FileText,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle,
    Activity,
} from 'lucide-react'
import type { User as UserType, CaseStatus } from '@/types'

// 患者病例接口
interface PatientCase {
    id: string
    chief_complaint: string
    status: CaseStatus
    created_at: string
    updated_at: string
}

export default function PatientHomePage() {
    const router = useRouter()
    const { user: authUser, setUser } = useAuthStore()

    const [profile, setProfile] = useState<UserType | null>(null)
    const [recentCases, setRecentCases] = useState<PatientCase[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [casesLoading, setCasesLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setIsLoading(true)
            setCasesLoading(true)

            // 并行加载数据
            const [profileData, casesData] = await Promise.all([
                getProfile(),
                getPendingCases({ page: 1, page_size: 5 }),
            ])

            setProfile(profileData)
            setUser(profileData) // 更新全局用户信息

            // 转换病例数据
            const cases: PatientCase[] = casesData.items.map((item: any) => ({
                id: item.id,
                chief_complaint: item.chief_complaint || item.questionnaire?.chief_complaint || '无主诉',
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
            }))
            setRecentCases(cases)
        } catch (err: any) {
            console.error('Load data error:', err)
            toast.error('加载数据失败', {
                description: err.message || '请刷新页面重试',
            })
        } finally {
            setIsLoading(false)
            setCasesLoading(false)
        }
    }

    const handleEditProfile = () => {
        router.push('/patient/profile')
    }

    const handleViewCase = (caseId: string) => {
        router.push(`/patient/cases/${caseId}`)
    }

    const handleNewCase = () => {
        router.push('/patient/new-case')
    }

    // 获取性别显示文本
    const getGenderText = (gender?: string) => {
        if (gender === 'male') return '男'
        if (gender === 'female') return '女'
        return '未设置'
    }

    // 获取待处理事项
    const getPendingItems = () => {
        const pendingReview = recentCases.filter(c => c.status === 'pending_review').length
        const approved = recentCases.filter(c => c.status === 'approved').length
        const running = recentCases.filter(c => c.status === 'running').length

        return { pendingReview, approved, running }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        )
    }

    const pendingItems = getPendingItems()

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        欢迎回来，{profile?.full_name || profile?.username || '患者'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        中医智能辅助诊疗系统 · 患者端
                    </p>
                </div>
                <Button
                    onClick={handleNewCase}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    新建病例
                </Button>
            </div>

            {/* 个人信息卡片 */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-20 relative">
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
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center shrink-0">
                            <User className="w-8 h-8 text-white" />
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">邮箱</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {profile?.email || '未设置'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">性别</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {getGenderText(profile?.gender)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                                <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">年龄</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {profile?.age ? `${profile.age} 岁` : '未设置'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">病例数</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {recentCases.length} 个
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 待处理事项 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-900/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 dark:text-amber-400">待审核</p>
                                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingItems.pendingReview}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-900/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400">诊断中</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pendingItems.running}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50 dark:border-green-900/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400">已完成</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{pendingItems.approved}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 最近病例列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-500" />
                        最近病例
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {casesLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                        </div>
                    ) : recentCases.length > 0 ? (
                        <div className="space-y-3">
                            {recentCases.map((caseItem) => {
                                const statusInfo = formatCaseStatus(caseItem.status)
                                return (
                                    <div
                                        key={caseItem.id}
                                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {caseItem.chief_complaint}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    提交于 {formatDateTime(caseItem.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <Badge
                                                    variant={
                                                        caseItem.status === 'pending_review'
                                                            ? 'warning'
                                                            : caseItem.status === 'approved'
                                                                ? 'success'
                                                                : caseItem.status === 'running'
                                                                    ? 'info'
                                                                    : 'secondary'
                                                    }
                                                >
                                                    {statusInfo.text}
                                                </Badge>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleViewCase(caseItem.id)}
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
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                暂无病例记录
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                创建您的第一个病例，开始智能诊疗
                            </p>
                            <Button
                                className="mt-4"
                                onClick={handleNewCase}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                新建病例
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

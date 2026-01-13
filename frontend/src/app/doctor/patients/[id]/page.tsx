"use client"

/**
 * 医生端 - 患者详情页面
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    getPatientDetail,
    updatePatient,
    deletePatient,
    PatientDetailResponse,
    UpdatePatientRequest,
} from '@/api/patients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCaseStatus } from '@/lib/utils'
import { toast } from 'sonner'
import {
    User,
    Mail,
    Calendar,
    FileText,
    ArrowLeft,
    Loader2,
    Edit,
    Trash2,
    Eye,
    Save,
    X,
} from 'lucide-react'

export default function PatientDetailPage() {
    const params = useParams()
    const router = useRouter()
    const patientId = Number(params.id)

    const [data, setData] = useState<PatientDetailResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // 编辑状态
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        gender: '' as 'male' | 'female' | '',
        age: '' as string,
    })

    // 删除确认
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        loadPatientDetail()
    }, [patientId])

    const loadPatientDetail = async () => {
        try {
            setIsLoading(true)
            const response = await getPatientDetail(patientId)
            setData(response)
            setFormData({
                full_name: response.patient.full_name,
                email: response.patient.email,
                gender: (response.patient.gender as 'male' | 'female' | '') || '',
                age: response.patient.age?.toString() || '',
            })
        } catch (err: any) {
            console.error('Load patient error:', err)
            toast.error('加载失败', { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const updateData: UpdatePatientRequest = {
                full_name: formData.full_name,
                email: formData.email,
                gender: formData.gender,
                age: formData.age ? parseInt(formData.age) : null,
            }
            await updatePatient(patientId, updateData)
            toast.success('保存成功')
            setIsEditing(false)
            loadPatientDetail()
        } catch (err: any) {
            toast.error('保存失败', { description: err.message })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            await deletePatient(patientId)
            toast.success('删除成功')
            router.push('/doctor/patients')
        } catch (err: any) {
            toast.error('删除失败', { description: err.message })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleViewCase = (caseId: string) => {
        router.push(`/doctor/review/${caseId}`)
    }

    const getGenderText = (gender: string) => {
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

    if (!data) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    患者不存在
                </h2>
                <Button onClick={() => router.push('/doctor/patients')}>
                    返回患者列表
                </Button>
            </div>
        )
    }

    const { patient, cases } = data

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 返回按钮 */}
            <Button variant="ghost" onClick={() => router.push('/doctor/patients')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回患者列表
            </Button>

            {/* 患者信息卡片 */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-500" />
                        患者信息
                    </CardTitle>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                                    <X className="w-4 h-4 mr-1" />
                                    取消
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-1" />
                                    )}
                                    保存
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                    <Edit className="w-4 h-4 mr-1" />
                                    编辑
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    删除
                                </Button>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">用户名</label>
                                <Input value={patient.username} disabled className="mt-1" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">姓名</label>
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">邮箱</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">性别</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            checked={formData.gender === 'male'}
                                            onChange={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                                        />
                                        <span>男</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            checked={formData.gender === 'female'}
                                            onChange={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                                        />
                                        <span>女</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">年龄</label>
                                <Input
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <p className="text-sm text-slate-500">用户名</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {patient.username}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">姓名</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {patient.full_name || '未设置'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">邮箱</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {patient.email || '未设置'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">性别</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {getGenderText(patient.gender)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">年龄</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {patient.age ? `${patient.age} 岁` : '未设置'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">注册时间</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {formatDateTime(patient.date_joined)}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 病例历史 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        病例历史
                        <Badge variant="secondary" className="ml-2">
                            {cases.length} 条
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {cases.length > 0 ? (
                        <div className="space-y-3">
                            {cases.map((caseItem) => {
                                const statusInfo = formatCaseStatus(caseItem.status as any)
                                return (
                                    <div
                                        key={caseItem.id}
                                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                {caseItem.chief_complaint || '无主诉'}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-1">
                                                创建于 {formatDateTime(caseItem.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge
                                                variant={
                                                    caseItem.status === 'pending_review'
                                                        ? 'warning'
                                                        : caseItem.status === 'approved'
                                                            ? 'success'
                                                            : caseItem.status === 'rejected'
                                                                ? 'destructive'
                                                                : 'secondary'
                                                }
                                            >
                                                {statusInfo.text}
                                            </Badge>
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
                        <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400">
                                该患者暂无病例记录
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 删除确认弹窗 */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                            确认删除
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            确定要删除患者 <strong>{patient.full_name || patient.username}</strong> 吗？
                            此操作不可撤销。
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                                取消
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        删除中...
                                    </>
                                ) : (
                                    '确认删除'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

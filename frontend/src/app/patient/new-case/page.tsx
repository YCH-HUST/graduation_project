"use client"

/**
 * 新建病例页面
 * 流程: 选择科室 → 选择医生 → 上传舌象 + 填写问诊 → 提交
 */
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUpload } from '@/components/case/ImageUpload'
import { QuestionnaireForm } from '@/components/case/QuestionnaireForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { createCase, runPipeline, getPipelineStatus } from '@/api/cases'
import { getDoctors, DEPARTMENTS, Doctor } from '@/api/doctors'
import { useCaseStore } from '@/store/case'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
    Loader2, Send, Activity, CheckCircle2, AlertCircle,
    ArrowLeft, ArrowRight, User, Building2, Award, Calendar
} from 'lucide-react'
import type { QuestionnaireData } from '@/types'

type PageState = 'select_department' | 'select_doctor' | 'form' | 'submitting' | 'processing' | 'success' | 'error'

export default function NewCasePage() {
    const router = useRouter()
    const { updatePipelineStatus, setPolling, isPolling } = useCaseStore()

    const [pageState, setPageState] = useState<PageState>('select_department')

    // 科室和医生选择
    const [selectedDepartment, setSelectedDepartment] = useState<string>('')
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loadingDoctors, setLoadingDoctors] = useState(false)

    // 表单数据
    const [image, setImage] = useState<File | null>(null)
    const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({
        chief_complaint: '',
        present_illness: '',
        past_history: '',
        sleep_quality: '',
        appetite: '',
        bowel_movement: '',
        urination: '',
        additional_notes: '',
    })
    const [errors, setErrors] = useState<{
        image?: string
        questionnaire?: Partial<Record<keyof QuestionnaireData, string>>
    }>({})
    const [caseId, setCaseId] = useState<number | null>(null)
    const [progress, setProgress] = useState(0)
    const [currentStage, setCurrentStage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    // 加载医生列表
    useEffect(() => {
        if (selectedDepartment && pageState === 'select_doctor') {
            loadDoctors(selectedDepartment)
        }
    }, [selectedDepartment, pageState])

    const loadDoctors = async (department: string) => {
        setLoadingDoctors(true)
        try {
            const response = await getDoctors(department)
            setDoctors(response.doctors)
        } catch (err) {
            console.error('Load doctors error:', err)
            toast.error('加载医生列表失败')
        } finally {
            setLoadingDoctors(false)
        }
    }

    // 选择科室
    const handleSelectDepartment = (departmentKey: string) => {
        setSelectedDepartment(departmentKey)
        setSelectedDoctor(null)
        setPageState('select_doctor')
    }

    // 选择医生
    const handleSelectDoctor = (doctor: Doctor) => {
        setSelectedDoctor(doctor)
    }

    // 确认医生进入表单
    const handleConfirmDoctor = () => {
        if (selectedDoctor) {
            setPageState('form')
        }
    }

    // 返回科室选择
    const handleBackToDepartment = () => {
        setPageState('select_department')
        setSelectedDoctor(null)
    }

    // 返回医生选择
    const handleBackToDoctor = () => {
        setPageState('select_doctor')
    }

    // 表单校验
    const validate = (): boolean => {
        const newErrors: typeof errors = {}

        if (!image) {
            newErrors.image = '请上传舌象图片'
        }

        const questionnaireErrors: Partial<Record<keyof QuestionnaireData, string>> = {}
        if (!questionnaire.chief_complaint?.trim()) {
            questionnaireErrors.chief_complaint = '请填写主诉'
        }
        if (!questionnaire.present_illness?.trim()) {
            questionnaireErrors.present_illness = '请填写现病史'
        }

        if (Object.keys(questionnaireErrors).length > 0) {
            newErrors.questionnaire = questionnaireErrors
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // 轮询流水线状态
    const pollPipelineStatus = useCallback(async (id: number) => {
        setPolling(true)

        const maxAttempts = 60
        let attempts = 0

        const poll = async () => {
            if (attempts >= maxAttempts) {
                setPageState('error')
                setErrorMessage('处理超时，请稍后查看结果')
                setPolling(false)
                return
            }

            try {
                const status = await getPipelineStatus(id)

                setProgress(status.progress)
                setCurrentStage(status.current_stage || '')
                updatePipelineStatus(status.progress, status.current_stage || '')

                if (status.result_available) {
                    setPageState('success')
                    setPolling(false)
                    toast.success('诊断完成', {
                        description: '正在跳转到结果页面...',
                    })
                    setTimeout(() => {
                        router.push(`/patient/cases/${id}`)
                    }, 1500)
                } else if (status.status === 'failed') {
                    setPageState('error')
                    setErrorMessage('处理失败，请重试')
                    setPolling(false)
                } else {
                    attempts++
                    setTimeout(poll, 2000)
                }
            } catch (error) {
                console.error('Poll error:', error)
                attempts++
                setTimeout(poll, 2000)
            }
        }

        poll()
    }, [router, setPolling, updatePipelineStatus])

    // 提交表单
    const handleSubmit = async () => {
        if (!validate()) {
            toast.error('请完善必填信息')
            return
        }

        setPageState('submitting')

        try {
            // 1. 创建病例（包含医生ID）
            const createResponse = await createCase(image!, questionnaire, selectedDoctor?.id)
            const newCaseId = createResponse.case_id
            setCaseId(newCaseId)

            toast.success('病例创建成功', {
                description: '开始进行智能分析...',
            })

            // 2. 触发流水线
            setPageState('processing')
            await runPipeline(newCaseId)

            // 3. 开始轮询状态
            pollPipelineStatus(newCaseId)

        } catch (error: any) {
            console.error('Submit error:', error)
            setPageState('error')
            setErrorMessage(error.message || '提交失败，请重试')
            toast.error('提交失败', {
                description: error.message || '请检查网络连接后重试',
            })
        }
    }

    // 重置表单
    const handleReset = () => {
        setPageState('select_department')
        setSelectedDepartment('')
        setSelectedDoctor(null)
        setDoctors([])
        setImage(null)
        setQuestionnaire({
            chief_complaint: '',
            present_illness: '',
            past_history: '',
            sleep_quality: '',
            appetite: '',
            bowel_movement: '',
            urination: '',
            additional_notes: '',
        })
        setErrors({})
        setCaseId(null)
        setProgress(0)
        setCurrentStage('')
        setErrorMessage('')
    }

    // 获取阶段显示文本
    const getStageText = (stage: string): string => {
        const stageMap: Record<string, string> = {
            preprocessing: '图像预处理',
            segmentation: '舌体分割',
            feature_extraction: '特征提取',
            diagnosis: '智能诊断',
            postprocessing: '结果生成',
            completed: '处理完成',
        }
        return stageMap[stage] || '处理中'
    }

    // ========== 渲染科室选择 ==========
    if (pageState === 'select_department') {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        新建病例
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                        第一步：请选择就诊科室
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DEPARTMENTS.map((dept) => (
                        <Card
                            key={dept.key}
                            className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600",
                                selectedDepartment === dept.key && "border-blue-500 ring-2 ring-blue-500/20"
                            )}
                            onClick={() => handleSelectDepartment(dept.key)}
                        >
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-2xl shadow-lg">
                                        {dept.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                            {dept.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {dept.description}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // ========== 渲染医生选择 ==========
    if (pageState === 'select_doctor') {
        const selectedDept = DEPARTMENTS.find(d => d.key === selectedDepartment)

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleBackToDepartment}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        返回
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                            选择医生
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {selectedDept?.name} - {selectedDept?.description}
                        </p>
                    </div>
                </div>

                {loadingDoctors ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : doctors.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                暂无医生
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                该科室暂无注册医生，请选择其他科室
                            </p>
                            <Button className="mt-4" variant="outline" onClick={handleBackToDepartment}>
                                重新选择科室
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {doctors.map((doctor) => (
                                <Card
                                    key={doctor.id}
                                    className={cn(
                                        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600",
                                        selectedDoctor?.id === doctor.id && "border-blue-500 ring-2 ring-blue-500/20"
                                    )}
                                    onClick={() => handleSelectDoctor(doctor)}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                                {doctor.full_name?.charAt(0) || doctor.username.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                                    {doctor.full_name || doctor.username}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {doctor.job_title && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                                                            <Award className="w-3 h-3" />
                                                            {doctor.job_title}
                                                        </span>
                                                    )}
                                                    {doctor.years_of_experience && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                                                            <Calendar className="w-3 h-3" />
                                                            {doctor.years_of_experience}年经验
                                                        </span>
                                                    )}
                                                </div>
                                                {doctor.hospital && (
                                                    <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-2 truncate">
                                                        <Building2 className="w-3 h-3 flex-shrink-0" />
                                                        {doctor.hospital}
                                                    </p>
                                                )}
                                            </div>
                                            {selectedDoctor?.id === doctor.id && (
                                                <CheckCircle2 className="w-6 h-6 text-blue-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <Button
                                size="lg"
                                disabled={!selectedDoctor}
                                onClick={handleConfirmDoctor}
                            >
                                下一步
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        )
    }

    // ========== 渲染处理中状态 ==========
    if (pageState === 'processing' || pageState === 'success') {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {pageState === 'success' ? (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                                    <CheckCircle2 className="w-10 h-10 text-white" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center animate-pulse-glow">
                                    <Activity className="w-10 h-10 text-emerald-500 animate-pulse" />
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl">
                            {pageState === 'success' ? '诊断完成' : '正在分析中'}
                        </CardTitle>
                        <CardDescription>
                            {pageState === 'success'
                                ? '正在跳转到结果页面...'
                                : '请稍候，AI 正在分析您的舌象数据'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">
                                    {getStageText(currentStage)}
                                </span>
                                <span className="font-medium text-emerald-600">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {['preprocessing', 'segmentation', 'feature_extraction', 'diagnosis', 'postprocessing'].map((stage, index) => {
                                const stageProgress = (index + 1) * 20
                                const isActive = progress >= stageProgress - 20 && progress < stageProgress
                                const isCompleted = progress >= stageProgress

                                return (
                                    <div
                                        key={stage}
                                        className={`text-center p-2 rounded-lg transition-all ${isActive
                                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                            : isCompleted
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50'
                                                : 'bg-slate-50 dark:bg-slate-800'
                                            }`}
                                    >
                                        <div
                                            className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-medium ${isCompleted
                                                ? 'bg-emerald-500 text-white'
                                                : isActive
                                                    ? 'bg-emerald-100 text-emerald-600 animate-pulse'
                                                    : 'bg-slate-200 text-slate-400 dark:bg-slate-700'
                                                }`}
                                        >
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <p className="text-[10px] mt-1 text-slate-500 dark:text-slate-400 truncate">
                                            {getStageText(stage)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ========== 渲染错误状态 ==========
    if (pageState === 'error') {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-red-600 dark:text-red-400">处理失败</CardTitle>
                        <CardDescription>{errorMessage}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center gap-4">
                        <Button variant="outline" onClick={handleReset}>
                            重新填写
                        </Button>
                        {caseId && (
                            <Button onClick={() => router.push(`/patient/cases/${caseId}`)}>
                                查看病例
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ========== 渲染表单（上传+问诊） ==========
    const selectedDept = DEPARTMENTS.find(d => d.key === selectedDepartment)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackToDoctor}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    返回
                </Button>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        填写病例信息
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {selectedDept?.name} · {selectedDoctor?.full_name || selectedDoctor?.username}
                    </p>
                </div>
            </div>

            {/* 已选医生信息卡片 */}
            {selectedDoctor && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                {selectedDoctor.full_name?.charAt(0) || selectedDoctor.username.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-blue-600 dark:text-blue-400">主诊医生</p>
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {selectedDoctor.full_name || selectedDoctor.username}
                                    {selectedDoctor.job_title && ` · ${selectedDoctor.job_title}`}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 舌象上传 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">舌象图片</CardTitle>
                        <CardDescription>
                            请上传清晰的舌象照片，确保光线充足
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ImageUpload
                            value={image}
                            onChange={(file) => {
                                setImage(file)
                                if (errors.image) setErrors({ ...errors, image: undefined })
                            }}
                            error={errors.image}
                            disabled={pageState === 'submitting'}
                        />
                    </CardContent>
                </Card>

                {/* 问诊表单 */}
                <Card className="lg:row-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">问诊信息</CardTitle>
                        <CardDescription>
                            请填写详细的症状描述，带 * 为必填项
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <QuestionnaireForm
                            value={questionnaire}
                            onChange={(value) => {
                                setQuestionnaire(value)
                                if (errors.questionnaire) setErrors({ ...errors, questionnaire: undefined })
                            }}
                            errors={errors.questionnaire}
                            disabled={pageState === 'submitting'}
                        />
                    </CardContent>
                </Card>

                {/* 提交按钮 */}
                <Card className="lg:col-span-1">
                    <CardContent className="pt-6">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleSubmit}
                            disabled={pageState === 'submitting'}
                        >
                            {pageState === 'submitting' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    提交中...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    提交并开始分析
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
                            提交后将自动进行 AI 分析，预计需要 30-60 秒
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

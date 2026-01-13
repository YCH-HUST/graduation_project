"use client"

/**
 * 医生端 - 病例审核页面
 * 三栏布局：患者资料 | 图片可视化 | 诊断与修订
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCaseDetail, submitReview } from '@/api/cases'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { formatDateTime, formatCaseStatus } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Loader2,
    User,
    FileText,
    Activity,
    Pill,
    Check,
    X,
    Edit3,
    Eye,
    AlertCircle,
    ArrowLeft,
} from 'lucide-react'
import type { CaseDetailResponse, ReviewDecision, Syndrome, Formula, AssetType } from '@/types'

export default function ReviewPage() {
    const params = useParams()
    const router = useRouter()
    const caseId = Number(params.id)

    const [data, setData] = useState<CaseDetailResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 审核相关状态
    const [reviewNote, setReviewNote] = useState('')
    const [editedSyndromes, setEditedSyndromes] = useState<Syndrome[]>([])
    const [editedFormulas, setEditedFormulas] = useState<Formula[]>([])
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                const response = await getCaseDetail(caseId)
                setData(response)

                // 初始化编辑数据
                if (response.latest_run?.diagnosis_result) {
                    setEditedSyndromes([...response.latest_run.diagnosis_result.syndromes])
                    setEditedFormulas([...response.latest_run.diagnosis_result.formulas])
                }
            } catch (err: any) {
                console.error('Fetch case detail error:', err)
                setError(err.message || '加载失败')
                toast.error('加载失败', {
                    description: err.message || '请刷新页面重试',
                })
            } finally {
                setIsLoading(false)
            }
        }

        if (caseId) {
            fetchData()
        }
    }, [caseId])

    const handleSubmitReview = async (decision: ReviewDecision) => {
        setIsSubmitting(true)

        try {
            await submitReview(caseId, {
                decision,
                edited_syndromes: decision === 'revise' ? editedSyndromes : undefined,
                edited_formulas: decision === 'revise' ? editedFormulas : undefined,
                note: reviewNote || undefined,
            })

            toast.success(
                decision === 'approve' ? '审核通过' : decision === 'reject' ? '已驳回' : '已修订',
                { description: '正在返回列表...' }
            )

            setTimeout(() => {
                router.push('/doctor/dashboard')
            }, 1000)
        } catch (err: any) {
            console.error('Submit review error:', err)
            toast.error('提交失败', {
                description: err.message || '请重试',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const getAssetTypeName = (type: AssetType): string => {
        const typeMap: Record<AssetType, string> = {
            raw: '原始图片',
            mask: '分割掩码',
            heatmap: '热力图',
            annotated: '标注结果',
        }
        return typeMap[type] || type
    }

    // 加载中状态
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-slate-500 dark:text-slate-400">加载中...</p>
                </div>
            </div>
        )
    }

    // 错误状态
    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            加载失败
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">{error || '未找到病例'}</p>
                        <Button onClick={() => router.push('/doctor/dashboard')}>返回列表</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { case: caseData, latest_run: run, assets } = data
    const result = run?.diagnosis_result
    const statusInfo = formatCaseStatus(caseData.status)

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/doctor/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        返回
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                            病例审核 #{caseId}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            创建于 {formatDateTime(caseData.created_at)}
                        </p>
                    </div>
                </div>
                <Badge
                    variant={
                        caseData.status === 'pending_review'
                            ? 'warning'
                            : caseData.status === 'approved'
                                ? 'success'
                                : 'secondary'
                    }
                    className="text-sm px-3 py-1"
                >
                    {statusInfo.text}
                </Badge>
            </div>

            {/* 三栏布局 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左栏：患者资料与问诊摘要 */}
                <Card className="lg:row-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <User className="w-5 h-5 text-blue-500" />
                            患者信息
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-sm text-slate-500 dark:text-slate-400">患者 ID</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {caseData.patient_id}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-sm text-slate-500 dark:text-slate-400">患者姓名</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                    {caseData.patient_name || '未知'}
                                </p>
                            </div>
                        </div>

                        <hr className="border-slate-200 dark:border-slate-700" />

                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-amber-500" />
                                问诊摘要
                            </h4>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">主诉</p>
                                    <p className="text-slate-900 dark:text-slate-100">
                                        {caseData.questionnaire.chief_complaint || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">现病史</p>
                                    <p className="text-slate-900 dark:text-slate-100">
                                        {caseData.questionnaire.present_illness || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400">既往史</p>
                                    <p className="text-slate-900 dark:text-slate-100">
                                        {caseData.questionnaire.past_history || '-'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400">睡眠</p>
                                        <p className="text-slate-900 dark:text-slate-100">
                                            {caseData.questionnaire.sleep_quality || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400">食欲</p>
                                        <p className="text-slate-900 dark:text-slate-100">
                                            {caseData.questionnaire.appetite || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400">大便</p>
                                        <p className="text-slate-900 dark:text-slate-100">
                                            {caseData.questionnaire.bowel_movement || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 dark:text-slate-400">小便</p>
                                        <p className="text-slate-900 dark:text-slate-100">
                                            {caseData.questionnaire.urination || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 中栏：图片可视化 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Eye className="w-5 h-5 text-purple-500" />
                            可视化分析
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assets && assets.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3">
                                {assets.map((asset) => (
                                    <Dialog key={asset.id}>
                                        <DialogTrigger asChild>
                                            <button className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-purple-500 transition-all">
                                                <img
                                                    src={asset.url}
                                                    alt={getAssetTypeName(asset.type)}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder-image.svg'
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                                        <p className="text-white text-xs font-medium">
                                                            {getAssetTypeName(asset.type)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>{getAssetTypeName(asset.type)}</DialogTitle>
                                            </DialogHeader>
                                            <img
                                                src={asset.url}
                                                alt={getAssetTypeName(asset.type)}
                                                className="w-full h-auto rounded-lg"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/placeholder-image.svg'
                                                }}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                暂无可视化资源
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 右栏：模型建议与医生修订 */}
                <Card className="lg:row-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Edit3 className="w-5 h-5 text-emerald-500" />
                            诊断与修订
                        </CardTitle>
                        <CardDescription>查看 AI 建议并进行审核</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {result ? (
                            <>
                                {/* 证候列表 */}
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        证候分析
                                        <Badge variant="secondary" className="ml-auto">
                                            置信度 {Math.round(result.confidence_score * 100)}%
                                        </Badge>
                                    </h4>
                                    <div className="space-y-3">
                                        {editedSyndromes.map((syndrome, index) => (
                                            <div key={index} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                        {syndrome.name}
                                                    </span>
                                                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                                                        {Math.round(syndrome.score * 100)}%
                                                    </span>
                                                </div>
                                                <Progress value={syndrome.score * 100} className="h-1.5" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 推荐方剂 */}
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                        <Pill className="w-4 h-4 text-teal-500" />
                                        推荐方剂
                                    </h4>
                                    <div className="space-y-2">
                                        {editedFormulas.map((formula, index) => (
                                            <div
                                                key={index}
                                                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                                        {formula.name}
                                                    </span>
                                                    <Badge variant="default" className="text-xs">
                                                        {Math.round(formula.score * 100)}%
                                                    </Badge>
                                                </div>
                                                {formula.indication && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                        {formula.indication}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 审核备注 */}
                                <div className="space-y-2">
                                    <Label htmlFor="review-note">审核备注</Label>
                                    <Textarea
                                        id="review-note"
                                        placeholder="可选：填写审核意见或修改建议..."
                                        value={reviewNote}
                                        onChange={(e) => setReviewNote(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                {/* 审核按钮 */}
                                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Button
                                        className="w-full"
                                        onClick={() => handleSubmitReview('approve')}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Check className="w-4 h-4 mr-2" />
                                        )}
                                        通过审核
                                    </Button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleSubmitReview('revise')}
                                            disabled={isSubmitting}
                                        >
                                            <Edit3 className="w-4 h-4 mr-1" />
                                            修订通过
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleSubmitReview('reject')}
                                            disabled={isSubmitting}
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            驳回
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                暂无诊断结果
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

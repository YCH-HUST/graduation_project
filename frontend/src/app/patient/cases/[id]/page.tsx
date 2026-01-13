"use client"

/**
 * 病例详情页面
 * - 展示诊断结果
 * - 可视化资源预览
 * - LLM 解释文本
 */
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getCaseDetail } from '@/api/cases'
import { useCaseStore } from '@/store/case'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    ChevronDown,
    ChevronUp,
    Eye,
    Activity,
    Pill,
    FileText,
    Image as ImageIcon,
    AlertCircle,
} from 'lucide-react'
import type { CaseDetailResponse, Asset, AssetType } from '@/types'

export default function CaseDetailPage() {
    const params = useParams()
    const caseId = Number(params.id)
    const { setCurrentCase, setCurrentRun, setCurrentAssets } = useCaseStore()

    const [data, setData] = useState<CaseDetailResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedExplanation, setExpandedExplanation] = useState(false)
    const [selectedImage, setSelectedImage] = useState<Asset | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                const response = await getCaseDetail(caseId)
                setData(response)
                setCurrentCase(response.case)
                setCurrentRun(response.latest_run || null)
                setCurrentAssets(response.assets)
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
    }, [caseId, setCurrentCase, setCurrentRun, setCurrentAssets])

    // 获取资源类型显示名称
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
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
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
                        <Button onClick={() => window.location.reload()}>重新加载</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { case: caseData, latest_run: run, assets } = data
    const result = run?.diagnosis_result
    const statusInfo = formatCaseStatus(caseData.status)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        病例详情
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        病例 ID: {caseId} · 创建于 {formatDateTime(caseData.created_at)}
                    </p>
                </div>
                <Badge
                    variant={
                        caseData.status === 'approved'
                            ? 'success'
                            : caseData.status === 'rejected' || caseData.status === 'failed'
                                ? 'destructive'
                                : caseData.status === 'pending_review'
                                    ? 'warning'
                                    : 'secondary'
                    }
                    className="text-sm px-3 py-1"
                >
                    {statusInfo.text}
                </Badge>
            </div>

            {/* 如果还在处理中 */}
            {(caseData.status === 'running' || caseData.status === 'created') && (
                <Card>
                    <CardContent className="py-8 text-center">
                        <Activity className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            正在处理中
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            请稍候，系统正在分析您的舌象数据...
                        </p>
                        {run && (
                            <div className="max-w-xs mx-auto mt-4">
                                <Progress value={run.progress} className="h-2" />
                                <p className="text-sm text-slate-400 mt-2">{run.progress}%</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 有诊断结果时显示 */}
            {result && (
                <>
                    {/* 诊断结论 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 证候分析 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    证候分析
                                </CardTitle>
                                <CardDescription>
                                    置信度: {Math.round(result.confidence_score * 100)}%
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {result.syndromes.map((syndrome, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                                {syndrome.name}
                                            </span>
                                            <span className="text-sm text-emerald-600 dark:text-emerald-400">
                                                {Math.round(syndrome.score * 100)}%
                                            </span>
                                        </div>
                                        <Progress value={syndrome.score * 100} className="h-2" />
                                        {syndrome.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {syndrome.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* 推荐方剂 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Pill className="w-5 h-5 text-teal-500" />
                                    推荐方剂
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {result.formulas.map((formula, index) => (
                                    <div
                                        key={index}
                                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                                {formula.name}
                                            </span>
                                            <Badge variant="default">{Math.round(formula.score * 100)}%</Badge>
                                        </div>
                                        {formula.composition && (
                                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                                <span className="font-medium">组成：</span>
                                                {formula.composition}
                                            </p>
                                        )}
                                        {formula.indication && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                <span className="font-medium">功效：</span>
                                                {formula.indication}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* 证据要点 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5 text-amber-500" />
                                证据要点
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {result.evidence_points.map((point, index) => (
                                    <li
                                        key={index}
                                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-medium">
                                            {index + 1}
                                        </span>
                                        <span className="text-slate-700 dark:text-slate-300">{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* LLM 解释（可折叠） */}
                    <Card>
                        <CardHeader
                            className="cursor-pointer"
                            onClick={() => setExpandedExplanation(!expandedExplanation)}
                        >
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="w-5 h-5 text-purple-500" />
                                    AI 综合分析
                                </CardTitle>
                                <Button variant="ghost" size="sm">
                                    {expandedExplanation ? (
                                        <ChevronUp className="w-4 h-4" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        {expandedExplanation && (
                            <CardContent>
                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                    {result.llm_explanation.split('\n\n').map((paragraph, index) => (
                                        <p key={index} className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                </>
            )}

            {/* 可视化资源 */}
            {assets && assets.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ImageIcon className="w-5 h-5 text-blue-500" />
                            可视化资源
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {assets.map((asset) => (
                                <Dialog key={asset.id}>
                                    <DialogTrigger asChild>
                                        <button
                                            className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-emerald-500 transition-all"
                                            onClick={() => setSelectedImage(asset)}
                                        >
                                            <img
                                                src={asset.url}
                                                alt={asset.description || getAssetTypeName(asset.type)}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    // 图片加载失败时显示占位图
                                                    (e.target as HTMLImageElement).src = '/placeholder-image.svg'
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <p className="text-white text-sm font-medium">
                                                        {getAssetTypeName(asset.type)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                                    <Eye className="w-4 h-4 text-slate-700" />
                                                </div>
                                            </div>
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                        <DialogHeader>
                                            <DialogTitle>{getAssetTypeName(asset.type)}</DialogTitle>
                                        </DialogHeader>
                                        <div className="mt-4">
                                            <img
                                                src={asset.url}
                                                alt={asset.description || getAssetTypeName(asset.type)}
                                                className="w-full h-auto rounded-lg"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/placeholder-image.svg'
                                                }}
                                            />
                                            {asset.description && (
                                                <p className="mt-4 text-slate-500 dark:text-slate-400">
                                                    {asset.description}
                                                </p>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 问诊信息 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">问诊信息</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">主诉</dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                                {caseData.questionnaire.chief_complaint || '-'}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">现病史</dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                                {caseData.questionnaire.present_illness || '-'}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">既往史</dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                                {caseData.questionnaire.past_history || '-'}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">睡眠</dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                                {caseData.questionnaire.sleep_quality || '-'}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">食欲</dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                                {caseData.questionnaire.appetite || '-'}
                            </dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">大便</dt>
                            <dd className="text-slate-900 dark:text-slate-100">
                                {caseData.questionnaire.bowel_movement || '-'}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    )
}

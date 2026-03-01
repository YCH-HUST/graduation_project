"use client"

/**
 * 医生端 - 病例审核页面
 * 粘性分栏布局：左侧固定（患者信息 + 可视化） | 右侧滚动（病程对比 + 诊断与修订）
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCaseDetail, submitReview, getPatientHistory } from '@/api/cases'
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
    Plus,
    Trash2,
    Save,
    Undo,
    TrendingUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { CaseDetailResponse, ReviewDecision, Syndrome, Formula, AssetType } from '@/types'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { DoctorChatBox } from '@/components/chat/DoctorChatBox'

// 配色
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ReviewPage() {
    const params = useParams()
    const router = useRouter()
    const caseId = params.id as string

    const [data, setData] = useState<CaseDetailResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // 审核相关状态
    const [reviewNote, setReviewNote] = useState('')
    const [editedSyndromes, setEditedSyndromes] = useState<Syndrome[]>([])
    const [editedFormulas, setEditedFormulas] = useState<Formula[]>([])
    const [isEditing, setIsEditing] = useState(false)

    // 病程对比
    const [historyData, setHistoryData] = useState<any[]>([])
    const [historyLabels, setHistoryLabels] = useState<string[]>([])

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

                // 加载病程对比数据
                if (response.case?.patient_id) {
                    try {
                        const history = await getPatientHistory(response.case.patient_id)
                        if (history && history.length > 0) {
                            // 收集所有证型名称
                            const allNames = new Set<string>()
                            history.forEach((h: any) => {
                                h.syndromes?.forEach((s: any) => allNames.add(s.name))
                            })
                            const labels = Array.from(allNames).slice(0, 5) // 最多5条线

                            // 构建图表数据
                            const chartData = history.map((h: any) => {
                                const row: any = { date: h.date }
                                labels.forEach((name) => {
                                    const found = h.syndromes?.find((s: any) => s.name === name)
                                    row[name] = found ? Math.round(found.score * 100) : 0
                                })
                                return row
                            })

                            setHistoryData(chartData)
                            setHistoryLabels(labels)
                        }
                    } catch {
                        // 历史数据加载失败不影响主流程
                    }
                }
            } catch (err: any) {
                console.error('Fetch case detail error:', err)
                setError(err.message || '加载失败')
                toast.error('加载失败', { description: err.message || '请刷新页面重试' })
            } finally {
                setIsLoading(false)
            }
        }

        if (caseId) fetchData()
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
            setTimeout(() => router.push('/doctor/dashboard'), 1000)
        } catch (err: any) {
            toast.error('提交失败', { description: err.message || '请重试' })
        } finally {
            setIsSubmitting(false)
        }
    }

    // 编辑处理函数
    const handleAddSyndrome = () => setEditedSyndromes([...editedSyndromes, { name: '', score: 0.5, description: '' }])
    const handleRemoveSyndrome = (i: number) => { const a = [...editedSyndromes]; a.splice(i, 1); setEditedSyndromes(a) }
    const handleUpdateSyndrome = (i: number, f: keyof Syndrome, v: any) => { const a = [...editedSyndromes]; a[i] = { ...a[i], [f]: v }; setEditedSyndromes(a) }
    const handleAddFormula = () => setEditedFormulas([...editedFormulas, { name: '', score: 0.5, indication: '' }])
    const handleRemoveFormula = (i: number) => { const a = [...editedFormulas]; a.splice(i, 1); setEditedFormulas(a) }
    const handleUpdateFormula = (i: number, f: keyof Formula, v: any) => { const a = [...editedFormulas]; a[i] = { ...a[i], [f]: v }; setEditedFormulas(a) }

    const getAssetTypeName = (type: AssetType): string => {
        const map: Record<AssetType, string> = { raw: '原始图片', mask: '分割掩码', heatmap: '热力图', annotated: '标注结果' }
        return map[type] || type
    }

    // 加载中
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

    // 错误
    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
                        <p className="text-slate-500 mb-4">{error || '未找到病例'}</p>
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
                            病例审核
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            创建于 {formatDateTime(caseData.created_at)}
                        </p>
                    </div>
                </div>
                <Badge
                    variant={caseData.status === 'pending_review' ? 'warning' : caseData.status === 'approved' ? 'success' : 'secondary'}
                    className="text-sm px-3 py-1"
                >
                    {statusInfo.text}
                </Badge>
            </div>

            {/* ===== 粘性分栏布局 ===== */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* ── 左侧固定栏：患者信息 + 可视化 ── */}
                <div className="w-full lg:w-[380px] lg:flex-shrink-0 lg:sticky lg:top-4 space-y-6">
                    {/* 患者信息 */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="w-5 h-5 text-blue-500" />
                                患者信息
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
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
                                <div className="space-y-2 text-sm">
                                    {[
                                        { label: '主诉', value: caseData.questionnaire?.chief_complaint },
                                        { label: '现病史', value: caseData.questionnaire?.present_illness },
                                        { label: '既往史', value: caseData.questionnaire?.past_history },
                                    ].filter(e => e.value).map((e) => (
                                        <div key={e.label}>
                                            <p className="text-slate-500 dark:text-slate-400">{e.label}</p>
                                            <p className="text-slate-900 dark:text-slate-100">{e.value}</p>
                                        </div>
                                    ))}
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: '睡眠', value: caseData.questionnaire?.sleep_quality },
                                            { label: '食欲', value: caseData.questionnaire?.appetite },
                                            { label: '大便', value: caseData.questionnaire?.bowel_movement },
                                            { label: '小便', value: caseData.questionnaire?.urination },
                                        ].filter(e => e.value).map((e) => (
                                            <div key={e.label}>
                                                <p className="text-slate-500 dark:text-slate-400">{e.label}</p>
                                                <p className="text-slate-900 dark:text-slate-100">{e.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 可视化分析 */}
                    <Card>
                        <CardHeader className="pb-3">
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
                                                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.svg' }}
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
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.svg' }}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                                    暂无可视化资源
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── 右侧滚动区：病程对比 + 诊断与修订 ── */}
                <div className="flex-1 min-w-0 space-y-6">

                    {/* 病程对比 */}
                    {historyData.length > 1 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <TrendingUp className="w-5 h-5 text-cyan-500" />
                                    病程对比
                                </CardTitle>
                                <CardDescription>该患者历史病例证型变化趋势</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={historyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                                            <Tooltip formatter={(val: any) => `${val}%`} />
                                            <Legend />
                                            {historyLabels.map((name, i) => (
                                                <Line
                                                    key={name}
                                                    type="monotone"
                                                    dataKey={name}
                                                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                                    strokeWidth={2}
                                                    dot={{ r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 诊断与修订 */}
                    <Card>
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
                                    {/* 证候分析 */}
                                    <div>
                                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-emerald-500" />
                                            证候分析
                                            <Badge variant="secondary" className="ml-auto text-xs">
                                                AI置信度 {Math.round(result.confidence_score * 100)}%
                                            </Badge>
                                        </h4>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                {editedSyndromes.map((syndrome, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                        <Input
                                                            value={syndrome.name}
                                                            onChange={(e) => handleUpdateSyndrome(index, 'name', e.target.value)}
                                                            placeholder="证候名称"
                                                            className="h-8 flex-1"
                                                        />
                                                        <input
                                                            type="range" min="0" max="1" step="0.01"
                                                            value={syndrome.score}
                                                            onChange={(e) => handleUpdateSyndrome(index, 'score', parseFloat(e.target.value))}
                                                            className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                            title={`${Math.round(syndrome.score * 100)}%`}
                                                        />
                                                        <span className="text-xs text-slate-500 w-8 text-right shrink-0">{Math.round(syndrome.score * 100)}%</span>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 shrink-0" onClick={() => handleRemoveSyndrome(index)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={handleAddSyndrome}>
                                                    <Plus className="w-4 h-4 mr-2" />添加证候
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {editedSyndromes.map((syndrome, index) => {
                                                    const pct = Math.round(syndrome.score * 100)
                                                    const intensity = pct >= 70 ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200'
                                                        : pct >= 40 ? 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-200'
                                                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-300'
                                                    return (
                                                        <div key={index} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium ${intensity}`}>
                                                            <span className="truncate mr-1">{syndrome.name}</span>
                                                            <span className="shrink-0 text-xs font-semibold opacity-70">{pct}%</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 推荐用药 */}
                                    <div>
                                        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                            <Pill className="w-4 h-4 text-teal-500" />
                                            推荐用药
                                            <Badge variant="secondary" className="ml-auto text-xs">
                                                AI置信度 {Math.round(result.confidence_score * 100)}%
                                            </Badge>
                                        </h4>
                                        {isEditing ? (
                                            <div className="space-y-2">
                                                {editedFormulas.map((formula, index) => (
                                                    <div key={index} className="space-y-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                value={formula.name}
                                                                onChange={(e) => handleUpdateFormula(index, 'name', e.target.value)}
                                                                placeholder="方剂名称"
                                                                className="h-8 flex-1"
                                                            />
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 shrink-0" onClick={() => handleRemoveFormula(index)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                        <Input
                                                            value={formula.indication || ''}
                                                            onChange={(e) => handleUpdateFormula(index, 'indication', e.target.value)}
                                                            placeholder="主治/适应症（可选）"
                                                            className="h-7 text-xs"
                                                        />
                                                    </div>
                                                ))}
                                                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={handleAddFormula}>
                                                    <Plus className="w-4 h-4 mr-2" />添加方剂
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {editedFormulas.map((formula, index) => {
                                                    const pct = Math.round(formula.score * 100)
                                                    const intensity = pct >= 70 ? 'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-200'
                                                        : pct >= 40 ? 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-200'
                                                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-300'
                                                    return (
                                                        <div key={index} className={`px-3 py-2 rounded-lg border text-sm ${intensity}`}>
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium truncate mr-1">{formula.name}</span>
                                                                <span className="shrink-0 text-xs font-semibold opacity-70">{pct}%</span>
                                                            </div>
                                                            {formula.indication && (
                                                                <p className="text-xs opacity-60 mt-0.5 truncate">{formula.indication}</p>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* 证据要点 */}
                                    {result.evidence_points && result.evidence_points.length > 0 && (
                                        <div>
                                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-amber-500" />
                                                证据要点
                                                <span className="ml-auto text-xs font-normal text-slate-500">AI 提取的舌诊/症状依据</span>
                                            </h4>
                                            <div className="space-y-2">
                                                {result.evidence_points.map((point: string, i: number) => (
                                                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                                                            {point}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* AI 综合分析 */}
                                    {result.llm_explanation && (
                                        <div>
                                            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-purple-500" />
                                                AI 综合分析
                                            </h4>
                                            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                    {result.llm_explanation}
                                                </p>
                                            </div>
                                        </div>
                                    )}

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
                                        {caseData.status !== 'pending_review' && caseData.status !== 'approved' ? (
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">等待患者确认提交</p>
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                                        AI 诊断已完成，等待患者点击"确认提交给医生"后方可审核
                                                    </p>
                                                </div>
                                            </div>
                                        ) : isEditing ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={() => handleSubmitReview('revise')}
                                                    disabled={isSubmitting}
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                                    确认修订
                                                </Button>
                                                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                                                    <Undo className="w-4 h-4 mr-2" />
                                                    取消编辑
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {caseData.status === 'approved' ? (
                                                    <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)} disabled={isSubmitting}>
                                                        <Edit3 className="w-4 h-4 mr-2" />
                                                        修订结果
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button className="w-full" onClick={() => handleSubmitReview('approve')} disabled={isSubmitting}>
                                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                                            通过审核
                                                        </Button>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isSubmitting}>
                                                                <Edit3 className="w-4 h-4 mr-1" />
                                                                修订结果
                                                            </Button>
                                                            <Button variant="destructive" onClick={() => handleSubmitReview('reject')} disabled={isSubmitting}>
                                                                <X className="w-4 h-4 mr-1" />
                                                                驳回
                                                            </Button>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
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

            {/* 客服悬浮框 */}
            {data?.case && (
                <DoctorChatBox
                    patientId={data.case.patient_id}
                    patientName={data.case.patient_name || '患者'}
                />
            )}
        </div>
    )
}

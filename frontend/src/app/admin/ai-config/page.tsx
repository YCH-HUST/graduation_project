"use client"

/**
 * 管理员端 - AI 配置管理页面
 * Tabs: LLM配置 | Prompt模版 | ML模型管理
 */
import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    Bot, Key, Cpu, Upload, CheckCircle2, XCircle, Loader2,
    RefreshCw, Save, FlaskConical, HardDrive, Eye, EyeOff,
    Settings2, MessageSquareText, Database,
} from 'lucide-react'
import {
    getAIConfig, saveAIConfig, testLLM,
    getMLModels, uploadMLModel,
} from '@/api/admin'
import type { AIConfigItem, MLModelInfo } from '@/types'

type Tab = 'llm' | 'prompts' | 'models'

export default function AIConfigPage() {
    const [activeTab, setActiveTab] = useState<Tab>('llm')

    // ── LLM 配置 ──
    const [configs, setConfigs] = useState<AIConfigItem[]>([])
    const [editedValues, setEditedValues] = useState<Record<string, string>>({})
    const [showKey, setShowKey] = useState(false)
    const [isSavingLLM, setIsSavingLLM] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; reply?: string } | null>(null)

    // ── Prompt 模版 ──
    const [isSavingPrompts, setIsSavingPrompts] = useState(false)

    // ── ML 模型 ──
    const [models, setModels] = useState<MLModelInfo[]>([])
    const [isLoadingModels, setIsLoadingModels] = useState(true)
    const [uploadingType, setUploadingType] = useState<string | null>(null)
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

    // ── 数据加载 ──
    const [isLoadingConfig, setIsLoadingConfig] = useState(true)

    useEffect(() => {
        loadConfig()
        loadModels()
    }, [])

    const loadConfig = async () => {
        try {
            setIsLoadingConfig(true)
            const data = await getAIConfig()
            setConfigs(data.configs)
            const vals: Record<string, string> = {}
            data.configs.forEach(c => { vals[c.key] = c.value })
            setEditedValues(vals)
        } catch (e: any) {
            toast.error('加载配置失败', { description: e.message })
        } finally {
            setIsLoadingConfig(false)
        }
    }

    const loadModels = async () => {
        try {
            setIsLoadingModels(true)
            const data = await getMLModels()
            setModels(data.models)
        } catch (e: any) {
            toast.error('加载模型信息失败', { description: e.message })
        } finally {
            setIsLoadingModels(false)
        }
    }

    // ── LLM 配置相关 ──
    const handleSaveLLM = async () => {
        setIsSavingLLM(true)
        try {
            const llmKeys = ['llm_api_key', 'llm_model_name', 'llm_api_url', 'llm_temperature']
            const payload = llmKeys.map(k => ({ key: k, value: editedValues[k] ?? '' }))
            await saveAIConfig(payload)
            toast.success('LLM 配置已保存')
            setTestResult(null)
            await loadConfig()
        } catch (e: any) {
            toast.error('保存失败', { description: e.message })
        } finally {
            setIsSavingLLM(false)
        }
    }

    const handleTestLLM = async () => {
        setIsTesting(true)
        setTestResult(null)
        try {
            const result = await testLLM()
            setTestResult(result)
            if (result.success) {
                toast.success('连接成功！', { description: `模型回复：${result.reply}` })
            } else {
                toast.error('连接失败', { description: result.message })
            }
        } catch (e: any) {
            setTestResult({ success: false, message: e.message })
            toast.error('测试请求失败', { description: e.message })
        } finally {
            setIsTesting(false)
        }
    }

    // ── Prompt 相关 ──
    const handleSavePrompts = async () => {
        setIsSavingPrompts(true)
        try {
            const promptKeys = ['prompt_symptom_extract_system', 'prompt_analysis_system']
            const payload = promptKeys.map(k => ({ key: k, value: editedValues[k] ?? '' }))
            await saveAIConfig(payload)
            toast.success('Prompt 模版已保存')
            await loadConfig()
        } catch (e: any) {
            toast.error('保存失败', { description: e.message })
        } finally {
            setIsSavingPrompts(false)
        }
    }

    // ── ML 模型上传 ──
    const handleUploadModel = async (modelType: string, file: File) => {
        setUploadingType(modelType)
        try {
            const result = await uploadMLModel(modelType, file)
            toast.success('模型更新成功', { description: result.message })
            await loadModels()
        } catch (e: any) {
            toast.error('上传失败', { description: e.message })
        } finally {
            setUploadingType(null)
            if (fileRefs.current[modelType]) {
                fileRefs.current[modelType]!.value = ''
            }
        }
    }

    const getConfig = (key: string) => editedValues[key] ?? ''

    // ── 渲染 ──
    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'llm', label: 'LLM 配置', icon: <Key className="w-4 h-4" /> },
        { id: 'prompts', label: 'Prompt 模版', icon: <MessageSquareText className="w-4 h-4" /> },
        { id: 'models', label: 'ML 模型', icon: <Cpu className="w-4 h-4" /> },
    ]

    const modelIcons: Record<string, React.ReactNode> = {
        yolo: <Database className="w-5 h-5 text-purple-500" />,
        syndrome: <Bot className="w-5 h-5 text-emerald-500" />,
        herb: <FlaskConical className="w-5 h-5 text-amber-500" />,
    }

    return (
        <div className="space-y-6">
            {/* 标题 */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Settings2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI 配置管理</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">管理 LLM 配置、Prompt 模版和 ML 模型文件</p>
                </div>
            </div>

            {/* Tab 导航 */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab 1: LLM 配置 ── */}
            {activeTab === 'llm' && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Key className="w-5 h-5 text-violet-500" />
                                LLM 接口配置
                            </CardTitle>
                            <CardDescription>修改大模型 API 密钥、模型名称和接口地址</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {isLoadingConfig ? (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />加载中...
                                </div>
                            ) : (
                                <>
                                    {/* API Key */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="api-key">API 密钥</Label>
                                        <div className="relative">
                                            <Input
                                                id="api-key"
                                                type={showKey ? 'text' : 'password'}
                                                value={getConfig('llm_api_key')}
                                                onChange={e => setEditedValues(prev => ({ ...prev, llm_api_key: e.target.value }))}
                                                placeholder="sk-..."
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowKey(!showKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">当前已保存 API Key 中间部分已遮蔽</p>
                                    </div>

                                    {/* 模型名称 */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="model-name">模型名称</Label>
                                        <Input
                                            id="model-name"
                                            value={getConfig('llm_model_name')}
                                            onChange={e => setEditedValues(prev => ({ ...prev, llm_model_name: e.target.value }))}
                                            placeholder="例: Qwen/Qwen3-235B-A22B-Instruct-2507"
                                        />
                                        <p className="text-xs text-slate-400">硅基流动平台模型 ID，需与账户权限匹配</p>
                                    </div>

                                    {/* API 地址 */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="api-url">API 地址</Label>
                                        <Input
                                            id="api-url"
                                            value={getConfig('llm_api_url')}
                                            onChange={e => setEditedValues(prev => ({ ...prev, llm_api_url: e.target.value }))}
                                            placeholder="https://api.siliconflow.cn/v1/chat/completions"
                                        />
                                    </div>

                                    {/* Temperature */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="temperature">Temperature</Label>
                                        <Input
                                            id="temperature"
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={getConfig('llm_temperature')}
                                            onChange={e => setEditedValues(prev => ({ ...prev, llm_temperature: e.target.value }))}
                                            placeholder="0.2"
                                            className="w-32"
                                        />
                                    </div>

                                    {/* 测试结果 */}
                                    {testResult && (
                                        <div className={`p-3 rounded-lg border text-sm ${testResult.success
                                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                            }`}>
                                            <div className="flex items-center gap-2 font-medium mb-1">
                                                {testResult.success
                                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    : <XCircle className="w-4 h-4 text-red-600" />
                                                }
                                                {testResult.message}
                                            </div>
                                            {testResult.reply && (
                                                <p className="text-slate-600 dark:text-slate-300 ml-6">
                                                    模型回复：{testResult.reply}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* 操作按钮 */}
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={handleTestLLM}
                                            variant="outline"
                                            disabled={isTesting}
                                        >
                                            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                                            测试连接
                                        </Button>
                                        <Button
                                            onClick={handleSaveLLM}
                                            disabled={isSavingLLM}
                                            className="bg-violet-600 hover:bg-violet-700"
                                        >
                                            {isSavingLLM ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            保存配置
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Tab 2: Prompt 模版 ── */}
            {activeTab === 'prompts' && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <MessageSquareText className="w-5 h-5 text-blue-500" />
                                症状提取 Prompt
                            </CardTitle>
                            <CardDescription>
                                用于从主诉和现病史中提取标准化症状的 System Prompt。
                                使用 <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{symptom_list}'}</code> 占位符嵌入症状词典。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoadingConfig ? (
                                <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />加载中...</div>
                            ) : (
                                <Textarea
                                    value={getConfig('prompt_symptom_extract_system')}
                                    onChange={e => setEditedValues(prev => ({ ...prev, prompt_symptom_extract_system: e.target.value }))}
                                    rows={12}
                                    className="font-mono text-sm leading-relaxed"
                                    placeholder="输入症状提取的 System Prompt..."
                                />
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bot className="w-5 h-5 text-emerald-500" />
                                综合分析 Prompt
                            </CardTitle>
                            <CardDescription>用于生成最终综合诊疗分析报告的 System Prompt</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoadingConfig ? (
                                <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />加载中...</div>
                            ) : (
                                <Textarea
                                    value={getConfig('prompt_analysis_system')}
                                    onChange={e => setEditedValues(prev => ({ ...prev, prompt_analysis_system: e.target.value }))}
                                    rows={12}
                                    className="font-mono text-sm leading-relaxed"
                                    placeholder="输入综合分析的 System Prompt..."
                                />
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSavePrompts}
                            disabled={isSavingPrompts}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSavingPrompts ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            保存所有 Prompt
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Tab 3: ML 模型管理 ── */}
            {activeTab === 'models' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            上传新模型文件后立即热重载，无需重启服务
                        </p>
                        <Button variant="outline" size="sm" onClick={loadModels} disabled={isLoadingModels}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingModels ? 'animate-spin' : ''}`} />
                            刷新
                        </Button>
                    </div>

                    {isLoadingModels ? (
                        <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin" />加载模型信息...
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {models.map(model => (
                                <Card key={model.type}>
                                    <CardContent className="pt-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="mt-0.5">{modelIcons[model.type]}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                                            {model.label}
                                                        </h3>
                                                        <Badge
                                                            variant={model.exists ? 'success' : 'destructive'}
                                                            className="text-xs"
                                                        >
                                                            {model.exists ? '正常' : '文件缺失'}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <span className="flex items-center gap-1">
                                                                <HardDrive className="w-3.5 h-3.5" />
                                                                {model.filename}
                                                            </span>
                                                            {model.exists && (
                                                                <>
                                                                    <span>{model.size_mb} MB</span>
                                                                    <span>
                                                                        更新于 {new Date(model.updated_at!).toLocaleString('zh-CN')}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400">
                                                            接受格式：<code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{model.accepted_ext}</code>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 上传区 */}
                                            <div className="flex flex-col items-end gap-2">
                                                <input
                                                    ref={el => { fileRefs.current[model.type] = el }}
                                                    type="file"
                                                    accept={model.accepted_ext}
                                                    className="hidden"
                                                    id={`file-${model.type}`}
                                                    onChange={e => {
                                                        const file = e.target.files?.[0]
                                                        if (file) handleUploadModel(model.type, file)
                                                    }}
                                                />
                                                <label htmlFor={`file-${model.type}`}>
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={uploadingType === model.type}
                                                        className="cursor-pointer"
                                                    >
                                                        <span>
                                                            {uploadingType === model.type
                                                                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                : <Upload className="w-4 h-4 mr-2" />
                                                            }
                                                            {uploadingType === model.type ? '上传中...' : '上传新模型'}
                                                        </span>
                                                    </Button>
                                                </label>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

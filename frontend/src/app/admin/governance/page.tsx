"use client"

/**
 * 管理员端 - 数据治理页面
 * 同义词、标签、模板、黑名单词管理（占位 CRUD）
 */
import { useEffect, useState, useCallback } from 'react'
import { getGovernanceItems, createGovernanceItem, deleteGovernanceItem } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    Loader2,
    Plus,
    Trash2,
    Database,
    Tag,
    FileText,
    Ban,
    RefreshCw,
} from 'lucide-react'
import type { GovernanceItem } from '@/types'

type GovernanceType = 'synonym' | 'tag' | 'template' | 'blacklist'

const typeConfig: Record<GovernanceType, { label: string; icon: React.ReactNode; color: string }> = {
    synonym: { label: '同义词', icon: <Database className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    tag: { label: '标签', icon: <Tag className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
    template: { label: '模板', icon: <FileText className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
    blacklist: { label: '黑名单', icon: <Ban className="w-4 h-4" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
}

export default function AdminGovernancePage() {
    const [activeType, setActiveType] = useState<GovernanceType>('synonym')
    const [items, setItems] = useState<GovernanceItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)

    // 新建表单
    const [newValue, setNewValue] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [dialogOpen, setDialogOpen] = useState(false)

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await getGovernanceItems(activeType)
            setItems(response)
        } catch (err: any) {
            console.error('Fetch governance items error:', err)
            toast.error('加载失败', {
                description: err.message || '请重试',
            })
        } finally {
            setIsLoading(false)
        }
    }, [activeType])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    const handleCreate = async () => {
        if (!newValue.trim()) {
            toast.error('请填写内容')
            return
        }

        try {
            setIsCreating(true)
            const newItem = await createGovernanceItem({
                type: activeType,
                value: newValue.trim(),
                description: newDescription.trim() || undefined,
            })
            setItems([newItem, ...items])
            setNewValue('')
            setNewDescription('')
            setDialogOpen(false)
            toast.success('创建成功')
        } catch (err: any) {
            console.error('Create governance item error:', err)
            toast.error('创建失败', {
                description: err.message || '请重试',
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            setIsDeleting(id)
            await deleteGovernanceItem(id)
            setItems(items.filter(item => item.id !== id))
            toast.success('删除成功')
        } catch (err: any) {
            console.error('Delete governance item error:', err)
            toast.error('删除失败', {
                description: err.message || '请重试',
            })
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        数据治理
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        管理同义词、标签、模板和黑名单词
                    </p>
                </div>
                <Button variant="outline" onClick={fetchItems} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新
                </Button>
            </div>

            {/* 类型切换 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        {(Object.keys(typeConfig) as GovernanceType[]).map((type) => {
                            const config = typeConfig[type]
                            const isActive = activeType === type
                            return (
                                <button
                                    key={type}
                                    onClick={() => setActiveType(type)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {config.icon}
                                    {config.label}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 数据列表 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {typeConfig[activeType].icon}
                                {typeConfig[activeType].label}管理
                            </CardTitle>
                            <CardDescription className="mt-1">
                                管理 {typeConfig[activeType].label} 数据
                            </CardDescription>
                        </div>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4" />
                                    添加
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>添加{typeConfig[activeType].label}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="value">内容 *</Label>
                                        <Input
                                            id="value"
                                            placeholder={`请输入${typeConfig[activeType].label}内容`}
                                            value={newValue}
                                            onChange={(e) => setNewValue(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">描述</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="可选：添加描述信息"
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">取消</Button>
                                    </DialogClose>
                                    <Button onClick={handleCreate} disabled={isCreating}>
                                        {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        创建
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        </div>
                    ) : items.length > 0 ? (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge className={typeConfig[item.type as GovernanceType]?.color || ''}>
                                            {typeConfig[item.type as GovernanceType]?.label || item.type}
                                        </Badge>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                                {item.value}
                                            </p>
                                            {item.description && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(item.id)}
                                        disabled={isDeleting === item.id}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                                    >
                                        {isDeleting === item.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Database className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                暂无数据
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-4">
                                点击"添加"按钮创建新的{typeConfig[activeType].label}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

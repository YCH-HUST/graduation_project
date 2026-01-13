"use client"

/**
 * 医生端 - 患者管理页面
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    getPatients,
    createPatient,
    updatePatient,
    deletePatient,
    PatientListItem,
    PatientsListResponse,
    CreatePatientRequest,
    UpdatePatientRequest,
} from '@/api/patients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
    Users,
    Search,
    Plus,
    Loader2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    Edit,
    Trash2,
    X,
    User,
} from 'lucide-react'

export default function PatientsPage() {
    const router = useRouter()

    const [data, setData] = useState<PatientsListResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10

    // 弹窗状态
    const [showModal, setShowModal] = useState(false)
    const [editingPatient, setEditingPatient] = useState<PatientListItem | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // 表单状态
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        email: '',
        gender: '' as 'male' | 'female' | '',
        age: '' as string,
    })

    const fetchPatients = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await getPatients({
                page: currentPage,
                page_size: pageSize,
                search: searchQuery || undefined,
            })
            setData(response)
        } catch (err: any) {
            console.error('Fetch patients error:', err)
            toast.error('加载失败', { description: err.message })
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, searchQuery])

    useEffect(() => {
        fetchPatients()
    }, [fetchPatients])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setCurrentPage(1)
        fetchPatients()
    }

    const handleOpenAddModal = () => {
        setEditingPatient(null)
        setFormData({
            username: '',
            password: '',
            full_name: '',
            email: '',
            gender: '',
            age: '',
        })
        setShowModal(true)
    }

    const handleOpenEditModal = (patient: PatientListItem) => {
        setEditingPatient(patient)
        setFormData({
            username: patient.username,
            password: '',
            full_name: patient.full_name,
            email: patient.email,
            gender: (patient.gender as 'male' | 'female' | '') || '',
            age: patient.age?.toString() || '',
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            setIsSaving(true)

            if (editingPatient) {
                // 更新
                const updateData: UpdatePatientRequest = {
                    full_name: formData.full_name,
                    email: formData.email,
                    gender: formData.gender,
                    age: formData.age ? parseInt(formData.age) : null,
                }
                await updatePatient(editingPatient.id, updateData)
                toast.success('更新成功')
            } else {
                // 创建
                if (!formData.username || !formData.password) {
                    toast.error('请填写用户名和密码')
                    return
                }
                const createData: CreatePatientRequest = {
                    username: formData.username,
                    password: formData.password,
                    full_name: formData.full_name,
                    email: formData.email,
                    gender: formData.gender,
                    age: formData.age ? parseInt(formData.age) : null,
                }
                await createPatient(createData)
                toast.success('创建成功')
            }

            setShowModal(false)
            fetchPatients()
        } catch (err: any) {
            toast.error(editingPatient ? '更新失败' : '创建失败', { description: err.message })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            setIsDeleting(true)
            await deletePatient(id)
            toast.success('删除成功')
            setShowDeleteConfirm(null)
            fetchPatients()
        } catch (err: any) {
            toast.error('删除失败', { description: err.message })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleViewDetail = (id: number) => {
        router.push(`/doctor/patients/${id}`)
    }

    const totalPages = data ? Math.ceil(data.total / pageSize) : 0

    const getGenderText = (gender: string) => {
        if (gender === 'male') return '男'
        if (gender === 'female') return '女'
        return '-'
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        患者管理
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        管理系统中的所有患者
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchPatients()} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        刷新
                    </Button>
                    <Button onClick={handleOpenAddModal}>
                        <Plus className="w-4 h-4" />
                        添加患者
                    </Button>
                </div>
            </div>

            {/* 搜索栏 */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="搜索患者用户名、姓名或邮箱..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>搜索</Button>
                    </form>
                </CardContent>
            </Card>

            {/* 患者列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        患者列表
                        {data && (
                            <Badge variant="secondary" className="ml-2">
                                共 {data.total} 人
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : data && data.items.length > 0 ? (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">ID</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">用户名</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">姓名</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">邮箱</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">性别</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">年龄</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">病例数</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((patient) => (
                                            <tr
                                                key={patient.id}
                                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                            >
                                                <td className="py-4 px-4 text-slate-500">#{patient.id}</td>
                                                <td className="py-4 px-4 font-medium text-slate-900 dark:text-slate-100">
                                                    {patient.username}
                                                </td>
                                                <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                                                    {patient.full_name || '-'}
                                                </td>
                                                <td className="py-4 px-4 text-slate-500">{patient.email || '-'}</td>
                                                <td className="py-4 px-4 text-slate-500">{getGenderText(patient.gender)}</td>
                                                <td className="py-4 px-4 text-slate-500">{patient.age ?? '-'}</td>
                                                <td className="py-4 px-4">
                                                    <Badge variant="secondary">{patient.case_count}</Badge>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleViewDetail(patient.id)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleOpenEditModal(patient)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => setShowDeleteConfirm(patient.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-sm text-slate-500">第 {currentPage} / {totalPages} 页</p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            上一页
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            下一页
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                                暂无患者
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-4">
                                点击"添加患者"创建第一个患者
                            </p>
                            <Button onClick={handleOpenAddModal}>
                                <Plus className="w-4 h-4 mr-1" />
                                添加患者
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 添加/编辑弹窗 */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {editingPatient ? '编辑患者' : '添加患者'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {!editingPatient && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            用户名 <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            value={formData.username}
                                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                            placeholder="3-20字符，字母数字下划线"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            密码 <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="至少6字符"
                                            required
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">姓名</label>
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                    placeholder="请输入姓名"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">邮箱</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="请输入邮箱"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">性别</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="male"
                                            checked={formData.gender === 'male'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, gender: 'male' }))}
                                        />
                                        <span>男</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="female"
                                            checked={formData.gender === 'female'}
                                            onChange={(e) => setFormData(prev => ({ ...prev, gender: 'female' }))}
                                        />
                                        <span>女</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">年龄</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="150"
                                    value={formData.age}
                                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                                    placeholder="请输入年龄"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                                    取消
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                            保存中...
                                        </>
                                    ) : (
                                        '保存'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 删除确认弹窗 */}
            {showDeleteConfirm !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                            确认删除
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            确定要删除这个患者吗？此操作不可撤销，该患者的所有病例也将被删除。
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                                取消
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleDelete(showDeleteConfirm)}
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

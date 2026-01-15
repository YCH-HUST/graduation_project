"use client"

/**
 * 管理员端 - 用户管理
 */
import { useEffect, useState, useCallback } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
    Loader2,
    Plus,
    Trash2,
    Edit,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import type { AdminUser, UserRole } from '@/types'

const roleLabels: Record<UserRole, string> = {
    patient: '患者',
    doctor: '医生',
    admin: '管理员',
}

const roleColors: Record<UserRole, string> = {
    patient: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    doctor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const pageSize = 10

    // 创建用户表单
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        email: '',
        full_name: '',
        role: 'patient' as UserRole,
    })

    // 编辑用户
    const [editUser, setEditUser] = useState<AdminUser | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    // 删除确认
    const [deleteUserId, setDeleteUserId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchUsers = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await getUsers({
                page,
                page_size: pageSize,
                role: roleFilter === 'all' ? undefined : roleFilter,
                search: search || undefined,
            })
            setUsers(response.items)
            setTotal(response.total)
        } catch (err: any) {
            console.error('Fetch users error:', err)
            toast.error('获取用户列表失败')
        } finally {
            setIsLoading(false)
        }
    }, [page, roleFilter, search])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const handleCreate = async () => {
        if (!newUser.username || !newUser.password) {
            toast.error('请填写用户名和密码')
            return
        }
        try {
            setIsCreating(true)
            await createUser(newUser)
            toast.success('用户创建成功')
            setCreateDialogOpen(false)
            setNewUser({ username: '', password: '', email: '', full_name: '', role: 'patient' })
            fetchUsers()
        } catch (err: any) {
            toast.error('创建失败', { description: err.response?.data?.detail || err.message })
        } finally {
            setIsCreating(false)
        }
    }

    const handleUpdate = async () => {
        if (!editUser) return
        try {
            setIsUpdating(true)
            await updateUser(editUser.id, editUser)
            toast.success('用户更新成功')
            setEditDialogOpen(false)
            setEditUser(null)
            fetchUsers()
        } catch (err: any) {
            toast.error('更新失败', { description: err.response?.data?.detail || err.message })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteUserId) return
        try {
            setIsDeleting(true)
            await deleteUser(deleteUserId)
            toast.success('用户已删除')
            setDeleteUserId(null)
            fetchUsers()
        } catch (err: any) {
            toast.error('删除失败', { description: err.response?.data?.detail || err.message })
        } finally {
            setIsDeleting(false)
        }
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-slate-100 dark:to-slate-300">
                        用户管理
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        管理系统中的所有用户
                    </p>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4" />
                            创建用户
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>创建用户</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>用户名 *</Label>
                                    <Input
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        placeholder="用户名"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>密码 *</Label>
                                    <Input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="密码"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>姓名</Label>
                                    <Input
                                        value={newUser.full_name}
                                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                        placeholder="姓名"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>角色</Label>
                                    <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as UserRole })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="patient">患者</SelectItem>
                                            <SelectItem value="doctor">医生</SelectItem>
                                            <SelectItem value="admin">管理员</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>邮箱</Label>
                                <Input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="邮箱"
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

            {/* 搜索和筛选 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                className="pl-10"
                                placeholder="搜索用户名、姓名或邮箱..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setPage(1)
                                }}
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="角色" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部</SelectItem>
                                <SelectItem value="patient">患者</SelectItem>
                                <SelectItem value="doctor">医生</SelectItem>
                                <SelectItem value="admin">管理员</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* 用户列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        用户列表
                    </CardTitle>
                    <CardDescription>共 {total} 个用户</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">暂无用户</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">ID</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">用户名</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">姓名</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">角色</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">病例数</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="py-3 px-4">{user.id}</td>
                                                <td className="py-3 px-4 font-medium">{user.username}</td>
                                                <td className="py-3 px-4">{user.full_name || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                                                </td>
                                                <td className="py-3 px-4">{user.case_count}</td>
                                                <td className="py-3 px-4">
                                                    <Badge variant={user.is_active ? 'success' : 'secondary'}>
                                                        {user.is_active ? '活跃' : '禁用'}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => { setEditUser(user); setEditDialogOpen(true) }}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setDeleteUserId(user.id)}
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
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <span className="text-sm text-slate-500">
                                        第 {page} 页，共 {totalPages} 页
                                    </span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page === totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* 编辑对话框 */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑用户</DialogTitle>
                    </DialogHeader>
                    {editUser && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>姓名</Label>
                                    <Input
                                        value={editUser.full_name}
                                        onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>角色</Label>
                                    <Select value={editUser.role} onValueChange={(v) => setEditUser({ ...editUser, role: v as UserRole })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="patient">患者</SelectItem>
                                            <SelectItem value="doctor">医生</SelectItem>
                                            <SelectItem value="admin">管理员</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>邮箱</Label>
                                <Input
                                    type="email"
                                    value={editUser.email}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>状态</Label>
                                <Select
                                    value={editUser.is_active ? 'active' : 'inactive'}
                                    onValueChange={(v) => setEditUser({ ...editUser, is_active: v === 'active' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">活跃</SelectItem>
                                        <SelectItem value="inactive">禁用</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button onClick={handleUpdate} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            保存
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除确认对话框 */}
            <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                    </DialogHeader>
                    <p className="py-4">确定要删除此用户吗？此操作不可撤销。</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteUserId(null)}>取消</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

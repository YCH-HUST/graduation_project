import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 TailwindCSS 类名，解决类名冲突
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * 检查是否启用 Mock 模式
 */
export function isMockMode(): boolean {
    return process.env.NEXT_PUBLIC_USE_MOCK === 'true'
}

/**
 * 获取 API 基础 URL
 */
export function getApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

/**
 * 格式化状态文本
 */
export function formatCaseStatus(status: string): { text: string; color: string } {
    const statusMap: Record<string, { text: string; color: string }> = {
        created: { text: '已创建', color: 'text-gray-500' },
        running: { text: '处理中', color: 'text-blue-500' },
        pending_review: { text: '待审核', color: 'text-yellow-500' },
        approved: { text: '已通过', color: 'text-green-500' },
        rejected: { text: '已驳回', color: 'text-red-500' },
        failed: { text: '失败', color: 'text-red-500' },
    }
    return statusMap[status] || { text: status, color: 'text-gray-500' }
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Axios API 客户端
 * - 自动注入 JWT Token
 * - 401 自动登出
 * - 支持 Mock 模式切换
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { getApiBaseUrl, isMockMode } from '@/lib/utils'
import { toast } from 'sonner'

// 创建 Axios 实例
const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// 请求拦截器：自动注入 JWT Token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Mock 模式下不发送真实请求
        if (isMockMode()) {
            return config
        }

        // 从 localStorage 获取 token
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 从 DRF 错误响应体提取人类可读的错误信息
function extractDRFErrorMessage(data: any): string | null {
    if (!data) return null
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) return data.non_field_errors[0]
    if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0]
        if (firstKey) {
            const fieldErr = data[firstKey]
            const msg = Array.isArray(fieldErr) ? fieldErr[0] : String(fieldErr)
            return msg
        }
    }
    return null
}

// 响应拦截器：处理错误和 401 自动登出
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // 处理 401 未授权错误
        if (error.response?.status === 401) {
            // 清除本地存储的认证信息
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                localStorage.removeItem('role')

                toast.error('登录已过期，请重新登录')

                // 跳转到登录页
                window.location.href = '/login'
            }
        } else if (error.response?.status === 400) {
            // 从 DRF 响应体提取具体错误原因，然后附加到 error.message 上
            const drfMsg = extractDRFErrorMessage(error.response.data)
            if (drfMsg) {
                // 覆盖 error.message 使调用方能直接拿到中文提示
                ; (error as any).message = drfMsg
            }
        } else if (error.response?.status === 403) {
            toast.error('没有访问权限')
        } else if (error.response?.status === 500) {
            toast.error('服务器错误，请稍后重试')
        } else if (error.code === 'ECONNABORTED') {
            toast.error('请求超时，请检查网络连接')
        } else if (!error.response) {
            toast.error('网络连接失败')
        }

        return Promise.reject(error)
    }
)

export default apiClient

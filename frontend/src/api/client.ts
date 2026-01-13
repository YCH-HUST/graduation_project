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

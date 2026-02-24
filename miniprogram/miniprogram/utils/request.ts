/**
 * HTTP 请求封装
 * 基于 wx.request，自动携带 token，统一处理错误
 */

const BASE_URL = 'http://localhost:8000'

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    data?: any
    header?: Record<string, string>
    /** 是否需要 token，默认 true */
    auth?: boolean
}

interface ApiResponse<T = any> {
    data: T
    statusCode: number
}

function getToken(): string {
    return wx.getStorageSync('token') || ''
}

/**
 * 通用请求
 */
export function request<T = any>(
    url: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = 'GET', data, header = {}, auth = true } = options

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...header,
    }

    if (auth) {
        const token = getToken()
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
    }

    return new Promise((resolve, reject) => {
        wx.request({
            url: `${BASE_URL}${url}`,
            method,
            data,
            header: headers,
            success(res) {
                const statusCode = res.statusCode
                if (statusCode === 401) {
                    // Token 过期，清除登录态，跳转登录页
                    wx.removeStorageSync('token')
                    wx.removeStorageSync('user')
                    wx.removeStorageSync('role')
                    wx.reLaunch({ url: '/pages/login/login' })
                    reject(new Error('登录已过期，请重新登录'))
                    return
                }
                if (statusCode >= 200 && statusCode < 300) {
                    resolve(res.data as T)
                } else {
                    const errData = res.data as any
                    reject(new Error(errData?.detail || `请求失败 (${statusCode})`))
                }
            },
            fail(err) {
                reject(new Error(err.errMsg || '网络请求失败'))
            },
        })
    })
}

/**
 * 文件上传（用于舌象图片上传）
 */
export function uploadFile<T = any>(
    url: string,
    filePath: string,
    formData?: Record<string, string>
): Promise<T> {
    const token = getToken()

    return new Promise((resolve, reject) => {
        wx.uploadFile({
            url: `${BASE_URL}${url}`,
            filePath,
            name: 'tongue_image',
            formData: formData || {},
            header: {
                Authorization: token ? `Bearer ${token}` : '',
            },
            success(res) {
                if (res.statusCode === 401) {
                    wx.removeStorageSync('token')
                    wx.reLaunch({ url: '/pages/login/login' })
                    reject(new Error('登录已过期'))
                    return
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                        resolve(data as T)
                    } catch {
                        reject(new Error('响应解析失败'))
                    }
                } else {
                    try {
                        const errData = JSON.parse(res.data)
                        reject(new Error(errData?.detail || `上传失败 (${res.statusCode})`))
                    } catch {
                        reject(new Error(`上传失败 (${res.statusCode})`))
                    }
                }
            },
            fail(err) {
                reject(new Error(err.errMsg || '上传失败'))
            },
        })
    })
}

/**
 * YOLO 检测文件上传
 */
export function uploadForDetection<T = any>(
    url: string,
    filePath: string
): Promise<T> {
    const token = getToken()

    return new Promise((resolve, reject) => {
        wx.uploadFile({
            url: `${BASE_URL}${url}`,
            filePath,
            name: 'image',
            header: {
                Authorization: token ? `Bearer ${token}` : '',
            },
            success(res) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                        resolve(data as T)
                    } catch {
                        reject(new Error('响应解析失败'))
                    }
                } else {
                    reject(new Error(`检测失败 (${res.statusCode})`))
                }
            },
            fail(err) {
                reject(new Error(err.errMsg || '检测请求失败'))
            },
        })
    })
}

export default { request, uploadFile, uploadForDetection }

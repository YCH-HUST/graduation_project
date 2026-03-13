/**
 * HTTP 请求封装
 * 基于 wx.request，自动携带 token，统一处理错误，网络失败自动重试
 */

import { ENV } from '../app'

// 环境配置：通过 app 的 globalData 获取，退回到 ENV.prod
export function getBaseUrl(): string {
    return ENV.prod
}

const MAX_RETRY = 2  // 网络失败最多重试次数

interface RequestOptions {
    method?: WechatMiniprogram.RequestOption['method']
    data?: any
    header?: Record<string, string>
    /** 是否需要 token，默认 true */
    auth?: boolean
    /** 内部重试计数，勿手动传入 */
    _retryCount?: number
}

function getToken(): string {
    return wx.getStorageSync('token') || ''
}

/**
 * 通用请求（含网络失败自动重试）
 */
export function request<T = any>(
    url: string,
    options: RequestOptions = {}
): Promise<T> {
    const { method = 'GET', data, header = {}, auth = true, _retryCount = 0 } = options

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

    const BASE_URL = getBaseUrl()

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
                    // 解析 DRF 各种错误格式 -> 返回人类可读的错误信息
                    let errMsg = ''
                    if (errData) {
                        if (typeof errData.detail === 'string') {
                            errMsg = errData.detail
                        } else if (Array.isArray(errData.non_field_errors) && errData.non_field_errors.length > 0) {
                            errMsg = errData.non_field_errors[0]
                        } else if (typeof errData === 'object') {
                            // 字段级别错误，如 { username: ["用户名已存在"] }
                            const firstKey = Object.keys(errData)[0]
                            if (firstKey) {
                                const fieldErr = errData[firstKey]
                                errMsg = Array.isArray(fieldErr) ? `${fieldErr[0]}` : String(fieldErr)
                            }
                        }
                    }
                    if (!errMsg) errMsg = `请求失败 (${statusCode})`
                    reject(new Error(errMsg))
                }
            },
            fail(err) {
                // 网络错误时自动重试
                if (_retryCount < MAX_RETRY) {
                    resolve(request<T>(url, { ...options, _retryCount: _retryCount + 1 }))
                } else {
                    reject(new Error(err.errMsg || '网络请求失败'))
                }
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
    const BASE_URL = getBaseUrl()

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
    const BASE_URL = getBaseUrl()

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

export default { request, uploadFile, uploadForDetection, getBaseUrl }

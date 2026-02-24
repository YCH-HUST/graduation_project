/**
 * 本地存储工具（替代 Web 端的 localStorage）
 */

export interface UserInfo {
    id: number
    username: string
    full_name?: string
    email?: string
    role: 'patient' | 'doctor' | 'admin'
    gender?: string
    age?: number
}

// ===== Token =====

export function setToken(token: string): void {
    wx.setStorageSync('token', token)
}

export function getToken(): string {
    return wx.getStorageSync('token') || ''
}

export function removeToken(): void {
    wx.removeStorageSync('token')
}

// ===== User =====

export function setUser(user: UserInfo): void {
    wx.setStorageSync('user', JSON.stringify(user))
}

export function getUser(): UserInfo | null {
    const raw = wx.getStorageSync('user')
    if (!raw) return null
    try {
        return JSON.parse(raw) as UserInfo
    } catch {
        return null
    }
}

export function removeUser(): void {
    wx.removeStorageSync('user')
}

// ===== Role =====

export function setRole(role: string): void {
    wx.setStorageSync('role', role)
}

export function getRole(): string {
    return wx.getStorageSync('role') || ''
}

// ===== 清除全部登录态 =====

export function clearAuth(): void {
    wx.removeStorageSync('token')
    wx.removeStorageSync('user')
    wx.removeStorageSync('role')
}

// ===== 检查是否已登录 =====

export function isLoggedIn(): boolean {
    return !!getToken()
}

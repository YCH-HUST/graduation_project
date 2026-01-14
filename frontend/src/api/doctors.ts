/**
 * Doctors API - 医生列表接口
 */
import apiClient from './client'
import { isMockMode } from '@/lib/utils'

// 医生信息
export interface Doctor {
    id: number
    username: string
    full_name: string
    hospital: string
    department: string
    department_display: string
    job_title: string
    years_of_experience?: number
}

// 医生列表响应
export interface DoctorsResponse {
    doctors: Doctor[]
    total: number
}

// 科室定义（含说明）
export interface Department {
    key: string
    name: string
    description: string
    icon: string
}

// 科室列表
export const DEPARTMENTS: Department[] = [
    { key: 'internal', name: '内科', description: '治外感及内伤杂病等', icon: '🫀' },
    { key: 'surgery', name: '外科', description: '治体表疾病等', icon: '🩹' },
    { key: 'gynecology', name: '妇科', description: '针对女性生理特点治相关病症', icon: '🌸' },
    { key: 'pediatrics', name: '儿科', description: '专注儿童疾病诊治', icon: '👶' },
    { key: 'orthopedics', name: '骨伤科', description: '治骨骼肌肉关节损伤等', icon: '🦴' },
    { key: 'ent', name: '耳鼻喉科', description: '诊治耳鼻咽喉疾病等', icon: '👂' },
]

/**
 * 获取医生列表
 * @param department 科室代码（可选）
 */
export async function getDoctors(department?: string): Promise<DoctorsResponse> {
    if (isMockMode()) {
        return mockGetDoctors(department)
    }
    const params = department ? { department } : {}
    const response = await apiClient.get<DoctorsResponse>('/api/doctors/', { params })
    return response.data
}

// ============ Mock 实现 ============

async function mockGetDoctors(department?: string): Promise<DoctorsResponse> {
    await new Promise(resolve => setTimeout(resolve, 300))

    const allDoctors: Doctor[] = [
        { id: 1, username: 'doctor1', full_name: '张医生', hospital: '北京中医院', department: 'internal', department_display: '内科', job_title: '主任医师', years_of_experience: 15 },
        { id: 2, username: 'doctor2', full_name: '李医生', hospital: '上海中医药大学附属医院', department: 'internal', department_display: '内科', job_title: '副主任医师', years_of_experience: 10 },
        { id: 3, username: 'doctor3', full_name: '王医生', hospital: '广州中医药大学第一附属医院', department: 'gynecology', department_display: '妇科', job_title: '主任医师', years_of_experience: 20 },
        { id: 4, username: 'doctor4', full_name: '赵医生', hospital: '成都中医药大学附属医院', department: 'pediatrics', department_display: '儿科', job_title: '副主任医师', years_of_experience: 8 },
        { id: 5, username: 'doctor5', full_name: '刘医生', hospital: '南京中医药大学附属医院', department: 'orthopedics', department_display: '骨伤科', job_title: '主治医师', years_of_experience: 5 },
    ]

    const filtered = department
        ? allDoctors.filter(d => d.department === department)
        : allDoctors

    return {
        doctors: filtered,
        total: filtered.length
    }
}

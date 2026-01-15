/**
 * Mock 数据 - 用于开发和测试
 */
import type {
    User,
    Case,
    PipelineRun,
    Asset,
    DiagnosisResult,
    ServiceHealth,
    CaseStatus,
} from '@/types'

// Mock 用户数据
export const mockUsers: Record<string, { password: string; user: User }> = {
    patient1: {
        password: 'password123',
        user: {
            id: 1,
            username: 'patient1',
            email: 'patient1@example.com',
            role: 'patient',
            full_name: '张三',
        },
    },
    doctor1: {
        password: 'password123',
        user: {
            id: 2,
            username: 'doctor1',
            email: 'doctor1@example.com',
            role: 'doctor',
            full_name: '李医生',
        },
    },
    admin1: {
        password: 'password123',
        user: {
            id: 3,
            username: 'admin1',
            email: 'admin1@example.com',
            role: 'admin',
            full_name: '管理员',
        },
    },
}

// Mock 诊断结果
export const mockDiagnosisResult: DiagnosisResult = {
    syndromes: [
        { name: '肝郁脾虚证', score: 0.85, description: '肝气郁结，脾失健运' },
        { name: '气滞血瘀证', score: 0.72, description: '气机郁滞，血行不畅' },
        { name: '湿热蕴结证', score: 0.65, description: '湿热内蕴，阻滞中焦' },
    ],
    formulas: [
        {
            name: '逍遥散',
            score: 0.88,
            composition: '柴胡、当归、白芍、茯苓、白术、甘草、生姜、薄荷',
            indication: '疏肝解郁，养血健脾'
        },
        {
            name: '血府逐瘀汤',
            score: 0.75,
            composition: '桃仁、红花、当归、生地、川芎、赤芍、牛膝、桔梗、柴胡、枳壳、甘草',
            indication: '活血化瘀，行气止痛'
        },
    ],
    evidence_points: [
        '舌象显示舌质暗红，有瘀斑',
        '舌苔薄白腻，提示湿气内蕴',
        '患者主诉胁肋胀痛，符合肝郁证候',
        '睡眠质量差，多梦易醒',
        '食欲减退，大便溏薄',
    ],
    llm_explanation: `综合分析患者的舌象特征和问诊信息，本案例呈现出典型的肝郁脾虚兼夹气滞血瘀的复合证候。

从舌象分析来看：舌质暗红提示有血瘀倾向，舌边有瘀斑进一步印证了气滞血瘀的存在。舌苔薄白腻说明脾虚湿困，运化失常。

从问诊信息来看：患者胁肋胀痛为肝郁气滞的典型表现，情志抑郁、善太息等症状也支持这一判断。睡眠差、多梦与肝血不足、心神失养有关。食欲减退、大便溏薄则反映了脾虚的病机。

治疗建议以疏肝解郁、健脾养血为主，兼以活血化瘀。首选逍遥散加减，如瘀血症状明显，可合用血府逐瘀汤化裁。`,
    confidence_score: 0.82,
}

// Mock 可视化资源
export const mockAssets: Asset[] = [
    { id: 1, type: 'raw', url: '/mock/tongue_raw.jpg', description: '原始舌象图片' },
    { id: 2, type: 'mask', url: '/mock/tongue_mask.jpg', description: '舌体分割掩码' },
    { id: 3, type: 'heatmap', url: '/mock/tongue_heatmap.jpg', description: '特征热力图' },
    { id: 4, type: 'annotated', url: '/mock/tongue_annotated.jpg', description: '标注结果图' },
]

// Mock 病例数据
export const mockCases: Case[] = [
    {
        id: 1,
        patient_id: 1,
        patient_name: '张三',
        tongue_image: '/mock/tongue_raw.jpg',
        questionnaire: {
            chief_complaint: '胁肋胀痛半月余',
            present_illness: '近半月来，无明显诱因出现右侧胁肋部胀痛不适，情绪激动时加重，伴有胸闷、善太息。',
            past_history: '既往体健，无特殊病史',
            sleep_quality: '睡眠差，多梦易醒',
            appetite: '食欲减退',
            bowel_movement: '大便溏薄，每日1-2次',
            urination: '小便正常',
            additional_notes: '近期工作压力较大，情绪不佳',
        },
        status: 'pending_review',
        created_at: '2024-01-13T10:30:00Z',
        updated_at: '2024-01-13T10:35:00Z',
    },
    {
        id: 2,
        patient_id: 1,
        patient_name: '张三',
        tongue_image: '/mock/tongue_raw.jpg',
        questionnaire: {
            chief_complaint: '头晕乏力一周',
            present_illness: '一周前开始出现头晕，伴有四肢乏力，活动后加重。',
            sleep_quality: '睡眠尚可',
            appetite: '食欲一般',
            bowel_movement: '大便正常',
            urination: '小便正常',
        },
        status: 'approved',
        created_at: '2024-01-10T14:20:00Z',
        updated_at: '2024-01-10T16:00:00Z',
    },
    {
        id: 3,
        patient_id: 4,
        patient_name: '王五',
        tongue_image: '/mock/tongue_raw.jpg',
        questionnaire: {
            chief_complaint: '咳嗽痰多三天',
            present_illness: '三天前受凉后出现咳嗽，痰白量多。',
            sleep_quality: '因咳嗽睡眠受影响',
            appetite: '食欲正常',
            bowel_movement: '大便正常',
            urination: '小便正常',
        },
        status: 'pending_review',
        created_at: '2024-01-12T09:15:00Z',
        updated_at: '2024-01-12T09:20:00Z',
    },
]

// Mock 流水线运行状态
export const mockPipelineRun: PipelineRun = {
    id: 1,
    case_id: 1,
    status: 'completed',
    progress: 100,
    current_stage: 'completed',
    result_available: true,
    diagnosis_result: mockDiagnosisResult,
    created_at: '2024-01-13T10:30:00Z',
    completed_at: '2024-01-13T10:35:00Z',
}

// Mock 服务健康状态
export const mockServiceHealth: ServiceHealth[] = [
    { name: 'Django Backend', status: 'healthy', latency_ms: 45, message: '响应正常', last_check: '2024-01-13T10:00:00Z' },
    { name: 'MySQL Database', status: 'healthy', latency_ms: 12, last_check: '2024-01-13T10:00:00Z' },
    { name: 'YOLO 舌象检测模型', status: 'healthy', latency_ms: 5, message: '模型就绪 (18.3 MB)', last_check: '2024-01-13T10:00:00Z' },
    { name: 'NLP Service', status: 'degraded', latency_ms: 100, message: '使用 Mock 模式（实际服务未部署）', last_check: '2024-01-13T10:00:00Z' },
    { name: 'SYNDROME Service', status: 'degraded', latency_ms: 100, message: '使用 Mock 模式（实际服务未部署）', last_check: '2024-01-13T10:00:00Z' },
    { name: 'EXPLANATION Service', status: 'degraded', latency_ms: 100, message: '使用 Mock 模式（实际服务未部署）', last_check: '2024-01-13T10:00:00Z' },
]

// 生成 Mock Token
export function generateMockToken(userId: number): string {
    return `mock_jwt_token_${userId}_${Date.now()}`
}

// 用于生成新用户 ID
let mockUserIdCounter = 100

// 添加 Mock 用户（用于注册）
export function addMockUser(data: {
    username: string
    password: string
    email?: string
    full_name?: string
    role?: 'patient' | 'doctor' | 'admin'
}): User {
    const newUser: User = {
        id: mockUserIdCounter++,
        username: data.username,
        email: data.email || `${data.username}@example.com`,
        role: data.role || 'patient',
        full_name: data.full_name || data.username,
    }

    mockUsers[data.username] = {
        password: data.password,
        user: newUser,
    }

    return newUser
}

// 模拟流水线进度
let mockPipelineProgress = 0

export function resetMockPipelineProgress() {
    mockPipelineProgress = 0
}

import type { PipelineStatus } from '@/types'

export function getMockPipelineStatus(caseId: number): {
    status: PipelineStatus
    progress: number
    current_stage: string
    result_available: boolean
} {
    mockPipelineProgress += 20

    if (mockPipelineProgress >= 100) {
        return {
            status: 'completed' as PipelineStatus,
            progress: 100,
            current_stage: 'completed',
            result_available: true,
        }
    }

    const stages = ['preprocessing', 'segmentation', 'feature_extraction', 'diagnosis', 'postprocessing']
    const stageIndex = Math.floor(mockPipelineProgress / 20)

    return {
        status: 'running' as PipelineStatus,
        progress: mockPipelineProgress,
        current_stage: stages[stageIndex] || 'processing',
        result_available: false,
    }
}

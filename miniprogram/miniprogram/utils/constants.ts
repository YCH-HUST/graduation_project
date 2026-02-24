/**
 * 全局常量定义
 */

// ===== 科室列表 =====
export interface Department {
    key: string
    name: string
    description: string
    icon: string
}

export const DEPARTMENTS: Department[] = [
    { key: 'internal', name: '内科', description: '治外感及内伤杂病等', icon: '🫀' },
    { key: 'surgery', name: '外科', description: '治体表疾病等', icon: '🩹' },
    { key: 'gynecology', name: '妇科', description: '针对女性生理特点治相关病症', icon: '🌸' },
    { key: 'pediatrics', name: '儿科', description: '专注儿童疾病诊治', icon: '👶' },
    { key: 'orthopedics', name: '骨伤科', description: '治骨骼肌肉关节损伤等', icon: '🦴' },
    { key: 'ent', name: '耳鼻喉科', description: '诊治耳鼻咽喉疾病等', icon: '👂' },
]

// ===== 流水线阶段 =====
export const STAGE_NAMES: Record<string, string> = {
    preprocessing: '图像预处理',
    segmentation: '舌体分割',
    feature_extraction: '特征提取',
    diagnosis: '智能诊断',
    postprocessing: '结果生成',
    completed: '处理完成',
}

export const PIPELINE_STAGES = [
    'preprocessing',
    'segmentation',
    'feature_extraction',
    'diagnosis',
    'postprocessing',
]

// ===== 病例状态 =====
export type CaseStatus =
    | 'created'
    | 'running'
    | 'pending_review'
    | 'approved'
    | 'rejected'
    | 'failed'

export const STATUS_TEXT: Record<CaseStatus, string> = {
    created: '已创建',
    running: '诊断中',
    pending_review: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    failed: '处理失败',
}

export const STATUS_COLOR: Record<CaseStatus, string> = {
    created: '#94a3b8',
    running: '#3b82f6',
    pending_review: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    failed: '#ef4444',
}

// ===== YOLO 舌象类别 =====
export const YOLO_CLASS_NAMES: Record<number, string> = {
    0: '黑苔',
    1: '地图舌',
    2: '紫苔',
    3: '红舌黄厚腻苔',
    4: '红舌厚腻苔',
    5: '白舌厚腻苔',
}

export const YOLO_CLASS_COLORS: Record<number, string> = {
    0: '#374151',
    1: '#f97316',
    2: '#9333ea',
    3: '#eab308',
    4: '#ef4444',
    5: '#94a3b8',
}

// ===== 图片资源类型 =====
export const ASSET_TYPE_NAMES: Record<string, string> = {
    raw: '原始图片',
    mask: '分割掩码',
    heatmap: '热力图',
    annotated: '标注结果',
}

// ===== 问诊字段标签 =====
export const QUESTIONNAIRE_LABELS: Record<string, string> = {
    chief_complaint: '主诉',
    present_illness: '现病史',
    past_history: '既往史',
    sleep_quality: '睡眠质量',
    appetite: '食欲',
    bowel_movement: '大便情况',
    urination: '小便情况',
    additional_notes: '补充说明',
}

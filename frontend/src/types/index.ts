/**
 * 中医智能辅助诊疗系统 - TypeScript 类型定义
 */

// =============== 用户与认证 ===============
export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  full_name?: string;
  // 医生个人资料字段
  hospital?: string;
  job_title?: string;
  years_of_experience?: number;
  gender?: 'male' | 'female' | '';
  age?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  user: User;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  role?: UserRole;  // 默认 patient
}

export interface RegisterResponse {
  token: string;
  role: UserRole;
  user: User;
}

// =============== 病例相关 ===============
export type CaseStatus =
  | 'created'
  | 'running'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'failed';

export interface Case {
  id: number;
  patient_id: number;
  patient_name?: string;
  tongue_image: string;
  questionnaire: QuestionnaireData;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireData {
  chief_complaint: string;      // 主诉
  present_illness: string;      // 现病史
  past_history?: string;        // 既往史
  sleep_quality?: string;       // 睡眠质量
  appetite?: string;            // 食欲
  bowel_movement?: string;      // 大便情况
  urination?: string;           // 小便情况
  additional_notes?: string;    // 补充说明
}

export interface CreateCaseRequest {
  image: File;
  questionnaire: QuestionnaireData;
}

export interface CreateCaseResponse {
  case_id: number;
}

// =============== 流水线相关 ===============
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineRun {
  id: number;
  case_id: number;
  status: PipelineStatus;
  progress: number;               // 0-100
  current_stage?: string;
  result_available: boolean;
  diagnosis_result?: DiagnosisResult;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface PipelineStatusResponse {
  status: PipelineStatus;
  progress: number;
  current_stage?: string;
  result_available: boolean;
}

// =============== 诊断结果 ===============
export interface DiagnosisResult {
  syndromes: Syndrome[];            // 证候列表
  formulas: Formula[];              // 推荐方剂
  evidence_points: string[];        // 证据要点
  llm_explanation: string;          // LLM 解释文本
  confidence_score: number;         // 置信度评分
}

export interface Syndrome {
  name: string;
  score: number;
  description?: string;
}

export interface Formula {
  name: string;
  score: number;
  composition?: string;
  indication?: string;
}

// =============== 可视化资源 ===============
export type AssetType = 'raw' | 'mask' | 'heatmap' | 'annotated';

export interface Asset {
  id: number;
  type: AssetType;
  url: string;
  description?: string;
}

// =============== 病例详情响应 ===============
export interface CaseDetailResponse {
  case: Case;
  latest_run?: PipelineRun;
  assets: Asset[];
}

// =============== 医生审核 ===============
export type ReviewDecision = 'approve' | 'reject' | 'revise';

export interface ReviewPayload {
  decision: ReviewDecision;
  edited_syndromes?: Syndrome[];
  edited_formulas?: Formula[];
  note?: string;
}

export interface ReviewResponse {
  ok: boolean;
}

// =============== 待审列表 ===============
export interface PendingCasesRequest {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string; // 支持逗号分隔的多状态
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
}

export interface PendingCasesResponse {
  items: Case[];
  page: number;
  page_size: number;
  total: number;
}

// =============== 管理员健康检查 ===============
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency_ms?: number;
  message?: string;
  last_check: string;
}

export interface HealthResponse {
  services: ServiceHealth[];
  overall_status: 'healthy' | 'unhealthy' | 'degraded';
}

// =============== 数据治理（占位） ===============
export interface GovernanceItem {
  id: number;
  type: 'synonym' | 'tag' | 'template' | 'blacklist';
  value: string;
  description?: string;
  created_at: string;
}

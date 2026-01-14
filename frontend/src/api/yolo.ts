/**
 * YOLO 舌象检测 API
 */
import apiClient from './client'

// 单个检测结果
export interface YoloDetection {
    class_id: number
    class_name: string
    confidence: number
    bbox: [number, number, number, number] // x1, y1, x2, y2
}

// 检测响应
export interface YoloDetectResponse {
    success: boolean
    detections: YoloDetection[]
    annotated_image: string // Base64 data URL
    detail?: string
}

/**
 * 执行舌象检测
 * @param image 舌象图片文件
 * @returns 检测结果和标注图像
 */
export async function detectTongue(image: File): Promise<YoloDetectResponse> {
    const formData = new FormData()
    formData.append('image', image)

    const response = await apiClient.post<YoloDetectResponse>(
        '/api/yolo/detect/',
        formData,
        {
            headers: { 'Content-Type': 'multipart/form-data' },
        }
    )
    return response.data
}

// 类别中文名映射（与后端保持一致）
export const TONGUE_CLASS_NAMES: Record<number, string> = {
    0: "黑苔",
    1: "地图舌",
    2: "紫苔",
    3: "红舌黄厚腻苔",
    4: "红舌厚腻苔",
    5: "白舌厚腻苔",
}

// 类别颜色映射（用于前端显示）
export const TONGUE_CLASS_COLORS: Record<number, string> = {
    0: "#323232",     // 黑苔 - 深灰色
    1: "#ffa500",     // 地图舌 - 橙色
    2: "#8000ff",     // 紫苔 - 紫色
    3: "#ffff00",     // 红舌黄厚腻苔 - 黄色
    4: "#ff0000",     // 红舌厚腻苔 - 红色
    5: "#ffffff",     // 白舌厚腻苔 - 白色
}

// pages/new-case/new-case.ts
import { getDoctors } from '../../api/doctors'
import { createCase, runPipeline, getPipelineStatus, detectTongue } from '../../api/cases'
import { DEPARTMENTS, STAGE_NAMES, PIPELINE_STAGES } from '../../utils/constants'
import { isLoggedIn } from '../../utils/storage'
import type { Doctor } from '../../api/doctors'
import type { QuestionnaireData, YoloDetection } from '../../api/cases'

type Step = 'dept' | 'doctor' | 'form' | 'detecting' | 'detected' | 'submitting' | 'processing' | 'success' | 'error'

Page({
    data: {
        step: 'dept' as Step,
        // 科室
        departments: DEPARTMENTS,
        selectedDeptKey: '',
        selectedDeptName: '',
        // 医生
        doctors: [] as Doctor[],
        doctorsLoading: false,
        selectedDoctorId: null as number | null,
        selectedDoctorName: '',
        // 表单
        imagePath: '',
        imageBase64: '',
        questionnaire: {
            chief_complaint: '',
            present_illness: '',
            past_history: '',
            sleep_quality: '',
            appetite: '',
            bowel_movement: '',
            urination: '',
            additional_notes: '',
        } as QuestionnaireData,
        formErrors: {} as Record<string, string>,
        // YOLO 检测
        detections: [] as YoloDetection[],
        annotatedImage: '',
        // 流水线
        caseId: '',
        progress: 0,
        currentStage: '',
        errorMessage: '',
        // 步骤进度（1~5）
        stepNum: 1,
        pipelineStages: PIPELINE_STAGES.map((s) => ({ key: s, label: STAGE_NAMES[s] })),
    },

    onLoad() {
        if (!isLoggedIn()) {
            wx.reLaunch({ url: '/pages/login/login' })
        }
    },

    // ===== 科室选择 =====
    onSelectDept(e: WechatMiniprogram.TouchEvent) {
        const key = e.currentTarget.dataset.key
        const dept = DEPARTMENTS.find((d) => d.key === key)
        this.setData({
            selectedDeptKey: key,
            selectedDeptName: dept?.name || '',
            step: 'doctor',
            stepNum: 2,
            doctors: [],
            selectedDoctorId: null,
            selectedDoctorName: '',
        })
        this.loadDoctors(key)
    },

    async loadDoctors(department: string) {
        this.setData({ doctorsLoading: true })
        try {
            const res = await getDoctors(department)
            this.setData({
                doctors: res.doctors.map((d) => ({
                    ...d,
                    initial: (d.full_name || d.username).charAt(0),
                })),
            })
        } catch (err: any) {
            wx.showToast({ title: err.message || '加载医生失败', icon: 'none' })
        } finally {
            this.setData({ doctorsLoading: false })
        }
    },

    onSelectDoctor(e: WechatMiniprogram.TouchEvent) {
        const { id, name } = e.currentTarget.dataset
        this.setData({ selectedDoctorId: id, selectedDoctorName: name })
    },

    onConfirmDoctor() {
        if (!this.data.selectedDoctorId) {
            wx.showToast({ title: '请先选择医生', icon: 'none' })
            return
        }
        this.setData({ step: 'form', stepNum: 3 })
    },

    onBackToDept() {
        this.setData({ step: 'dept', stepNum: 1 })
    },

    onBackToDoctor() {
        this.setData({ step: 'doctor', stepNum: 2 })
    },

    onBackToForm() {
        this.setData({ step: 'form', stepNum: 3, detections: [], annotatedImage: '' })
    },

    // ===== 图片上传 =====
    onChooseImage() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const path = res.tempFiles[0].tempFilePath
                this.setData({ imagePath: path })
            },
        })
    },

    // ===== 问诊表单 =====
    onQuestionnaireInput(e: WechatMiniprogram.Input) {
        const field = e.currentTarget.dataset.field
        this.setData({ [`questionnaire.${field}`]: e.detail.value })
    },

    validateForm(): boolean {
        const errors: Record<string, string> = {}
        if (!this.data.imagePath) errors.image = '请上传舌象图片'
        if (!this.data.questionnaire.chief_complaint.trim()) errors.chief_complaint = '请填写主诉'
        if (!this.data.questionnaire.present_illness.trim()) errors.present_illness = '请填写现病史'
        this.setData({ formErrors: errors })
        return Object.keys(errors).length === 0
    },

    // ===== YOLO 检测 =====
    async onDetect() {
        if (!this.validateForm()) {
            wx.showToast({ title: '请完善必填信息', icon: 'none' })
            return
        }
        this.setData({ step: 'detecting', stepNum: 4 })
        try {
            const result = await detectTongue(this.data.imagePath)
            if (result.success) {
                const detections = result.detections.map((d) => {
                    const pct = Math.round(d.confidence * 1000) / 10
                    const confClass = d.confidence > 0.8 ? 'conf-high'
                        : d.confidence > 0.5 ? 'conf-mid' : 'conf-low'
                    return { ...d, confText: pct.toFixed(1), confClass }
                })
                this.setData({
                    detections,
                    annotatedImage: result.annotated_image,
                    step: 'detected',
                })
            } else {
                throw new Error(result.detail || '检测失败')
            }
        } catch (err: any) {
            wx.showToast({ title: err.message || '检测失败，请重试', icon: 'none' })
            this.setData({ step: 'form', stepNum: 3 })
        }
    },

    // ===== 提交病例 =====
    async onSubmitCase() {
        this.setData({ step: 'submitting', stepNum: 5 })
        try {
            const { imagePath, questionnaire, selectedDoctorId } = this.data
            const createRes = await createCase(imagePath, questionnaire, selectedDoctorId ?? undefined)
            const caseId = createRes.case_id
            this.setData({ caseId })

            this.setData({ step: 'processing' })
            await runPipeline(caseId)
            this.startPolling(caseId)
        } catch (err: any) {
            this.setData({ step: 'error', errorMessage: err.message || '提交失败，请重试' })
        }
    },

    startPolling(caseId: string) {
        let attempts = 0
        const maxAttempts = 60

        const poll = async () => {
            if (attempts >= maxAttempts) {
                this.setData({ step: 'error', errorMessage: '处理超时，请稍后查看结果' })
                return
            }
            try {
                const status = await getPipelineStatus(caseId)
                this.setData({ progress: status.progress, currentStage: status.current_stage || '' })

                if (status.result_available) {
                    this.setData({ step: 'success' })
                    wx.showToast({ title: '诊断完成', icon: 'success' })
                    setTimeout(() => {
                        wx.redirectTo({ url: `/pages/case-detail/case-detail?id=${caseId}` })
                    }, 1200)
                } else if (status.status === 'failed') {
                    this.setData({ step: 'error', errorMessage: '处理失败，请重试' })
                } else {
                    attempts++
                    setTimeout(poll, 2000)
                }
            } catch {
                attempts++
                setTimeout(poll, 2000)
            }
        }
        poll()
    },

    getStageName(key: string): string {
        return STAGE_NAMES[key] || '处理中'
    },

    onReset() {
        this.setData({
            step: 'dept',
            stepNum: 1,
            selectedDeptKey: '',
            selectedDeptName: '',
            doctors: [],
            selectedDoctorId: null,
            selectedDoctorName: '',
            imagePath: '',
            questionnaire: {
                chief_complaint: '', present_illness: '', past_history: '',
                sleep_quality: '', appetite: '', bowel_movement: '', urination: '', additional_notes: '',
            },
            formErrors: {},
            detections: [],
            annotatedImage: '',
            caseId: '',
            progress: 0,
            currentStage: '',
            errorMessage: '',
        })
    },

    onViewCase() {
        wx.redirectTo({ url: `/pages/case-detail/case-detail?id=${this.data.caseId}` })
    },
})

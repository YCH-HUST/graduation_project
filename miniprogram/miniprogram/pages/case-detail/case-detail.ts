// pages/case-detail/case-detail.ts
import { getCaseDetail } from '../../api/cases'
import { STATUS_TEXT, STATUS_COLOR, ASSET_TYPE_NAMES } from '../../utils/constants'
import type { CaseStatus } from '../../utils/constants'

Page({
    data: {
        caseId: '',
        caseData: null as any,
        run: null as any,
        assets: [] as any[],
        result: null as any,
        isLoading: true,
        error: '',
        showExplanation: false,
        statusText: '',
        statusColor: '#94a3b8',
    },

    onLoad(options: { id?: string }) {
        const { id } = options
        if (!id) {
            this.setData({ error: '病例 ID 不存在', isLoading: false })
            return
        }
        this.setData({ caseId: id })
        this.loadDetail(id)
    },

    async loadDetail(caseId: string) {
        this.setData({ isLoading: true, error: '' })
        try {
            const data = await getCaseDetail(caseId)
            const caseInfo = data.case
            const run = data.latest_run
            const assets = (data.assets || []).map((a: any) => ({
                ...a,
                typeName: ASSET_TYPE_NAMES[a.type] || a.type,
                fullUrl: a.url.startsWith('http') ? a.url : `http://localhost:8000${a.url}`,
            }))

            // 格式化 syndromes 分数
            const rawResult = run?.diagnosis_result
            let result: any = null
            if (rawResult) {
                result = {
                    ...rawResult,
                    confidencePercent: Math.round((rawResult.confidence_score || 0) * 100),
                    syndromes: rawResult.syndromes.map((s: any) => ({ ...s, scorePercent: Math.round(s.score * 100) })),
                    formulas: rawResult.formulas.map((f: any) => ({ ...f, scorePercent: Math.round(f.score * 100) })),
                }
            }

            const questionnaire = caseInfo.questionnaire || {}
            const qEntries = [
                { label: '主诉', value: questionnaire.chief_complaint },
                { label: '现病史', value: questionnaire.present_illness },
                { label: '既往史', value: questionnaire.past_history },
                { label: '睡眠质量', value: questionnaire.sleep_quality },
                { label: '食欲', value: questionnaire.appetite },
                { label: '大便情况', value: questionnaire.bowel_movement },
                { label: '小便情况', value: questionnaire.urination },
                { label: '补充说明', value: questionnaire.additional_notes },
            ].filter((e) => e.value)

            this.setData({
                caseData: { ...caseInfo, qEntries, timeText: this.formatTime(caseInfo.created_at) },
                run,
                assets,
                result,
                statusText: STATUS_TEXT[caseInfo.status as CaseStatus] || caseInfo.status,
                statusColor: STATUS_COLOR[caseInfo.status as CaseStatus] || '#94a3b8',
                statusBgClass: `badge-${caseInfo.status}`,
                isLoading: false,
            })
        } catch (err: any) {
            this.setData({ error: err.message || '加载失败', isLoading: false })
        }
    },

    formatTime(isoStr: string): string {
        try {
            const d = new Date(isoStr)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        } catch { return '' }
    },

    toggleExplanation() {
        this.setData({ showExplanation: !this.data.showExplanation })
    },

    onPreviewImage(e: WechatMiniprogram.TouchEvent) {
        const url = e.currentTarget.dataset.url
        const urls = this.data.assets.map((a: any) => a.fullUrl)
        wx.previewImage({ current: url, urls })
    },

    onReload() {
        this.loadDetail(this.data.caseId)
    },
})

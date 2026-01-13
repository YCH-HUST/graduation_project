/**
 * 病例状态管理 (Zustand)
 */
import { create } from 'zustand'
import type { Case, PipelineRun, Asset, DiagnosisResult } from '@/types'

interface CaseState {
    // 当前病例
    currentCase: Case | null
    currentRun: PipelineRun | null
    currentAssets: Asset[]

    // 流水线状态
    isPolling: boolean
    pipelineProgress: number
    pipelineStage: string

    // Actions
    setCurrentCase: (caseData: Case | null) => void
    setCurrentRun: (run: PipelineRun | null) => void
    setCurrentAssets: (assets: Asset[]) => void
    updatePipelineStatus: (progress: number, stage: string) => void
    setPolling: (isPolling: boolean) => void
    reset: () => void
}

export const useCaseStore = create<CaseState>((set) => ({
    // 初始状态
    currentCase: null,
    currentRun: null,
    currentAssets: [],
    isPolling: false,
    pipelineProgress: 0,
    pipelineStage: '',

    // Actions
    setCurrentCase: (caseData) => set({ currentCase: caseData }),

    setCurrentRun: (run) => set({ currentRun: run }),

    setCurrentAssets: (assets) => set({ currentAssets: assets }),

    updatePipelineStatus: (progress, stage) =>
        set({ pipelineProgress: progress, pipelineStage: stage }),

    setPolling: (isPolling) => set({ isPolling }),

    reset: () =>
        set({
            currentCase: null,
            currentRun: null,
            currentAssets: [],
            isPolling: false,
            pipelineProgress: 0,
            pipelineStage: '',
        }),
}))

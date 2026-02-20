import { create } from 'zustand'
import { api } from '@/lib/api'
import type { RecruitingPlan, PlanWeekSummary, PlanProgress, PlanWeekDetail } from '@/types'

interface PlanState {
  plan: RecruitingPlan | null
  weeks: PlanWeekSummary[]
  progress: PlanProgress | null
  currentWeekDetail: PlanWeekDetail | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null
}

interface PlanActions {
  fetchPlan: () => Promise<void>
  generatePlan: (data?: { dreamSchools?: string[]; geographyPrefs?: string[] }) => Promise<void>
  fetchWeek: (weekNumber: number) => Promise<void>
  completeWeek: (weekNumber: number) => Promise<void>
  regeneratePlan: (reason: string) => Promise<void>
  clearError: () => void
}

export const usePlanStore = create<PlanState & PlanActions>((set, get) => ({
  plan: null,
  weeks: [],
  progress: null,
  currentWeekDetail: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchPlan: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getPlan()
      set({
        plan: data.plan || null,
        weeks: data.weeks || [],
        progress: data.progress || null,
        isLoading: false,
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load plan', isLoading: false })
    }
  },

  generatePlan: async (data) => {
    set({ isGenerating: true, error: null })
    try {
      await api.generatePlan(data)
      await get().fetchPlan()
      set({ isGenerating: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to generate plan', isGenerating: false })
      throw err
    }
  },

  fetchWeek: async (weekNumber) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getPlanWeek(weekNumber)
      // Ensure targetSchools is always an array to prevent map errors
      if (data && !data.targetSchools) {
        data.targetSchools = []
      }
      set({ currentWeekDetail: data || null, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load week', isLoading: false })
    }
  },

  completeWeek: async (weekNumber) => {
    try {
      await api.completePlanWeek(weekNumber)
      await get().fetchPlan()
      await get().fetchWeek(weekNumber)
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to complete week' })
    }
  },

  regeneratePlan: async (reason) => {
    set({ isGenerating: true, error: null })
    try {
      await api.regeneratePlan(reason)
      await get().fetchPlan()
      set({ isGenerating: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to regenerate plan', isGenerating: false })
    }
  },

  clearError: () => set({ error: null }),
}))

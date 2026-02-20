import { create } from 'zustand'
import { api } from '@/lib/api'
import type { FilmEvaluation, FilmEvaluationDetail } from '@/types'

interface EvaluationState {
  evaluations: FilmEvaluation[]
  currentEvaluation: FilmEvaluationDetail | null
  isLoading: boolean
  isCreating: boolean
  isPolling: boolean
  error: string | null
}

interface EvaluationActions {
  fetchEvaluations: () => Promise<void>
  fetchEvaluation: (id: string) => Promise<void>
  createEvaluation: (data: { position: string; videoUrl: string; videoFileName?: string }) => Promise<string>
  pollEvaluation: (id: string) => Promise<void>
  clearError: () => void
}

let pollTimer: ReturnType<typeof setInterval> | null = null

export const useEvaluationStore = create<EvaluationState & EvaluationActions>((set, get) => ({
  evaluations: [],
  currentEvaluation: null,
  isLoading: false,
  isCreating: false,
  isPolling: false,
  error: null,

  fetchEvaluations: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getEvaluations()
      set({ evaluations: data.evaluations, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load evaluations', isLoading: false })
    }
  },

  fetchEvaluation: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getEvaluation(id)
      set({ currentEvaluation: data.evaluation, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load evaluation', isLoading: false })
    }
  },

  createEvaluation: async (data) => {
    set({ isCreating: true, error: null })
    try {
      const result = await api.createEvaluation(data)
      set({ isCreating: false })
      return result.evaluation.id
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create evaluation', isCreating: false })
      throw err
    }
  },

  pollEvaluation: async (id) => {
    if (pollTimer) clearInterval(pollTimer)
    set({ isPolling: true })

    return new Promise<void>((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 120 // 10 minutes at 5s intervals

      pollTimer = setInterval(async () => {
        attempts++
        try {
          const data = await api.getEvaluation(id)
          if (data.evaluation.status !== 'pending' && data.evaluation.status !== 'processing') {
            if (pollTimer) clearInterval(pollTimer)
            pollTimer = null
            set({ currentEvaluation: data.evaluation, isPolling: false })
            // Refresh list
            get().fetchEvaluations()
            resolve()
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            if (pollTimer) clearInterval(pollTimer)
            pollTimer = null
            set({ isPolling: false, error: 'Evaluation timed out' })
            reject(new Error('Evaluation timed out'))
          }
        }
      }, 5000)
    })
  },

  clearError: () => set({ error: null }),
}))

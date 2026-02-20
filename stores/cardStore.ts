import { create } from 'zustand'
import { api } from '@/lib/api'
import type { RecruitingCard, CardAnalyticsResponse, CardFollower } from '@/types'

interface CardState {
  card: RecruitingCard | null
  analytics: CardAnalyticsResponse | null
  followers: CardFollower[]
  isLoading: boolean
  isGenerating: boolean
  error: string | null
}

interface CardActions {
  fetchAnalytics: () => Promise<void>
  fetchCard: (slug: string) => Promise<void>
  fetchFollowers: () => Promise<void>
  generateCard: (evaluationId?: string) => Promise<string>
  notifyFollowers: (updateType: string) => Promise<void>
  clearError: () => void
}

export const useCardStore = create<CardState & CardActions>((set) => ({
  card: null,
  analytics: null,
  followers: [],
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchAnalytics: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getCardAnalytics()
      set({ analytics: data, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load analytics', isLoading: false })
    }
  },

  fetchCard: async (slug) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getCard(slug)
      set({ card: data, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load card', isLoading: false })
    }
  },

  fetchFollowers: async () => {
    try {
      const data = await api.getCardFollowers()
      set({ followers: data.followers })
    } catch {}
  },

  generateCard: async (evaluationId) => {
    set({ isGenerating: true, error: null })
    try {
      const result = await api.generateCard(evaluationId)
      set({ isGenerating: false })
      return result.card.slug
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to generate card', isGenerating: false })
      throw err
    }
  },

  notifyFollowers: async (updateType) => {
    try {
      await api.notifyFollowers(updateType)
    } catch {}
  },

  clearError: () => set({ error: null }),
}))

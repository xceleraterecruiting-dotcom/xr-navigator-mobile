import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ChallengesResponse, Challenge, XPInfo, StreakInfo, Badge } from '@/types'

interface ChallengesState {
  xp: XPInfo | null
  streak: StreakInfo | null
  dailyChallenges: Challenge[]
  weeklyChallenges: Challenge[]
  badges: Badge[]
  isLoading: boolean
  error: string | null
}

interface ChallengesActions {
  fetchChallenges: () => Promise<void>
  assignChallenges: () => Promise<void>
  clearError: () => void
}

export const useChallengesStore = create<ChallengesState & ChallengesActions>((set) => ({
  xp: null,
  streak: null,
  dailyChallenges: [],
  weeklyChallenges: [],
  badges: [],
  isLoading: false,
  error: null,

  fetchChallenges: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.getChallenges()
      set({
        xp: data.xp,
        streak: data.streak,
        dailyChallenges: data.dailyChallenges,
        weeklyChallenges: data.weeklyChallenges,
        badges: data.badges,
        isLoading: false,
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load challenges', isLoading: false })
    }
  },

  assignChallenges: async () => {
    try {
      await api.assignChallenges()
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to assign challenges' })
    }
  },

  clearError: () => set({ error: null }),
}))

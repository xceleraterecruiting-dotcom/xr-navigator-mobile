import { create } from 'zustand'
import { api } from '@/lib/api'
import { storageHelpers } from '@/lib/storage'
import { identifyUser } from '@/lib/analytics'
import type { Athlete } from '@/types'

interface AthleteState {
  athlete: Athlete | null
  isLoading: boolean
  error: string | null
}

interface AthleteActions {
  fetchAthlete: () => Promise<void>
  updateProfile: (data: Partial<Athlete>) => Promise<void>
  clearAthlete: () => Promise<void>
}

type AthleteStore = AthleteState & AthleteActions

export const useAthleteStore = create<AthleteStore>((set, get) => ({
  athlete: null,
  isLoading: false,
  error: null,

  fetchAthlete: async () => {
    set({ isLoading: true, error: null })

    // Try cache first
    const cached = await storageHelpers.getAthleteCache()
    if (cached) {
      set({ athlete: cached })
    }

    try {
      const athlete = await api.getAthlete()
      set({ athlete, isLoading: false })
      await storageHelpers.setAthleteCache(athlete)
      identifyUser(athlete)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile'
      set({ error: message, isLoading: false })
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const athlete = await api.updateProfile(data)
      set({ athlete, isLoading: false })
      await storageHelpers.setAthleteCache(athlete)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  clearAthlete: async () => {
    set({ athlete: null, error: null })
    await storageHelpers.delete('athlete_cache')
  },
}))

// Selectors
export const useAthlete = () => useAthleteStore((state) => state.athlete)
export const useIsPhenom = () => useAthleteStore((state) => state.athlete?.partner === 'phenom')
export const useAthleteLoading = () => useAthleteStore((state) => state.isLoading)

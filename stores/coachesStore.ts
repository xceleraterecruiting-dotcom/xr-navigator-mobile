import { create } from 'zustand'
import { api } from '@/lib/api'
import { storageHelpers } from '@/lib/storage'
import type { CollegeCoach, SavedCoach, CoachFilters, OutreachStatus } from '@/types'

interface CoachesState {
  coaches: CollegeCoach[]
  savedCoaches: SavedCoach[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  filters: CoachFilters
  searchQuery: string
  hasMore: boolean
  page: number
}

interface CoachesActions {
  fetchCoaches: (reset?: boolean) => Promise<void>
  searchCoaches: (query: string) => Promise<void>
  fetchSavedCoaches: () => Promise<void>
  saveCoach: (coachId: string) => Promise<void>
  updateOutreachStatus: (savedCoachId: string, status: OutreachStatus) => Promise<void>
  deleteSavedCoach: (savedCoachId: string) => Promise<void>
  setFilters: (filters: Partial<CoachFilters>) => void
  clearSearch: () => void
}

type CoachesStore = CoachesState & CoachesActions

export const useCoachesStore = create<CoachesStore>((set, get) => ({
  coaches: [],
  savedCoaches: [],
  isLoading: false,
  isSaving: false,
  error: null,
  filters: {},
  searchQuery: '',
  hasMore: true,
  page: 1,

  fetchCoaches: async (reset = false) => {
    const { filters, page, coaches } = get()
    if (reset) {
      set({ page: 1, coaches: [], hasMore: true })
    }

    set({ isLoading: true, error: null })
    try {
      const currentPage = reset ? 1 : page
      const newCoaches = await api.getCoaches({ ...filters, page: currentPage, limit: 20 })
      set({
        coaches: reset ? newCoaches : [...coaches, ...newCoaches],
        hasMore: newCoaches.length === 20,
        page: currentPage + 1,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load coaches'
      set({ error: message, isLoading: false })
    }
  },

  searchCoaches: async (query) => {
    set({ searchQuery: query, isLoading: true, error: null })
    if (!query.trim()) {
      set({ coaches: [], isLoading: false })
      return
    }
    try {
      const coaches = await api.searchCoaches(query)
      set({ coaches, isLoading: false, hasMore: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      set({ error: message, isLoading: false })
    }
  },

  fetchSavedCoaches: async () => {
    // Try cache first
    const cached = await storageHelpers.getSavedCoachesCache()
    if (cached) {
      set({ savedCoaches: cached })
    }

    set({ isLoading: true, error: null })
    try {
      const savedCoaches = await api.getSavedCoaches()
      set({ savedCoaches, isLoading: false })
      await storageHelpers.setSavedCoachesCache(savedCoaches)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load saved coaches'
      set({ error: message, isLoading: false })
    }
  },

  saveCoach: async (coachId) => {
    set({ isSaving: true, error: null })
    try {
      const savedCoach = await api.saveCoach(coachId)
      set((state) => ({
        savedCoaches: [...state.savedCoaches, savedCoach],
        isSaving: false,
      }))
      await storageHelpers.setSavedCoachesCache(get().savedCoaches)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save coach'
      set({ error: message, isSaving: false })
      throw err
    }
  },

  updateOutreachStatus: async (savedCoachId, status) => {
    set({ isSaving: true, error: null })
    try {
      const updated = await api.updateOutreachStatus(savedCoachId, status)
      set((state) => ({
        savedCoaches: state.savedCoaches.map((sc) =>
          sc.id === savedCoachId ? updated : sc
        ),
        isSaving: false,
      }))
      await storageHelpers.setSavedCoachesCache(get().savedCoaches)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      set({ error: message, isSaving: false })
      throw err
    }
  },

  deleteSavedCoach: async (savedCoachId) => {
    set({ isSaving: true, error: null })
    try {
      await api.deleteSavedCoach(savedCoachId)
      set((state) => ({
        savedCoaches: state.savedCoaches.filter((sc) => sc.id !== savedCoachId),
        isSaving: false,
      }))
      await storageHelpers.setSavedCoachesCache(get().savedCoaches)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove coach'
      set({ error: message, isSaving: false })
      throw err
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }))
  },

  clearSearch: () => {
    set({ searchQuery: '', coaches: [], page: 1, hasMore: true })
  },
}))

// Selectors
export const useSavedCoachIds = () =>
  useCoachesStore((state) => new Set(state.savedCoaches.map((sc) => sc.collegeCoachId)))

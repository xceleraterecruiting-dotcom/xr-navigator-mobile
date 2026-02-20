/**
 * Bootcamp Store (Zustand)
 *
 * Manages the XR Method Bootcamp state:
 * - Enrollment status
 * - Week progress
 * - Target school list
 * - Current week coaches
 */

import { create } from 'zustand'
import {
  api,
  type BootcampResponse,
  type BootcampWeek,
  type BootcampTargetSchool,
  type BootcampWeekResponse,
} from '@/lib/api'

interface BootcampState {
  // Enrollment
  enrolled: boolean
  enrollment: {
    id: string
    status: string
    currentWeek: number
    startedAt: string
    completedAt: string | null
    lastActiveAt: string
  } | null

  // Progress
  progress: {
    completedWeeks: number
    totalWeeks: number
    percentComplete: number
  } | null

  // Weeks
  weeks: BootcampWeek[]

  // Target schools summary
  targetSchools: {
    perfectFit: number
    dream: number
    safe: number
    projection: string | null
  } | null

  // Current week coaches
  currentWeekCoaches: BootcampTargetSchool[]

  // Current week detail (when viewing a specific week)
  currentWeekDetail: BootcampWeekResponse | null

  // Loading states
  isLoading: boolean
  isLoadingWeek: boolean
  isEnrolling: boolean
  isUpdatingProgress: boolean
  error: string | null
}

interface BootcampActions {
  fetchBootcamp: () => Promise<void>
  enrollBootcamp: () => Promise<void>
  fetchWeek: (weekNumber: number) => Promise<void>
  incrementProgress: (weekNumber: number, amount?: number) => Promise<void>
  completeWeek: (weekNumber: number) => Promise<void>
  clearError: () => void
  reset: () => void
}

const initialState: BootcampState = {
  enrolled: false,
  enrollment: null,
  progress: null,
  weeks: [],
  targetSchools: null,
  currentWeekCoaches: [],
  currentWeekDetail: null,
  isLoading: false,
  isLoadingWeek: false,
  isEnrolling: false,
  isUpdatingProgress: false,
  error: null,
}

export const useBootcampStore = create<BootcampState & BootcampActions>((set, get) => ({
  ...initialState,

  fetchBootcamp: async () => {
    set({ isLoading: true, error: null })
    try {
      console.log('[Bootcamp] Fetching bootcamp status...')
      const data = await api.getBootcamp()
      console.log('[Bootcamp] Response:', JSON.stringify(data, null, 2).slice(0, 500))

      if (!data.enrolled) {
        console.log('[Bootcamp] Not enrolled yet')
        set({
          enrolled: false,
          enrollment: null,
          progress: null,
          weeks: [],
          targetSchools: null,
          currentWeekCoaches: [],
          isLoading: false,
        })
        return
      }

      console.log('[Bootcamp] Enrolled, week', data.enrollment?.currentWeek)
      set({
        enrolled: true,
        enrollment: data.enrollment || null,
        progress: data.progress || null,
        weeks: data.weeks || [],
        targetSchools: data.targetSchools || null,
        currentWeekCoaches: data.currentWeekCoaches || [],
        isLoading: false,
      })
    } catch (err) {
      console.error('[Bootcamp] Fetch error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to load bootcamp',
        isLoading: false,
      })
    }
  },

  enrollBootcamp: async () => {
    set({ isEnrolling: true, error: null })
    try {
      console.log('[Bootcamp] Calling enroll API...')
      const data = await api.enrollBootcamp()
      console.log('[Bootcamp] Enroll response:', JSON.stringify(data, null, 2).slice(0, 500))

      // Refresh bootcamp state after enrollment
      console.log('[Bootcamp] Refreshing state...')
      await get().fetchBootcamp()

      set({ isEnrolling: false })
    } catch (err) {
      console.error('[Bootcamp] Enroll error:', err)
      set({
        error: err instanceof Error ? err.message : 'Failed to enroll in bootcamp',
        isEnrolling: false,
      })
      throw err
    }
  },

  fetchWeek: async (weekNumber: number) => {
    set({ isLoadingWeek: true, error: null })
    try {
      const data = await api.getBootcampWeek(weekNumber)
      set({
        currentWeekDetail: data,
        isLoadingWeek: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load week',
        isLoadingWeek: false,
      })
    }
  },

  incrementProgress: async (weekNumber: number, amount = 1) => {
    set({ isUpdatingProgress: true, error: null })
    try {
      const data = await api.updateBootcampProgress({
        weekNumber,
        action: 'increment',
        amount,
      })

      // Update local state optimistically
      const { weeks, enrollment } = get()

      const updatedWeeks = weeks.map(w => {
        if (w.weekNumber === weekNumber) {
          return {
            ...w,
            progress: data.progress,
            isCompleted: data.isComplete,
            completedAt: data.isComplete ? new Date().toISOString() : w.completedAt,
          }
        }
        // If a new week was unlocked, update it
        if (data.weekUnlocked && w.weekNumber === data.weekUnlocked) {
          return { ...w, isUnlocked: true }
        }
        return w
      })

      set({
        weeks: updatedWeeks,
        enrollment: enrollment ? { ...enrollment, currentWeek: data.currentWeek } : null,
        isUpdatingProgress: false,
      })

      // If week was completed, refresh full state
      if (data.isComplete) {
        await get().fetchBootcamp()
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update progress',
        isUpdatingProgress: false,
      })
      throw err
    }
  },

  completeWeek: async (weekNumber: number) => {
    set({ isUpdatingProgress: true, error: null })
    try {
      const data = await api.updateBootcampProgress({
        weekNumber,
        action: 'complete',
      })

      // Refresh full state after completion
      await get().fetchBootcamp()

      set({ isUpdatingProgress: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to complete week',
        isUpdatingProgress: false,
      })
      throw err
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}))

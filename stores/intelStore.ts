/**
 * Intel Store
 *
 * Manages Live Intel feed data with caching and offline support
 */

import { create } from 'zustand'
import { api } from '@/lib/api'
import { storageHelpers } from '@/lib/storage'

// Event types matching backend
type IntelEventType =
  | 'email_opened'
  | 'email_replied'
  | 'email_clicked'
  | 'profile_view'
  | 'twitter_follow'
  | 'twitter_reply'

export interface IntelEvent {
  id: string
  type: IntelEventType
  coachId: string | null
  coachName: string | null
  title: string | null
  school: string | null
  schoolLogo: string | null
  division: string | null
  timestamp: string
  description: string
  cta: {
    label: string
    action: string
    color: 'accent' | 'success' | 'info' | 'ghost'
  }
}

interface IntelFeedResponse {
  events: IntelEvent[]
  hasMore: boolean
  total: number
}

interface IntelState {
  events: IntelEvent[]
  hasMore: boolean
  total: number
  isLoading: boolean
  isStale: boolean
  error: string | null
  lastFetchedAt: number | null
}

interface IntelActions {
  fetchIntel: (limit?: number) => Promise<void>
  clearIntel: () => void
  clearError: () => void
}

const CACHE_KEY = 'intel_feed_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const useIntelStore = create<IntelState & IntelActions>((set, get) => ({
  events: [],
  hasMore: false,
  total: 0,
  isLoading: false,
  isStale: false,
  error: null,
  lastFetchedAt: null,

  fetchIntel: async (limit = 10) => {
    const { lastFetchedAt } = get()

    // Skip if recently fetched (within TTL)
    if (lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      console.log('[Intel] Fetching intel feed...')
      // Fetch from API
      const response = await api.request<IntelFeedResponse>(
        `/api/intel/feed?limit=${limit}`
      )
      console.log('[Intel] Got', response.events.length, 'events')

      set({
        events: response.events,
        hasMore: response.hasMore,
        total: response.total,
        isLoading: false,
        isStale: false,
        lastFetchedAt: Date.now(),
      })

      // Cache for offline use
      await storageHelpers.set(CACHE_KEY, {
        events: response.events,
        hasMore: response.hasMore,
        total: response.total,
        cachedAt: Date.now(),
      })
    } catch (err) {
      console.error('[Intel] Fetch error:', err)
      // On error, try to load from cache
      try {
        const cached = await storageHelpers.get<{
          events: IntelEvent[]
          hasMore: boolean
          total: number
          cachedAt: number
        }>(CACHE_KEY)

        if (cached) {
          console.log('[Intel] Using cached data')
          set({
            events: cached.events,
            hasMore: cached.hasMore,
            total: cached.total,
            isLoading: false,
            isStale: true, // Mark as stale since we're using cached data
            error: null,
          })
          return
        }
      } catch {
        // Cache read failed, continue with error
      }

      set({
        error: err instanceof Error ? err.message : 'Failed to load intel feed',
        isLoading: false,
      })
    }
  },

  clearIntel: () => {
    set({
      events: [],
      hasMore: false,
      total: 0,
      isLoading: false,
      isStale: false,
      error: null,
      lastFetchedAt: null,
    })
    storageHelpers.delete(CACHE_KEY)
  },

  clearError: () => set({ error: null }),
}))

// Selector for getting unread/new events count
export function useUnreadIntelCount(): number {
  const events = useIntelStore((state) => state.events)
  // Consider events from the last 24 hours as "new"
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  return events.filter(
    (e) => new Date(e.timestamp).getTime() > oneDayAgo
  ).length
}

// Selector for getting high-priority events (replies, high-interest)
export function useHighPriorityIntel(): IntelEvent[] {
  const events = useIntelStore((state) => state.events)
  return events.filter(
    (e) =>
      e.type === 'email_replied' ||
      e.type === 'twitter_reply' ||
      e.cta.color === 'success'
  )
}

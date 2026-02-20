/**
 * Offline Experience System
 *
 * Handles network detection, action queuing, and graceful degradation
 * for each screen type in the app.
 */

import { useEffect, useState, useCallback } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Storage key for offline queue
const OFFLINE_QUEUE_KEY = 'xr_offline_queue'

/**
 * Queued action for offline sends
 */
export interface QueuedAction {
  id: string
  type: 'email' | 'dm' | 'save' | 'unsave' | 'update'
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, unknown>
  queuedAt: number
  retryCount: number
  metadata?: {
    coachName?: string
    description?: string
  }
}

/**
 * Per-screen offline behavior configuration
 */
export type ScreenType =
  | 'dashboard'
  | 'coaches'
  | 'pipeline'
  | 'insight'
  | 'profile'
  | 'campaigns'
  | 'outreach'

export interface OfflineBehavior {
  /** Whether partial functionality is available */
  partial: boolean
  /** Which data is cached and available */
  cached: string[]
  /** Which features are hidden when offline */
  hidden?: string[]
  /** Which features are disabled when offline */
  disabled?: string[]
  /** Banner message to show */
  banner: string
}

export const OFFLINE_BEHAVIOR: Record<ScreenType, OfflineBehavior> = {
  dashboard: {
    partial: true,
    cached: ['stats', 'pipelineChart', 'recommendedCoaches'],
    hidden: ['liveIntel'],
    disabled: ['refresh'],
    banner: "You're offline. Showing cached data.",
  },

  coaches: {
    partial: true,
    cached: ['lastSearchResults'],
    disabled: ['search', 'save', 'filter'],
    banner: 'Search disabled while offline.',
  },

  pipeline: {
    partial: true,
    cached: ['savedCoaches'],
    disabled: ['sendActions', 'statusUpdate'],
    banner: 'Actions will send when connected.',
  },

  insight: {
    partial: false,
    cached: [],
    banner: 'XR Insight needs an internet connection.',
  },

  profile: {
    partial: true,
    cached: ['profileData'],
    disabled: ['share', 'copy', 'save'],
    banner: 'Changes will sync when connected.',
  },

  campaigns: {
    partial: true,
    cached: ['campaignList'],
    disabled: ['create', 'send'],
    banner: 'Campaign creation disabled while offline.',
  },

  outreach: {
    partial: true,
    cached: ['twitterMatches', 'campaignList'],
    disabled: ['sendDM', 'createCampaign', 'scan'],
    banner: 'Outreach actions disabled while offline.',
  },
}

/**
 * Generate unique ID for queued actions
 */
function generateQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Offline action queue management
 */
export const offlineQueue = {
  /**
   * Add an action to the offline queue
   */
  add: async (action: Omit<QueuedAction, 'id' | 'queuedAt' | 'retryCount'>) => {
    try {
      const queue = await offlineQueue.getAll()
      const newAction: QueuedAction = {
        ...action,
        id: generateQueueId(),
        queuedAt: Date.now(),
        retryCount: 0,
      }
      queue.push(newAction)
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
      return newAction.id
    } catch (error) {
      console.error('Failed to queue offline action:', error)
      return null
    }
  },

  /**
   * Get all queued actions
   */
  getAll: async (): Promise<QueuedAction[]> => {
    try {
      const queue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)
      return queue ? JSON.parse(queue) : []
    } catch (error) {
      console.error('Failed to get offline queue:', error)
      return []
    }
  },

  /**
   * Remove an action from the queue
   */
  remove: async (actionId: string) => {
    try {
      const queue = await offlineQueue.getAll()
      const filtered = queue.filter((a) => a.id !== actionId)
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to remove from offline queue:', error)
    }
  },

  /**
   * Update retry count for an action
   */
  incrementRetry: async (actionId: string) => {
    try {
      const queue = await offlineQueue.getAll()
      const updated = queue.map((a) =>
        a.id === actionId ? { ...a, retryCount: a.retryCount + 1 } : a
      )
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update retry count:', error)
    }
  },

  /**
   * Clear all queued actions
   */
  clear: async () => {
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY)
    } catch (error) {
      console.error('Failed to clear offline queue:', error)
    }
  },

  /**
   * Get queue count
   */
  count: async (): Promise<number> => {
    const queue = await offlineQueue.getAll()
    return queue.length
  },

  /**
   * Process all queued actions (call when back online)
   */
  process: async (
    executor: (action: QueuedAction) => Promise<boolean>
  ): Promise<{ success: number; failed: number }> => {
    const queue = await offlineQueue.getAll()
    let success = 0
    let failed = 0

    for (const action of queue) {
      try {
        const result = await executor(action)
        if (result) {
          await offlineQueue.remove(action.id)
          success++
        } else {
          await offlineQueue.incrementRetry(action.id)
          failed++
        }
      } catch (error) {
        await offlineQueue.incrementRetry(action.id)
        failed++
      }
    }

    // Remove actions that have failed too many times
    const remaining = await offlineQueue.getAll()
    const toRemove = remaining.filter((a) => a.retryCount >= 3)
    for (const action of toRemove) {
      await offlineQueue.remove(action.id)
    }

    return { success, failed }
  },
}

/**
 * Hook for network status
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [connectionType, setConnectionType] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true)
      setConnectionType(state.type)
    })

    // Get initial state
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true)
      setConnectionType(state.type)
    })

    return () => unsubscribe()
  }, [])

  return { isConnected, connectionType }
}

/**
 * Hook for offline-aware data fetching
 */
export function useOfflineData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { isConnected } = useNetworkStatus()

  const fetch = useCallback(async () => {
    if (options?.enabled === false) return

    setLoading(true)
    setError(null)

    try {
      if (isConnected) {
        // Online: fetch fresh data
        const freshData = await fetcher()
        setData(freshData)
        setIsStale(false)

        // Cache the data
        await AsyncStorage.setItem(
          `cache_${cacheKey}`,
          JSON.stringify({
            data: freshData,
            cachedAt: Date.now(),
          })
        )
      } else {
        // Offline: try to load from cache
        const cached = await AsyncStorage.getItem(`cache_${cacheKey}`)
        if (cached) {
          const { data: cachedData, cachedAt } = JSON.parse(cached)
          setData(cachedData)

          // Check if stale
          const staleTime = options?.staleTime ?? 5 * 60 * 1000 // 5 minutes default
          setIsStale(Date.now() - cachedAt > staleTime)
        } else {
          setError(new Error('No cached data available'))
        }
      }
    } catch (err) {
      // On error, try to fall back to cache
      try {
        const cached = await AsyncStorage.getItem(`cache_${cacheKey}`)
        if (cached) {
          const { data: cachedData } = JSON.parse(cached)
          setData(cachedData)
          setIsStale(true)
        }
      } catch {
        // Ignore cache errors
      }
      setError(err instanceof Error ? err : new Error('Fetch failed'))
    } finally {
      setLoading(false)
    }
  }, [cacheKey, fetcher, isConnected, options?.enabled, options?.staleTime])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, isStale, refetch: fetch }
}

/**
 * Hook for offline-aware actions (mutations)
 */
export function useOfflineAction<T>(
  actionFn: () => Promise<T>,
  options: {
    queueConfig?: Omit<QueuedAction, 'id' | 'queuedAt' | 'retryCount'>
    onSuccess?: (result: T) => void
    onError?: (error: Error) => void
    onQueued?: (actionId: string) => void
  }
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { isConnected } = useNetworkStatus()

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (isConnected) {
        // Online: execute immediately
        const result = await actionFn()
        options.onSuccess?.(result)
        return result
      } else if (options.queueConfig) {
        // Offline: queue for later
        const actionId = await offlineQueue.add(options.queueConfig)
        if (actionId) {
          options.onQueued?.(actionId)
        }
        return null
      } else {
        throw new Error('Action requires internet connection')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Action failed')
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [actionFn, isConnected, options])

  return { execute, loading, error }
}

/**
 * Check if a feature is available for a screen in offline mode
 */
export function isFeatureAvailableOffline(
  screen: ScreenType,
  feature: string
): boolean {
  const behavior = OFFLINE_BEHAVIOR[screen]

  // If feature is in hidden or disabled, it's not available
  if (behavior.hidden?.includes(feature)) return false
  if (behavior.disabled?.includes(feature)) return false

  // If it's in cached, it's available
  return behavior.cached.includes(feature)
}

/**
 * Get offline banner message for a screen
 */
export function getOfflineBanner(screen: ScreenType): string {
  return OFFLINE_BEHAVIOR[screen].banner
}

/**
 * Check if a screen has partial offline support
 */
export function hasPartialOfflineSupport(screen: ScreenType): boolean {
  return OFFLINE_BEHAVIOR[screen].partial
}

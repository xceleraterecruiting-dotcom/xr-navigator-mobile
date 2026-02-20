/**
 * Performance Optimization Utilities
 *
 * Optimizations for world-class mobile experience:
 * - 60fps animations on iPhone 8 / Galaxy A14
 * - < 1.5s time to interactive on 3G
 * - Smart animation disabling on low-end devices
 */

import { Platform } from 'react-native'
import { useEffect, useState, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Performance Thresholds
// ─────────────────────────────────────────────────────────────────────────────

export const PERF_THRESHOLDS = {
  /** Time to interactive (ms) */
  timeToInteractive: 1500,
  /** Dashboard load time (ms) */
  dashboardLoad: 2000,
  /** Minimum animation FPS */
  animationFPS: 30,
  /** Target list scroll FPS */
  listScrollFPS: 60,
  /** Memory limit (MB) */
  memoryLimit: 150,
  /** Low-end device RAM threshold (bytes) */
  lowEndRAMThreshold: 3 * 1024 * 1024 * 1024, // 3GB
}

// ─────────────────────────────────────────────────────────────────────────────
// FlatList Optimization Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Optimized FlatList props for smooth scrolling
 * Apply these to all FlatLists in the app
 */
export const FLATLIST_OPTIMIZATIONS = {
  /** Remove items outside viewport from memory */
  removeClippedSubviews: true,
  /** Max items to render per batch */
  maxToRenderPerBatch: 10,
  /** Batching period for cell updates (ms) */
  updateCellsBatchingPeriod: 50,
  /** Number of screens to render around current */
  windowSize: 15,
  /** Initial items to render */
  initialNumToRender: 10,
  /** Maintain scroll position */
  maintainVisibleContentPosition: {
    minIndexForVisible: 0,
  },
}

/**
 * Light optimization for smaller lists (< 20 items)
 */
export const FLATLIST_LIGHT = {
  removeClippedSubviews: false,
  maxToRenderPerBatch: 20,
  windowSize: 21,
  initialNumToRender: 15,
}

/**
 * Heavy optimization for large lists (100+ items)
 */
export const FLATLIST_HEAVY = {
  removeClippedSubviews: true,
  maxToRenderPerBatch: 5,
  updateCellsBatchingPeriod: 100,
  windowSize: 10,
  initialNumToRender: 5,
}

// ─────────────────────────────────────────────────────────────────────────────
// Device Performance Detection
// ─────────────────────────────────────────────────────────────────────────────

let cachedIsLowEnd: boolean | null = null

/**
 * Check if device is low-end (< 3GB RAM on Android)
 * Results are cached for the session
 */
export async function isLowEndDevice(): Promise<boolean> {
  if (cachedIsLowEnd !== null) return cachedIsLowEnd

  try {
    // iOS devices are generally performant
    if (Platform.OS === 'ios') {
      cachedIsLowEnd = false
      return false
    }

    // Try to use react-native-device-info if available
    try {
      const DeviceInfo = require('react-native-device-info')
      const totalMemory = await DeviceInfo.getTotalMemory()
      cachedIsLowEnd = totalMemory < PERF_THRESHOLDS.lowEndRAMThreshold
      return cachedIsLowEnd
    } catch {
      // Package not installed, assume not low-end
      cachedIsLowEnd = false
      return false
    }
  } catch {
    cachedIsLowEnd = false
    return false
  }
}

/**
 * Hook for checking device performance level
 */
export function useDevicePerformance() {
  const [isLowEnd, setIsLowEnd] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    isLowEndDevice().then((result) => {
      setIsLowEnd(result)
      setIsChecking(false)
    })
  }, [])

  return {
    isLowEnd,
    isChecking,
    /** Whether to run animations */
    shouldAnimate: !isLowEnd,
    /** FlatList config based on device */
    flatListConfig: isLowEnd ? FLATLIST_HEAVY : FLATLIST_OPTIMIZATIONS,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if animations should be enabled
 * Returns false on low-end devices
 */
export async function shouldEnableAnimations(): Promise<boolean> {
  const lowEnd = await isLowEndDevice()
  return !lowEnd
}

/**
 * Hook for conditionally enabling animations
 */
export function useAnimationEnabled() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    shouldEnableAnimations().then(setEnabled)
  }, [])

  return enabled
}

// ─────────────────────────────────────────────────────────────────────────────
// Render Optimization Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Memoized renderItem generator for FlatLists
 * Ensures stable reference to prevent unnecessary re-renders
 */
export function useStableRenderItem<T>(
  renderFn: (item: T, index: number) => React.ReactElement,
  deps: React.DependencyList = []
): ({ item, index }: { item: T; index: number }) => React.ReactElement {
  return useCallback(
    ({ item, index }: { item: T; index: number }) => renderFn(item, index),
    deps
  )
}

/**
 * Debounced state update hook
 * Prevents rapid re-renders during fast interactions
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 150
): [T, (value: T) => void, T] {
  const [value, setValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return [debouncedValue, setValue, value]
}

/**
 * Throttled callback hook
 * Limits how often a function can be called
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 100
): T {
  const lastCallRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      const remaining = delay - (now - lastCallRef.current)

      if (remaining <= 0) {
        lastCallRef.current = now
        callback(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callback(...args)
        }, remaining)
      }
    }) as T,
    [callback, delay]
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// List Key Extractors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stable key extractor for items with id
 */
export function keyExtractorById(item: { id: string }): string {
  return item.id
}

/**
 * Stable key extractor for items with index
 */
export function keyExtractorByIndex(_: unknown, index: number): string {
  return `item-${index}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Optimization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate optimal image dimensions based on device
 * Prevents loading oversized images
 */
export function getOptimalImageSize(
  targetWidth: number,
  targetHeight: number
): { width: number; height: number } {
  // On low-end devices, use smaller images
  const scale = cachedIsLowEnd ? 1 : 2
  return {
    width: Math.round(targetWidth * scale),
    height: Math.round(targetHeight * scale),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance Monitoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple performance timer for development
 */
export function createPerfTimer(label: string) {
  const start = Date.now()

  return {
    end: () => {
      const duration = Date.now() - start
      if (__DEV__) {
        console.log(`[Perf] ${label}: ${duration}ms`)
      }
      return duration
    },
  }
}

/**
 * Hook for measuring component mount time
 */
export function useMountTime(componentName: string) {
  useEffect(() => {
    if (__DEV__) {
      const timer = createPerfTimer(`${componentName} mount`)
      return () => {
        timer.end()
      }
    }
  }, [componentName])
}

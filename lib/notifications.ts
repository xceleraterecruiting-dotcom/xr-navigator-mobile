/**
 * Push Notifications System
 *
 * Handles:
 * - Push token registration with backend
 * - Permission requests
 * - Notification listeners
 * - Deep linking from notifications
 */

import { useEffect, useRef, useState } from 'react'
import { Platform, AppState, type AppStateStatus } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'

import { api } from './api'
import { analytics } from './analytics'

// Check if running on a physical device (not simulator)
function isPhysicalDevice(): boolean {
  // In production builds, we're always on a physical device
  if (!__DEV__) return true

  // In dev, check platform-specific indicators
  if (Platform.OS === 'ios') {
    // iOS simulators have specific model names
    return !Constants.platform?.ios?.model?.includes('Simulator')
  }

  // Android emulators typically don't have certain hardware
  return true // Assume physical device, registration will fail gracefully if not
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'coach_reply'
  | 'email_opened'
  | 'profile_view'
  | 'twitter_follow'
  | 'streak_reminder'
  | 'challenge_complete'
  | 'weekly_summary'
  | 'system'

export interface NotificationData {
  type: NotificationType
  title: string
  body: string
  // Navigation data
  screen?: string
  params?: Record<string, string>
  // Entity references
  coachId?: string
  campaignId?: string
  notificationId?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// Configure how notifications appear when app is in foreground
// Wrapped in try-catch to prevent crashes on startup
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
} catch (e) {
  console.warn('[Notifications] Failed to set handler:', e)
}

// ─────────────────────────────────────────────────────────────────────────────
// Push Token Registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the Expo push token for this device
 */
export async function getPushToken(): Promise<string | null> {
  // Must be a physical device
  if (!isPhysicalDevice()) {
    console.log('[Notifications] Push notifications require a physical device')
    return null
  }

  try {
    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted')
      return null
    }

    // Get the token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    return token.data
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error)
    return null
  }
}

/**
 * Register push token with backend
 */
export async function registerPushToken(): Promise<boolean> {
  try {
    const token = await getPushToken()
    if (!token) return false

    const platform = Platform.OS as 'ios' | 'android'

    await api.request('/api/notifications/register-push', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    })

    console.log('[Notifications] Token registered successfully')
    analytics.track('push_token_registered', { platform })
    return true
  } catch (error) {
    console.error('[Notifications] Failed to register token:', error)
    return false
  }
}

/**
 * Unregister push token (for logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.request('/api/notifications/unregister-push', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    console.log('[Notifications] Token unregistered')
  } catch (error) {
    console.error('[Notifications] Failed to unregister token:', error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set the app badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count)
  } catch (error) {
    console.error('[Notifications] Failed to set badge:', error)
  }
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep Link Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the route to navigate to based on notification data
 */
export function getNotificationRoute(data: NotificationData): {
  path: string
  params?: Record<string, string>
} | null {
  const { type, screen, params, coachId, campaignId } = data

  // If explicit screen is provided, use it
  if (screen) {
    return { path: screen, params }
  }

  // Otherwise, determine route based on notification type
  switch (type) {
    case 'coach_reply':
    case 'email_opened':
      return {
        path: '/(tabs)/saved',
        params: coachId ? { highlightCoach: coachId } : undefined,
      }

    case 'profile_view':
      return { path: '/(tabs)/recruit' }

    case 'twitter_follow':
      return {
        path: '/(tabs)/twitter',
        params: coachId ? { coachId } : undefined,
      }

    case 'streak_reminder':
    case 'challenge_complete':
      return { path: '/(tabs)/challenges' }

    case 'weekly_summary':
      return { path: '/(tabs)' } // Dashboard

    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook to set up notification listeners
 * Should be used in the root layout
 */
export function useNotifications() {
  const router = useRouter()
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null)

  useEffect(() => {
    // Register token on mount
    registerPushToken()

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Notifications] Received:', notification)
        setLastNotification(notification)

        // Track notification received
        const data = notification.request.content.data as unknown as NotificationData | undefined
        analytics.track('notification_received', {
          type: data?.type ?? 'unknown',
          foreground: true,
        })
      }
    )

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Notifications] User tapped:', response)

        const data = response.notification.request.content.data as unknown as NotificationData | undefined

        // Track notification tap
        analytics.track('notification_tapped', {
          type: data?.type ?? 'unknown',
        })

        // Navigate to appropriate screen
        const route = data ? getNotificationRoute(data) : null
        if (route) {
          // Small delay to ensure app is ready
          setTimeout(() => {
            router.push(route.path as any)
          }, 100)
        }

        // Clear badge on tap
        clearBadge()
      }
    )

    // Clean up listeners
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [router])

  return { lastNotification }
}

/**
 * Hook to handle initial notification (app opened from notification)
 */
export function useInitialNotification() {
  const router = useRouter()
  const [handled, setHandled] = useState(false)

  useEffect(() => {
    if (handled) return

    // Check if app was opened from a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as unknown as NotificationData | undefined

        analytics.track('notification_cold_start', {
          type: data?.type ?? 'unknown',
        })

        const route = data ? getNotificationRoute(data) : null
        if (route) {
          // Delay navigation until app is ready
          setTimeout(() => {
            router.push(route.path as any)
          }, 500)
        }

        clearBadge()
      }
      setHandled(true)
    })
  }, [router, handled])
}

/**
 * Hook to re-register token when app comes to foreground
 * Ensures token stays fresh
 */
export function useTokenRefresh() {
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground - refresh token
        registerPushToken()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [])
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Notifications (for testing/debugging)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule a local notification (useful for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
  seconds: number = 1
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown> | undefined,
      sound: true,
    },
    trigger: seconds > 0 ? {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    } : null,
  })
  return id
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id)
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

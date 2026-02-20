/**
 * OfflineBanner Component
 *
 * Displays a contextual banner when the user is offline.
 * Shows appropriate message based on the current screen.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

import { colors, fontFamily, spacing, borderRadius } from '@/constants/theme'
import {
  useNetworkStatus,
  getOfflineBanner,
  ScreenType,
  offlineQueue,
} from '@/lib/offline'
import { useEffect, useState } from 'react'

interface OfflineBannerProps {
  /** Current screen context */
  screen: ScreenType
  /** Optional custom message override */
  customMessage?: string
}

export function OfflineBanner({ screen, customMessage }: OfflineBannerProps) {
  const { isConnected } = useNetworkStatus()
  const [queueCount, setQueueCount] = useState(0)

  // Get queue count for display
  useEffect(() => {
    if (!isConnected) {
      offlineQueue.count().then(setQueueCount)
    }
  }, [isConnected])

  // Don't show if connected
  if (isConnected) return null

  const message = customMessage || getOfflineBanner(screen)

  return (
    <Animated.View
      entering={SlideInUp.duration(300)}
      exiting={SlideOutUp.duration(200)}
      style={styles.container}
    >
      <View style={styles.content}>
        <Ionicons
          name="cloud-offline-outline"
          size={16}
          color={colors.warning}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      {queueCount > 0 && (
        <Text style={styles.queueText}>
          {queueCount} action{queueCount !== 1 ? 's' : ''} queued
        </Text>
      )}
    </Animated.View>
  )
}

/**
 * Compact offline indicator for headers
 */
export function OfflineIndicator() {
  const { isConnected } = useNetworkStatus()

  if (isConnected) return null

  return (
    <View style={styles.indicator}>
      <Ionicons
        name="cloud-offline"
        size={14}
        color={colors.warning}
      />
    </View>
  )
}

/**
 * Full-screen offline message for screens with no offline support
 */
interface OfflineScreenProps {
  title?: string
  message?: string
}

export function OfflineScreen({
  title = 'No Connection',
  message = 'This feature requires an internet connection.',
}: OfflineScreenProps) {
  const { isConnected } = useNetworkStatus()

  // Only show if disconnected
  if (isConnected) return null

  return (
    <View style={styles.fullScreen}>
      <Ionicons
        name="cloud-offline-outline"
        size={64}
        color={colors.textTertiary}
      />
      <Text style={styles.fullScreenTitle}>{title}</Text>
      <Text style={styles.fullScreenMessage}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)', // warning with opacity
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.warning,
    flex: 1,
  },
  queueText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    marginLeft: 24, // align with message
  },
  indicator: {
    padding: 4,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  fullScreenTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: colors.text,
    marginTop: spacing.md,
  },
  fullScreenMessage: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})

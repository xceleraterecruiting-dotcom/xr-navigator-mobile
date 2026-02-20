/**
 * LiveIntel Component
 *
 * Dashboard section showing live activity feed.
 * Shows 3 events max with pulse indicator.
 *
 * Events include:
 * - Email opens
 * - Profile views
 * - Twitter follows
 * - Replies
 */

import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'

import { colors, spacing, borderRadius, fontFamily, fontSize } from '@/constants/theme'
import { IntelCard } from '@/components/ui/IntelCard'
import { IntelCardSkeleton } from '@/components/ui/Skeleton'
import { useIntelStore } from '@/stores/intelStore'
import { analytics } from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LiveIntelProps {
  /** Max number of events to show */
  maxEvents?: number
  /** Show header */
  showHeader?: boolean
  /** Handler for "View All" press */
  onViewAll?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse Dot Animation
// ─────────────────────────────────────────────────────────────────────────────

function PulseDot() {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.pulseDot, animatedStyle]} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function LiveIntel({ maxEvents = 3, showHeader = true, onViewAll }: LiveIntelProps) {
  const router = useRouter()
  const { events, isLoading, error, fetchIntel, hasMore } = useIntelStore()

  // Fetch intel on mount
  useEffect(() => {
    fetchIntel()
  }, [])

  // Slice to max events
  const displayEvents = events.slice(0, maxEvents)
  const hasEvents = displayEvents.length > 0

  // Handle event CTA press
  const handleEventAction = (event: typeof events[0]) => {
    analytics.track('intel_event_action', {
      type: event.type,
      coachId: event.coachId,
    })

    // Navigate based on event type
    if (event.coachId) {
      // Open coach modal/details
      router.push(`/(tabs)/saved?highlight=${event.coachId}`)
    } else {
      // Default to saved coaches
      router.push('/(tabs)/saved')
    }
  }

  // Handle View All
  const handleViewAll = () => {
    analytics.track('dashboard_cta_tapped', { cta_type: 'view_all_intel' })
    onViewAll?.()
    router.push('/(tabs)/saved')
  }

  // Loading state
  if (isLoading && events.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <PulseDot />
              <Text style={styles.title}>LIVE INTEL</Text>
            </View>
          </View>
        )}
        <View style={styles.skeletonContainer}>
          <IntelCardSkeleton />
          <IntelCardSkeleton />
          <IntelCardSkeleton />
        </View>
      </View>
    )
  }

  // Empty state
  if (!hasEvents && !isLoading) {
    return (
      <Animated.View entering={FadeInUp.duration(400)} style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.pulseDot, { opacity: 0.3 }]} />
              <Text style={styles.title}>LIVE INTEL</Text>
            </View>
          </View>
        )}
        <View style={styles.emptyState}>
          <Ionicons name="pulse-outline" size={24} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            Activity will appear here when coaches engage with your outreach
          </Text>
        </View>
      </Animated.View>
    )
  }

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.container}>
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PulseDot />
            <Text style={styles.title}>LIVE INTEL</Text>
            <Text style={styles.count}>({events.length})</Text>
          </View>
          {hasMore && (
            <TouchableOpacity
              onPress={handleViewAll}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Events */}
      <View style={styles.eventsList}>
        {displayEvents.map((event, index) => (
          <IntelCard
            key={event.id}
            event={event}
            index={index}
            onCTAPress={() => handleEventAction(event)}
          />
        ))}
      </View>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Variant
// ─────────────────────────────────────────────────────────────────────────────

interface LiveIntelCompactProps {
  /** Single most recent event */
  event?: typeof useIntelStore.getState extends () => { events: (infer E)[] } ? E : never
  /** Press handler */
  onPress?: () => void
}

export function LiveIntelCompact({ event, onPress }: LiveIntelCompactProps) {
  if (!event) return null

  return (
    <TouchableOpacity
      style={styles.compactContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <PulseDot />
      <Text style={styles.compactText} numberOfLines={1}>
        {event.description}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  title: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  count: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },
  viewAll: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.accent,
  },
  eventsList: {
    gap: spacing.sm,
  },
  skeletonContainer: {
    gap: spacing.sm,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  compactText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
})

/**
 * Skeleton Loading Components
 *
 * Shimmer skeleton placeholders matching exact component layouts.
 * Uses Reanimated for better performance on low-end devices.
 */

import React, { useEffect } from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'

import { colors, spacing, borderRadius } from '@/constants/theme'

// ─────────────────────────────────────────────────────────────────────────────
// Base Skeleton Components
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

/**
 * Animated shimmer effect hook
 */
function useShimmer() {
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    )
  }, [])

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))
}

/**
 * Basic skeleton with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius: br = 8,
  style,
}: SkeletonProps) {
  const shimmerStyle = useShimmer()

  return (
    <Animated.View
      style={[
        {
          width: width as number | `${number}%`,
          height,
          borderRadius: br,
          backgroundColor: colors.surface,
        },
        shimmerStyle,
        style,
      ]}
    />
  )
}

/**
 * Circular skeleton (for avatars)
 */
export function SkeletonCircle({ size, style }: { size: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  width = '100%',
  height = 14,
  style,
}: {
  width?: number | string
  height?: number
  style?: ViewStyle
}) {
  return <Skeleton width={width} height={height} borderRadius={4} style={style} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built Component Skeletons
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skeleton for coach card
 */
export function CoachCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={36} height={36} borderRadius={10} />
        <View style={styles.textGroup}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={34} height={34} borderRadius={8} />
      </View>
    </View>
  )
}

/**
 * Skeleton for StatCard (3-stat hero)
 */
export function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.statItem}>
          <Skeleton width={50} height={32} borderRadius={6} />
          <Skeleton width={70} height={12} style={{ marginTop: 6 }} />
          <Skeleton width={50} height={10} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  )
}

/**
 * Skeleton for IntelCard
 */
export function IntelCardSkeleton() {
  return (
    <View style={styles.intelCard}>
      <View style={styles.row}>
        <SkeletonCircle size={8} />
        <View style={{ flex: 1 }}>
          <Skeleton width="80%" height={14} />
          <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={80} height={28} borderRadius={6} />
      </View>
    </View>
  )
}

/**
 * Skeleton for Pipeline/Saved coach card with Smart CTA
 */
export function PipelineCardSkeleton() {
  return (
    <View style={styles.pipelineCard}>
      {/* Top row */}
      <View style={styles.row}>
        <Skeleton width={36} height={36} borderRadius={8} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width="50%" height={15} />
            <Skeleton width={60} height={18} borderRadius={9} />
          </View>
          <Skeleton width="70%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      {/* History row */}
      <View style={styles.historyRow}>
        <Skeleton width="35%" height={12} />
      </View>
      {/* Smart CTA */}
      <View style={styles.ctaRow}>
        <Skeleton width="100%" height={38} borderRadius={8} />
      </View>
    </View>
  )
}

/**
 * Skeleton for Pipeline mini chart
 */
export function PipelineChartSkeleton() {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Skeleton width={80} height={14} />
        <View style={styles.chartNumbers}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={24} height={20} borderRadius={4} />
          ))}
        </View>
      </View>
      <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: spacing.sm }} />
    </View>
  )
}

/**
 * Skeleton for the dashboard
 */
export function DashboardSkeleton() {
  return (
    <View style={styles.dashboard}>
      {/* Hero Name */}
      <View style={styles.heroSection}>
        <Skeleton width={200} height={48} borderRadius={4} />
        <Skeleton width={150} height={48} style={{ marginTop: 4 }} borderRadius={4} />
        <Skeleton width={120} height={16} style={{ marginTop: 8 }} />
      </View>

      {/* Stats */}
      <StatCardSkeleton />

      {/* Live Intel */}
      <View style={styles.section}>
        <Skeleton width={100} height={14} style={{ marginBottom: spacing.sm }} />
        <IntelCardSkeleton />
        <IntelCardSkeleton />
        <IntelCardSkeleton />
      </View>

      {/* Recommended */}
      <View style={styles.section}>
        <Skeleton width={160} height={14} style={{ marginBottom: spacing.sm }} />
        <CoachCardSkeleton />
        <CoachCardSkeleton />
        <CoachCardSkeleton />
      </View>
    </View>
  )
}

/**
 * Skeleton for search results
 */
export function SearchResultsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.searchResults}>
      {Array.from({ length: count }).map((_, i) => (
        <CoachCardSkeleton key={i} />
      ))}
    </View>
  )
}

/**
 * Skeleton for Pipeline/Saved list
 */
export function PipelineListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.searchResults}>
      {Array.from({ length: count }).map((_, i) => (
        <PipelineCardSkeleton key={i} />
      ))}
    </View>
  )
}

/**
 * Skeleton for Campaign card
 */
export function CampaignCardSkeleton() {
  return (
    <View style={styles.campaignCard}>
      {/* Header with title and status badge */}
      <View style={styles.campaignHeader}>
        <View style={styles.campaignTitleRow}>
          <Skeleton width="60%" height={16} />
          <Skeleton width={70} height={22} borderRadius={4} />
        </View>
        <Skeleton width="80%" height={13} style={{ marginTop: 4 }} />
      </View>
      {/* Stats row */}
      <View style={styles.campaignStats}>
        <View style={styles.campaignStat}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width={24} height={14} />
        </View>
        <View style={styles.campaignStat}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width={24} height={14} />
        </View>
        <View style={styles.campaignStat}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width={32} height={14} />
        </View>
        <Skeleton width={18} height={18} borderRadius={9} />
      </View>
    </View>
  )
}

/**
 * Skeleton for Campaigns list screen
 */
export function CampaignsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.campaignsList}>
      {Array.from({ length: count }).map((_, i) => (
        <CampaignCardSkeleton key={i} />
      ))}
    </View>
  )
}

/**
 * Skeleton for Profile screen
 */
export function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      {/* Header */}
      <View style={styles.profileHeader}>
        <SkeletonCircle size={80} />
        <Skeleton width={150} height={24} style={{ marginTop: spacing.md }} />
        <Skeleton width={100} height={14} style={{ marginTop: 4 }} />
      </View>

      {/* Stats */}
      <View style={styles.profileStats}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.profileStatItem}>
            <Skeleton width={40} height={24} borderRadius={6} />
            <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* Fields */}
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.profileField}>
          <Skeleton width={80} height={12} />
          <Skeleton width="100%" height={18} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Basic card
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textGroup: {
    flex: 1,
    gap: spacing.xs,
  },

  // Stat Card
  statCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  // Intel Card
  intelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  // Pipeline Card
  pipelineCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ctaRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  // Chart
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartNumbers: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  // Dashboard
  dashboard: {
    padding: spacing.lg,
  },
  heroSection: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },

  // Search Results
  searchResults: {
    gap: spacing.sm,
  },

  // Campaigns
  campaignCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  campaignHeader: {
    marginBottom: spacing.sm,
  },
  campaignTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  campaignStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  campaignStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campaignsList: {
    padding: spacing.md,
    paddingBottom: 100,
  },

  // Profile
  profile: {
    padding: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileField: {
    marginBottom: spacing.md,
  },
})

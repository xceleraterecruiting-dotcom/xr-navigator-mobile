/**
 * RecruitingProgressCard Component
 *
 * Shows your recruiting journey: how coaches are engaging with your outreach.
 * CONTACTED → OPENED → WATCHED FILM → INTERESTED
 */

import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { colors, fontFamily, spacing, borderRadius, shadows } from '@/constants/theme'

interface FunnelData {
  contacted: number
  opened: number
  clicked: number
  interested: number
  percentages: {
    opened: number
    clicked: number
    interested: number
  }
  gap: {
    hasGap: boolean
    clickedWithoutResponse: number
    message: string | null
  }
}

interface RecruitingFunnelCardProps {
  data: FunnelData | null
  isLoading?: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

function FunnelRow({
  label,
  value,
  percentage,
  index,
  isFirst = false,
}: {
  label: string
  value: number
  percentage?: number
  index: number
  isFirst?: boolean
}) {
  const barWidth = useSharedValue(0)

  useEffect(() => {
    barWidth.value = withDelay(
      index * 100,
      withTiming(percentage ?? 100, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
    )
  }, [percentage, index])

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }))

  return (
    <View style={styles.funnelRow}>
      <View style={styles.funnelLabelRow}>
        <Text style={styles.funnelLabel}>{label}</Text>
        <View style={styles.funnelValueRow}>
          <Text style={styles.funnelValue}>{value}</Text>
          {!isFirst && percentage !== undefined && (
            <Text style={styles.funnelPercentage}>({percentage}%)</Text>
          )}
        </View>
      </View>
      <View style={styles.funnelBarTrack}>
        <Animated.View style={[styles.funnelBarFill, barStyle]} />
      </View>
    </View>
  )
}

export function RecruitingFunnelCard({
  data,
  isLoading = false,
  isCollapsed = false,
  onToggleCollapse,
}: RecruitingFunnelCardProps) {
  const router = useRouter()

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.loadingIcon} />
          <View style={styles.loadingTitle} />
        </View>
        <View style={styles.loadingBars}>
          <View style={styles.loadingBar} />
          <View style={styles.loadingBar} />
          <View style={styles.loadingBar} />
        </View>
      </View>
    )
  }

  // Empty state
  if (!data || data.contacted === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>COACH ACTIVITY</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>
            Start reaching out to see how coaches engage
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/coaches')}
          >
            <Text style={styles.emptyBtnText}>Find Coaches</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <Pressable style={styles.header} onPress={onToggleCollapse}>
        <View style={styles.headerIcon}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>COACH ACTIVITY</Text>
        <View style={{ flex: 1 }} />
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {/* Funnel rows */}
      {!isCollapsed && (
        <>
          <View style={styles.funnelContent}>
            <FunnelRow
              label="Contacted"
              value={data.contacted}
              index={0}
              isFirst
            />
            <FunnelRow
              label="Opened"
              value={data.opened}
              percentage={data.percentages.opened}
              index={1}
            />
            <FunnelRow
              label="Watched Film"
              value={data.clicked}
              percentage={data.percentages.clicked}
              index={2}
            />
            <FunnelRow
              label="Interested"
              value={data.interested}
              percentage={data.percentages.interested}
              index={3}
            />
          </View>

          {/* Gap Alert */}
          {data.gap.hasGap && data.gap.message && (
            <View style={styles.gapAlert}>
              <Ionicons name="warning" size={16} color="#F97316" />
              <Text style={styles.gapText}>{data.gap.message}</Text>
            </View>
          )}

          {/* CTA when gap detected */}
          {data.gap.hasGap && (
            <Pressable
              style={styles.gapCta}
              onPress={() => router.push('/(tabs)/insight')}
            >
              <Text style={styles.gapCtaText}>Review My Approach</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200,165,77,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textTertiary,
  },

  // Funnel content
  funnelContent: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  funnelRow: {
    gap: 4,
  },
  funnelLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  funnelValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  funnelValue: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.text,
  },
  funnelPercentage: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  funnelBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  funnelBarFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  // Gap alert
  gapAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: borderRadius.md,
  },
  gapText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: '#F97316',
    lineHeight: 18,
  },
  gapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  gapCtaText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  emptyBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.primary,
  },

  // Loading
  loadingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  loadingTitle: {
    width: 150,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginLeft: spacing.sm,
  },
  loadingBars: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  loadingBar: {
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
})

export default RecruitingFunnelCard

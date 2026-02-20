/**
 * StatCard Component
 *
 * 3-stat hero card with gold edge accent
 * Shows key metrics: Contacted, Streak, Opened
 */

import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import Animated from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontFamily, spacing, borderRadius, shadows } from '@/constants/theme'
import { useButtonPress } from '@/lib/animations'

interface Stat {
  value: number | string
  label: string
  subtext?: string
  icon?: keyof typeof Ionicons.glyphMap
  color?: string
}

interface StatCardProps {
  stats: Stat[]
  onPress?: () => void
}

function StatItem({ stat }: { stat: Stat }) {
  const iconColor = stat.color || colors.accent

  return (
    <View style={styles.statItem}>
      {stat.icon && (
        <Ionicons
          name={stat.icon}
          size={16}
          color={iconColor}
          style={styles.statIcon}
        />
      )}
      <Text
        style={[styles.statValue, stat.color ? { color: stat.color } : null]}
        accessibilityLabel={`${stat.value} ${stat.label}`}
      >
        {stat.value}
      </Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
      {stat.subtext && (
        <Text style={styles.statSubtext}>{stat.subtext}</Text>
      )}
    </View>
  )
}

export function StatCard({ stats, onPress }: StatCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useButtonPress()

  const content = (
    <View style={styles.statsRow}>
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          <StatItem stat={stat} />
          {index < stats.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {content}
        </Animated.View>
      </Pressable>
    )
  }

  return <View style={styles.container}>{content}</View>
}

// Convenience component for the dashboard hero stats
interface DashboardStatsProps {
  contacted: number
  streak: number
  opened: number
  onPress?: () => void
}

export function DashboardStats({
  contacted,
  streak,
  opened,
  onPress,
}: DashboardStatsProps) {
  const stats: Stat[] = [
    {
      value: contacted,
      label: 'CONTACTED',
      color: colors.accent,
    },
    {
      value: streak,
      label: 'STREAK',
      icon: 'flame',
      color: colors.warning,
    },
    {
      value: opened,
      label: 'OPENED',
      color: colors.success,
    },
  ]

  return <StatCard stats={stats} onPress={onPress} />
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    // Gold glow effect
    ...shadows.gold,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 36,
    color: colors.text,
    letterSpacing: 1,
  },
  statLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginTop: 2,
  },
  statSubtext: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.border,
  },
})

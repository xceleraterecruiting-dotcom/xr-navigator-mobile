import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { UsageItem } from '@/types'
import { colors, spacing, fontSize, borderRadius, fontFamily} from '@/constants/theme'

interface UsageBannerProps {
  label: string
  usage: UsageItem | undefined
}

function periodLabel(period: string): string {
  switch (period) {
    case 'day': return 'today'
    case 'lifetime': return 'total'
    case 'year': return 'this year'
    default: return ''
  }
}

export function UsageBanner({ label, usage }: UsageBannerProps) {
  if (!usage) return null

  const isUnlimited = usage.limit === -1
  const isAtLimit = usage.atLimit && !isUnlimited
  const pct = usage.limit > 0 ? Math.min(usage.used / usage.limit, 1) : 0

  const countText = isUnlimited
    ? `${usage.used} ${periodLabel(usage.period)}`
    : `${usage.used} of ${usage.limit} ${periodLabel(usage.period)}`

  return (
    <View style={[styles.container, isAtLimit && styles.containerAtLimit]}>
      <View style={styles.textRow}>
        <Text style={[styles.label, isAtLimit && styles.labelAtLimit]}>
          {label}
        </Text>
        <Text style={[styles.count, isAtLimit && styles.countAtLimit]}>
          {countText}
        </Text>
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            { width: `${pct * 100}%` },
            isAtLimit ? styles.barFillAtLimit : styles.barFillNormal,
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  containerAtLimit: {
    backgroundColor: `${colors.error}15`,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  labelAtLimit: {
    color: colors.error,
  },
  count: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontFamily: fontFamily.semibold,
  },
  countAtLimit: {
    color: colors.error,
  },
  bar: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barFillNormal: {
    backgroundColor: colors.primary,
  },
  barFillAtLimit: {
    backgroundColor: colors.error,
  },
})

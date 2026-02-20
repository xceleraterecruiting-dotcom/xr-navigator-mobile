/**
 * PipelineMini Component
 *
 * Compact pipeline visualization showing outreach funnel.
 * Shows: Saved → Sent → Opened → Replied → Interested → Offered
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'

import { colors, spacing, borderRadius, fontFamily, fontSize } from '@/constants/theme'
import { pipelineChartA11y } from '@/lib/accessibility'

interface PipelineStats {
  saved: number
  sent: number
  opened: number
  replied: number
  interested: number
  offered: number
}

interface PipelineMiniProps {
  stats: PipelineStats
  onPress?: () => void
}

// Pipeline stage colors
const STAGE_COLORS = {
  saved: colors.textTertiary,
  sent: colors.accent,
  opened: colors.info,
  replied: colors.warning,
  interested: colors.success,
  offered: '#FF6B6B', // Hot red
}

export function PipelineMini({ stats, onPress }: PipelineMiniProps) {
  const total = stats.saved || 1 // Avoid division by zero
  const a11yProps = pipelineChartA11y(stats)

  // Calculate percentages for each stage
  const getWidth = (value: number) => {
    const percentage = (value / total) * 100
    return Math.max(percentage, value > 0 ? 5 : 0) // Minimum 5% if has value
  }

  return (
    <Animated.View entering={FadeInUp.duration(400).delay(300)}>
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
        {...a11yProps}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PIPELINE</Text>
          <View style={styles.statsRow}>
            <StatNumber value={stats.saved} color={STAGE_COLORS.saved} />
            <Text style={styles.separator}>|</Text>
            <StatNumber value={stats.sent} color={STAGE_COLORS.sent} />
            <Text style={styles.separator}>|</Text>
            <StatNumber value={stats.opened} color={STAGE_COLORS.opened} />
            <Text style={styles.separator}>|</Text>
            <StatNumber value={stats.replied} color={STAGE_COLORS.replied} />
            <Text style={styles.separator}>|</Text>
            <StatNumber value={stats.interested} color={STAGE_COLORS.interested} />
            <Text style={styles.separator}>|</Text>
            <StatNumber value={stats.offered} color={STAGE_COLORS.offered} />
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {/* Saved (full width background) */}
            <View style={[styles.progressSegment, { flex: 1, backgroundColor: `${STAGE_COLORS.saved}30` }]} />

            {/* Sent */}
            {stats.sent > 0 && (
              <View
                style={[
                  styles.progressSegmentOverlay,
                  { width: `${getWidth(stats.sent)}%`, backgroundColor: STAGE_COLORS.sent },
                ]}
              />
            )}

            {/* Opened */}
            {stats.opened > 0 && (
              <View
                style={[
                  styles.progressSegmentOverlay,
                  { width: `${getWidth(stats.opened)}%`, backgroundColor: STAGE_COLORS.opened, left: `${getWidth(stats.sent)}%` },
                ]}
              />
            )}
          </View>
        </View>

        {/* Labels */}
        <View style={styles.labelsRow}>
          <Text style={[styles.label, { color: STAGE_COLORS.saved }]}>Saved</Text>
          <Text style={[styles.label, { color: STAGE_COLORS.sent }]}>Sent</Text>
          <Text style={[styles.label, { color: STAGE_COLORS.opened }]}>Opened</Text>
          <Text style={[styles.label, { color: STAGE_COLORS.replied }]}>Replied</Text>
          <Text style={[styles.label, { color: STAGE_COLORS.interested }]}>Interest</Text>
          <Text style={[styles.label, { color: STAGE_COLORS.offered }]}>Offers</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// Stat number component
function StatNumber({ value, color }: { value: number; color: string }) {
  return (
    <Text style={[styles.statNumber, { color }]}>
      {value}
    </Text>
  )
}

/**
 * Compact inline version for tight spaces
 */
export function PipelineInline({ stats, onPress }: PipelineMiniProps) {
  const total = stats.saved || 1

  return (
    <TouchableOpacity
      style={styles.inlineContainer}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <Text style={styles.inlineLabel}>Pipeline</Text>
      <View style={styles.inlineBar}>
        <View
          style={[
            styles.inlineSegment,
            { flex: stats.sent / total || 0, backgroundColor: STAGE_COLORS.sent },
          ]}
        />
        <View
          style={[
            styles.inlineSegment,
            { flex: stats.opened / total || 0, backgroundColor: STAGE_COLORS.opened },
          ]}
        />
        <View
          style={[
            styles.inlineSegment,
            { flex: stats.replied / total || 0, backgroundColor: STAGE_COLORS.replied },
          ]}
        />
        <View
          style={[
            styles.inlineSegment,
            { flex: (total - stats.sent - stats.opened - stats.replied) / total || 1, backgroundColor: `${STAGE_COLORS.saved}30` },
          ]}
        />
      </View>
      <Text style={styles.inlineTotal}>{stats.saved}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statNumber: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
  },
  separator: {
    fontSize: fontSize.xs,
    color: colors.disabled,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  progressSegment: {
    height: '100%',
  },
  progressSegmentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 10,
    fontFamily: fontFamily.regular,
    letterSpacing: 0.3,
  },

  // Inline version
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  inlineBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  inlineSegment: {
    height: '100%',
  },
  inlineTotal: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textSecondary,
    minWidth: 20,
    textAlign: 'right',
  },
})

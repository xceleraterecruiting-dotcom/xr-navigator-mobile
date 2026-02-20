/**
 * InterestLevel Component
 *
 * Visual indicator of coach engagement/interest level
 * Shows a progress bar with color coding and guidance text
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated from 'react-native-reanimated'
import { colors, fontFamily, spacing, borderRadius, interestColors } from '@/constants/theme'
import { useProgressBar } from '@/lib/animations'

interface InterestLevelProps {
  score: number // 0-100
  showLabel?: boolean
  showGuidance?: boolean
  size?: 'small' | 'medium' | 'large'
}

// Get interest level data based on score
function getInterestData(score: number): {
  color: string
  bgColor: string
  label: string
  guidance: string
} {
  if (score >= 50) {
    return {
      color: interestColors.high.text,
      bgColor: interestColors.high.bg,
      label: 'High Interest',
      guidance: 'This coach is engaged. Send a follow-up!',
    }
  }
  if (score >= 20) {
    return {
      color: interestColors.medium.text,
      bgColor: interestColors.medium.bg,
      label: 'Warming Up',
      guidance: 'Keep the conversation going.',
    }
  }
  return {
    color: interestColors.low.text,
    bgColor: interestColors.low.bg,
    label: 'Just Starting',
    guidance: 'Send your first message to gauge interest.',
  }
}

export function InterestLevel({
  score,
  showLabel = true,
  showGuidance = false,
  size = 'medium',
}: InterestLevelProps) {
  const interest = getInterestData(score)
  const progressStyle = useProgressBar(score)

  const barHeight = size === 'small' ? 4 : size === 'large' ? 8 : 6

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Interest level ${score} out of 100. ${interest.guidance}`}
    >
      {/* Label row */}
      {showLabel && score > 0 && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: interest.color }]}>
            {interest.label}
          </Text>
          <Text style={styles.score}>{score}</Text>
        </View>
      )}

      {/* Progress bar */}
      <View style={[styles.barContainer, { height: barHeight }]}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: interest.color, height: barHeight },
            progressStyle,
          ]}
        />
      </View>

      {/* Guidance text */}
      {showGuidance && (
        <Text style={styles.guidance}>{interest.guidance}</Text>
      )}
    </View>
  )
}

// Compact inline version for coach cards
interface InterestBadgeProps {
  score: number
}

export function InterestBadge({ score }: InterestBadgeProps) {
  const interest = getInterestData(score)

  if (score === 0) return null

  return (
    <View
      style={[styles.badge, { backgroundColor: interest.bgColor }]}
      accessibilityLabel={`${interest.label}, score ${score}`}
    >
      <View style={[styles.badgeDot, { backgroundColor: interest.color }]} />
      <Text style={[styles.badgeText, { color: interest.color }]}>
        {interest.label}
      </Text>
    </View>
  )
}

// Mini version - just the dot indicator
interface InterestDotProps {
  score: number
  size?: number
}

export function InterestDot({ score, size = 8 }: InterestDotProps) {
  const interest = getInterestData(score)

  if (score === 0) return null

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: interest.color,
        },
      ]}
      accessibilityLabel={interest.label}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  score: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    color: colors.textTertiary,
  },
  barContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: borderRadius.full,
  },
  guidance: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  // Dot styles
  dot: {},
})

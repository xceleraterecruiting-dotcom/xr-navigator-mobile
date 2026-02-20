/**
 * ScoreBreakdownModal Component
 *
 * Bottom sheet showing detailed breakdown of Recruiting Readiness Score
 * Each factor displays its contribution with a mini progress bar and actionable tip
 */

import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { colors, fontFamily, spacing, borderRadius } from '@/constants/theme'
import { haptics } from '@/lib/haptics'
import { BottomSheet } from './BottomSheet'

// Map factor names to routes for navigation
const FACTOR_ROUTES: Record<string, string> = {
  'Profile Completeness': '/(tabs)/profile',
  'Weekly Outreach': '/(tabs)/coaches',
  'Follow-up Discipline': '/(tabs)/saved',
  'Streak Consistency': '/(tabs)/challenges',
  'Coach Engagement': '/(tabs)/campaigns',
  'Film & Evaluation': '/(tabs)/evaluate',
}

// Score color thresholds (same as ReadinessRing)
function getScoreColor(score: number): string {
  if (score >= 75) return '#22C55E' // Green
  if (score >= 50) return '#EAB308' // Gold
  if (score >= 25) return '#F97316' // Orange
  return '#6B7280' // Gray
}

interface ScoreFactor {
  name: string
  score: number
  weight: number
  tip: string
  current?: string
  target?: string
}

interface ScoreBreakdownModalProps {
  visible: boolean
  onClose: () => void
  score: number
  trend: 'up' | 'down' | 'stable'
  factors: ScoreFactor[]
}

function FactorRow({
  factor,
  index,
  onNavigate,
}: {
  factor: ScoreFactor
  index: number
  onNavigate?: (route: string) => void
}) {
  const animatedWidth = useSharedValue(0)
  const color = getScoreColor(factor.score)
  const route = FACTOR_ROUTES[factor.name]
  const isClickable = !!route && factor.score < 100

  React.useEffect(() => {
    animatedWidth.value = withDelay(
      index * 100,
      withTiming(factor.score, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    )
  }, [factor.score, index])

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }))

  const handlePress = () => {
    if (route && onNavigate) {
      haptics.light()
      onNavigate(route)
    }
  }

  const content = (
    <>
      {/* Header: Name and Score */}
      <View style={styles.factorHeader}>
        <Text style={styles.factorName}>{factor.name}</Text>
        <View style={styles.factorScoreContainer}>
          <Text style={[styles.factorScore, { color }]}>{factor.score}</Text>
          <Text style={styles.factorWeight}>({factor.weight}%)</Text>
          {isClickable && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.factorBarTrack}>
        <Animated.View
          style={[styles.factorBarFill, { backgroundColor: color }, barStyle]}
        />
      </View>

      {/* Current vs Target */}
      {factor.current && (
        <View style={styles.factorMeta}>
          <Text style={styles.factorCurrent}>{factor.current}</Text>
          {factor.target && (
            <>
              <Text style={styles.factorArrow}>→</Text>
              <Text style={styles.factorTarget}>{factor.target}</Text>
            </>
          )}
        </View>
      )}

      {/* Tip */}
      <Text style={styles.factorTip}>{factor.tip}</Text>
    </>
  )

  if (isClickable) {
    return (
      <TouchableOpacity
        style={styles.factorRow}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return <View style={styles.factorRow}>{content}</View>
}

export function ScoreBreakdownModal({
  visible,
  onClose,
  score,
  trend,
  factors,
}: ScoreBreakdownModalProps) {
  const router = useRouter()
  const scoreColor = getScoreColor(score)
  const isCrushing = score >= 90

  const trendLabel = trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : '→ Stable'
  const trendColor = trend === 'up' ? '#22C55E' : trend === 'down' ? '#F97316' : colors.textMuted

  const handleNavigate = (route: string) => {
    onClose()
    // Small delay to allow modal to close
    setTimeout(() => {
      router.push(route as any)
    }, 150)
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoint={0.75}
      title="Score Breakdown"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero score display */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroScore, { color: scoreColor }]}>{score}</Text>
          <Text style={[styles.heroTrend, { color: trendColor }]}>{trendLabel}</Text>
          {isCrushing && (
            <View style={styles.crushingBadge}>
              <Text style={styles.crushingText}>You're crushing it!</Text>
            </View>
          )}
        </View>

        {/* Factors list */}
        <View style={styles.factorsSection}>
          <Text style={styles.sectionHeader}>SCORE FACTORS</Text>
          <Text style={styles.factorsHint}>Tap a factor to improve it</Text>
          {factors.map((factor, index) => (
            <FactorRow
              key={factor.name}
              factor={factor}
              index={index}
              onNavigate={handleNavigate}
            />
          ))}
        </View>

        {/* Lowest factor highlight */}
        {factors.length > 0 && (
          <View style={styles.focusSection}>
            <Text style={styles.sectionHeader}>FOCUS AREA</Text>
            <View style={styles.focusCard}>
              <Text style={styles.focusTitle}>
                {factors.reduce((min, f) => (f.score < min.score ? f : min)).name}
              </Text>
              <Text style={styles.focusTip}>
                {factors.reduce((min, f) => (f.score < min.score ? f : min)).tip}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Hero section
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  heroScore: {
    fontFamily: fontFamily.display,
    fontSize: 72,
    letterSpacing: 2,
    lineHeight: 72,
  },
  heroTrend: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  crushingBadge: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  crushingText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: '#22C55E',
    letterSpacing: 0.5,
  },

  // Section headers
  sectionHeader: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 2.5,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },

  // Factors section
  factorsSection: {
    marginBottom: spacing.lg,
  },
  factorsHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  factorRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  factorName: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.text,
  },
  factorScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  factorScore: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    letterSpacing: 0.5,
  },
  factorWeight: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  factorBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  factorBarFill: {
    height: 6,
    borderRadius: 3,
  },
  factorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  factorCurrent: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  factorArrow: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  factorTarget: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  factorTip: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Focus section
  focusSection: {
    marginBottom: spacing.lg,
  },
  focusCard: {
    backgroundColor: 'rgba(217,119,6,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  focusTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#D97706',
    marginBottom: spacing.xs,
  },
  focusTip: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
})

export default ScoreBreakdownModal

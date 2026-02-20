/**
 * ReadinessRing Component
 *
 * WHOOP-style circular progress ring showing Recruiting Readiness Score
 * The centerpiece of the dashboard — one number tells the whole story
 */

import React, { useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
  useAnimatedStyle,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, fontFamily, spacing } from '@/constants/theme'

// Animated Circle for SVG
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Score color thresholds (spec-defined)
const SCORE_COLORS = {
  high: '#22C55E',      // 75-100: Green — "You're on track"
  medium: '#EAB308',    // 50-74: Gold — "Room to grow"
  low: '#F97316',       // 25-49: Orange — "Take action"
  empty: '#6B7280',     // 0-24: Gray — NOT red. "Start your journey"
}

function getScoreColor(score: number): string {
  if (score >= 75) return SCORE_COLORS.high
  if (score >= 50) return SCORE_COLORS.medium
  if (score >= 25) return SCORE_COLORS.low
  return SCORE_COLORS.empty
}

function getScoreMessage(score: number): string {
  if (score >= 75) return "You're on track"
  if (score >= 50) return 'Room to grow'
  if (score >= 25) return 'Take action'
  if (score > 0) return 'Start your journey'
  return 'Complete your profile'
}

function getTrendArrow(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑'
    case 'down': return '↓'
    default: return '→'
  }
}

interface ReadinessRingProps {
  score: number // 0-100
  trend?: 'up' | 'down' | 'stable'
  size?: number
  strokeWidth?: number
  onPress?: () => void
  showLabel?: boolean
  showTrend?: boolean
  style?: ViewStyle
  isLoading?: boolean
}

export function ReadinessRing({
  score,
  trend = 'stable',
  size = 100,
  strokeWidth = 8,
  onPress,
  showLabel = true,
  showTrend = true,
  style,
  isLoading = false,
}: ReadinessRingProps) {
  // Animation values
  const progress = useSharedValue(0)
  const glowOpacity = useSharedValue(0)
  const pulseScale = useSharedValue(1)

  // Ring calculations
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  const scoreColor = getScoreColor(score)

  // Haptic callback for animation completion
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  // Animate on score change
  useEffect(() => {
    if (isLoading) return

    const targetProgress = Math.min(Math.max(score, 0), 100) / 100

    // Reset and animate
    progress.value = 0
    glowOpacity.value = 0

    // Animate progress with ease-out cubic (1.2s as per spec)
    progress.value = withTiming(
      targetProgress,
      {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished && score > 0) {
          runOnJS(triggerHaptic)()
        }
      }
    )

    // Animate glow in after progress starts
    glowOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 800 })
    )
  }, [score, isLoading])

  // Empty state pulse animation
  useEffect(() => {
    if (score === 0 && !isLoading) {
      pulseScale.value = withRepeat(
        withTiming(1.05, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    } else {
      pulseScale.value = 1
    }
  }, [score, isLoading])

  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value)
    return {
      strokeDashoffset,
    }
  })

  // Glow animation style
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.4,
  }))

  // Pulse animation for empty state
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }))

  const content = (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Glow effect behind ring - centered using 50% position + transform */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: scoreColor,
            // Position at center of container, then shift back by half glow size
            top: '50%',
            left: '50%',
            transform: [
              { translateX: -(size + 20) / 2 },
              { translateY: -(size + 20) / 2 },
            ],
          },
          glowStyle,
        ]}
      />

      {/* SVG Ring */}
      <Animated.View style={pulseStyle}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Progress arc */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
      </Animated.View>

      {/* Center content */}
      <View style={styles.centerContent}>
        {isLoading ? (
          <Text style={styles.loadingText}>...</Text>
        ) : (
          <View style={styles.centerInner}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {score}
              {showTrend && score > 0 && (
                <Text style={[styles.trendArrow, { color: scoreColor }]}>
                  {getTrendArrow(trend)}
                </Text>
              )}
            </Text>
            {showLabel && (
              <Text style={styles.label}>RECRUITING SCORE</Text>
            )}
          </View>
        )}
      </View>
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={`Recruiting score ${score} out of 100. ${getScoreMessage(score)}. Tap for details.`}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View accessibilityLabel={`Recruiting score ${score} out of 100. ${getScoreMessage(score)}`}>
      {content}
    </View>
  )
}

// Compact version for lists or secondary placement
interface ReadinessRingMiniProps {
  score: number
  size?: number
  style?: ViewStyle
}

export function ReadinessRingMini({
  score,
  size = 40,
  style,
}: ReadinessRingMiniProps) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const scoreColor = getScoreColor(score)
  const strokeDashoffset = circumference * (1 - score / 100)

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Center score */}
      <View style={[styles.miniCenter, { width: size, height: size }]}>
        <Text style={[styles.miniScore, { color: scoreColor }]}>{score}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    // Center the glow behind the ring using transform for reliable centering
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: fontFamily.display,
    fontSize: 48,
    textAlign: 'center',
  },
  trendArrow: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 2.5,
    color: colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: colors.textMuted,
  },
  // Mini version styles
  miniCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniScore: {
    fontFamily: fontFamily.display,
    fontSize: 14,
    letterSpacing: 0.5,
  },
})

export default ReadinessRing

import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { colors, borderRadius, fontSize, fontFamily } from '@/constants/theme'

interface ProgressBarProps {
  progress: number // 0-1
  color?: string
  trackColor?: string
  height?: number
  label?: string
  style?: ViewStyle
}

export function ProgressBar({
  progress,
  color = colors.primary,
  trackColor = 'rgba(255,255,255,0.08)',
  height = 6,
  label,
  style,
}: ProgressBarProps) {
  const animatedProgress = useSharedValue(0)

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    })
  }, [progress])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%` as any,
  }))

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.track, { height, backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.fill,
            { height, backgroundColor: color },
            fillStyle,
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.full,
  },
  label: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    marginBottom: 4,
  },
})

import React from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { colors, borderRadius, fontSize, spacing, fontFamily, shadows } from '@/constants/theme'
import { haptics } from '@/lib/haptics'

interface GradientButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  fullWidth?: boolean
  icon?: React.ReactNode
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity)

export function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
}: GradientButtonProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 })
  }

  const handlePress = () => {
    haptics.light()
    onPress()
  }

  const isDisabled = disabled || loading

  return (
    <AnimatedTouchable
      style={[
        styles.wrapper,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        shadows.gold,
        style,
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <View style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={colors.background} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </>
        )}
      </View>
    </AnimatedTouchable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.primary,
  },
  text: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.background,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.5,
  },
})

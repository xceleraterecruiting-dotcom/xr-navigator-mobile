/**
 * Animation System for XR Navigator Mobile
 *
 * World-class animations using Reanimated 3
 * All timing values from spec for 60fps on iPhone 8 / Galaxy A14
 */

import { useEffect } from 'react'
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated'
import { Platform } from 'react-native'
import { timing } from '@/constants/theme'

// Re-export timing for convenience
export { timing }

/**
 * Button press animation
 * Scale to 0.97 on press, back to 1 on release
 */
export function useButtonPress() {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const onPressIn = () => {
    scale.value = withTiming(0.97, { duration: timing.buttonPress })
  }

  const onPressOut = () => {
    scale.value = withTiming(1, { duration: timing.buttonPress })
  }

  return { animatedStyle, onPressIn, onPressOut }
}

/**
 * Card tap highlight animation
 * Brief opacity pulse on tap
 */
export function useCardTap() {
  const opacity = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const onPressIn = () => {
    opacity.value = withTiming(0.7, { duration: timing.cardTap / 2 })
  }

  const onPressOut = () => {
    opacity.value = withTiming(1, { duration: timing.cardTap / 2 })
  }

  return { animatedStyle, onPressIn, onPressOut }
}

/**
 * Modal spring animation
 * Spring up when visible, slide down when hidden
 */
export function useModalSpring(visible: boolean) {
  const translateY = useSharedValue(500)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 1,
      })
    } else {
      translateY.value = withTiming(500, { duration: 200 })
    }
  }, [visible])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return animatedStyle
}

/**
 * Staggered entry animation for lists
 * Each item fades in and slides up with staggered delay
 */
export function useStaggeredEntry(index: number, isVisible: boolean) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(20)

  useEffect(() => {
    if (isVisible) {
      const delay = index * timing.staggerDelay
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: timing.intelStagger })
      )
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: timing.intelStagger })
      )
    } else {
      opacity.value = 0
      translateY.value = 20
    }
  }, [isVisible, index])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return animatedStyle
}

/**
 * Pulsing dot animation for Live Intel indicator
 * Infinite pulse between full and 40% opacity
 */
export function usePulseDot() {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, {
        duration: timing.pulseDot / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return animatedStyle
}

/**
 * Skeleton shimmer animation
 * Pulsing opacity for loading placeholders
 */
export function useSkeletonPulse() {
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return animatedStyle
}

/**
 * Fade in animation
 * Simple opacity fade from 0 to 1
 */
export function useFadeIn(delay: number = 0) {
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: timing.pageTransition })
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  return animatedStyle
}

/**
 * Slide up animation
 * Slide from bottom with fade
 */
export function useSlideUp(delay: number = 0) {
  const opacity = useSharedValue(0)
  const translateY = useSharedValue(30)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: timing.pageTransition })
    )
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: timing.pageTransition })
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  return animatedStyle
}

/**
 * Scale in animation
 * Scale from 0.9 to 1 with fade
 */
export function useScaleIn(delay: number = 0) {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.9)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: timing.pageTransition })
    )
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 200 })
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  return animatedStyle
}

/**
 * Progress bar animation
 * Animate width from 0 to target percentage
 */
export function useProgressBar(percentage: number, duration: number = 500) {
  const width = useSharedValue(0)

  useEffect(() => {
    width.value = withTiming(percentage, {
      duration,
      easing: Easing.out(Easing.cubic),
    })
  }, [percentage])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }))

  return animatedStyle
}

/**
 * Count up animation
 * Animate a number from 0 to target
 */
export function useCountUp(target: number, duration: number = 1000) {
  const value = useSharedValue(0)

  useEffect(() => {
    value.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.cubic),
    })
  }, [target])

  return value
}

/**
 * Haptic feedback helper
 * Wraps haptic calls for animation callbacks
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  'worklet'
  // This will be called from JS thread
  // Actual haptic implementation happens in the component
}

/**
 * Performance guard
 * Checks if animations should be enabled based on device capabilities
 */
let _shouldAnimate: boolean | null = null

export async function checkShouldAnimate(): Promise<boolean> {
  if (_shouldAnimate !== null) return _shouldAnimate

  // iOS always animates
  if (Platform.OS === 'ios') {
    _shouldAnimate = true
    return true
  }

  // Android: check RAM (requires react-native-device-info)
  try {
    const DeviceInfo = require('react-native-device-info')
    const ram = await DeviceInfo.getTotalMemory()
    // Disable animations on devices with < 3GB RAM
    _shouldAnimate = ram > 3 * 1024 * 1024 * 1024
  } catch {
    // If we can't check, assume animations are fine
    _shouldAnimate = true
  }

  return _shouldAnimate
}

/**
 * Hook to get animation enable state
 */
export function useAnimationsEnabled() {
  const enabled = useSharedValue(true)

  useEffect(() => {
    checkShouldAnimate().then((should) => {
      enabled.value = should
    })
  }, [])

  return enabled
}

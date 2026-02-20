import React, { useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, borderRadius, spacing } from '@/constants/theme'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 }

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  snapPoint?: number // 0-1 fraction of screen height, default 0.5
  children: React.ReactNode
  title?: string
  style?: ViewStyle
}

export function BottomSheet({
  visible,
  onClose,
  snapPoint = 0.5,
  children,
  title,
  style,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets()
  const sheetHeight = SCREEN_HEIGHT * snapPoint
  const translateY = useSharedValue(sheetHeight)
  const backdropOpacity = useSharedValue(0)
  const context = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG)
      backdropOpacity.value = withTiming(1, { duration: 250 })
    } else {
      translateY.value = withSpring(sheetHeight, SPRING_CONFIG)
      backdropOpacity.value = withTiming(0, { duration: 200 })
    }
  }, [visible, sheetHeight])

  const close = useCallback(() => {
    translateY.value = withTiming(sheetHeight, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    })
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)()
    })
  }, [sheetHeight, onClose])

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, context.value + event.translationY)
    })
    .onEnd((event) => {
      if (event.translationY > sheetHeight * 0.3 || event.velocityY > 500) {
        runOnJS(close)()
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG)
      }
    })

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  if (!visible) return null

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight + insets.bottom, paddingBottom: insets.bottom },
            style,
            sheetStyle,
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          {title && (
            <Text style={styles.title}>{title}</Text>
          )}
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    zIndex: 101,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
})

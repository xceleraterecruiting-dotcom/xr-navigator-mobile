import React, { createContext, useContext, useCallback, useRef } from 'react'
import { Text, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, borderRadius, fontSize, spacing, fontFamily, shadows } from '@/constants/theme'
import { haptics } from '@/lib/haptics'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastConfig {
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  show: (message: string, type?: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({ show: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', icon: colors.success },
  error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', icon: colors.error },
  info: { bg: 'rgba(212,168,87,0.15)', border: 'rgba(212,168,87,0.3)', icon: colors.primary },
  warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: colors.warning },
}

const HAPTIC_MAP: Record<ToastType, () => Promise<void>> = {
  success: haptics.success,
  error: haptics.error,
  info: haptics.light,
  warning: haptics.warning,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const translateY = useSharedValue(-100)
  const opacity = useSharedValue(0)
  const currentToast = useRef<ToastConfig | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toast, setToast] = React.useState<ToastConfig | null>(null)

  const hide = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 250, easing: Easing.in(Easing.cubic) })
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(setToast)(null)
    })
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const config: ToastConfig = { message, type, duration }
    currentToast.current = config
    setToast(config)

    HAPTIC_MAP[type]()

    translateY.value = -100
    opacity.value = 0
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    opacity.value = withTiming(1, { duration: 300 })

    timeoutRef.current = setTimeout(hide, duration)
  }, [hide])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const toastColors = toast ? TOAST_COLORS[toast.type] : TOAST_COLORS.info

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Animated.View
        style={[
          styles.container,
          {
            top: insets.top + spacing.sm,
            backgroundColor: toastColors.bg,
            borderColor: toastColors.border,
          },
          shadows.sm,
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        {toast && (
          <>
            <Ionicons
              name={TOAST_ICONS[toast.type]}
              size={20}
              color={toastColors.icon}
            />
            <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
          </>
        )}
      </Animated.View>
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    zIndex: 9999,
  } as ViewStyle,
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
})

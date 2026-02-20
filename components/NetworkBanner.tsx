import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, fontSize, fontFamily} from '@/constants/theme'

export function NetworkBanner() {
  const insets = useSafeAreaInsets()
  const [isOffline, setIsOffline] = useState(false)
  const [slideAnim] = useState(new Animated.Value(-50))

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false)
      setIsOffline(offline)

      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })

    return unsubscribe
  }, [])

  if (!isOffline) return null

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + spacing.xs, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    zIndex: 1000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
})

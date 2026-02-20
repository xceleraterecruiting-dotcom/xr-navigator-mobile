import React, { useEffect } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated'

import { GradientButton } from '@/components/ui/GradientButton'
import { Button } from '@/components/ui/Button'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { colors, spacing, fontSize, fontFamily } from '@/constants/theme'

const TOTAL_STEPS = 6 // welcome + 5 steps

export default function OnboardingWelcome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useUser()
  const { signOut } = useAuth()
  const updateFields = useOnboardingStore((s) => s.updateFields)

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/(auth)/sign-in')
    } catch (err) {
      if (__DEV__) console.warn('Sign out failed:', err)
    }
  }

  // Animation values
  const contentOpacity = useSharedValue(0)
  const contentScale = useSharedValue(0.95)
  const buttonOpacity = useSharedValue(0)
  const buttonTranslateY = useSharedValue(20)

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) })
    contentScale.value = withSpring(1, { damping: 14, stiffness: 100 })

    buttonOpacity.value = withDelay(400, withTiming(1, { duration: 500 }))
    buttonTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 100 }))
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }))

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }))

  // Pre-fill from Clerk user data
  useEffect(() => {
    if (user) {
      const fields: Record<string, string> = {}
      if (user.firstName) fields.firstName = user.firstName
      if (user.lastName) fields.lastName = user.lastName
      if (user.primaryEmailAddress?.emailAddress) fields.email = user.primaryEmailAddress.emailAddress
      if (Object.keys(fields).length > 0) updateFields(fields)
    }
  }, [user])

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Progress dots at top */}
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === 0 && styles.dotActive]}
          />
        ))}
      </View>

      {/* Content centered */}
      <View style={styles.centerWrap}>
        <Animated.View style={[styles.block, contentStyle]}>
          <Image
            source={require('@/assets/images/xr-logo-gold.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Create Your{'\n'}Recruiting Profile</Text>

          <Text style={styles.subtitle}>
            Tell us about yourself so our AI can give you{'\n'}personalized recruiting guidance.
          </Text>

          <Text style={styles.time}>About 3 minutes</Text>
        </Animated.View>
      </View>

      {/* Button at bottom */}
      <Animated.View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }, buttonStyle]}>
        <GradientButton
          title="Get Started"
          onPress={() => router.push('/(onboarding)/step-basics')}
          fullWidth
        />
        <Button
          title="Already have an account? Sign In"
          variant="ghost"
          onPress={handleSignOut}
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
    borderRadius: 4,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  block: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 280,
    height: 180,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  time: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textDim,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
})

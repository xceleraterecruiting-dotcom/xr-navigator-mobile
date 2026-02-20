/**
 * CelebrationOverlay Component
 *
 * Full-screen celebration for major wins like first coach response
 * This is THE screenshot moment — confetti, school logo, emotional copy
 */

import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Pressable, Modal, Dimensions, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { SchoolLogo } from './SchoolLogo'
import { colors, fontFamily, spacing, borderRadius, shadows } from '@/constants/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface CelebrationCoach {
  name: string
  school: string
  division?: string
}

interface CelebrationOverlayProps {
  visible: boolean
  onClose: () => void
  coach: CelebrationCoach
  onViewReply?: () => void
  autoDismissMs?: number
}

export function CelebrationOverlay({
  visible,
  onClose,
  coach,
  onViewReply,
  autoDismissMs = 10000,
}: CelebrationOverlayProps) {
  const confettiRef = useRef<ConfettiCannon>(null)
  const backdropOpacity = useSharedValue(0)
  const contentScale = useSharedValue(0.8)
  const contentOpacity = useSharedValue(0)
  const logoScale = useSharedValue(0)
  const textOpacity = useSharedValue(0)

  // Auto dismiss timer
  useEffect(() => {
    if (visible && autoDismissMs > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, autoDismissMs)
      return () => clearTimeout(timer)
    }
  }, [visible, autoDismissMs])

  // Haptic on show
  useEffect(() => {
    if (visible) {
      // Triple haptic pulse for major celebration
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400)
    }
  }, [visible])

  // Animate in
  useEffect(() => {
    if (visible) {
      // Backdrop fade in
      backdropOpacity.value = withTiming(1, { duration: 300 })

      // Content scale + fade
      contentOpacity.value = withTiming(1, { duration: 300 })
      contentScale.value = withSpring(1, {
        damping: 12,
        stiffness: 120,
      })

      // Logo bounce in
      logoScale.value = withDelay(
        200,
        withSpring(1, {
          damping: 10,
          stiffness: 150,
        })
      )

      // Text fade in
      textOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))

      // Fire confetti
      setTimeout(() => {
        confettiRef.current?.start()
      }, 300)
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 })
      contentOpacity.value = withTiming(0, { duration: 200 })
      contentScale.value = 0.8
      logoScale.value = 0
      textOpacity.value = 0
    }
  }, [visible])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }))

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }))

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }))

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I just got a response from ${coach.name} at ${coach.school}! My recruiting journey is making progress. 🏈`,
      })
    } catch {}
  }

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={false}
          fadeOut
          fallSpeed={2500}
          explosionSpeed={350}
          colors={['#22C55E', '#EAB308', '#3B82F6', '#F97316', '#A855F7']}
        />

        <Animated.View style={[styles.content, contentStyle]}>
          {/* Celebration emoji */}
          <Text style={styles.emoji}>🎉 🎉 🎉</Text>

          {/* School logo */}
          <Animated.View style={[styles.logoContainer, logoStyle]}>
            <SchoolLogo schoolName={coach.school} size={80} />
          </Animated.View>

          {/* Headline */}
          <Animated.View style={textStyle}>
            <Text style={styles.headline}>YOU GOT A RESPONSE</Text>

            {/* Coach info */}
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.schoolName}>{coach.school}</Text>

            {/* Emotional copy */}
            <Text style={styles.message}>
              A college coach wants to talk.{'\n'}
              This is what recruiting is about.
            </Text>
          </Animated.View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={onViewReply || onClose}>
              <Text style={styles.primaryBtnText}>View Reply</Text>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </Pressable>

            <Pressable style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text style={styles.shareBtnText}>Share This Win</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
    maxWidth: 320,
  },
  emoji: {
    fontSize: 32,
    marginBottom: spacing.lg,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  headline: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: '#22C55E',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  coachName: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  schoolName: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#22C55E',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  primaryBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#000',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  shareBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.text,
  },
})

export default CelebrationOverlay

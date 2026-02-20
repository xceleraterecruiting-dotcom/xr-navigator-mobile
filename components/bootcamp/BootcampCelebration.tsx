/**
 * BootcampCelebration Component
 *
 * Celebration overlays for bootcamp milestones:
 * - First email sent ("First Contact" badge)
 * - Week completion
 * - Graduation (all 8 weeks complete)
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
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, fontFamily, spacing, borderRadius, shadows } from '@/constants/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export type CelebrationType = 'first_contact' | 'week_complete' | 'graduation'

interface BootcampCelebrationProps {
  visible: boolean
  type: CelebrationType
  weekNumber?: number
  onClose: () => void
  onContinue?: () => void
}

const CELEBRATION_CONFIG: Record<CelebrationType, {
  emoji: string
  headline: string
  subheadline: string
  message: string
  buttonText: string
  buttonColor: string
  confettiColors: string[]
}> = {
  first_contact: {
    emoji: '🎯',
    headline: 'FIRST CONTACT',
    subheadline: "You've broken the ice!",
    message: 'The first email is the hardest. You did it.\nNow keep the momentum going.',
    buttonText: 'Send More',
    buttonColor: '#F97316',
    confettiColors: ['#F97316', '#EAB308', '#22C55E'],
  },
  week_complete: {
    emoji: '✅',
    headline: 'WEEK COMPLETE',
    subheadline: 'Goal achieved!',
    message: "You crushed it. Next week is now unlocked.\nLet's keep building.",
    buttonText: 'Next Week',
    buttonColor: '#22C55E',
    confettiColors: ['#22C55E', '#3B82F6', '#A855F7'],
  },
  graduation: {
    emoji: '🎓',
    headline: 'XR GRADUATE',
    subheadline: 'You completed the XR Method!',
    message: "8 weeks of structured outreach.\n30 schools contacted. You're doing it.",
    buttonText: 'View Results',
    buttonColor: colors.primary,
    confettiColors: [colors.primary, '#22C55E', '#3B82F6', '#EC4899', '#F97316'],
  },
}

export function BootcampCelebration({
  visible,
  type,
  weekNumber,
  onClose,
  onContinue,
}: BootcampCelebrationProps) {
  const confettiRef = useRef<ConfettiCannon>(null)
  const config = CELEBRATION_CONFIG[type]

  const backdropOpacity = useSharedValue(0)
  const contentScale = useSharedValue(0.8)
  const contentOpacity = useSharedValue(0)
  const badgeScale = useSharedValue(0)
  const textOpacity = useSharedValue(0)

  // Haptic on show
  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      if (type === 'graduation') {
        // Extra haptics for graduation
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200)
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400)
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 600)
      }
    }
  }, [visible, type])

  // Animate in
  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 300 })
      contentOpacity.value = withTiming(1, { duration: 300 })
      contentScale.value = withSpring(1, { damping: 12, stiffness: 120 })
      badgeScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 150 }))
      textOpacity.value = withDelay(400, withTiming(1, { duration: 400 }))

      // Fire confetti
      setTimeout(() => {
        confettiRef.current?.start()
      }, 300)
    } else {
      backdropOpacity.value = withTiming(0, { duration: 200 })
      contentOpacity.value = withTiming(0, { duration: 200 })
      contentScale.value = 0.8
      badgeScale.value = 0
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

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }))

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }))

  const handleShare = async () => {
    let message = ''
    switch (type) {
      case 'first_contact':
        message = "I just sent my first recruiting email through the XR Method Bootcamp! The journey has begun. 🏈"
        break
      case 'week_complete':
        message = `Just completed Week ${weekNumber} of the XR Method Bootcamp! Making progress on my recruiting journey. 🏈`
        break
      case 'graduation':
        message = "I just graduated from the XR Method Bootcamp! 8 weeks of structured recruiting outreach complete. 🎓🏈"
        break
    }
    try {
      await Share.share({ message })
    } catch {}
  }

  const handleContinue = () => {
    onClose()
    onContinue?.()
  }

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          count={type === 'graduation' ? 200 : 100}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={false}
          fadeOut
          fallSpeed={2500}
          explosionSpeed={350}
          colors={config.confettiColors}
        />

        <Animated.View style={[styles.content, contentStyle]}>
          {/* Badge/Emoji */}
          <Animated.View style={[styles.badgeContainer, badgeStyle]}>
            <Text style={styles.emoji}>{config.emoji}</Text>
          </Animated.View>

          {/* Text content */}
          <Animated.View style={textStyle}>
            <Text style={[styles.headline, { color: config.buttonColor }]}>
              {config.headline}
            </Text>
            {weekNumber && type === 'week_complete' && (
              <Text style={styles.weekNumber}>Week {weekNumber}</Text>
            )}
            <Text style={styles.subheadline}>{config.subheadline}</Text>
            <Text style={styles.message}>{config.message}</Text>
          </Animated.View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: config.buttonColor }]}
              onPress={handleContinue}
            >
              <Text style={styles.primaryBtnText}>{config.buttonText}</Text>
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
  badgeContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  emoji: {
    fontSize: 48,
  },
  headline: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  weekNumber: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subheadline: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
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

export default BootcampCelebration

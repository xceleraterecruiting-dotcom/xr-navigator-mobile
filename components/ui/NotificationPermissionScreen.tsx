/**
 * NotificationPermissionScreen Component
 *
 * Pre-permission screen shown before the system prompt.
 * Explains the value of notifications to increase opt-in rate.
 */

import React from 'react'
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, fontFamily, spacing, borderRadius, shadows } from '@/constants/theme'

interface NotificationPermissionScreenProps {
  visible: boolean
  onEnable: () => void
  onSkip: () => void
}

const BENEFITS = [
  {
    icon: 'videocam' as const,
    text: 'A coach watches your film',
  },
  {
    icon: 'logo-twitter' as const,
    text: 'A coach follows you on Twitter',
  },
  {
    icon: 'chatbubble-ellipses' as const,
    text: 'A coach responds to your email',
  },
]

export function NotificationPermissionScreen({
  visible,
  onEnable,
  onSkip,
}: NotificationPermissionScreenProps) {
  const bellScale = useSharedValue(0)

  React.useEffect(() => {
    if (visible) {
      bellScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 120 }))
    } else {
      bellScale.value = 0
    }
  }, [visible])

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bellScale.value }],
  }))

  const handleEnable = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onEnable()
  }

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSkip()
  }

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View
          style={styles.content}
          entering={FadeIn.duration(300)}
        >
          {/* Bell Icon */}
          <Animated.View style={[styles.iconContainer, bellStyle]}>
            <View style={styles.iconCircle}>
              <Ionicons name="notifications" size={48} color={colors.primary} />
            </View>
          </Animated.View>

          {/* Headline */}
          <Text style={styles.headline}>Never Miss a Coach's Attention</Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <Text style={styles.benefitsLabel}>Get notified instantly when:</Text>
            {BENEFITS.map((benefit, index) => (
              <Animated.View
                key={benefit.text}
                style={styles.benefitRow}
                entering={FadeIn.delay(300 + index * 100).duration(300)}
              >
                <View style={styles.checkCircle}>
                  <Ionicons name={benefit.icon} size={14} color={colors.primary} />
                </View>
                <Text style={styles.benefitText}>{benefit.text}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Social proof */}
          <View style={styles.proofContainer}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
            <Text style={styles.proofText}>
              Athletes with notifications on respond{' '}
              <Text style={styles.proofHighlight}>3x faster</Text> to coach interest.
            </Text>
          </View>

          {/* Actions */}
          <Pressable style={styles.enableBtn} onPress={handleEnable}>
            <Ionicons name="notifications" size={20} color="#000" />
            <Text style={styles.enableBtnText}>Enable Notifications</Text>
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },

  // Icon
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(200,165,77,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(200,165,77,0.3)',
  },

  // Headline
  headline: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 0.3,
  },

  // Benefits
  benefitsList: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  benefitsLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200,165,77,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },

  // Social proof
  proofContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  proofText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  proofHighlight: {
    fontFamily: fontFamily.bold,
    color: colors.success,
  },

  // Buttons
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  enableBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: '#000',
  },
  skipBtn: {
    paddingVertical: spacing.md,
  },
  skipBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
})

export default NotificationPermissionScreen

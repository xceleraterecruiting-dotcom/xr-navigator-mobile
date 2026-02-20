/**
 * NextBestMoveCard Component
 *
 * AI-generated, contextual action recommendation
 * The app feels intelligent — one card tells you what to do next
 */

import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { colors, fontFamily, spacing, borderRadius, shadows } from '@/constants/theme'

// Priority types for Next Best Move
export type MoveType =
  | 'response'      // Coach responded - celebration!
  | 'follower'      // Coach followed on Twitter
  | 'hot_click'     // Coach clicked 2x+
  | 'click'         // Coach clicked once
  | 'hot_open'      // Coach opened 2x+ without click
  | 'follow_up'     // 5+ days since contact
  | 'start'         // No outreach yet

interface MoveCoach {
  id: string
  name: string
  school: string
  title?: string | null
  division?: string | null
}

interface NextBestMove {
  type: MoveType
  coach: MoveCoach | null
  savedCoachId?: string
  message: string
  actionLabel: string
  actionRoute: string
  priority: number
}

// Visual config for each move type
const MOVE_CONFIG: Record<MoveType, {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bgColor: string
  borderColor: string
  badge?: string
  badgeColor?: string
  shouldPulse?: boolean
  haptic?: boolean
}> = {
  response: {
    icon: 'chatbubble-ellipses',
    color: '#22C55E',
    bgColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.4)',
    badge: 'NEW REPLY',
    badgeColor: '#22C55E',
    shouldPulse: true,
    haptic: true,
  },
  follower: {
    icon: 'logo-twitter',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.4)',
    badge: 'NEW FOLLOW',
    badgeColor: '#3B82F6',
    haptic: true,
  },
  hot_click: {
    icon: 'flame',
    color: '#F97316',
    bgColor: 'rgba(249,115,22,0.1)',
    borderColor: 'rgba(249,115,22,0.4)',
    badge: 'HOT LEAD',
    badgeColor: '#F97316',
    shouldPulse: true,
    haptic: true,
  },
  click: {
    icon: 'eye',
    color: '#EAB308',
    bgColor: 'rgba(234,179,8,0.1)',
    borderColor: 'rgba(234,179,8,0.4)',
    badge: 'WATCHED FILM',
    badgeColor: '#EAB308',
  },
  hot_open: {
    icon: 'mail-open',
    color: '#EAB308',
    bgColor: 'rgba(234,179,8,0.1)',
    borderColor: 'rgba(234,179,8,0.4)',
    badge: 'OPENED 2X',
    badgeColor: '#EAB308',
  },
  follow_up: {
    icon: 'time',
    color: colors.textMuted,
    bgColor: colors.surface,
    borderColor: colors.border,
  },
  start: {
    icon: 'rocket',
    color: colors.primary,
    bgColor: 'rgba(200,165,77,0.1)',
    borderColor: 'rgba(200,165,77,0.3)',
  },
}

interface NextBestMoveCardProps {
  data: NextBestMove | null
  isLoading?: boolean
  onAction?: () => void
  onDismiss?: () => void
  onCelebrate?: (coach: { name: string; school: string; division?: string }) => void
}

export function NextBestMoveCard({
  data: move,
  isLoading = false,
  onAction,
  onDismiss,
  onCelebrate,
}: NextBestMoveCardProps) {
  const router = useRouter()
  const pulseAnim = useSharedValue(1)
  const borderAnim = useSharedValue(0)

  const config = move ? MOVE_CONFIG[move.type] : MOVE_CONFIG.start

  // Trigger celebration for first response
  useEffect(() => {
    if (move?.type === 'response' && move.coach && onCelebrate) {
      onCelebrate({
        name: move.coach.name,
        school: move.coach.school,
        division: move.coach.division ?? undefined,
      })
    }
  }, [move?.type, move?.coach?.id])

  // Pulse animation for high-priority items
  useEffect(() => {
    if (config.shouldPulse) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )

      // Fire border glow animation
      borderAnim.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        true
      )
    } else {
      pulseAnim.value = 1
      borderAnim.value = 0
    }
  }, [move?.type])

  // Haptic on first appear for priority 1-3
  useEffect(() => {
    if (move && config.haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
  }, [move?.type, move?.coach?.id])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }))

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onAction?.()

    if (move?.actionRoute) {
      if (move.actionRoute.startsWith('http')) {
        Linking.openURL(move.actionRoute)
      } else {
        router.push(move.actionRoute as any)
      }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIcon} />
          <View style={styles.loadingText} />
        </View>
      </View>
    )
  }

  // Empty state - no move available
  if (!move) {
    return (
      <Pressable
        style={[styles.card, { borderColor: config.borderColor, backgroundColor: config.bgColor }]}
        onPress={() => router.push('/(tabs)/coaches')}
      >
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.textContent}>
            <Text style={styles.message}>Start reaching out to coaches to unlock personalized recruiting intelligence</Text>
          </View>
        </View>
        <Pressable style={[styles.actionBtn, { backgroundColor: config.color }]} onPress={() => router.push('/(tabs)/coaches')}>
          <Text style={styles.actionBtnText}>Find Coaches</Text>
          <Ionicons name="chevron-forward" size={16} color="#000" />
        </Pressable>
      </Pressable>
    )
  }

  return (
    <Animated.View style={pulseStyle}>
      <View style={[styles.card, { borderColor: config.borderColor, backgroundColor: config.bgColor }]}>
        {/* Badge */}
        {config.badge && (
          <View style={[styles.badge, { backgroundColor: `${config.badgeColor}22` }]}>
            {config.icon === 'flame' && (
              <Ionicons name="flame" size={12} color={config.badgeColor} style={{ marginRight: 4 }} />
            )}
            <Text style={[styles.badgeText, { color: config.badgeColor }]}>{config.badge}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: `${config.color}22` }]}>
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>

          {/* Message */}
          <View style={styles.textContent}>
            <Text style={styles.message}>{move.message}</Text>
            {move.coach && (
              <Text style={styles.coachInfo}>
                {move.coach.name} • {move.coach.school}
              </Text>
            )}
          </View>
        </View>

        {/* Action button */}
        <Pressable
          style={[styles.actionBtn, { backgroundColor: config.color }]}
          onPress={handleAction}
        >
          <Text style={styles.actionBtnText}>{move.actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color="#000" />
        </Pressable>

        {/* Dismiss button for dismissible moves */}
        {onDismiss && move.type !== 'start' && (
          <Pressable style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Not this coach</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  loadingText: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  message: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  coachInfo: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Action button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#000',
  },

  // Dismiss
  dismissBtn: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dismissText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
})

export default NextBestMoveCard

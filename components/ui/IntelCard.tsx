/**
 * IntelCard Component
 *
 * Live Intel event card with single CTA
 * Shows coach activity (opened email, viewed profile, etc.)
 */

import React from 'react'
import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import Animated from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontFamily, spacing, borderRadius } from '@/constants/theme'
import { useStaggeredEntry, useButtonPress } from '@/lib/animations'

// Event types
type IntelEventType =
  | 'email_opened'
  | 'email_replied'
  | 'email_clicked'
  | 'profile_view'
  | 'twitter_follow'
  | 'twitter_reply'

interface IntelEvent {
  id: string
  type: IntelEventType
  coachName: string | null
  school: string | null
  schoolLogo?: string | null
  division?: string | null
  timestamp: Date | string
  description: string
  cta: {
    label: string
    action: string
    color: 'accent' | 'success' | 'info' | 'ghost'
  }
}

interface IntelCardProps {
  event: IntelEvent
  index: number
  isVisible?: boolean
  onCTAPress?: (action: string, event: IntelEvent) => void
}

// Get icon for event type
function getEventIcon(type: IntelEventType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'email_opened':
      return 'mail-open'
    case 'email_replied':
      return 'chatbubble'
    case 'email_clicked':
      return 'link'
    case 'profile_view':
      return 'eye'
    case 'twitter_follow':
      return 'logo-twitter'
    case 'twitter_reply':
      return 'chatbubbles'
    default:
      return 'notifications'
  }
}

// Get CTA button color
function getCTAColor(color: IntelEvent['cta']['color']): string {
  switch (color) {
    case 'accent':
      return colors.accent
    case 'success':
      return colors.success
    case 'info':
      return colors.info
    case 'ghost':
    default:
      return colors.textTertiary
  }
}

// Format relative time
function getTimeAgo(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function IntelCard({
  event,
  index,
  isVisible = true,
  onCTAPress,
}: IntelCardProps) {
  const staggerStyle = useStaggeredEntry(index, isVisible)
  const { animatedStyle: buttonStyle, onPressIn, onPressOut } = useButtonPress()

  const ctaColor = getCTAColor(event.cta.color)
  const isGhost = event.cta.color === 'ghost'

  return (
    <Animated.View style={[styles.container, staggerStyle]}>
      {/* Left: Icon or Logo */}
      <View style={styles.iconContainer}>
        {event.schoolLogo ? (
          <Image source={{ uri: event.schoolLogo }} style={styles.logo} />
        ) : (
          <View style={styles.iconCircle}>
            <Ionicons
              name={getEventIcon(event.type)}
              size={16}
              color={colors.accent}
            />
          </View>
        )}
      </View>

      {/* Middle: Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.coachName} numberOfLines={1}>
            {event.coachName || event.school || 'Unknown'}
          </Text>
          <Text style={styles.timeAgo}>{getTimeAgo(event.timestamp)}</Text>
        </View>
        {event.school && event.coachName && (
          <Text style={styles.school} numberOfLines={1}>
            {event.school}
          </Text>
        )}
        <Text style={styles.description}>{event.description}</Text>
      </View>

      {/* Right: CTA */}
      <Pressable
        onPress={() => onCTAPress?.(event.cta.action, event)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.ctaButton,
          isGhost ? styles.ctaGhost : { backgroundColor: ctaColor },
        ]}
        accessibilityLabel={`${event.cta.label} for ${event.coachName}`}
        accessibilityRole="button"
      >
        <Animated.View style={buttonStyle}>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={isGhost ? colors.textTertiary : colors.void}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

// Live Intel section header with pulsing dot
interface LiveIntelHeaderProps {
  count: number
}

export function LiveIntelHeader({ count }: LiveIntelHeaderProps) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <View style={styles.pulseDot} />
        <Text style={styles.headerTitle}>LIVE INTEL</Text>
      </View>
      {count > 0 && (
        <Text style={styles.headerCount}>{count} new</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachName: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  timeAgo: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },
  school: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textTertiary,
  },
  ctaButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaGhost: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Header styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  headerCount: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.success,
  },
})

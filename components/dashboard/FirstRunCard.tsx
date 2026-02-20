/**
 * FirstRunCard Component
 *
 * Shown on dashboard when user hasn't sent any outreach yet.
 * Guides them through the first steps of using the app.
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInUp } from 'react-native-reanimated'

import { colors, spacing, borderRadius, fontFamily, fontSize, cardStyles } from '@/constants/theme'
import { getFirstRunAction } from '@/lib/progressiveDisclosure'
import { useButtonPress } from '@/lib/animations'
import { haptics } from '@/lib/haptics'

interface FirstRunCardProps {
  savedCount: number
  hasEmail: boolean
  hasTwitter: boolean
  onAction: (action: 'search' | 'email' | 'dm' | 'connect') => void
}

export function FirstRunCard({
  savedCount,
  hasEmail,
  hasTwitter,
  onAction,
}: FirstRunCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = useButtonPress()
  const action = getFirstRunAction(savedCount, hasEmail, hasTwitter)

  const handlePress = () => {
    haptics.light()
    onAction(action.action)
  }

  // Get icon component
  const getIcon = () => {
    switch (action.icon) {
      case 'search':
        return <Ionicons name="search" size={32} color={colors.accent} />
      case 'mail':
        return <Ionicons name="mail" size={32} color={colors.accent} />
      case 'send':
        return <Ionicons name="send" size={32} color={colors.accent} />
      case 'logo-twitter':
        return <Text style={styles.twitterIcon}>𝕏</Text>
      default:
        return <Ionicons name="rocket" size={32} color={colors.accent} />
    }
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(200)}
      style={styles.container}
    >
      {/* Accent border glow */}
      <View style={styles.glowBorder} />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{action.title}</Text>
          <Text style={styles.description}>{action.description}</Text>
        </View>

        {/* CTA Button */}
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={action.ctaLabel}
          >
            <Text style={styles.ctaText}>{action.ctaLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressDots}>
          <View style={[styles.progressDot, savedCount >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressDot, hasEmail && styles.progressDotActive]} />
          <View style={[styles.progressDot, savedCount >= 1 && hasEmail && styles.progressDotActive]} />
        </View>
        <Text style={styles.progressText}>
          {savedCount === 0 && 'Step 1: Find coaches'}
          {savedCount > 0 && !hasEmail && 'Step 2: Connect email'}
          {savedCount > 0 && hasEmail && 'Step 3: Send your first message'}
        </Text>
      </View>
    </Animated.View>
  )
}

/**
 * Compact version for smaller screens
 */
export function FirstRunCardCompact({
  onAction,
}: {
  onAction: (action: 'search') => void
}) {
  return (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={() => {
        haptics.light()
        onAction('search')
      }}
      activeOpacity={0.8}
    >
      <Ionicons name="rocket" size={20} color={colors.accent} />
      <Text style={styles.compactText}>Start your recruiting journey</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.6,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twitterIcon: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
    color: colors.accent,
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.void,
    letterSpacing: 0.5,
  },
  progressContainer: {
    backgroundColor: colors.elevated,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.disabled,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },

  // Compact version
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compactText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
})

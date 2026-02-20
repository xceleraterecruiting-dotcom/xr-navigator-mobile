/**
 * ErrorState Component
 *
 * Consistent error display pattern with CTAs.
 * Uses error microcopy from lib/errorStates.ts
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { colors, spacing, borderRadius, fontFamily, fontSize } from '@/constants/theme'
import {
  EMAIL_ERRORS,
  TWITTER_ERRORS,
  COACH_STATES,
  NETWORK_ERRORS,
  EMPTY_STATES,
  type ErrorWithCTA,
} from '@/lib/errorStates'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ErrorCategory = 'email' | 'twitter' | 'coach' | 'network' | 'empty'

interface ErrorStateProps {
  /** Error category */
  category: ErrorCategory
  /** Specific error type within category */
  type: string
  /** Context for dynamic messages (e.g., email address) */
  context?: string
  /** CTA action handler */
  onAction?: () => void
  /** Show icon */
  showIcon?: boolean
  /** Custom icon name */
  icon?: keyof typeof Ionicons.glyphMap
  /** Compact mode for inline errors */
  compact?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Lookups
// ─────────────────────────────────────────────────────────────────────────────

const ERROR_MAPS: Record<ErrorCategory, Record<string, ErrorWithCTA>> = {
  email: EMAIL_ERRORS,
  twitter: TWITTER_ERRORS,
  coach: COACH_STATES,
  network: NETWORK_ERRORS,
  empty: EMPTY_STATES,
}

const CATEGORY_ICONS: Record<ErrorCategory, keyof typeof Ionicons.glyphMap> = {
  email: 'mail-outline',
  twitter: 'logo-twitter',
  coach: 'person-outline',
  network: 'cloud-offline-outline',
  empty: 'folder-open-outline',
}

const CTA_COLORS: Record<string, string> = {
  warning: colors.warning,
  success: colors.success,
  info: colors.info,
  accent: colors.accent,
  ghost: colors.textSecondary,
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ErrorState({
  category,
  type,
  context,
  onAction,
  showIcon = true,
  icon,
  compact = false,
}: ErrorStateProps) {
  const errorMap = ERROR_MAPS[category]
  const error = errorMap?.[type]

  if (!error) {
    if (__DEV__) {
      console.warn(`[ErrorState] Unknown error type: ${category}.${type}`)
    }
    return null
  }

  // Get message (handle function messages)
  const message =
    typeof error.message === 'function' ? error.message(context || '') : error.message

  // Get CTA color
  const ctaColor = error.ctaColor ? CTA_COLORS[error.ctaColor] : colors.textSecondary

  // Get icon
  const iconName = icon || CATEGORY_ICONS[category]

  if (compact) {
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
        <View style={styles.compactContainer}>
          {showIcon && (
            <Ionicons
              name={iconName}
              size={14}
              color={colors.warning}
              style={styles.compactIcon}
            />
          )}
          <Text style={styles.compactMessage} numberOfLines={2}>
            {message}
          </Text>
          {error.cta && onAction && (
            <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
              <Text style={[styles.compactCta, { color: ctaColor }]}>{error.cta}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    )
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      {showIcon && (
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={32} color={colors.textTertiary} />
        </View>
      )}

      <Text style={styles.message}>{message}</Text>

      {error.cta && onAction && (
        <TouchableOpacity
          style={[styles.ctaButton, { borderColor: ctaColor }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.ctaText, { color: ctaColor }]}>{error.cta}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Error Banner
// ─────────────────────────────────────────────────────────────────────────────

interface InlineErrorProps {
  message: string
  type?: 'warning' | 'error' | 'info'
  onDismiss?: () => void
}

export function InlineError({ message, type = 'warning', onDismiss }: InlineErrorProps) {
  const color =
    type === 'error' ? colors.error : type === 'info' ? colors.info : colors.warning

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.inlineContainer, { borderLeftColor: color }]}
    >
      <Ionicons
        name={type === 'error' ? 'alert-circle' : type === 'info' ? 'information-circle' : 'warning'}
        size={16}
        color={color}
        style={styles.inlineIcon}
      />
      <Text style={styles.inlineMessage}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  type: keyof typeof EMPTY_STATES
  onAction?: () => void
  customIcon?: keyof typeof Ionicons.glyphMap
}

export function EmptyState({ type, onAction, customIcon }: EmptyStateProps) {
  return (
    <ErrorState
      category="empty"
      type={type}
      onAction={onAction}
      icon={customIcon}
      showIcon
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },
  iconContainer: {
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  message: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  ctaButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  ctaText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: `${colors.warning}10`,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  compactIcon: {
    marginRight: spacing.xs,
  },
  compactMessage: {
    flex: 1,
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
  compactCta: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    marginLeft: spacing.sm,
  },

  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  inlineIcon: {
    marginRight: spacing.sm,
  },
  inlineMessage: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
  },
})

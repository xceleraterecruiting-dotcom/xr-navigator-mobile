import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, borderRadius, spacing, fontSize } from '@/constants/theme'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'primary'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  style?: ViewStyle
}

export function Badge({ label, variant = 'default', style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles]]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  success: {
    backgroundColor: `${colors.success}20`,
  },
  warning: {
    backgroundColor: `${colors.warning}20`,
  },
  error: {
    backgroundColor: `${colors.error}20`,
  },
  primary: {
    backgroundColor: `${colors.primary}20`,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  defaultText: {
    color: colors.textMuted,
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
  errorText: {
    color: colors.error,
  },
  primaryText: {
    color: colors.primary,
  },
})

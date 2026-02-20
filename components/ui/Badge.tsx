import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, borderRadius, spacing, fontSize, fontFamily } from '@/constants/theme'

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
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  success: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
  },
  warning: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  error: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  primary: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  text: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
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

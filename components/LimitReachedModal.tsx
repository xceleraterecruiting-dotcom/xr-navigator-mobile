import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

import { Button } from '@/components/ui/Button'
import { colors, spacing, fontSize, borderRadius, fontFamily} from '@/constants/theme'

interface LimitReachedModalProps {
  message: string
  visible: boolean
  onDismiss: () => void
}

/**
 * Limit reached modal - currently disabled (no limits during free period)
 *
 * During the free launch period, there are no usage limits.
 * This component never renders anything.
 */
export function LimitReachedModal({ message, visible, onDismiss }: LimitReachedModalProps) {
  // No limits during free period - never show this modal
  return null
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  icon: {
    fontSize: 40,
    color: colors.warning,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  dismissText: {
    fontSize: fontSize.sm,
    color: colors.textDim,
  },
})

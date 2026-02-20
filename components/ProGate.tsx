import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useIsPro } from '@/stores/subscriptionStore'
import { colors, spacing, fontSize, fontFamily} from '@/constants/theme'

interface ProGateProps {
  /** What to render when user is Pro */
  children: React.ReactNode
  /** Feature name shown in the upgrade prompt */
  feature?: string
}

/**
 * Pro feature gate - currently disabled (everything is free)
 *
 * All features are available to all users during the free launch period.
 * This component simply renders its children without any restrictions.
 */
export function ProGate({ children, feature }: ProGateProps) {
  // Everything is free for now - always show children
  return <>{children}</>
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    fontSize: 40,
    color: colors.primary,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
})

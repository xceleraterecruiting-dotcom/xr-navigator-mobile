/**
 * HeroName Component
 *
 * Large display name with Bebas Neue font for dashboard header
 * Spec: 52px name, split across two lines
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fontFamily, spacing } from '@/constants/theme'

interface HeroNameProps {
  firstName: string
  lastName: string
  position?: string
  gradYear?: number
  school?: string
}

export function HeroName({
  firstName,
  lastName,
  position,
  gradYear,
  school,
}: HeroNameProps) {
  // Build subtitle
  const subtitleParts: string[] = []
  if (position) subtitleParts.push(position)
  if (gradYear) subtitleParts.push(`Class of ${gradYear}`)
  const subtitle = subtitleParts.join(' · ')

  return (
    <View style={styles.container}>
      <Text
        style={styles.firstName}
        accessibilityRole="header"
        accessibilityLabel={`${firstName} ${lastName}`}
      >
        {firstName.toUpperCase()}
      </Text>
      <Text style={styles.lastName}>{lastName.toUpperCase()}</Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {school && (
        <Text style={styles.school}>{school}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  firstName: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 52,
    color: colors.text,
    letterSpacing: 1,
  },
  lastName: {
    fontFamily: fontFamily.display,
    fontSize: 52,
    lineHeight: 52,
    color: colors.text,
    letterSpacing: 1,
    marginTop: -8, // Tighten line spacing
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  school: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
})

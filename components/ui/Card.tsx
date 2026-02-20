import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native'
import { colors, borderRadius, spacing, shadows } from '@/constants/theme'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  noPadding?: boolean
  elevated?: boolean
}

export function Card({ children, style, onPress, noPadding, elevated }: CardProps) {
  const cardContent = (
    <View style={[styles.card, elevated && styles.elevated, noPadding && styles.noPadding, style]}>
      {children}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        {cardContent}
      </TouchableOpacity>
    )
  }

  return cardContent
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
    ...shadows.md,
  },
  noPadding: {
    padding: 0,
  },
  touchable: {
    overflow: 'hidden',
  },
})

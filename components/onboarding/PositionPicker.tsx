import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, borderRadius, spacing, fontSize, fontFamily } from '@/constants/theme'
import { haptics } from '@/lib/haptics'

const POSITIONS = [
  { key: 'QB', label: 'Quarterback' },
  { key: 'RB', label: 'Running Back' },
  { key: 'WR', label: 'Wide Receiver' },
  { key: 'TE', label: 'Tight End' },
  { key: 'OL', label: 'Offensive Line' },
  { key: 'DL', label: 'Defensive Line' },
  { key: 'EDGE', label: 'Edge Rusher' },
  { key: 'LB', label: 'Linebacker' },
  { key: 'CB', label: 'Cornerback' },
  { key: 'S', label: 'Safety' },
  { key: 'K', label: 'Kicker' },
  { key: 'P', label: 'Punter' },
  { key: 'LS', label: 'Long Snapper' },
  { key: 'ATH', label: 'Athlete' },
]

interface PositionPickerProps {
  value: string
  onChange: (value: string) => void
}

export function PositionPicker({ value, onChange }: PositionPickerProps) {
  return (
    <View style={styles.grid}>
      {POSITIONS.map((pos) => {
        const selected = value === pos.key
        return (
          <TouchableOpacity
            key={pos.key}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => {
              haptics.light()
              onChange(pos.key)
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipKey, selected && styles.chipKeySelected]}>{pos.key}</Text>
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{pos.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    width: '31%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipKey: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  chipKeySelected: {
    color: colors.primary,
  },
  chipLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
    marginTop: 2,
  },
  chipLabelSelected: {
    color: colors.primary,
  },
})

import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, divisionColors, borderRadius, spacing, fontSize, fontFamily } from '@/constants/theme'
import { haptics } from '@/lib/haptics'

const DIVISIONS = [
  { key: 'D1_FBS_P4', label: 'D1 FBS P4', subtitle: 'Power 4' },
  { key: 'D1_FBS_G5', label: 'D1 FBS G5', subtitle: 'Group of 5' },
  { key: 'D1_FCS', label: 'D1 FCS', subtitle: 'FCS' },
  { key: 'D2', label: 'Division 2', subtitle: 'D2' },
  { key: 'D3', label: 'Division 3', subtitle: 'D3' },
  { key: 'NAIA', label: 'NAIA', subtitle: 'NAIA' },
  { key: 'JUCO', label: 'JUCO', subtitle: 'Junior College' },
]

interface DivisionPickerProps {
  value: string
  onChange: (value: string) => void
}

export function DivisionPicker({ value, onChange }: DivisionPickerProps) {
  return (
    <View style={styles.grid}>
      {DIVISIONS.map((div) => {
        const selected = value === div.key
        const divColor = divisionColors[div.key] || divisionColors.NAIA
        return (
          <TouchableOpacity
            key={div.key}
            style={[
              styles.chip,
              selected && { borderColor: divColor.border, backgroundColor: divColor.bg },
            ]}
            onPress={() => {
              haptics.light()
              onChange(div.key)
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipLabel, selected && { color: divColor.text }]}>
              {div.label}
            </Text>
            <Text style={[styles.chipSubtitle, selected && { color: divColor.text, opacity: 0.8 }]}>
              {div.subtitle}
            </Text>
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
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  chipSubtitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
    marginTop: 2,
  },
})

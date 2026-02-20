import React, { useState } from 'react'
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native'
import { colors, borderRadius, spacing, fontSize, fontFamily } from '@/constants/theme'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { haptics } from '@/lib/haptics'

// Generate heights from 4'10" to 7'0"
const HEIGHTS: { inches: number; label: string }[] = []
for (let feet = 4; feet <= 7; feet++) {
  const startInch = feet === 4 ? 10 : 0
  const endInch = feet === 7 ? 0 : 11
  for (let inch = startInch; inch <= endInch; inch++) {
    HEIGHTS.push({
      inches: feet * 12 + inch,
      label: `${feet}'${inch}"`,
    })
  }
}

interface HeightPickerProps {
  value: string // inches as string
  onChange: (inches: string) => void
}

export function HeightPicker({ value, onChange }: HeightPickerProps) {
  const [visible, setVisible] = useState(false)

  const selectedLabel = value
    ? HEIGHTS.find(h => h.inches === parseInt(value, 10))?.label || 'Select height'
    : 'Select height'

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, value ? styles.triggerSelected : undefined]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {selectedLabel}
        </Text>
      </TouchableOpacity>

      <BottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
        snapPoint={0.5}
        title="Select Height"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {HEIGHTS.map((item) => {
            const selected = value === String(item.inches)
            return (
              <TouchableOpacity
                key={item.inches}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => {
                  haptics.light()
                  onChange(String(item.inches))
                  setVisible(false)
                }}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  triggerSelected: {
    borderColor: colors.borderAccent,
  },
  triggerText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  triggerPlaceholder: {
    color: colors.textDim,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
})

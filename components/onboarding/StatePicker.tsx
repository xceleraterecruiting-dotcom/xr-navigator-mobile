import React, { useState, useMemo } from 'react'
import { View, TouchableOpacity, Text, TextInput, StyleSheet, ScrollView } from 'react-native'
import { colors, borderRadius, spacing, fontSize, fontFamily } from '@/constants/theme'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { haptics } from '@/lib/haptics'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

interface StatePickerProps {
  value: string
  onChange: (value: string) => void
}

export function StatePicker({ value, onChange }: StatePickerProps) {
  const [visible, setVisible] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return US_STATES
    const q = search.toLowerCase()
    return US_STATES.filter(s =>
      s.toLowerCase().includes(q) || STATE_NAMES[s].toLowerCase().includes(q)
    )
  }, [search])

  const displayValue = value ? `${STATE_NAMES[value]} (${value})` : 'Select state'

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, value ? styles.triggerSelected : undefined]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {displayValue}
        </Text>
      </TouchableOpacity>

      <BottomSheet
        visible={visible}
        onClose={() => { setVisible(false); setSearch('') }}
        snapPoint={0.6}
        title="Select State"
      >
        <TextInput
          style={styles.searchInput}
          placeholder="Search states..."
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.map((item) => {
            const selected = value === item
            return (
              <TouchableOpacity
                key={item}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => {
                  haptics.light()
                  onChange(item)
                  setVisible(false)
                  setSearch('')
                }}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {STATE_NAMES[item]}
                </Text>
                <Text style={[styles.optionAbbr, selected && styles.optionAbbrSelected]}>
                  {item}
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
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.text,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
  },
  optionAbbr: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
  },
  optionAbbrSelected: {
    color: colors.primary,
  },
})

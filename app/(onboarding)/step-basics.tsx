import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input } from '@/components/ui/Input'
import { GradientButton } from '@/components/ui/GradientButton'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { PositionPicker } from '@/components/onboarding/PositionPicker'
import { StatePicker } from '@/components/onboarding/StatePicker'
import { useOnboardingStore, validateStep1 } from '@/stores/onboardingStore'
import { useToast } from '@/components/ui/Toast'
import { haptics } from '@/lib/haptics'
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme'

const GRAD_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030']

export default function StepBasics() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { formData, updateField } = useOnboardingStore()

  const handleNext = () => {
    const error = validateStep1(formData)
    if (error) {
      toast.show(error, 'error')
      haptics.error()
      return
    }
    router.push('/(onboarding)/step-academics')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingProgress currentStep={1} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>The Basics</Text>
        <Text style={styles.subtitle}>Let's start with who you are</Text>

        <Input
          label="First Name"
          placeholder="Enter first name"
          value={formData.firstName}
          onChangeText={(v) => updateField('firstName', v)}
          autoCapitalize="words"
        />

        <Input
          label="Last Name"
          placeholder="Enter last name"
          value={formData.lastName}
          onChangeText={(v) => updateField('lastName', v)}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Position</Text>
        <PositionPicker
          value={formData.position}
          onChange={(v) => updateField('position', v)}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Graduation Year</Text>
        <View style={styles.yearRow}>
          {GRAD_YEARS.map((year) => {
            const selected = formData.gradYear === year
            return (
              <TouchableOpacity
                key={year}
                style={[styles.yearChip, selected && styles.yearChipSelected]}
                onPress={() => { haptics.light(); updateField('gradYear', year) }}
                activeOpacity={0.7}
              >
                <Text style={[styles.yearText, selected && styles.yearTextSelected]}>
                  {year}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Input
          label="High School"
          placeholder="Enter high school name"
          value={formData.highSchoolName}
          onChangeText={(v) => updateField('highSchoolName', v)}
          autoCapitalize="words"
        />

        <Input
          label="City"
          placeholder="Enter city"
          value={formData.city}
          onChangeText={(v) => updateField('city', v)}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>State</Text>
        <StatePicker
          value={formData.state}
          onChange={(v) => updateField('state', v)}
        />

        {/* Age confirmation */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => { haptics.light(); updateField('ageConfirmation', !formData.ageConfirmation) }}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.ageConfirmation && styles.checkboxChecked]}>
            {formData.ageConfirmation && (
              <Text style={styles.checkboxMark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I confirm I am 13 years of age or older
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <GradientButton title="Next" onPress={handleNext} fullWidth />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    marginBottom: spacing.xs,
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  yearChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  yearChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  yearText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  yearTextSelected: {
    color: colors.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 20,
  },
  buttonRow: {
    marginTop: spacing.md,
  },
})

import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input } from '@/components/ui/Input'
import { GradientButton } from '@/components/ui/GradientButton'
import { Button } from '@/components/ui/Button'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { HeightPicker } from '@/components/onboarding/HeightPicker'
import { useOnboardingStore, validateStep3 } from '@/stores/onboardingStore'
import { useToast } from '@/components/ui/Toast'
import { haptics } from '@/lib/haptics'
import { colors, spacing, fontSize, fontFamily } from '@/constants/theme'

export default function StepMeasurables() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { formData, updateField } = useOnboardingStore()

  const handleNext = () => {
    const error = validateStep3(formData)
    if (error) {
      toast.show(error, 'error')
      haptics.error()
      return
    }
    router.push('/(onboarding)/step-recruiting')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingProgress currentStep={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Measurables</Text>
        <Text style={styles.subtitle}>Your physical profile</Text>

        <Text style={styles.fieldLabel}>Height</Text>
        <HeightPicker
          value={formData.heightInches}
          onChange={(v) => updateField('heightInches', v)}
        />

        <Input
          label="Weight (lbs)"
          placeholder="e.g. 185"
          value={formData.weightLbs}
          onChangeText={(v) => updateField('weightLbs', v)}
          keyboardType="number-pad"
          containerStyle={{ marginTop: spacing.md }}
        />

        <Input
          label="40 Yard Dash (optional)"
          placeholder="e.g. 4.6"
          value={formData.fortyYardDash}
          onChangeText={(v) => updateField('fortyYardDash', v)}
          keyboardType="decimal-pad"
        />

        <Input
          label="Bench Press (optional)"
          placeholder="e.g. 225"
          value={formData.benchPress}
          onChangeText={(v) => updateField('benchPress', v)}
          keyboardType="number-pad"
        />

        <Input
          label="Squat (optional)"
          placeholder="e.g. 315"
          value={formData.squat}
          onChangeText={(v) => updateField('squat', v)}
          keyboardType="number-pad"
        />

        <View style={styles.buttonRow}>
          <Button
            title="Back"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
          <GradientButton title="Next" onPress={handleNext} style={styles.nextBtn} />
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
})

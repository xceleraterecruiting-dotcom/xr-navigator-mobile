import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input } from '@/components/ui/Input'
import { GradientButton } from '@/components/ui/GradientButton'
import { Button } from '@/components/ui/Button'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { useOnboardingStore, validateStep2 } from '@/stores/onboardingStore'
import { useToast } from '@/components/ui/Toast'
import { haptics } from '@/lib/haptics'
import { colors, spacing, fontSize, fontFamily } from '@/constants/theme'

export default function StepAcademics() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { formData, updateField } = useOnboardingStore()

  const handleNext = () => {
    const error = validateStep2(formData)
    if (error) {
      toast.show(error, 'error')
      haptics.error()
      return
    }
    router.push('/(onboarding)/step-measurables')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingProgress currentStep={2} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Academics</Text>
        <Text style={styles.subtitle}>Grades matter in recruiting</Text>

        <Input
          label="GPA"
          placeholder="e.g. 3.5"
          value={formData.gpa}
          onChangeText={(v) => updateField('gpa', v)}
          keyboardType="decimal-pad"
        />

        <Input
          label="SAT Score (optional)"
          placeholder="e.g. 1200"
          value={formData.satScore}
          onChangeText={(v) => updateField('satScore', v)}
          keyboardType="number-pad"
        />

        <Input
          label="ACT Score (optional)"
          placeholder="e.g. 25"
          value={formData.actScore}
          onChangeText={(v) => updateField('actScore', v)}
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

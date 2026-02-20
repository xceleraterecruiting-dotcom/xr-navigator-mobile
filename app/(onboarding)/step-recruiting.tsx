import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input } from '@/components/ui/Input'
import { GradientButton } from '@/components/ui/GradientButton'
import { Button } from '@/components/ui/Button'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { DivisionPicker } from '@/components/onboarding/DivisionPicker'
import { useOnboardingStore, validateStep4 } from '@/stores/onboardingStore'
import { useToast } from '@/components/ui/Toast'
import { haptics } from '@/lib/haptics'
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme'

export default function StepRecruiting() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { formData, updateField } = useOnboardingStore()

  const handleNext = () => {
    const error = validateStep4(formData)
    if (error) {
      toast.show(error, 'error')
      haptics.error()
      return
    }
    router.push('/(onboarding)/step-contact')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingProgress currentStep={4} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Recruiting</Text>
        <Text style={styles.subtitle}>Your recruiting goals and experience</Text>

        <Text style={styles.fieldLabel}>Target Level</Text>
        <DivisionPicker
          value={formData.targetLevel}
          onChange={(v) => updateField('targetLevel', v)}
        />

        <Input
          label="Film Link (optional)"
          placeholder="https://www.hudl.com/..."
          value={formData.hudlLink}
          onChangeText={(v) => updateField('hudlLink', v)}
          keyboardType="url"
          autoCapitalize="none"
          containerStyle={{ marginTop: spacing.lg }}
        />

        <Text style={styles.fieldLabel}>Varsity Experience</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, formData.varsityExperience === true && styles.toggleBtnSelected]}
            onPress={() => { haptics.light(); updateField('varsityExperience', true) }}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, formData.varsityExperience === true && styles.toggleTextSelected]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, formData.varsityExperience === false && styles.toggleBtnSelected]}
            onPress={() => { haptics.light(); updateField('varsityExperience', false) }}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, formData.varsityExperience === false && styles.toggleTextSelected]}>No</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Do you have any offers?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, formData.hasOffers === true && styles.toggleBtnSelected]}
            onPress={() => { haptics.light(); updateField('hasOffers', true) }}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, formData.hasOffers === true && styles.toggleTextSelected]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, formData.hasOffers === false && styles.toggleBtnSelected]}
            onPress={() => { haptics.light(); updateField('hasOffers', false) }}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, formData.hasOffers === false && styles.toggleTextSelected]}>No</Text>
          </TouchableOpacity>
        </View>

        {formData.hasOffers && (
          <Input
            label="Current Offers"
            placeholder="e.g. Alabama, Ohio State"
            value={formData.offers}
            onChangeText={(v) => updateField('offers', v)}
            autoCapitalize="words"
          />
        )}

        <Input
          label="Dream Schools (optional)"
          placeholder="e.g. Alabama, Ohio State"
          value={formData.dreamSchools}
          onChangeText={(v) => updateField('dreamSchools', v)}
          autoCapitalize="words"
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
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  toggleBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  toggleText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  toggleTextSelected: {
    color: colors.primary,
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

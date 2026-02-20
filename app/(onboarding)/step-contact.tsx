import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Input } from '@/components/ui/Input'
import { GradientButton } from '@/components/ui/GradientButton'
import { Button } from '@/components/ui/Button'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { useOnboardingStore, validateStep5 } from '@/stores/onboardingStore'
import { useToast } from '@/components/ui/Toast'
import { haptics } from '@/lib/haptics'
import { colors, spacing, fontSize, fontFamily } from '@/constants/theme'

export default function StepContact() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { formData, updateField, submit, isSubmitting } = useOnboardingStore()

  const handleFinish = async () => {
    const error = validateStep5(formData)
    if (error) {
      toast.show(error, 'error')
      haptics.error()
      return
    }

    const success = await submit()
    if (success) {
      haptics.success()
      // Navigate to main app with welcome flag
      router.replace('/(tabs)/insight?welcome=true')
    } else {
      haptics.error()
      toast.show(useOnboardingStore.getState().submitError || 'Something went wrong', 'error')
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingProgress currentStep={5} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Contact Info</Text>
        <Text style={styles.subtitle}>How coaches can reach you</Text>

        <Input
          label="Email"
          placeholder="your@email.com"
          value={formData.email}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Phone Number"
          placeholder="(555) 123-4567"
          value={formData.phone}
          onChangeText={(v) => updateField('phone', v)}
          keyboardType="phone-pad"
        />

        <Input
          label="Twitter/X Handle (optional)"
          placeholder="@yourhandle"
          value={formData.twitterHandle}
          onChangeText={(v) => updateField('twitterHandle', v)}
          autoCapitalize="none"
        />

        {/* Parent Contact */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Parent / Guardian Contact</Text>
          <View style={styles.dividerLine} />
        </View>

        <Input
          label="Parent Name (optional)"
          placeholder="Enter parent name"
          value={formData.parentName}
          onChangeText={(v) => updateField('parentName', v)}
          autoCapitalize="words"
        />

        <Input
          label="Parent Email (optional)"
          placeholder="parent@email.com"
          value={formData.parentEmail}
          onChangeText={(v) => updateField('parentEmail', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Parent Phone"
          placeholder="(555) 123-4567"
          value={formData.parentPhone}
          onChangeText={(v) => updateField('parentPhone', v)}
          keyboardType="phone-pad"
        />

        {/* SMS Consent */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => { haptics.light(); updateField('smsConsent', !formData.smsConsent) }}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, formData.smsConsent && styles.checkboxChecked]}>
            {formData.smsConsent && (
              <Text style={styles.checkboxMark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I consent to receive SMS messages related to my recruiting journey. Message and data rates may apply. Reply STOP to unsubscribe.
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <Button
            title="Back"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
          <GradientButton
            title="Finish"
            onPress={handleFinish}
            loading={isSubmitting}
            style={styles.nextBtn}
          />
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textDim,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
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
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backBtn: {
    flex: 1,
  },
  nextBtn: {
    flex: 2,
  },
})

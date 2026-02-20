import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme'

const STEP_LABELS = ['Basics', 'Academics', 'Measurables', 'Recruiting', 'Contact']

interface OnboardingProgressProps {
  currentStep: number // 1-based
  totalSteps?: number
}

export function OnboardingProgress({ currentStep, totalSteps = 5 }: OnboardingProgressProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEP_LABELS.slice(0, totalSteps).map((label, index) => {
          const stepNum = index + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isFuture = stepNum > currentStep

          return (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isCurrent && styles.circleCurrent,
                  isFuture && styles.circleFuture,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text style={[styles.stepNumber, isCurrent && styles.stepNumberCurrent]}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                  isFuture && styles.stepLabelFuture,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  circleCompleted: {
    backgroundColor: colors.success,
  },
  circleCurrent: {
    backgroundColor: colors.primary,
  },
  circleFuture: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepNumber: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
  },
  stepNumberCurrent: {
    color: colors.background,
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
  stepLabelFuture: {
    color: colors.textDim,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
})

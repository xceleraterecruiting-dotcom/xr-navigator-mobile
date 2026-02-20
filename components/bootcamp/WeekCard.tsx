/**
 * WeekCard Component
 *
 * Displays a bootcamp week with:
 * - Theme badge (FOUNDATION, PERFECT_FIT, etc.)
 * - Title and goal
 * - Progress indicator (x/target)
 * - Lock/unlock/complete state
 * - Current week highlight
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn } from 'react-native-reanimated'
import { colors, fontFamily, spacing, borderRadius, fontSize, shadows } from '@/constants/theme'
import { haptics } from '@/lib/haptics'
import type { BootcampWeek } from '@/lib/api'

// Theme colors for visual distinction
const THEME_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  FOUNDATION: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', border: 'rgba(59,130,246,0.4)' },
  PERFECT_FIT: { bg: 'rgba(212,168,87,0.15)', text: colors.primary, border: 'rgba(212,168,87,0.4)' },
  SAFE_SCHOOL: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', border: 'rgba(34,197,94,0.4)' },
  CONTENT: { bg: 'rgba(168,85,247,0.15)', text: '#A855F7', border: 'rgba(168,85,247,0.4)' },
  FOLLOW_UP: { bg: 'rgba(249,115,22,0.15)', text: '#F97316', border: 'rgba(249,115,22,0.4)' },
  DREAM: { bg: 'rgba(236,72,153,0.15)', text: '#EC4899', border: 'rgba(236,72,153,0.4)' },
  CAMPS: { bg: 'rgba(14,165,233,0.15)', text: '#0EA5E9', border: 'rgba(14,165,233,0.4)' },
  MOMENTUM: { bg: 'rgba(212,168,87,0.15)', text: colors.primary, border: 'rgba(212,168,87,0.4)' },
}

interface WeekCardProps {
  week: BootcampWeek
  isSelected?: boolean
  onPress: () => void
  index?: number
}

export function WeekCard({ week, isSelected, onPress, index = 0 }: WeekCardProps) {
  const themeColor = THEME_COLORS[week.theme] || THEME_COLORS.FOUNDATION
  const isLocked = !week.isUnlocked
  const isCompleted = week.isCompleted
  const isCurrent = week.isCurrent

  const handlePress = () => {
    if (isLocked) {
      haptics.warning()
      return
    }
    haptics.light()
    onPress()
  }

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(300)}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isCompleted && styles.cardCompleted,
          isLocked && styles.cardLocked,
          isCurrent && !isSelected && styles.cardCurrent,
        ]}
        onPress={handlePress}
        activeOpacity={isLocked ? 0.7 : 0.8}
      >
        {/* Week number badge */}
        <View style={[styles.weekBadge, isCompleted && styles.weekBadgeCompleted]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={14} color={colors.success} />
          ) : isLocked ? (
            <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
          ) : (
            <Text style={[styles.weekNumber, isCurrent && styles.weekNumberCurrent]}>
              {week.weekNumber}
            </Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Theme badge */}
          <View style={[styles.themeBadge, { backgroundColor: themeColor.bg }]}>
            <Text style={[styles.themeText, { color: themeColor.text }]}>
              {week.theme.replace('_', ' ')}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, isLocked && styles.titleLocked]} numberOfLines={1}>
            {week.title}
          </Text>

          {/* Goal */}
          <Text style={[styles.goal, isLocked && styles.goalLocked]} numberOfLines={1}>
            {week.goal}
          </Text>

          {/* Progress indicator */}
          {!isLocked && (
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, (week.progress / week.targetCount) * 100)}%` },
                    isCompleted && styles.progressBarCompleted,
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {week.progress}/{week.targetCount}
              </Text>
            </View>
          )}

          {/* Locked message */}
          {isLocked && (
            <Text style={styles.lockedText}>Complete Week {week.weekNumber - 1} to unlock</Text>
          )}
        </View>

        {/* Arrow indicator for selected/current */}
        {(isSelected || isCurrent) && !isLocked && (
          <View style={styles.arrowWrap}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isSelected ? colors.primary : colors.textMuted}
            />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  cardCompleted: {
    borderColor: `${colors.success}40`,
    backgroundColor: `${colors.success}08`,
  },
  cardLocked: {
    opacity: 0.6,
    backgroundColor: colors.cardElevated,
  },
  cardCurrent: {
    borderColor: `${colors.primary}40`,
  },

  // Week badge
  weekBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekBadgeCompleted: {
    backgroundColor: `${colors.success}15`,
    borderColor: `${colors.success}30`,
  },
  weekNumber: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  weekNumberCurrent: {
    color: colors.primary,
  },

  // Content
  content: {
    flex: 1,
  },
  themeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  themeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: 2,
  },
  titleLocked: {
    color: colors.textMuted,
  },
  goal: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  goalLocked: {
    color: colors.textMuted,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressBarCompleted: {
    backgroundColor: colors.success,
  },
  progressText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    minWidth: 36,
    textAlign: 'right',
  },

  // Locked
  lockedText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },

  // Arrow
  arrowWrap: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignSelf: 'center',
  },
})

export default WeekCard

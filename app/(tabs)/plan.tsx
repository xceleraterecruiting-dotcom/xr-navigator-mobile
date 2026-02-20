import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { usePlanStore } from '@/stores/planStore'
import { analytics } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { useToast } from '@/components/ui/Toast'
import { GradientButton } from '@/components/ui/GradientButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { SchoolLogo } from '@/components/ui/SchoolLogo'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows } from '@/constants/theme'

export default function PlanScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const openDrawer = useDrawerStore((s) => s.open)

  const {
    plan, weeks, progress, currentWeekDetail,
    isLoading, isGenerating, error,
    fetchPlan, generatePlan, fetchWeek, completeWeek, clearError,
  } = usePlanStore()

  const [refreshing, setRefreshing] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  useEffect(() => {
    analytics.screenView('Recruiting Plan')
    fetchPlan()
  }, [])

  // Load week detail when plan arrives
  useEffect(() => {
    if (plan && progress && !selectedWeek) {
      const currentWeekNum = progress.currentWeekNumber
      setSelectedWeek(currentWeekNum)
      fetchWeek(currentWeekNum)
    }
  }, [plan, progress])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPlan()
    setRefreshing(false)
  }, [])

  const handleSelectWeek = (weekNum: number) => {
    setSelectedWeek(weekNum)
    fetchWeek(weekNum)
    haptics.light()
  }

  const handleGenerate = async () => {
    haptics.medium()
    try {
      await generatePlan()
      toast.show('Plan generated!', 'success')
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate plan'
      if (msg.includes('503') || msg.includes('not enabled')) {
        toast.show('This feature is not available yet', 'error')
      } else {
        toast.show(msg, 'error')
      }
    }
  }

  const handleCompleteWeek = async () => {
    if (!selectedWeek) return
    haptics.success()
    try {
      await completeWeek(selectedWeek)
      toast.show('Week completed!', 'success')
    } catch {
      toast.show('Failed to complete week', 'error')
    }
  }

  // Empty state — no plan
  if (!isLoading && !plan) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.backBtn}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recruiting Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, shadows.gold]}>
            <Ionicons name="calendar-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your 8-Week Recruiting Plan</Text>
          <Text style={styles.emptySubtitle}>
            Get a personalized weekly plan with target schools, tasks, and coaching contacts
          </Text>
          <GradientButton
            title="Generate My Plan"
            onPress={handleGenerate}
            loading={isGenerating}
            fullWidth
            style={{ marginTop: spacing.lg }}
            icon={<Ionicons name="sparkles" size={18} color={colors.background} />}
          />
        </View>
      </View>
    )
  }

  const weekDetail = currentWeekDetail

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.backBtn}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recruiting Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Progress */}
        {progress && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>
                Week {progress.currentWeekNumber} of {progress.totalWeeks}
              </Text>
              <Text style={styles.progressPercent}>{Math.round(progress.percentComplete)}%</Text>
            </View>
            <ProgressBar
              progress={progress.percentComplete / 100}
              style={{ marginTop: spacing.sm }}
            />
            <Text style={styles.progressSub}>
              {progress.completedTasks}/{progress.totalTasks} tasks completed
            </Text>
          </Animated.View>
        )}

        {/* Week Selector */}
        {weeks && weeks.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekSelector}
        >
          {weeks.map((w) => {
            const isCurrent = w.weekNumber === selectedWeek
            const isCompleted = w.status === 'COMPLETED'
            return (
              <TouchableOpacity
                key={w.weekNumber}
                style={[
                  styles.weekPill,
                  isCurrent && styles.weekPillActive,
                  isCompleted && styles.weekPillCompleted,
                ]}
                onPress={() => handleSelectWeek(w.weekNumber)}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                ) : (
                  <Text style={[styles.weekPillText, isCurrent && styles.weekPillTextActive]}>
                    {w.weekNumber}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        )}

        {/* Week Detail */}
        {weekDetail && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.weekCard}>
            <View style={styles.themeBadge}>
              <Text style={styles.themeText}>{weekDetail.week.theme}</Text>
            </View>
            <Text style={styles.weekTitle}>{weekDetail.week.focusTitle}</Text>
            {weekDetail.week.focusDescription && (
              <Text style={styles.weekDesc}>{weekDetail.week.focusDescription}</Text>
            )}

            {/* Tasks */}
            <View style={styles.tasksSection}>
              <Text style={styles.tasksSectionTitle}>
                Tasks ({weekDetail.week.tasksCompleted}/{weekDetail.week.tasksTotal})
              </Text>
              {weekDetail.week.weeklyGoals && (
                <Text style={styles.goalsText}>{weekDetail.week.weeklyGoals}</Text>
              )}
            </View>

            {/* Target Schools */}
            {weekDetail.targetSchools && weekDetail.targetSchools.length > 0 && (
              <View style={styles.schoolsSection}>
                <Text style={styles.tasksSectionTitle}>
                  Target Schools ({weekDetail.targetSchools.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {weekDetail.targetSchools.map((school) => (
                    <View key={school.id} style={styles.schoolCard}>
                      <SchoolLogo schoolName={school.name} size={32} />
                      <Text style={styles.schoolName} numberOfLines={1}>{school.name}</Text>
                      <Text style={styles.schoolDiv}>{school.division}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Complete Week CTA */}
            {weekDetail.isActive && !weekDetail.isCompleted && (
              <GradientButton
                title="Complete This Week"
                onPress={handleCompleteWeek}
                fullWidth
                style={{ marginTop: spacing.lg }}
              />
            )}

            {weekDetail.isLocked && (
              <View style={styles.lockedBanner}>
                <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                <Text style={styles.lockedText}>Complete previous weeks to unlock</Text>
              </View>
            )}
          </Animated.View>
        )}

        {isLoading && !plan && (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Skeleton style={{ width: '100%', height: 100, borderRadius: borderRadius.xl, marginBottom: spacing.md }} />
            <Skeleton style={{ width: '100%', height: 200, borderRadius: borderRadius.xl }} />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  backBtn: { padding: spacing.sm },
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text },

  // Empty
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: fontSize['2xl'], fontFamily: fontFamily.bold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { fontSize: fontSize.base, fontFamily: fontFamily.regular, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  comingSoonBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: `${colors.primary}30`,
  },
  comingSoonText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, color: colors.primary },

  // Progress
  progressCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: fontSize.base, fontFamily: fontFamily.bold, color: colors.text },
  progressPercent: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.primary },
  progressSub: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.textMuted, marginTop: spacing.xs },

  // Week Selector
  weekSelector: { paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.lg, paddingVertical: spacing.xs },
  weekPill: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  weekPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekPillCompleted: { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` },
  weekPillText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, color: colors.textMuted },
  weekPillTextActive: { color: colors.background },

  // Week Detail
  weekCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  themeBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm, marginBottom: spacing.sm,
  },
  themeText: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, color: colors.primary, textTransform: 'uppercase' },
  weekTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text, marginBottom: spacing.xs },
  weekDesc: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },

  tasksSection: { marginTop: spacing.md },
  tasksSectionTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, color: colors.text, marginBottom: spacing.sm },
  goalsText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.textSecondary, lineHeight: 20 },

  schoolsSection: { marginTop: spacing.lg },
  schoolCard: {
    alignItems: 'center', width: 80, marginRight: spacing.sm,
    backgroundColor: colors.cardElevated, borderRadius: borderRadius.lg,
    padding: spacing.sm, gap: spacing.xs,
  },
  schoolName: { fontSize: 10, fontFamily: fontFamily.medium, color: colors.text, textAlign: 'center' },
  schoolDiv: { fontSize: 9, fontFamily: fontFamily.regular, color: colors.textMuted },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.cardElevated, borderRadius: borderRadius.md,
  },
  lockedText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, color: colors.textMuted },
})

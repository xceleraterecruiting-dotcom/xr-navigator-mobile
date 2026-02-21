/**
 * XR Method Bootcamp Tab
 *
 * 8-Week guided recruiting course with:
 * - Sequential week unlocking
 * - One goal per week
 * - Auto-surfaced coaches
 * - Week 2 "First Email" micro-CTA
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'

import { useBootcampStore } from '@/stores/bootcampStore'
import { analytics } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { useToast } from '@/components/ui/Toast'
import { GradientButton } from '@/components/ui/GradientButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { WeekCard } from '@/components/bootcamp/WeekCard'
import { BootcampCoachCard } from '@/components/bootcamp/BootcampCoachCard'
import { BootcampSchoolCard } from '@/components/bootcamp/BootcampSchoolCard'
import type { BootcampTargetSchool } from '@/lib/api'
import { BootcampCelebration, type CelebrationType } from '@/components/bootcamp/BootcampCelebration'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows } from '@/constants/theme'

export default function BootcampScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const openDrawer = useDrawerStore((s) => s.open)

  const {
    enrolled,
    enrollment,
    progress,
    weeks,
    targetSchools,
    currentWeekCoaches,
    currentWeekDetail,
    isLoading,
    isLoadingWeek,
    isEnrolling,
    error,
    fetchBootcamp,
    enrollBootcamp,
    fetchWeek,
    incrementProgress,
    completeWeek,
    clearError,
  } = useBootcampStore()

  const [refreshing, setRefreshing] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  // Celebration state
  const [celebration, setCelebration] = useState<{
    visible: boolean
    type: CelebrationType
    weekNumber?: number
  }>({ visible: false, type: 'week_complete' })

  // Expanded schools state for school-first view
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set())

  const toggleSchool = (schoolId: string) => {
    setExpandedSchools(prev => {
      const next = new Set(prev)
      if (next.has(schoolId)) {
        next.delete(schoolId)
      } else {
        next.add(schoolId)
      }
      return next
    })
  }

  // Group flat coaches by school ID for school-first display
  const groupCoachesBySchool = (coaches: (BootcampTargetSchool & { contacted?: boolean })[]) => {
    const grouped = new Map<string, {
      school: BootcampTargetSchool & { contacted?: boolean }
      coaches: (BootcampTargetSchool & { contacted?: boolean })[]
    }>()

    for (const coach of coaches) {
      if (!grouped.has(coach.id)) {
        grouped.set(coach.id, {
          school: coach, // Use first coach's school info
          coaches: []
        })
      }
      grouped.get(coach.id)!.coaches.push(coach)
    }

    return Array.from(grouped.values())
  }

  useEffect(() => {
    analytics.screenView('Bootcamp')
    fetchBootcamp()
  }, [])

  // Set current week as selected when bootcamp loads
  useEffect(() => {
    if (enrolled && enrollment && !selectedWeek) {
      setSelectedWeek(enrollment.currentWeek)
      fetchWeek(enrollment.currentWeek)
    }
  }, [enrolled, enrollment])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchBootcamp()
    setRefreshing(false)
  }, [])

  const handleSelectWeek = (weekNum: number) => {
    // Allow viewing locked weeks (preview)
    setSelectedWeek(weekNum)
    fetchWeek(weekNum)
    haptics.light()
  }

  const handleEnroll = async () => {
    haptics.medium()
    try {
      console.log('[Bootcamp] Starting enrollment...')
      await enrollBootcamp()
      console.log('[Bootcamp] Enrollment successful')
      toast.show('Welcome to The XR Method!', 'success')
    } catch (err: any) {
      console.error('[Bootcamp] Enrollment error:', err)
      const msg = err?.message || 'Failed to enroll. Please try again.'
      toast.show(msg, 'error')
    }
  }

  const handleEmailCoach = async (coachId: string, schoolName: string, coachEmail?: string | null) => {
    haptics.light()

    // If we have an email, open mailto: directly
    if (coachEmail) {
      Linking.openURL(`mailto:${coachEmail}`)
    } else {
      // Otherwise navigate to coaches screen to find coach
      router.push('/(tabs)/coaches' as any)
      return
    }

    // Increment progress for the current week when emailing a coach
    if (selectedWeek && currentWeekDetail && !currentWeekDetail.isCompleted) {
      try {
        await incrementProgress(selectedWeek)
        // Refresh week detail to show updated progress
        fetchWeek(selectedWeek)
      } catch (err) {
        console.log('[Bootcamp] Failed to increment progress:', err)
      }
    }
  }

  const handleViewCoach = (coachId: string) => {
    haptics.light()
    if (coachId) {
      router.push(`/coach/${coachId}` as any)
    }
  }

  const handleCompleteWeek = async () => {
    if (!selectedWeek) return
    haptics.success()
    try {
      await completeWeek(selectedWeek)

      // Show celebration based on week number
      if (selectedWeek === 8) {
        // Graduation!
        setCelebration({ visible: true, type: 'graduation', weekNumber: 8 })
      } else {
        // Week completion
        setCelebration({ visible: true, type: 'week_complete', weekNumber: selectedWeek })
      }
    } catch {
      toast.show('Failed to complete week', 'error')
    }
  }

  const handleCelebrationClose = () => {
    setCelebration((prev) => ({ ...prev, visible: false }))
  }

  const handleCelebrationContinue = () => {
    setCelebration((prev) => ({ ...prev, visible: false }))
    // Move to next week
    if (selectedWeek && selectedWeek < 8) {
      const nextWeek = selectedWeek + 1
      setSelectedWeek(nextWeek)
      fetchWeek(nextWeek)
    }
  }

  // Check if we should show the "First Email" micro-CTA for Week 2
  const showMicroRunCTA =
    currentWeekDetail?.showMicroRunCTA ||
    (selectedWeek === 2 && currentWeekDetail?.progress === 0 && !currentWeekDetail?.isCompleted)

  // Safely access current week coaches
  const safeCurrentWeekCoaches = currentWeekCoaches || []

  // Empty state — not enrolled
  if (!isLoading && !enrolled) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              openDrawer()
              haptics.light()
            }}
            style={styles.backBtn}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>XR Method</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.emptyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.emptyIcon, shadows.gold]}>
            <Ionicons name="school-outline" size={48} color={colors.primary} />
          </View>

          <Text style={styles.emptyTitle}>The XR Method</Text>
          <Text style={styles.emptySubtitle}>
            8 Week Recruiting Plan. 30 schools. Your path to getting recruited.
          </Text>

          {/* Features list */}
          <View style={styles.featuresList}>
            <FeatureItem
              icon="list"
              title="30-School Target List"
              description="AI-generated based on your projection"
            />
            <FeatureItem
              icon="people"
              title="Coaches Surfaced Weekly"
              description="Right coaches, right order, right time"
            />
            <FeatureItem
              icon="mail"
              title="XR Email Format"
              description="Proven template that gets responses"
            />
            <FeatureItem
              icon="lock-open"
              title="Sequential Unlocking"
              description="Master each step before moving on"
            />
          </View>

          <GradientButton
            title="Start Bootcamp"
            onPress={handleEnroll}
            loading={isEnrolling}
            fullWidth
            style={{ marginTop: spacing.xl }}
            icon={<Ionicons name="rocket" size={18} color={colors.background} />}
          />

          <Text style={styles.enrollNote}>
            Free for all athletes. Complete at your own pace.
          </Text>
        </ScrollView>
      </View>
    )
  }

  // Current week detail
  const weekDetail = currentWeekDetail
  const currentWeekObj = weeks.find((w) => w.weekNumber === selectedWeek)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            openDrawer()
            haptics.light()
          }}
          style={styles.backBtn}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>XR Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Progress Card */}
        {progress && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>
                  Week {enrollment?.currentWeek || 1} of 8
                </Text>
                <Text style={styles.progressSubtitle}>
                  {progress.completedWeeks} weeks completed
                </Text>
              </View>
              <View style={styles.percentCircle}>
                <Text style={styles.percentText}>{progress.percentComplete}%</Text>
              </View>
            </View>
            <ProgressBar
              progress={progress.percentComplete / 100}
              style={{ marginTop: spacing.md }}
            />

            {/* Target schools summary */}
            {targetSchools && (
              <View style={styles.schoolsSummary}>
                <SchoolStat label="Perfect Fit" count={targetSchools.perfectFit} color="#D4A857" />
                <SchoolStat label="Dream" count={targetSchools.dream} color="#EC4899" />
                <SchoolStat label="Safe" count={targetSchools.safe} color="#22C55E" />
              </View>
            )}
          </Animated.View>
        )}

        {/* Week 2 Micro-Run CTA */}
        {showMicroRunCTA && (
          <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.microRunCard}>
            <View style={styles.microRunBadge}>
              <Ionicons name="flash" size={12} color="#F97316" />
              <Text style={styles.microRunBadgeText}>FIRST STEP</Text>
            </View>
            <Text style={styles.microRunTitle}>Send Your First Email</Text>
            <Text style={styles.microRunDesc}>
              Break the ice! Your first email is the hardest. Pick one coach and hit send.
            </Text>
            {safeCurrentWeekCoaches.length > 0 && safeCurrentWeekCoaches[0].coachName && (
              <View style={{ marginTop: spacing.md }}>
                <BootcampCoachCard
                  coach={safeCurrentWeekCoaches[0]}
                  onEmail={() =>
                    handleEmailCoach(
                      safeCurrentWeekCoaches[0].coachId || '',
                      safeCurrentWeekCoaches[0].name,
                      safeCurrentWeekCoaches[0].coachEmail
                    )
                  }
                  onViewProfile={() =>
                    safeCurrentWeekCoaches[0].coachId && handleViewCoach(safeCurrentWeekCoaches[0].coachId)
                  }
                />
              </View>
            )}
          </Animated.View>
        )}

        {/* Week List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your 8 Weeks</Text>
          {weeks.map((week, index) => (
            <WeekCard
              key={week.weekNumber}
              week={week}
              isSelected={week.weekNumber === selectedWeek}
              onPress={() => handleSelectWeek(week.weekNumber)}
              index={index}
            />
          ))}
        </View>

        {/* Loading state for week detail */}
        {selectedWeek && isLoadingWeek && !weekDetail && (
          <View style={[styles.section, { alignItems: 'center', paddingVertical: spacing.xl }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingWeekText, { marginTop: spacing.md }]}>
              Loading Week {selectedWeek}...
            </Text>
          </View>
        )}

        {/* Locked week preview */}
        {weekDetail && selectedWeek && !weekDetail.isUnlocked && !currentWeekObj?.isUnlocked && (
          <View style={styles.section}>
            <View style={styles.lockedWeekCard}>
              <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
              <Text style={styles.lockedWeekTitle}>Week {selectedWeek} Locked</Text>
              <Text style={styles.lockedWeekDesc}>
                Complete the previous weeks to unlock this content.
              </Text>
            </View>
          </View>
        )}

        {/* Week Detail & Coaches */}
        {/* Show for any week that has detail loaded and is unlocked (from either source) */}
        {weekDetail && selectedWeek && (weekDetail.isUnlocked || currentWeekObj?.isUnlocked) && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
            <View style={styles.weekDetailHeader}>
              <Text style={styles.sectionTitle}>Week {selectedWeek} Schools</Text>
              {weekDetail.isCompleted ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              ) : (
                <Text style={styles.coachCount}>
                  {weekDetail.coaches ? groupCoachesBySchool(weekDetail.coaches).length : 0} schools
                </Text>
              )}
            </View>

            {weekDetail.tips && weekDetail.tips.length > 0 && (
              <View style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb" size={16} color={colors.primary} />
                  <Text style={styles.tipsTitle}>Pro Tips</Text>
                </View>
                {weekDetail.tips.map((tip, i) => (
                  <Text key={i} style={styles.tipText}>
                    • {tip}
                  </Text>
                ))}
              </View>
            )}

            {/* School cards with expandable coaches */}
            {isLoadingWeek ? (
              <View style={styles.loadingWeek}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingWeekText}>Loading schools...</Text>
              </View>
            ) : (
              groupCoachesBySchool(weekDetail.coaches || []).map(({ school, coaches }, index) => (
                <BootcampSchoolCard
                  key={school.id}
                  school={{
                    id: school.id,
                    name: school.name,
                    division: school.division,
                    conference: school.conference,
                    state: school.state,
                    matchScore: school.matchScore,
                    reasons: school.reasons,
                  }}
                  coaches={coaches}
                  isExpanded={expandedSchools.has(school.id)}
                  onToggle={() => toggleSchool(school.id)}
                  onEmailCoach={(coach) => handleEmailCoach(coach.coachId || '', coach.name, coach.coachEmail)}
                  index={index}
                />
              ))
            )}

            {/* Complete Week CTA - always visible for unlocked, non-completed weeks */}
            {!weekDetail.isCompleted && (
              <View style={{ marginTop: spacing.md }}>
                {/* Progress indicator */}
                <View style={styles.weekProgressRow}>
                  <Text style={styles.weekProgressText}>
                    Progress: {weekDetail.progress}/{weekDetail.target}
                  </Text>
                  {weekDetail.progress >= weekDetail.target && (
                    <View style={styles.goalReachedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.goalReachedText}>Goal Reached!</Text>
                    </View>
                  )}
                </View>
                <GradientButton
                  title={weekDetail.progress >= weekDetail.target ? "Complete This Week" : "Mark Week Complete"}
                  onPress={handleCompleteWeek}
                  fullWidth
                  icon={<Ionicons name="checkmark-circle" size={18} color={colors.background} />}
                />
                {weekDetail.progress < weekDetail.target && (
                  <Text style={styles.skipNote}>
                    Tip: Contact {weekDetail.target - weekDetail.progress} more coaches to reach your goal
                  </Text>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* Loading skeleton */}
        {isLoading && !enrolled && (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Skeleton
              style={{
                width: '100%',
                height: 120,
                borderRadius: borderRadius.xl,
                marginBottom: spacing.md,
              }}
            />
            <Skeleton
              style={{
                width: '100%',
                height: 80,
                borderRadius: borderRadius.xl,
                marginBottom: spacing.sm,
              }}
            />
            <Skeleton
              style={{
                width: '100%',
                height: 80,
                borderRadius: borderRadius.xl,
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Celebration Modal */}
      <BootcampCelebration
        visible={celebration.visible}
        type={celebration.type}
        weekNumber={celebration.weekNumber}
        onClose={handleCelebrationClose}
        onContinue={handleCelebrationContinue}
      />
    </View>
  )
}

// Feature item for enrollment screen
function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
      </View>
    </View>
  )
}

// School stat badge
function SchoolStat({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <View style={styles.schoolStat}>
      <Text style={[styles.schoolStatCount, { color }]}>{count}</Text>
      <Text style={styles.schoolStatLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backBtn: { padding: spacing.sm },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },

  // Empty state
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },

  // Features list
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  enrollNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Progress card
  progressCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  progressSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  percentCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  percentText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },

  // Schools summary
  schoolsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  schoolStat: {
    alignItems: 'center',
  },
  schoolStatCount: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
  },
  schoolStatLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Micro-run CTA
  microRunCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    padding: spacing.lg,
  },
  microRunBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  microRunBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: '#F97316',
    letterSpacing: 0.5,
  },
  microRunTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  microRunDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  weekDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  coachCount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },

  // Tips
  tipsCard: {
    backgroundColor: `${colors.primary}08`,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  tipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },

  // Loading state
  loadingWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingWeekText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },

  // Week progress
  weekProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekProgressText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  goalReachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  goalReachedText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.success,
  },
  skipNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Locked week
  lockedWeekCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedWeekTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  lockedWeekDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Completed badge
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  completedBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.success,
  },
})

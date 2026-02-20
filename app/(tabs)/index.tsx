import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { haptics } from '@/lib/haptics'
import { Ionicons } from '@expo/vector-icons'

import { SchoolLogo } from '@/components/ui/SchoolLogo'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { HeroName } from '@/components/ui/HeroName'
import { ReadinessRing } from '@/components/ui/ReadinessRing'
import { ScoreBreakdownModal } from '@/components/ui/ScoreBreakdownModal'
import { CelebrationOverlay } from '@/components/ui/CelebrationOverlay'
import { NotificationPermissionScreen } from '@/components/ui/NotificationPermissionScreen'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { FirstRunCard } from '@/components/dashboard/FirstRunCard'
import { ToolsGrid } from '@/components/dashboard/ToolsGrid'
import { LiveIntel } from '@/components/dashboard/LiveIntel'
import { NextBestMoveCard } from '@/components/dashboard/NextBestMoveCard'
import { RecruitingFunnelCard } from '@/components/dashboard/RecruitingFunnelCard'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useDrawerStore } from '@/stores/drawerStore'
import {
  useAthleteStore,
  useReadinessScore,
  useReadinessScoreLoading,
  useNextBestMove,
  useNextBestMoveLoading,
  useRecruitingFunnel,
  useRecruitingFunnelLoading,
} from '@/stores/athleteStore'
import { useCoachesStore } from '@/stores/coachesStore'
import { useIsPro } from '@/stores/subscriptionStore'
import { useIntelStore } from '@/stores/intelStore'
import { api } from '@/lib/api'
import { analytics } from '@/lib/analytics'
import { storageHelpers } from '@/lib/storage'
import { areNotificationsEnabled, requestNotificationPermissions, registerPushToken } from '@/lib/notifications'
import { getDashboardSections } from '@/lib/progressiveDisclosure'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows, divisionColors } from '@/constants/theme'
import type { CollegeCoach, DailyTask, DailyPlanResponse } from '@/types'

// Division badge helper
function getDivisionStyle(division: string) {
  const d = divisionColors[division] || divisionColors.NAIA
  let label = 'D2+'
  if (division === 'D1_FBS_P4') label = 'P4'
  else if (division === 'D1_FBS_G5') label = 'G5'
  else if (division === 'D1_FCS') label = 'FCS'
  else if (division === 'D2') label = 'D2'
  else if (division === 'D3') label = 'D3'
  else if (division === 'NAIA') label = 'NAIA'
  return { ...d, label }
}

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { welcomeMessage, headerSubtitle, primaryColor, isPhenom } = usePartnerBranding()
  const isPro = useIsPro()

  const { athlete, isLoading: athleteLoading, fetchAthlete, fetchReadinessScore, fetchNextBestMove, fetchRecruitingFunnel } = useAthleteStore()
  const { savedCoaches, isLoading: coachesLoading, fetchSavedCoaches } = useCoachesStore()
  const { events: intelEvents, isLoading: intelLoading, fetchIntel } = useIntelStore()
  const readinessScore = useReadinessScore()
  const isLoadingScore = useReadinessScoreLoading()
  const nextBestMove = useNextBestMove()
  const isLoadingMove = useNextBestMoveLoading()
  const funnel = useRecruitingFunnel()
  const isLoadingFunnel = useRecruitingFunnelLoading()

  const isLoading = athleteLoading || coachesLoading

  // Daily Plan (Recommended Coaches) - matches web dashboard
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null)
  const [recommendedLoading, setRecommendedLoading] = useState(true)
  const [savedCoachIds, setSavedCoachIds] = useState<Set<string>>(new Set())

  // Sidebar drawer
  const openDrawer = useDrawerStore((s) => s.open)

  // Coach detail modal
  const [selectedCoach, setSelectedCoach] = useState<CollegeCoach | null>(null)

  // Score breakdown modal
  const [showScoreModal, setShowScoreModal] = useState(false)

  // Celebration overlay for first response
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationCoach, setCelebrationCoach] = useState<{ name: string; school: string; division?: string } | null>(null)

  // Funnel collapsed state
  const [funnelCollapsed, setFunnelCollapsed] = useState(false)

  // Notification permission screen
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false)
  const hasCheckedNotifications = useRef(false)

  // Check if we should show notification permission screen
  useEffect(() => {
    if (hasCheckedNotifications.current || !athlete) return
    hasCheckedNotifications.current = true

    const checkNotificationPermission = async () => {
      // Check if we've already shown the prompt
      const hasSeenPrompt = await storageHelpers.get('notification_prompt_seen')
      if (hasSeenPrompt) return

      // Check if notifications are already enabled
      const enabled = await areNotificationsEnabled()
      if (enabled) {
        await storageHelpers.set('notification_prompt_seen', 'true')
        return
      }

      // Show the prompt after a short delay (let dashboard load first)
      setTimeout(() => setShowNotificationPrompt(true), 1500)
    }

    checkNotificationPermission()
  }, [athlete?.id])

  const handleEnableNotifications = async () => {
    setShowNotificationPrompt(false)
    await storageHelpers.set('notification_prompt_seen', 'true')

    const granted = await requestNotificationPermissions()
    if (granted) {
      await registerPushToken()
      analytics.track('notification_permission_granted', { source: 'dashboard_prompt' })
    } else {
      analytics.track('notification_permission_denied', { source: 'dashboard_prompt' })
    }
  }

  const handleSkipNotifications = async () => {
    setShowNotificationPrompt(false)
    await storageHelpers.set('notification_prompt_seen', 'true')
    analytics.track('notification_permission_skipped', { source: 'dashboard_prompt' })
  }

  // Track first load for stagger animations
  const hasAnimated = useRef(false)
  const shouldAnimate = !hasAnimated.current
  useEffect(() => {
    if (athlete) hasAnimated.current = true
  }, [athlete?.id])

  useEffect(() => {
    analytics.screenView('Dashboard')
  }, [])

  // Fetch dashboard data on focus
  useFocusEffect(
    useCallback(() => {
      fetchIntel(5) // Fetch top 5 intel events
      fetchReadinessScore() // Fetch readiness score
      fetchNextBestMove() // Fetch next best action
      fetchRecruitingFunnel() // Fetch funnel data
    }, [])
  )

  // Fetch daily plan (recommended coaches) — matches web dashboard exactly
  useEffect(() => {
    if (!athlete) return
    fetchRecommended()
  }, [athlete?.id])

  // Also track which coaches are already saved
  useEffect(() => {
    const ids = new Set<string>(savedCoaches.map((c) => c.collegeCoachId))
    setSavedCoachIds(ids)
  }, [savedCoaches])

  const fetchRecommended = async () => {
    setRecommendedLoading(true)
    try {
      // Use the same daily-plan API as the web dashboard
      const plan = await api.getDailyPlan()
      setDailyPlan(plan)
    } catch {
      // Non-critical - fall back to null
    } finally {
      setRecommendedLoading(false)
    }
  }

  // Handle contacting a recommended coach
  const handleContactTask = async (task: DailyTask, contactMethod?: 'email' | 'twitter') => {
    const method = contactMethod || (task.actionType === 'twitter_dm' ? 'twitter' : 'email')
    haptics.light()
    analytics.dashboardCTATapped('contact_coach', 'recommended')

    // Open contact method
    if (method === 'twitter' && task.twitter) {
      Linking.openURL(`https://twitter.com/${task.twitter.replace('@', '')}`)
    } else if (method === 'email' && task.email) {
      Linking.openURL(`mailto:${task.email}`)
    }

    // Remove from UI immediately
    if (dailyPlan) {
      setDailyPlan({
        ...dailyPlan,
        tasks: dailyPlan.tasks.filter((t) => t.id !== task.id),
        earnedXp: dailyPlan.earnedXp + task.xp,
      })
    }

    // Mark task as complete in backend
    try {
      await api.completeTask({
        taskId: task.id,
        taskType: task.type,
        xp: task.xp,
        coachId: task.coachId,
        contactMethod: method,
      })
    } catch (err) {
      if (__DEV__) console.warn('Failed to complete task:', err)
    }
  }

  // Handle saving a recommended coach
  const handleSaveTask = async (task: DailyTask) => {
    if (savedCoachIds.has(task.coachId)) return
    haptics.light()
    analytics.dashboardCTATapped('save_coach', 'recommended')

    // Optimistically update UI
    setSavedCoachIds((prev) => new Set(prev).add(task.coachId))

    try {
      await api.saveCoach(task.coachId)
    } catch (err) {
      // Revert on error
      setSavedCoachIds((prev) => {
        const next = new Set(prev)
        next.delete(task.coachId)
        return next
      })
      if (__DEV__) console.warn('Failed to save coach:', err)
    }
  }

  const handleRefresh = async () => {
    await Promise.all([
      fetchAthlete(),
      fetchSavedCoaches(),
      fetchRecommended(),
      fetchIntel(5),
      fetchReadinessScore(),
      fetchNextBestMove(),
      fetchRecruitingFunnel(),
    ])
  }

  // Stats - use outreachCount from athlete (matches web dashboard's sent emails count)
  const contactedCount = athlete?.outreachCount || 0
  const savedCount = savedCoaches.length
  const streak = athlete?.streak || 0
  const xpTotal = athlete?.xp || 0
  // Count coaches who opened emails (from engagement data)
  const openedCount = savedCoaches.filter((sc: any) => sc.engagement?.lastEmailOpened).length

  // Progressive disclosure - determine what sections to show
  const dashboardSections = useMemo(
    () => getDashboardSections(savedCoaches, { outreachCount: contactedCount }),
    [savedCoaches, contactedCount]
  )

  // Show skeleton on first load
  if (isLoading && !athlete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DashboardSkeleton />
      </View>
    )
  }

  // Handle FirstRunCard actions
  const handleFirstRunAction = (action: 'search' | 'email' | 'dm' | 'connect') => {
    haptics.light()
    analytics.dashboardCTATapped(action, 'first_run')
    switch (action) {
      case 'search':
        router.push('/(tabs)/coaches')
        break
      case 'email':
      case 'dm':
        router.push('/(tabs)/saved')
        break
      case 'connect':
        // TODO: Navigate to email connection settings
        router.push('/(tabs)/profile')
        break
    }
  }

  return (
    <View style={styles.container}>
    <OfflineBanner screen="dashboard" />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing['2xl'] },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={primaryColor}
        />
      }
    >
      {/* ── Hero Header with Readiness Score ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => { openDrawer(); haptics.light() }}
            style={styles.menuBtn}
            hitSlop={8}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isPro && (
            <View style={styles.proPill}>
              <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          )}
        </View>

        {/* New header layout: Welcome message + Readiness Ring */}
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.welcomeText}>
              Welcome back, <Text style={[styles.welcomeName, { color: primaryColor }]}>{athlete?.firstName || 'Athlete'}</Text>
            </Text>
            <Text style={styles.subtitle}>
              {streak > 0 ? `${streak} day streak — keep going!` : "Let's keep the momentum going."}
            </Text>
          </View>
          <ReadinessRing
            score={readinessScore?.score || 0}
            trend={readinessScore?.trend || 'stable'}
            size={100}
            onPress={() => setShowScoreModal(true)}
            isLoading={isLoadingScore}
          />
        </View>
      </View>

      {/* ── Context-Aware Primary CTA ── */}
      {savedCount === 0 ? (
        <TouchableOpacity
          style={[styles.primaryCTA, { backgroundColor: primaryColor }]}
          onPress={() => { router.push('/(tabs)/coaches'); haptics.light() }}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={colors.background} />
          <Text style={styles.primaryCTAText}>Find Your First Coaches</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.background} />
        </TouchableOpacity>
      ) : contactedCount === 0 ? (
        <TouchableOpacity
          style={[styles.primaryCTA, { backgroundColor: primaryColor }]}
          onPress={() => { router.push('/(tabs)/saved'); haptics.light() }}
          activeOpacity={0.8}
        >
          <Ionicons name="mail" size={20} color={colors.background} />
          <Text style={styles.primaryCTAText}>Send Your First Message</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.background} />
        </TouchableOpacity>
      ) : openedCount > 0 ? (
        <TouchableOpacity
          style={[styles.primaryCTA, { backgroundColor: colors.success }]}
          onPress={() => { router.push('/(tabs)/saved'); haptics.light() }}
          activeOpacity={0.8}
        >
          <Ionicons name="eye" size={20} color={colors.background} />
          <Text style={styles.primaryCTAText}>{openedCount} Coach{openedCount !== 1 ? 'es' : ''} Viewed Your Email</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.background} />
        </TouchableOpacity>
      ) : null}

      {/* ── Your Next Best Move ── */}
      <Animated.View entering={shouldAnimate ? FadeInDown.delay(100).duration(400) : undefined}>
        <NextBestMoveCard
          data={nextBestMove}
          isLoading={isLoadingMove}
          onAction={async () => {
            // For follow_up type with savedCoachId, mark as sent in backend
            if (nextBestMove?.type === 'follow_up' && nextBestMove.savedCoachId) {
              try {
                await api.markFollowUpSent(nextBestMove.savedCoachId)
                // Refresh immediately after marking as sent
                fetchNextBestMove()
              } catch (err) {
                console.error('Failed to mark follow-up as sent:', err)
                // Still refresh to give user feedback
                setTimeout(() => fetchNextBestMove(), 2000)
              }
            } else {
              // For other types, just refresh after a delay
              setTimeout(() => fetchNextBestMove(), 2000)
            }
          }}
          onDismiss={() => {
            // For now, just refresh to get next suggestion
            // TODO: Add API to mark this coach as "skipped" for next-best-move
            fetchNextBestMove()
          }}
          onCelebrate={(coach) => {
            setCelebrationCoach(coach)
            setShowCelebration(true)
          }}
        />
      </Animated.View>

      {/* ── Recruiting Funnel ── */}
      {/* Only show if user has contacted coaches AND we have data */}
      {dashboardSections.showLiveIntel && (funnel?.contacted ?? 0) > 0 && (
        <Animated.View entering={shouldAnimate ? FadeInDown.delay(200).duration(400) : undefined}>
          <RecruitingFunnelCard
            data={funnel}
            isLoading={isLoadingFunnel}
            isCollapsed={funnelCollapsed}
            onToggleCollapse={() => setFunnelCollapsed(!funnelCollapsed)}
          />
        </Animated.View>
      )}

      {/* ── Live Intel Section (progressive disclosure: after 1st outreach) ── */}
      {/* Only show if user has intel events */}
      {dashboardSections.showLiveIntel && intelEvents.length > 0 && (
        <Animated.View entering={shouldAnimate ? FadeInDown.delay(300).duration(400) : undefined}>
          <LiveIntel maxEvents={3} />
        </Animated.View>
      )}

      {/* ── First Run Card (progressive disclosure) ── */}
      {dashboardSections.showFirstRunCard && !coachesLoading && (
        <Animated.View entering={shouldAnimate ? FadeInDown.delay(200).duration(400) : undefined}>
          <FirstRunCard
            savedCount={savedCount}
            hasEmail={false} // TODO: Get from email integration status
            hasTwitter={false} // Twitter integration is on the dedicated X tab
            onAction={handleFirstRunAction}
          />
        </Animated.View>
      )}

      {/* ── Recommended Coaches (progressive disclosure: after 3 outreaches or 5 saves) ── */}
      {dashboardSections.showRecommendedCoaches && (
      <Animated.View style={styles.section} entering={shouldAnimate ? FadeInDown.delay(400).duration(400) : undefined}>
        {/* Header with progress */}
        <View style={styles.recommendedHeader}>
          <View style={styles.recommendedHeaderLeft}>
            {/* Progress circle */}
            {dailyPlan && dailyPlan.totalCount > 0 && (
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>
                  {dailyPlan.completedCount}/{dailyPlan.totalCount}
                </Text>
              </View>
            )}
            <View>
              <View style={styles.recommendedTitleRow}>
                <Ionicons name="people" size={18} color={primaryColor} />
                <Text style={styles.recommendedTitle}>Recommended Coaches</Text>
              </View>
              {streak > 0 && (
                <View style={styles.streakRow}>
                  <Ionicons name="flame" size={12} color={colors.warning} />
                  <Text style={styles.streakText}>{streak} day streak</Text>
                </View>
              )}
            </View>
          </View>
          {/* XP Display */}
          {dailyPlan && (
            <View style={styles.xpBadgeContainer}>
              <Ionicons name="flash" size={16} color={primaryColor} />
              <Text style={[styles.xpBadgeNumber, { color: primaryColor }]}>{dailyPlan.earnedXp}</Text>
              <Text style={styles.xpBadgeTotal}>/ {dailyPlan.totalXp} XP</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          {recommendedLoading ? (
            <ActivityIndicator color={primaryColor} style={{ paddingVertical: spacing.xl }} />
          ) : dailyPlan && dailyPlan.tasks.length > 0 ? (
            <>
              {dailyPlan.tasks.slice(0, 5).map((task, i) => {
                const div = getDivisionStyle(task.division)
                const isSaved = savedCoachIds.has(task.coachId)
                return (
                  <View
                    key={task.id}
                    style={[
                      styles.taskRow,
                      i < Math.min(dailyPlan.tasks.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.taskCoachInfo}
                      onPress={() => {
                        // Create a CollegeCoach object for the modal
                        setSelectedCoach({
                          id: task.coachId,
                          name: task.coachName,
                          title: task.coachTitle,
                          school: task.school,
                          division: task.division as any,
                          conference: task.conference,
                          email: task.email || null,
                          twitter: task.twitter || null,
                          phone: null,
                          imageUrl: null,
                        })
                        haptics.light()
                      }}
                      activeOpacity={0.7}
                    >
                      <SchoolLogo schoolName={task.school} size={40} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.taskNameRow}>
                          <Text style={styles.taskCoachName} numberOfLines={1}>{task.coachName}</Text>
                          <View style={[styles.divBadge, { backgroundColor: div.bg, borderColor: div.border }]}>
                            <Text style={[styles.divBadgeText, { color: div.text }]}>{div.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.taskCoachDetail} numberOfLines={1}>
                          {task.coachTitle} · {task.school}
                        </Text>
                        {task.reason && (
                          <Text style={styles.taskReason} numberOfLines={1}>{task.reason}</Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.taskActions}>
                      <Text style={[styles.taskXp, { color: primaryColor }]}>+{task.xp}</Text>
                      {/* Save Button */}
                      <TouchableOpacity
                        style={[styles.taskSaveBtn, isSaved && styles.taskSaveBtnActive]}
                        onPress={() => handleSaveTask(task)}
                        disabled={isSaved}
                      >
                        <Ionicons
                          name={isSaved ? 'star' : 'star-outline'}
                          size={16}
                          color={isSaved ? colors.primary : colors.textMuted}
                        />
                      </TouchableOpacity>
                      {/* Contact Button */}
                      <TouchableOpacity
                        style={[styles.taskContactBtn, { backgroundColor: primaryColor }]}
                        onPress={() => handleContactTask(task)}
                      >
                        {task.twitter ? (
                          <Ionicons name="logo-twitter" size={14} color={colors.background} />
                        ) : (
                          <Ionicons name="mail" size={14} color={colors.background} />
                        )}
                        <Text style={styles.taskContactText}>
                          {task.twitter ? 'X' : 'Email'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })}
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.push('/(tabs)/recommended' as any)}
              >
                <Text style={[styles.viewAllText, { color: primaryColor }]}>
                  VIEW ALL RECOMMENDED COACHES →
                </Text>
              </TouchableOpacity>
            </>
          ) : dailyPlan && dailyPlan.totalCount > 0 && dailyPlan.tasks.length === 0 ? (
            // All tasks completed
            <View style={styles.allDoneContainer}>
              <Ionicons name="trophy" size={40} color={colors.success} />
              <Text style={styles.allDoneTitle}>Great Work!</Text>
              <Text style={styles.allDoneText}>
                You contacted all recommended coaches • {dailyPlan.earnedXp} XP earned
              </Text>
              <Text style={styles.allDoneSubtext}>New recommendations tomorrow</Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(tabs)/coaches')}
              >
                <Ionicons name="people-outline" size={16} color={colors.text} />
                <Text style={styles.exploreBtnText}>Explore Full Directory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyMissions}
              onPress={() => router.push('/(tabs)/coaches')}
            >
              <Ionicons name="search-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Finding coaches for you</Text>
              <Text style={styles.emptyText}>Browse coaches to get started</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      )}

      {/* ── Tools Grid ── */}
      <Animated.View entering={shouldAnimate ? FadeInDown.delay(500).duration(400) : undefined}>
        <ToolsGrid streakCount={streak} />
      </Animated.View>
    </ScrollView>

    {/* ── Coach Detail Modal ── */}
    {selectedCoach && (
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={() => setSelectedCoach(null)}
          activeOpacity={1}
        />
        <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modalHandle} />

          {/* Coach info */}
          <View style={styles.modalCoachHeader}>
            <View style={styles.modalLogoWrap}>
              <SchoolLogo schoolName={selectedCoach.school} size={48} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalCoachName}>{selectedCoach.name}</Text>
              <Text style={styles.modalCoachTitle}>{selectedCoach.title}</Text>
            </View>
          </View>

          {/* Division + Conference */}
          {selectedCoach.division && (() => {
            const div = getDivisionStyle(selectedCoach.division!)
            return (
              <View style={styles.modalBadgeRow}>
                <View style={[styles.modalDivBadge, { backgroundColor: div.bg, borderColor: div.border }]}>
                  <Text style={[styles.modalDivBadgeText, { color: div.text }]}>{div.label}</Text>
                </View>
                {selectedCoach.conference && (
                  <View style={styles.modalConfBadge}>
                    <Text style={styles.modalConfBadgeText}>{selectedCoach.conference}</Text>
                  </View>
                )}
              </View>
            )
          })()}

          {/* School */}
          <View style={styles.modalSchoolRow}>
            <SchoolLogo schoolName={selectedCoach.school} size={20} />
            <Text style={styles.modalSchoolName}>{selectedCoach.school}</Text>
          </View>

          {/* Contact info */}
          {selectedCoach.email && (
            <TouchableOpacity
              style={styles.modalContactRow}
              onPress={() => Linking.openURL(`mailto:${selectedCoach.email}`)}
            >
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <Text style={styles.modalContactText}>{selectedCoach.email}</Text>
            </TouchableOpacity>
          )}
          {selectedCoach.twitter && (
            <TouchableOpacity
              style={styles.modalContactRow}
              onPress={() => Linking.openURL(`https://twitter.com/${selectedCoach.twitter!.replace('@', '')}`)}
            >
              <Ionicons name="logo-twitter" size={16} color={colors.primary} />
              <Text style={styles.modalContactText}>{selectedCoach.twitter}</Text>
            </TouchableOpacity>
          )}

          {/* Action buttons */}
          <View style={styles.modalActions}>
            {selectedCoach.email && (
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => Linking.openURL(`mailto:${selectedCoach.email}`)}
              >
                <Ionicons name="mail-outline" size={18} color={colors.primary} />
                <Text style={styles.modalActionText}>Send Email</Text>
              </TouchableOpacity>
            )}
            {selectedCoach.twitter && (
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => Linking.openURL(`https://twitter.com/${selectedCoach.twitter!.replace('@', '')}`)}
              >
                <Ionicons name="logo-twitter" size={18} color={colors.primary} />
                <Text style={styles.modalActionText}>View Twitter</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Ask AI */}
          <TouchableOpacity
            style={styles.modalAiBtn}
            onPress={() => {
              setSelectedCoach(null)
              router.push('/(tabs)/insight')
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.modalAiText}>How should I approach this coach?</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* Score Breakdown Modal */}
    <ScoreBreakdownModal
      visible={showScoreModal}
      onClose={() => setShowScoreModal(false)}
      score={readinessScore?.score || 0}
      trend={readinessScore?.trend || 'stable'}
      factors={readinessScore?.factors || []}
    />

    {/* Celebration Overlay for First Response */}
    {celebrationCoach && (
      <CelebrationOverlay
        visible={showCelebration}
        onClose={() => {
          setShowCelebration(false)
          setCelebrationCoach(null)
        }}
        coach={celebrationCoach}
        onViewReply={() => {
          setShowCelebration(false)
          setCelebrationCoach(null)
          router.push('/(tabs)/saved')
        }}
      />
    )}

    {/* Notification Permission Screen */}
    <NotificationPermissionScreen
      visible={showNotificationPrompt}
      onEnable={handleEnableNotifications}
      onSkip={handleSkipNotifications}
    />

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },

  // ── Header ──
  header: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  menuBtn: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  // Hero row with welcome message + readiness ring
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  heroLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  proPillText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  welcomeName: {
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    marginTop: spacing.xs,
  },

  // ── Hero Stat (single emphasized stat under name) ──
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroStatText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  heroStatNumber: {
    fontFamily: fontFamily.bold,
  },

  // ── Context-Aware Primary CTA ──
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  primaryCTAText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.background,
    flex: 1,
    textAlign: 'center',
  },

  // ── Find Coaches CTA ──
  findCoachesCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  findCoachesText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },

  // ── Feature Cards ──
  // ── Sections ──
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 2,
  },
  xpBadge: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },

  // ── New badge ──
  newBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  newBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },

  viewAllBtn: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    letterSpacing: 1.5,
  },

  // ── Recommended Coaches ──
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  coachLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachDetails: {
    flex: 1,
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    flex: 1,
  },
  coachSchool: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  divBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  divBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
  },

  // ── Empty Missions ──
  emptyMissions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },

  // ── Daily Plan / Recommended Coaches (matches web) ──
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  recommendedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  recommendedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recommendedTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
  xpBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  xpBadgeNumber: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
  },
  xpBadgeTotal: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  taskCoachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    minWidth: 0,
  },
  taskNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  taskCoachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    flex: 1,
  },
  taskCoachDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
  taskReason: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  taskXp: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
  },
  taskSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskSaveBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  taskContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  taskContactText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  allDoneContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  allDoneTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.success,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  allDoneText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  allDoneSubtext: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.lg,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  exploreBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },

  // ── Coach Detail Modal ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalCoachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modalLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalCoachName: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  modalCoachTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalDivBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  modalDivBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },
  modalConfBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalConfBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
  },
  modalSchoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalSchoolName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  modalContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalContactText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  modalAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  modalAiText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    flex: 1,
  },
})

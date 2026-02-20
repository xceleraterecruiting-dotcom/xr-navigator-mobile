import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { useChallengesStore } from '@/stores/challengesStore'
import { analytics } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows } from '@/constants/theme'
import type { Challenge } from '@/types'

function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  const progress = challenge.targetCount > 0 ? challenge.progress / challenge.targetCount : 0

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <View style={[cardStyles.container, challenge.completed && cardStyles.completed]}>
        <View style={cardStyles.left}>
          <View style={[cardStyles.check, challenge.completed && cardStyles.checkDone]}>
            {challenge.completed && (
              <Ionicons name="checkmark" size={14} color={colors.success} />
            )}
          </View>
        </View>
        <View style={cardStyles.content}>
          <Text style={[cardStyles.title, challenge.completed && cardStyles.titleDone]}>
            {challenge.title}
          </Text>
          <Text style={cardStyles.description} numberOfLines={2}>
            {challenge.description}
          </Text>
          {!challenge.completed && challenge.targetCount > 1 && (
            <ProgressBar
              progress={progress}
              style={{ marginTop: spacing.xs }}
              label={`${challenge.progress}/${challenge.targetCount}`}
            />
          )}
        </View>
        <View style={[cardStyles.xpBadge, challenge.completed && cardStyles.xpBadgeDone]}>
          <Text style={[cardStyles.xpText, challenge.completed && cardStyles.xpTextDone]}>
            +{challenge.xpReward}
          </Text>
          <Text style={[cardStyles.xpLabel, challenge.completed && cardStyles.xpLabelDone]}>XP</Text>
        </View>
      </View>
    </Animated.View>
  )
}

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  completed: { opacity: 0.7 },
  left: {},
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { borderColor: colors.success, backgroundColor: `${colors.success}15` },
  content: { flex: 1 },
  title: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.text },
  titleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  description: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.textMuted, marginTop: 2 },
  xpBadge: {
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm, alignItems: 'center',
  },
  xpBadgeDone: { backgroundColor: `${colors.success}15` },
  xpText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, color: colors.primary },
  xpTextDone: { color: colors.success },
  xpLabel: { fontSize: 10, fontFamily: fontFamily.medium, color: colors.primary },
  xpLabelDone: { color: colors.success },
})

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const openDrawer = useDrawerStore((s) => s.open)

  const {
    xp, streak, dailyChallenges, weeklyChallenges, badges,
    isLoading, error, fetchChallenges, assignChallenges, clearError,
  } = useChallengesStore()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    analytics.screenView('Challenges')
    assignChallenges().then(() => fetchChallenges())
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchChallenges()
    setRefreshing(false)
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.backBtn}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenges & XP</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* XP Hero Card */}
        {xp && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.xpHero}>
              <View style={styles.xpTop}>
                <View>
                  <Text style={styles.xpTotal}>{xp.total.toLocaleString()}</Text>
                  <Text style={styles.xpLevelLabel}>Level {xp.level}: {xp.levelName}</Text>
                </View>
                {streak && (
                  <View style={styles.streakContainer}>
                    <Ionicons name="flame" size={24} color={colors.warning} />
                    <Text style={styles.streakNumber}>{streak.current}</Text>
                    <Text style={styles.streakLabel}>day streak</Text>
                  </View>
                )}
              </View>
              <ProgressBar
                progress={xp.xpToNextLevel > 0 ? xp.xpInCurrentLevel / (xp.xpInCurrentLevel + xp.xpToNextLevel) : 1}
                style={{ marginTop: spacing.md }}
                label={`${xp.xpToNextLevel} XP to Level ${xp.level + 1}`}
              />
            </View>
          </Animated.View>
        )}

        {isLoading && !xp && (
          <View style={{ paddingHorizontal: spacing.md }}>
            <Skeleton style={{ width: '100%', height: 120, borderRadius: borderRadius.lg, marginBottom: spacing.md }} />
            <Skeleton style={{ width: '100%', height: 70, borderRadius: borderRadius.lg, marginBottom: spacing.sm }} />
            <Skeleton style={{ width: '100%', height: 70, borderRadius: borderRadius.lg, marginBottom: spacing.sm }} />
          </View>
        )}

        {/* Daily Challenges */}
        {dailyChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Challenges</Text>
            {dailyChallenges.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} index={i} />
            ))}
          </View>
        )}

        {/* Weekly Challenges */}
        {weeklyChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Challenges</Text>
            {weeklyChallenges.map((c, i) => (
              <ChallengeCard key={c.id} challenge={c} index={i + dailyChallenges.length} />
            ))}
          </View>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgesGrid}>
              {badges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {!isLoading && dailyChallenges.length === 0 && weeklyChallenges.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Check back for new challenges!</Text>
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

  // XP Hero
  xpHero: {
    marginHorizontal: spacing.md, marginBottom: spacing.lg,
    borderRadius: borderRadius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderAccent,
    backgroundColor: 'rgba(212,168,87,0.08)',
  },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  xpTotal: { fontSize: fontSize['3xl'], fontFamily: fontFamily.bold, color: colors.text },
  xpLevelLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, color: colors.primary },
  streakContainer: { alignItems: 'center' },
  streakNumber: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, color: colors.warning },
  streakLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.textMuted },

  // Sections
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text, marginBottom: spacing.sm },

  // Badges
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeItem: {
    width: '30%', backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.borderAccent, padding: spacing.md, alignItems: 'center',
  },
  badgeIcon: { fontSize: 28, marginBottom: spacing.xs },
  badgeName: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, color: colors.text, textAlign: 'center' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  emptyText: { fontSize: fontSize.base, fontFamily: fontFamily.regular, color: colors.textMuted, marginTop: spacing.md },
})

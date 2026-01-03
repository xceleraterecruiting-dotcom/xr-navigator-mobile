import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useAthleteStore } from '@/stores/athleteStore'
import { useCoachesStore } from '@/stores/coachesStore'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize } from '@/constants/theme'

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { welcomeMessage, headerSubtitle, primaryColor, isPhenom } = usePartnerBranding()

  const { athlete, isLoading: athleteLoading, fetchAthlete } = useAthleteStore()
  const { savedCoaches, isLoading: coachesLoading, fetchSavedCoaches } = useCoachesStore()

  const isLoading = athleteLoading || coachesLoading

  useEffect(() => {
    analytics.screenView('Dashboard')
  }, [])

  const handleRefresh = async () => {
    await Promise.all([fetchAthlete(), fetchSavedCoaches()])
  }

  // Calculate stats
  const contactedCount = savedCoaches.filter((sc) => sc.outreachStatus !== 'NOT_CONTACTED').length
  const savedCount = savedCoaches.length
  const waitingCount = savedCoaches.filter((sc) => sc.outreachStatus === 'WAITING').length

  // Get recommended action
  const getRecommendedAction = () => {
    if (!athlete) return null

    const profileComplete = athlete.position && athlete.gradYear && athlete.height && athlete.weight
    if (!profileComplete) {
      return {
        title: 'Complete Your Profile',
        description: 'Add your position, measurements, and academics to stand out to coaches.',
        action: () => router.push('/(tabs)/profile'),
        buttonText: 'Update Profile',
      }
    }

    if (savedCount === 0) {
      return {
        title: 'Find Your First Coach',
        description: 'Search our database of 7,000+ college coaches to start your recruiting journey.',
        action: () => router.push('/(tabs)/coaches'),
        buttonText: 'Browse Coaches',
      }
    }

    if (waitingCount > 0) {
      return {
        title: `Follow Up with ${waitingCount} Coach${waitingCount > 1 ? 'es' : ''}`,
        description: 'Some coaches haven\'t responded yet. Following up shows genuine interest.',
        action: () => router.push('/(tabs)/saved'),
        buttonText: 'View Waiting',
      }
    }

    return {
      title: 'Get Recruiting Advice',
      description: 'Ask XR Insight for personalized guidance on your recruiting journey.',
      action: () => router.push('/(tabs)/insight'),
      buttonText: 'Ask XR Insight',
    }
  }

  const recommendedAction = getRecommendedAction()

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={primaryColor}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.welcome, { color: primaryColor }]}>{welcomeMessage}</Text>
        {headerSubtitle && <Text style={styles.subtitle}>{headerSubtitle}</Text>}
      </View>

      {/* Partner Badge */}
      {isPhenom && (
        <Badge label="Phenom Elite Athlete" variant="primary" style={styles.partnerBadge} />
      )}

      {/* Recommended Action */}
      {recommendedAction && (
        <Card style={[styles.recommendedCard, { borderColor: primaryColor }]}>
          <Text style={styles.recommendedTitle}>{recommendedAction.title}</Text>
          <Text style={styles.recommendedDescription}>{recommendedAction.description}</Text>
          <Button
            title={recommendedAction.buttonText}
            onPress={recommendedAction.action}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* Stats */}
      <Text style={styles.sectionTitle}>Your Progress</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{contactedCount}</Text>
          <Text style={styles.statLabel}>Contacted</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{savedCount}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{athlete?.streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNumber, { color: primaryColor }]}>{athlete?.xp || 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <Button
          title="Find Coaches"
          variant="secondary"
          onPress={() => router.push('/(tabs)/coaches')}
          style={styles.quickAction}
        />
        <Button
          title="Ask XR Insight"
          variant="secondary"
          onPress={() => router.push('/(tabs)/insight')}
          style={styles.quickAction}
        />
      </View>
    </ScrollView>
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
  header: {
    marginBottom: spacing.lg,
  },
  welcome: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  partnerBadge: {
    marginBottom: spacing.lg,
  },
  recommendedCard: {
    marginBottom: spacing.xl,
    borderWidth: 2,
  },
  recommendedTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recommendedDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statNumber: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
  },
})

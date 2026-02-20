import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  TextInput,
} from 'react-native'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { haptics } from '@/lib/haptics'
import { Ionicons } from '@expo/vector-icons'

import { SchoolLogo } from '@/components/ui/SchoolLogo'
import { InterestBadge } from '@/components/ui/InterestLevel'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { PipelineListSkeleton } from '@/components/ui/Skeleton'
import { useChatStore } from '@/stores/chatStore'
import { useCoachesStore } from '@/stores/coachesStore'
import { useSubscriptionStore, useUsage } from '@/stores/subscriptionStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useDrawerStore } from '@/stores/drawerStore'
import { analytics } from '@/lib/analytics'
import { UsageBanner } from '@/components/UsageBanner'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { getSmartCTA, getInterestLevel, getFollowUpGuidance, type CoachEngagement } from '@/lib/smartCTA'
import { coachCardA11y, smartCTAA11y, filterChipA11y } from '@/lib/accessibility'
import { useButtonPress } from '@/lib/animations'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows, divisionColors, interestColors } from '@/constants/theme'
import type { SavedCoach, OutreachStatus } from '@/types'

const STATUS_OPTIONS: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'NOT_CONTACTED', label: 'Not Contacted', color: colors.textMuted },
  { value: 'SENT', label: 'Sent', color: colors.primary },
  { value: 'WAITING', label: 'Waiting', color: colors.warning },
  { value: 'RESPONDED', label: 'Responded', color: colors.success },
]

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'NOT_CONTACTED', label: 'New' },
  { value: 'SENT', label: 'Sent' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESPONDED', label: 'Replied' },
]

function getDivisionLabel(division: string) {
  if (division === 'D1_FBS_P4') return 'Power 4'
  if (division === 'D1_FBS_G5') return 'Group of 5'
  if (division === 'D1_FCS') return 'FCS'
  return division?.replace(/_/g, ' ') || ''
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt)

  const {
    savedCoaches,
    isLoading,
    fetchSavedCoaches,
    updateOutreachStatus,
    deleteSavedCoach,
  } = useCoachesStore()

  const usage = useUsage()
  const fetchUsage = useSubscriptionStore((s) => s.fetchUsage)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCoach, setSelectedCoach] = useState<SavedCoach | null>(null)
  const [detailCoach, setDetailCoach] = useState<SavedCoach | null>(null)
  const [limitModal, setLimitModal] = useState<string | null>(null)

  useEffect(() => {
    analytics.screenView('Saved Coaches')
    fetchUsage()
  }, [])

  // Filter + search
  const filteredCoaches = savedCoaches
    .filter((sc) => activeFilter === 'all' || sc.outreachStatus === activeFilter)
    .filter((sc) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const coach = sc.collegeCoach
      return (
        coach.name.toLowerCase().includes(q) ||
        coach.school.toLowerCase().includes(q) ||
        (coach.title && coach.title.toLowerCase().includes(q))
      )
    })

  // Stats
  const totalSaved = savedCoaches.length
  const contacted = savedCoaches.filter((sc) => sc.outreachStatus !== 'NOT_CONTACTED').length
  const responded = savedCoaches.filter((sc) => sc.outreachStatus === 'RESPONDED').length

  const handleStatusChange = async (savedCoach: SavedCoach, status: OutreachStatus) => {
    try {
      await updateOutreachStatus(savedCoach.id, status)
      haptics.success()
      analytics.updateOutreachStatus(status)
      setSelectedCoach(null)
    } catch (err) {
      haptics.error()
    }
  }

  const handleDelete = (savedCoach: SavedCoach) => {
    Alert.alert(
      'Remove Coach',
      `Are you sure you want to remove ${savedCoach.collegeCoach.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSavedCoach(savedCoach.id)
              haptics.success()
            } catch (err) {
              haptics.error()
            }
          },
        },
      ]
    )
  }

  const handleContactEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`)
  }

  const handleContactTwitter = (twitter: string) => {
    const handle = twitter.replace('@', '')
    Linking.openURL(`https://twitter.com/${handle}`)
  }

  const getStatusColor = (status: OutreachStatus) => {
    switch (status) {
      case 'RESPONDED': return colors.success
      case 'WAITING': return colors.warning
      case 'SENT': return colors.primary
      default: return colors.textDim
    }
  }

  const getStatusBg = (status: OutreachStatus) => {
    switch (status) {
      case 'RESPONDED': return colors.successLight
      case 'WAITING': return colors.warningLight
      case 'SENT': return colors.primaryLight
      default: return 'rgba(255,255,255,0.06)'
    }
  }

  // Helper to get engagement or create default
  const getEngagement = (savedCoach: SavedCoach): CoachEngagement => {
    if (savedCoach.engagement) return savedCoach.engagement
    // Default engagement if not available
    return {
      lastEmailSent: savedCoach.lastContactedAt,
      lastEmailOpened: null,
      lastEmailReplied: savedCoach.outreachStatus === 'RESPONDED' ? savedCoach.lastContactedAt : null,
      emailOpenCount: 0,
      emailClickCount: 0,
      twitterDiscoveredAt: null,
      twitterRespondedAt: null,
      twitterEngagementScore: null,
      lastDmAt: null,
      hasEmail: !!savedCoach.collegeCoach.email,
      hasTwitter: !!savedCoach.collegeCoach.twitter,
    }
  }

  // Handle Smart CTA press
  const handleSmartCTA = (item: SavedCoach, action: string) => {
    const coach = item.collegeCoach
    haptics.light()
    analytics.track('smart_cta_tapped', { action, coachId: coach.id })

    switch (action) {
      case 'reply':
      case 'followup':
      case 'email':
        if (coach.email) handleContactEmail(coach.email)
        break
      case 'dm':
        if (coach.twitter) handleContactTwitter(coach.twitter)
        break
      case 'view':
      default:
        router.push('/(tabs)/insight')
        break
    }
  }

  const renderSavedCoach = useCallback(({ item }: { item: SavedCoach }) => {
    const coach = item.collegeCoach
    const statusOption = STATUS_OPTIONS.find((s) => s.value === item.outreachStatus)
    const statusColor = getStatusColor(item.outreachStatus)
    const statusBg = getStatusBg(item.outreachStatus)
    const divColors = coach.division ? (divisionColors[coach.division] || divisionColors.NAIA) : null

    // Smart CTA and Interest Level
    const engagement = getEngagement(item)
    const smartCTA = getSmartCTA(engagement)
    const interest = getInterestLevel(engagement)
    const guidance = getFollowUpGuidance(engagement)
    const a11yProps = coachCardA11y({ name: coach.name, title: coach.title, school: coach.school, division: coach.division })

    return (
      <TouchableOpacity
        style={styles.coachCard}
        onPress={() => setDetailCoach(item)}
        activeOpacity={0.85}
        {...a11yProps}
      >
        {/* Top row: Logo + Name/School + Interest Badge */}
        <View style={styles.coachTopRow}>
          <View style={styles.logoWrap}>
            <SchoolLogo schoolName={coach.school} size={36} />
          </View>
          <View style={styles.coachInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.coachName} numberOfLines={1}>{coach.name}</Text>
              {interest.score > 0 && (
                <InterestBadge score={interest.score} />
              )}
            </View>
            <Text style={styles.coachTitle} numberOfLines={1}>
              {coach.title}{coach.title && coach.school ? ' · ' : ''}{coach.school}
            </Text>
          </View>
        </View>

        {/* Outreach history / guidance */}
        {(item.lastContactedAt || guidance) && (
          <View style={styles.historyRow}>
            {item.lastContactedAt && (
              <View style={styles.historyItem}>
                <Ionicons name="mail" size={12} color={colors.textTertiary} />
                <Text style={styles.historyText}>
                  Emailed {new Date(item.lastContactedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {item.outreachStatus === 'RESPONDED' && ' · Replied'}
                  {engagement.lastEmailOpened && !engagement.lastEmailReplied && ' · Opened'}
                </Text>
              </View>
            )}
            {guidance && (
              <Text style={styles.guidanceText}>{guidance}</Text>
            )}
          </View>
        )}

        {/* Signal row with glow when engaged */}
        {interest.score >= 20 && (
          <View style={[styles.signalRow, { backgroundColor: `${interest.color}10` }]}>
            <View style={[styles.signalDot, { backgroundColor: interest.color }]} />
            <Text style={[styles.signalText, { color: interest.color }]}>
              {interest.label}
            </Text>
          </View>
        )}

        {/* Bottom row: Smart CTA + secondary actions */}
        <View style={styles.bottomRow}>
          {/* Smart CTA Button */}
          <TouchableOpacity
            style={[
              styles.smartCTAButton,
              { backgroundColor: smartCTA.variant === 'ghost' ? colors.surface : `${smartCTA.color}20`, borderColor: smartCTA.color },
            ]}
            onPress={() => handleSmartCTA(item, smartCTA.action)}
            activeOpacity={0.8}
            {...smartCTAA11y(coach.name, smartCTA.label)}
          >
            <Text style={[styles.smartCTAText, { color: smartCTA.color }]}>
              {smartCTA.label}
            </Text>
          </TouchableOpacity>

          {/* Secondary channel icons (small, muted) */}
          <View style={styles.channelIcons}>
            {coach.email && smartCTA.action !== 'email' && (
              <TouchableOpacity
                style={styles.channelIcon}
                onPress={() => handleContactEmail(coach.email!)}
              >
                <Ionicons name="mail-outline" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
            {coach.twitter && smartCTA.action !== 'dm' && (
              <TouchableOpacity
                style={styles.channelIcon}
                onPress={() => handleContactTwitter(coach.twitter!)}
              >
                <Text style={styles.twitterIcon}>𝕏</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* More menu */}
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setSelectedCoach(item)}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }, [selectedCoach, detailCoach])

  const listHeader = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={{ marginRight: spacing.sm }}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Saved Coaches</Text>
            <Text style={styles.subtitle}>{totalSaved} coaches</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/coaches')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={colors.background} />
            <Text style={styles.addButtonText}>Add More</Text>
          </TouchableOpacity>
        </View>

        {/* Inline stats row */}
        <View style={styles.miniStats}>
          <Text style={[styles.miniStatInline, { color: colors.primary }]}>{totalSaved} <Text style={styles.miniStatLabel}>saved</Text></Text>
          <Text style={styles.miniStatDot}>·</Text>
          <Text style={[styles.miniStatInline, { color: colors.warning }]}>{contacted} <Text style={styles.miniStatLabel}>contacted</Text></Text>
          <Text style={styles.miniStatDot}>·</Text>
          <Text style={[styles.miniStatInline, { color: colors.success }]}>{responded} <Text style={styles.miniStatLabel}>replied</Text></Text>
        </View>

        {usage?.savedCoaches && usage.savedCoaches.limit > 0 && (
          <View style={styles.usageBannerWrap}>
            <UsageBanner label="Saved Coaches" usage={usage.savedCoaches} />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coaches..."
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.value
            const count = item.value === 'all'
              ? savedCoaches.length
              : savedCoaches.filter((sc) => sc.outreachStatus === item.value).length
            const a11y = filterChipA11y(item.label, isActive)
            return (
              <TouchableOpacity
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => {
                  setActiveFilter(item.value)
                  haptics.light()
                }}
                {...a11y}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      </View>
    </>
  )

  // Show skeleton on initial load
  if (isLoading && savedCoaches.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={{ marginRight: spacing.sm }}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Saved Coaches</Text>
              <Text style={styles.subtitle}>Loading...</Text>
            </View>
          </View>
        </View>
        <PipelineListSkeleton />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner screen="pipeline" />
      <FlatList
        data={filteredCoaches}
        keyExtractor={(item) => item.id}
        renderItem={renderSavedCoach}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchSavedCoaches}
            tintColor={primaryColor}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={colors.textDim} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'No coaches saved yet' : 'None with this status'}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Start by searching and saving coaches you want to contact.'
                : 'Update coach statuses to track your outreach progress.'}
            </Text>
          </View>
        }
      />

      <LimitReachedModal
        message={limitModal || ''}
        visible={!!limitModal}
        onDismiss={() => setLimitModal(null)}
      />

      {/* Status Picker Modal with spring animation */}
      {selectedCoach && (
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.modalBackground}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedCoach(null)}
              activeOpacity={1}
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(300)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}
          >
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>UPDATE STATUS</Text>
            <Text style={styles.modalSubtitle}>{selectedCoach.collegeCoach.name}</Text>

            {STATUS_OPTIONS.map((option) => {
              const isActive = selectedCoach.outreachStatus === option.value
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    isActive && { backgroundColor: `${option.color}15` },
                  ]}
                  onPress={() => handleStatusChange(selectedCoach, option.value)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${option.label} status`}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: option.color }]} />
                  <Text style={[styles.statusOptionText, isActive && { color: option.color, fontFamily: fontFamily.bold }]}>
                    {option.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={20} color={option.color} />
                  )}
                </TouchableOpacity>
              )
            })}

            {/* Delete option */}
            <TouchableOpacity
              style={styles.deleteOption}
              onPress={() => {
                setSelectedCoach(null)
                handleDelete(selectedCoach)
              }}
              activeOpacity={0.7}
              accessibilityLabel="Remove coach from pipeline"
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteOptionText}>Remove from Pipeline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSelectedCoach(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Coach Detail Modal */}
      {detailCoach && (() => {
        const coach = detailCoach.collegeCoach
        const divColors = coach.division ? (divisionColors[coach.division] || divisionColors.NAIA) : null
        const engagement = getEngagement(detailCoach)
        const interest = getInterestLevel(engagement)

        return (
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              style={styles.modalBackground}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                onPress={() => setDetailCoach(null)}
                activeOpacity={1}
              />
            </Animated.View>
            <Animated.View
              entering={SlideInDown.springify().damping(20).stiffness(300)}
              exiting={SlideOutDown.duration(200)}
              style={[styles.detailModal, { paddingBottom: insets.bottom + spacing.lg }]}
            >
              <View style={styles.modalHandle} />

              {/* Close button */}
              <TouchableOpacity
                style={styles.detailModalClose}
                onPress={() => setDetailCoach(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Coach info */}
              <Text style={styles.detailModalName}>{coach.name}</Text>
              <Text style={styles.detailModalTitle}>{coach.title}</Text>

              {/* Division + Conference */}
              <View style={styles.detailModalBadges}>
                {divColors && (
                  <View style={[styles.detailModalDivBadge, { backgroundColor: divColors.bg, borderColor: divColors.border }]}>
                    <Text style={[styles.detailModalDivText, { color: divColors.text }]}>
                      {getDivisionLabel(coach.division!)}
                    </Text>
                  </View>
                )}
                {coach.conference && (
                  <Text style={styles.detailModalConf}>{coach.conference}</Text>
                )}
                {interest.score > 0 && (
                  <InterestBadge score={interest.score} />
                )}
              </View>

              {/* School */}
              <View style={styles.detailModalSchoolRow}>
                <Text style={styles.detailModalLabel}>School</Text>
                <View style={styles.detailModalSchoolInner}>
                  <SchoolLogo schoolName={coach.school} size={24} />
                  <Text style={styles.detailModalSchool}>{coach.school}</Text>
                </View>
              </View>

              {/* Email */}
              {coach.email && (
                <View style={styles.detailModalInfoRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.detailModalInfoText, { color: colors.primary }]}>{coach.email}</Text>
                </View>
              )}

              {/* Twitter */}
              {coach.twitter && (
                <View style={styles.detailModalInfoRow}>
                  <Text style={styles.twitterIcon}>𝕏</Text>
                  <Text style={[styles.detailModalInfoText, { color: colors.primary }]}>@{coach.twitter.replace('@', '')}</Text>
                </View>
              )}

              {/* Outreach Status */}
              <View style={styles.detailModalStatusRow}>
                <Text style={styles.detailModalLabel}>Status</Text>
                <View style={[styles.detailModalStatusBadge, { backgroundColor: getStatusBg(detailCoach.outreachStatus) }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(detailCoach.outreachStatus) }]} />
                  <Text style={[styles.detailModalStatusText, { color: getStatusColor(detailCoach.outreachStatus) }]}>
                    {STATUS_OPTIONS.find(s => s.value === detailCoach.outreachStatus)?.label}
                  </Text>
                </View>
              </View>

              {/* Last contacted */}
              {detailCoach.lastContactedAt && (
                <View style={styles.detailModalInfoRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                  <Text style={styles.detailModalInfoTextMuted}>
                    Last contacted {new Date(detailCoach.lastContactedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.detailModalActions}>
                {coach.email && (
                  <TouchableOpacity
                    style={[styles.detailModalActionBtn, { backgroundColor: primaryColor }]}
                    onPress={() => {
                      Linking.openURL(`mailto:${coach.email}`)
                      setDetailCoach(null)
                    }}
                  >
                    <Text style={styles.detailModalActionText}>Send Email</Text>
                  </TouchableOpacity>
                )}
                {coach.twitter && (
                  <TouchableOpacity
                    style={styles.detailModalActionBtnOutline}
                    onPress={() => {
                      Linking.openURL(`https://twitter.com/${coach.twitter?.replace('@', '')}`)
                      setDetailCoach(null)
                    }}
                  >
                    <Text style={styles.detailModalActionOutlineText}>View 𝕏</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.detailModalActionBtnOutline}
                  onPress={() => {
                    setDetailCoach(null)
                    setSelectedCoach(detailCoach)
                  }}
                >
                  <Ionicons name="sync-outline" size={14} color={colors.text} />
                  <Text style={styles.detailModalActionOutlineText}>Update Status</Text>
                </TouchableOpacity>
              </View>

              {/* AI approach link */}
              <TouchableOpacity
                style={styles.approachLink}
                activeOpacity={0.7}
                onPress={() => {
                  setPendingPrompt(`How should I approach ${coach.name}, ${coach.title} at ${coach.school}? What should I say in my first message?`)
                  setDetailCoach(null)
                  router.push('/(tabs)/insight')
                }}
              >
                <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                <Text style={styles.approachText}>How should I approach this coach?</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )
      })()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },

  // ── Mini stats ──
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  miniStatInline: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
  },
  miniStatLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  miniStatDot: {
    fontSize: fontSize.sm,
    color: colors.textDim,
  },
  usageBannerWrap: {
    marginTop: spacing.sm,
  },

  // ── Search ──
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    height: 40,
  },

  // ── Filter Tabs ──
  filterRow: {
    marginBottom: spacing.sm,
  },
  filterTabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  filterTabTextActive: {
    color: colors.background,
  },
  filterCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  filterCountText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  filterCountTextActive: {
    color: colors.background,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },

  // ── Coach card ──
  coachCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  coachTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coachInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    flexShrink: 1,
  },
  coachTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  divBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  divBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },

  // History & guidance row
  historyRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textTertiary,
  },
  guidanceText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.warning,
    fontStyle: 'italic',
  },

  // Signal row (interest indicator)
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  signalText: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.3,
  },

  // Bottom row: Smart CTA + actions
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  smartCTAButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  smartCTAText: {
    fontSize: 13,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.3,
  },
  channelIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  twitterIcon: {
    fontSize: 12,
    fontFamily: fontFamily.semibold,
    color: colors.textTertiary,
  },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legacy status (for modal)
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty ──
  empty: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },

  // ── Modal ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
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
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    marginBottom: spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontFamily: fontFamily.semibold,
    flex: 1,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  deleteOptionText: {
    fontSize: fontSize.base,
    color: colors.error,
    fontFamily: fontFamily.semibold,
    flex: 1,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
  },

  // ── Coach Detail Modal ──
  detailModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  detailModalClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1,
  },
  detailModalName: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: 2,
    paddingRight: 40,
  },
  detailModalTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.md,
  },
  detailModalBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  detailModalDivBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  detailModalDivText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
  },
  detailModalConf: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  detailModalSchoolRow: {
    marginBottom: spacing.md,
  },
  detailModalLabel: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  detailModalSchoolInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailModalSchool: {
    fontSize: fontSize.base,
    color: colors.text,
    fontFamily: fontFamily.semibold,
  },
  detailModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailModalInfoText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  detailModalInfoTextMuted: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  detailModalStatusRow: {
    marginBottom: spacing.sm,
  },
  detailModalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  detailModalStatusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
  },
  detailModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  detailModalActionBtn: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  detailModalActionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  detailModalActionBtnOutline: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailModalActionOutlineText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  approachLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    marginTop: spacing.sm,
  },
  approachText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.semibold,
  },
})

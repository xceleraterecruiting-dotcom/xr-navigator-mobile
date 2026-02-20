/**
 * Pipeline-First Outreach Screen
 *
 * Priority order:
 * 1. Engaged/Hot - Coaches showing interest RIGHT NOW
 * 2. Waiting for Reply - Sent, no response (follow-up at 5+ days)
 * 3. Responded - The wins
 * 4. Need to Contact - The to-do list
 */

import React, { useEffect, useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  Linking,
  Alert,
  Clipboard,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { haptics } from '@/lib/haptics'
import { analytics } from '@/lib/analytics'
import { useDrawerStore } from '@/stores/drawerStore'
import { useToast } from '@/components/ui/Toast'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { Skeleton } from '@/components/ui/Skeleton'
import { SchoolLogo } from '@/components/ui/SchoolLogo'
import {
  useOutreachStore,
  useOutreachSections,
  useOutreachLoading,
  useEmailConnected,
  useTwitterConnected,
  useHotCount,
  OutreachItem,
  OutreachSection,
} from '@/stores/outreachStore'
import { api } from '@/lib/api'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows, divisionColors } from '@/constants/theme'

// Action button styles based on suggested action
const ACTION_STYLES: Record<OutreachItem['suggestedAction'], { icon: string; label: string; color: string; bgColor: string }> = {
  send_email: { icon: 'mail', label: 'Email', color: colors.text, bgColor: colors.cardElevated },
  send_dm: { icon: 'logo-twitter', label: 'DM', color: '#1DA1F2', bgColor: 'rgba(29,161,242,0.15)' },
  follow_up: { icon: 'refresh', label: 'Follow Up', color: colors.warning, bgColor: 'rgba(251,191,36,0.15)' },
  view_reply: { icon: 'chatbubble', label: 'View Reply', color: colors.success, bgColor: 'rgba(34,197,94,0.15)' },
  thank_you: { icon: 'heart', label: 'Thank You', color: colors.error, bgColor: 'rgba(248,113,113,0.15)' },
}

// Section header styles
const SECTION_STYLES: Record<OutreachSection['key'], { icon: string; color: string }> = {
  engaged: { icon: 'flame', color: '#FF6B6B' },
  waiting: { icon: 'time', color: colors.warning },
  responded: { icon: 'checkmark-circle', color: colors.success },
  need_contact: { icon: 'list', color: colors.textMuted },
}

function OutreachCard({ item, onEmail, onDM }: {
  item: OutreachItem
  onEmail: () => void
  onDM: () => void
}) {
  const divColor = item.coach.division
    ? divisionColors[item.coach.division] || divisionColors.NAIA
    : null

  const actionStyle = ACTION_STYLES[item.suggestedAction]

  // Format time ago
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return `${Math.floor(diffDays / 7)}w ago`
  }

  // Status line
  let statusLine = ''
  let statusColor = colors.textMuted

  if (item.status === 'engaged') {
    if (item.emailOpenedAt) {
      statusLine = `Opened email ${formatTimeAgo(item.emailOpenedAt)}`
      if (item.emailOpenCount > 1) statusLine += ` (${item.emailOpenCount}×)`
      statusColor = colors.success
    } else if (item.isFollowingOnTwitter && item.twitterDiscoveredAt) {
      statusLine = `Followed you ${formatTimeAgo(item.twitterDiscoveredAt)}`
      statusColor = '#1DA1F2'
    }
  } else if (item.status === 'waiting') {
    if (item.emailSentAt) {
      statusLine = `Email sent ${formatTimeAgo(item.emailSentAt)}`
      if (item.daysSinceContact && item.daysSinceContact >= 5) {
        statusLine += ' • Follow up recommended'
        statusColor = colors.warning
      }
    } else if (item.twitterDmSentAt) {
      statusLine = `DM sent ${formatTimeAgo(item.twitterDmSentAt)}`
    }
  } else if (item.status === 'responded') {
    if (item.emailRepliedAt) {
      statusLine = `Replied ${formatTimeAgo(item.emailRepliedAt)}`
      statusColor = colors.success
    } else if (item.twitterRepliedAt) {
      statusLine = `DM replied ${formatTimeAgo(item.twitterRepliedAt)}`
      statusColor = colors.success
    }
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[styles.card, item.isHot && styles.cardHot]}
    >
      {/* Hot badge */}
      {item.isHot && (
        <View style={styles.hotBadge}>
          <Ionicons name="flame" size={12} color="#FF6B6B" />
          <Text style={styles.hotBadgeText}>HOT</Text>
        </View>
      )}

      {/* Main content */}
      <View style={styles.cardContent}>
        {/* Row 1: Name + Division */}
        <View style={styles.nameRow}>
          <Text style={styles.coachName} numberOfLines={1}>{item.coach.name}</Text>
          {divColor && (
            <View style={[styles.divBadge, { backgroundColor: divColor.bg, borderColor: divColor.border }]}>
              <Text style={[styles.divBadgeText, { color: divColor.text }]}>
                {item.coach.division?.replace('D1_FBS_', '').replace('D1_', '')}
              </Text>
            </View>
          )}
        </View>

        {/* Row 2: Title */}
        <Text style={styles.coachTitle} numberOfLines={1}>{item.coach.title}</Text>

        {/* Row 3: School */}
        <View style={styles.schoolRow}>
          <SchoolLogo schoolName={item.coach.school} size={20} />
          <Text style={styles.schoolName} numberOfLines={1}>{item.coach.school}</Text>
          {item.coach.conference && (
            <Text style={styles.confText}>{item.coach.conference}</Text>
          )}
        </View>

        {/* Row 4: Status line */}
        {statusLine && (
          <Text style={[styles.statusLine, { color: statusColor }]}>{statusLine}</Text>
        )}

        {/* Row 5: Action buttons */}
        <View style={styles.actionRow}>
          {/* Channel indicators */}
          <View style={styles.channels}>
            {item.hasEmail && (
              <Ionicons name="mail-outline" size={14} color={colors.textDim} />
            )}
            {(item.hasTwitter || item.isFollowingOnTwitter) && (
              <Ionicons
                name="logo-twitter"
                size={14}
                color={item.isFollowingOnTwitter ? '#1DA1F2' : colors.textDim}
              />
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            {item.hasEmail && (
              <TouchableOpacity
                style={[styles.actionBtn, item.suggestedAction === 'send_email' && styles.actionBtnPrimary]}
                onPress={onEmail}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color={item.suggestedAction === 'send_email' ? colors.background : colors.text}
                />
                <Text style={[
                  styles.actionBtnText,
                  item.suggestedAction === 'send_email' && styles.actionBtnTextPrimary
                ]}>Email</Text>
              </TouchableOpacity>
            )}

            {(item.hasTwitter || item.isFollowingOnTwitter) && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  (item.suggestedAction === 'send_dm' || (!item.hasEmail && item.status === 'need_contact')) && styles.actionBtnTwitter
                ]}
                onPress={onDM}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="logo-twitter"
                  size={14}
                  color={(item.suggestedAction === 'send_dm' || (!item.hasEmail && item.status === 'need_contact')) ? '#1DA1F2' : colors.text}
                />
                <Text style={[
                  styles.actionBtnText,
                  (item.suggestedAction === 'send_dm' || (!item.hasEmail && item.status === 'need_contact')) && { color: '#1DA1F2' }
                ]}>DM</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

function SectionHeader({ section }: { section: OutreachSection }) {
  const style = SECTION_STYLES[section.key]
  const count = section.items.length
  const hotCount = section.items.filter(i => i.isHot).length

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={style.icon as any} size={18} color={style.color} />
        <Text style={[styles.sectionTitle, { color: style.color }]}>{section.title}</Text>
        <View style={[styles.countBadge, { backgroundColor: `${style.color}20` }]}>
          <Text style={[styles.countBadgeText, { color: style.color }]}>{count}</Text>
        </View>
        {hotCount > 0 && section.key === 'engaged' && (
          <View style={styles.hotCountBadge}>
            <Ionicons name="flame" size={12} color="#FF6B6B" />
            <Text style={styles.hotCountText}>{hotCount}</Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
    </View>
  )
}

function EmptySection({ section }: { section: OutreachSection }) {
  return (
    <View style={styles.emptySection}>
      <Text style={styles.emptySectionText}>{section.emptyMessage}</Text>
    </View>
  )
}

function ConnectionBanner({ emailConnected, twitterConnected, onConnect }: {
  emailConnected: boolean
  twitterConnected: boolean
  onConnect: (type: 'email' | 'twitter') => void
}) {
  if (emailConnected && twitterConnected) return null

  return (
    <View style={styles.connectionBanner}>
      {!emailConnected && (
        <TouchableOpacity
          style={styles.connectBtn}
          onPress={() => onConnect('email')}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={16} color={colors.primary} />
          <Text style={styles.connectBtnText}>Connect Email</Text>
        </TouchableOpacity>
      )}
      {!twitterConnected && (
        <TouchableOpacity
          style={styles.connectBtn}
          onPress={() => onConnect('twitter')}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-twitter" size={16} color="#1DA1F2" />
          <Text style={[styles.connectBtnText, { color: '#1DA1F2' }]}>Connect Twitter</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function OutreachScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const openDrawer = useDrawerStore((s) => s.open)

  const sections = useOutreachSections()
  const isLoading = useOutreachLoading()
  const emailConnected = useEmailConnected()
  const twitterConnected = useTwitterConnected()
  const hotCount = useHotCount()
  const fetchOutreach = useOutreachStore((s) => s.fetchOutreach)

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    analytics.screenView('Outreach')
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchOutreach()
    }, [])
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchOutreach()
    setRefreshing(false)
  }

  const handleConnect = (type: 'email' | 'twitter') => {
    haptics.light()
    if (type === 'email') {
      router.push('/(tabs)/email-connect' as any)
    } else {
      router.push('/(tabs)/twitter' as any)
    }
  }

  const handleEmail = async (item: OutreachItem) => {
    haptics.light()
    analytics.track('outreach_email_tap', {
      coachId: item.coach.id,
      status: item.status,
    })

    if (!item.coach.email) {
      toast.show('No email available for this coach', 'error')
      return
    }

    // For engaged/responded, could show conversation
    // For now, open email composer
    Linking.openURL(`mailto:${item.coach.email}`)
  }

  const handleDM = async (item: OutreachItem) => {
    haptics.light()
    analytics.track('outreach_dm_tap', {
      coachId: item.coach.id,
      status: item.status,
      isFollowing: item.isFollowingOnTwitter,
    })

    const handle = item.coach.twitter?.replace('@', '')
    if (!handle && !item.isFollowingOnTwitter) {
      toast.show('No Twitter available for this coach', 'error')
      return
    }

    // Generate DM message
    try {
      const result = await api.generateTwitterDM({
        coachId: item.coach.id,
        coachName: item.coach.name,
        school: item.coach.school,
        title: item.coach.title,
        isFollowUp: item.status === 'waiting',
      })

      // Copy to clipboard
      Clipboard.setString(result.message)
      toast.show('DM copied! Opening Twitter...', 'success')

      // Open Twitter profile
      setTimeout(() => {
        const twitterUrl = handle
          ? `https://twitter.com/${handle}`
          : 'https://twitter.com/messages'
        Linking.openURL(twitterUrl)
      }, 500)
    } catch (error) {
      // Fallback - just open profile
      if (handle) {
        Linking.openURL(`https://twitter.com/${handle}`)
      }
    }
  }

  const handleCreateCampaign = () => {
    haptics.medium()
    if (!emailConnected) {
      toast.show('Connect your email first to send campaigns', 'info')
      router.push('/(tabs)/email-connect' as any)
      return
    }
    router.push('/campaign/new' as any)
  }

  // Filter out empty sections except need_contact
  const visibleSections = sections.filter(
    s => s.items.length > 0 || s.key === 'need_contact'
  )

  // Loading state
  if (isLoading && sections.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Outreach</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingSkeleton}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              style={{ width: '100%', height: 120, borderRadius: borderRadius.xl, marginBottom: spacing.sm }}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner screen="outreach" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Outreach</Text>
          {hotCount > 0 && (
            <View style={styles.headerHotBadge}>
              <Ionicons name="flame" size={14} color="#FF6B6B" />
              <Text style={styles.headerHotText}>{hotCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={handleCreateCampaign}
          style={styles.addBtn}
        >
          <Ionicons
            name="add-circle"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Connection banner */}
      <ConnectionBanner
        emailConnected={emailConnected}
        twitterConnected={twitterConnected}
        onConnect={handleConnect}
      />

      {/* Main list */}
      <SectionList
        sections={visibleSections.map(s => ({ ...s, data: s.items.length > 0 ? s.items : [null] }))}
        keyExtractor={(item, index) => item?.id ?? `empty-${index}`}
        renderItem={({ item, section }) => {
          if (!item) {
            return <EmptySection section={section as OutreachSection} />
          }
          return (
            <OutreachCard
              item={item}
              onEmail={() => handleEmail(item)}
              onDM={() => handleDM(item)}
            />
          )
        }}
        renderSectionHeader={({ section }) => (
          <SectionHeader section={section as OutreachSection} />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  menuBtn: {
    padding: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  headerHotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,107,107,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  headerHotText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: '#FF6B6B',
  },
  addBtn: {
    padding: spacing.sm,
  },
  connectionBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  connectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
  },
  connectBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  loadingSkeleton: {
    padding: spacing.md,
  },

  // Section header
  sectionHeader: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
  },
  hotCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: spacing.xs,
  },
  hotCountText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: '#FF6B6B',
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Empty section
  emptySection: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  emptySectionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardHot: {
    borderColor: 'rgba(255,107,107,0.4)',
    backgroundColor: 'rgba(255,107,107,0.05)',
  },
  hotBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,107,107,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: borderRadius.md,
    zIndex: 1,
  },
  hotBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: '#FF6B6B',
  },
  cardContent: {
    padding: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingRight: 50, // Space for hot badge
  },
  coachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
    flex: 1,
  },
  divBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  divBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  coachTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  schoolName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  confText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
  },
  statusLine: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    marginTop: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  channels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnTwitter: {
    backgroundColor: 'rgba(29,161,242,0.15)',
    borderColor: 'rgba(29,161,242,0.3)',
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  actionBtnTextPrimary: {
    color: colors.background,
  },
})

import React, { useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { haptics } from '@/lib/haptics'
import { analytics } from '@/lib/analytics'
import { useToast } from '@/components/ui/Toast'
import { useCampaignStore, useCurrentCampaign, useIsCampaignLoading, useIsCampaignSending } from '@/stores/campaignStore'
import { colors, spacing, fontSize, borderRadius, fontFamily, cardStyles, divisionColors } from '@/constants/theme'
import type { CampaignStatus, RecipientStatus, Division } from '@/types'

// Status colors
const STATUS_COLORS: Record<CampaignStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'rgba(255,255,255,0.1)', text: colors.textMuted, label: 'Draft' },
  SCHEDULED: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', label: 'Scheduled' },
  SENDING: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Sending' },
  COMPLETED: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', label: 'Completed' },
  FAILED: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Failed' },
  CANCELLED: { bg: 'rgba(255,255,255,0.08)', text: colors.textDim, label: 'Cancelled' },
}

const RECIPIENT_STATUS_COLORS: Record<RecipientStatus, { icon: string; color: string }> = {
  PENDING: { icon: 'time-outline', color: colors.textMuted },
  SENT: { icon: 'checkmark-circle', color: colors.success },
  FAILED: { icon: 'close-circle', color: colors.error },
  BOUNCED: { icon: 'alert-circle', color: colors.warning },
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function CampaignDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const { id } = useLocalSearchParams<{ id: string }>()

  const campaign = useCurrentCampaign()
  const isLoading = useIsCampaignLoading()
  const isSending = useIsCampaignSending()
  const fetchCampaign = useCampaignStore((s) => s.fetchCampaign)
  const sendCampaign = useCampaignStore((s) => s.sendCampaign)
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign)
  const clearCurrentCampaign = useCampaignStore((s) => s.clearCurrentCampaign)

  useEffect(() => {
    analytics.screenView('CampaignDetail')
    return () => clearCurrentCampaign()
  }, [id])

  useFocusEffect(
    useCallback(() => {
      if (id) fetchCampaign(id)
    }, [id])
  )

  // Auto-refresh while sending
  useEffect(() => {
    if (campaign?.status === 'SENDING') {
      const interval = setInterval(() => fetchCampaign(id!), 5000)
      return () => clearInterval(interval)
    }
  }, [campaign?.status, id])

  const handleRefresh = () => {
    if (id) fetchCampaign(id)
  }

  const handleSendNow = async () => {
    if (!campaign || campaign.status !== 'DRAFT') return

    Alert.alert(
      'Send Campaign',
      `Send to ${campaign.totalRecipients} coaches now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            haptics.medium()
            try {
              const result = await sendCampaign(campaign.id, { action: 'send' })
              if (result.success) {
                toast.show(`Sent to ${result.sentCount} coaches`, 'success')
              }
              fetchCampaign(id!)
            } catch {
              toast.show('Failed to send campaign', 'error')
            }
          },
        },
      ]
    )
  }

  const handleRetry = async () => {
    if (!campaign) return

    Alert.alert(
      'Retry Failed',
      'Retry sending to failed recipients?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: async () => {
            haptics.medium()
            try {
              const result = await sendCampaign(campaign.id, { action: 'retry' })
              if (result.success) {
                toast.show(`Retried ${result.sentCount} emails`, 'success')
              }
              fetchCampaign(id!)
            } catch {
              toast.show('Failed to retry', 'error')
            }
          },
        },
      ]
    )
  }

  const handleDelete = () => {
    if (!campaign) return

    Alert.alert(
      'Delete Campaign',
      'Are you sure you want to delete this campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptics.heavy()
            try {
              await deleteCampaign(campaign.id)
              toast.show('Campaign deleted', 'info')
              router.back()
            } catch {
              toast.show('Failed to delete campaign', 'error')
            }
          },
        },
      ]
    )
  }

  if (isLoading && !campaign) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!campaign) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Campaign not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.DRAFT
  const openRate = campaign.sentCount > 0
    ? Math.round((campaign.openCount / campaign.sentCount) * 100)
    : 0
  const clickRate = campaign.sentCount > 0
    ? Math.round((campaign.clickCount / campaign.sentCount) * 100)
    : 0
  const failedCount = campaign.recipients.filter((r) => r.status === 'FAILED').length

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {campaign.name || 'Campaign'}
        </Text>
        {(campaign.status === 'DRAFT' || campaign.status === 'CANCELLED') && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
        {campaign.status !== 'DRAFT' && campaign.status !== 'CANCELLED' && (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusStyle.bg }]}>
          <View style={styles.statusContent}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusStyle.label}
            </Text>
          </View>
          {campaign.status === 'SENDING' && (
            <ActivityIndicator size="small" color={statusStyle.text} />
          )}
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Subject</Text>
          <Text style={styles.subjectText}>{campaign.subject}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Recipients" value={campaign.totalRecipients} icon="people" />
          <StatCard label="Sent" value={campaign.sentCount} icon="send" />
          <StatCard label="Open Rate" value={`${openRate}%`} icon="mail-open" />
          <StatCard label="Click Rate" value={`${clickRate}%`} icon="hand-left" />
        </View>

        {/* Recipients */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recipients ({campaign.recipients.length})</Text>

          {campaign.recipients.map((recipient) => {
            const statusInfo = RECIPIENT_STATUS_COLORS[recipient.status] || RECIPIENT_STATUS_COLORS.PENDING
            const divStyle = recipient.coach.division
              ? divisionColors[recipient.coach.division]
              : null

            return (
              <View key={recipient.id} style={[cardStyles.base, styles.recipientCard]}>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>{recipient.coach.name}</Text>
                  <Text style={styles.recipientSchool}>
                    {recipient.coach.title} • {recipient.coach.school}
                  </Text>
                  {recipient.failureReason && (
                    <Text style={styles.failureReason}>{recipient.failureReason}</Text>
                  )}
                </View>

                <View style={styles.recipientStatus}>
                  {divStyle && (
                    <View
                      style={[styles.divisionBadge, { backgroundColor: divStyle.bg }]}
                    >
                      <Text style={[styles.divisionText, { color: divStyle.text }]}>
                        {recipient.coach.division?.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.statusIcon}>
                    <Ionicons
                      name={statusInfo.icon as any}
                      size={20}
                      color={statusInfo.color}
                    />
                    {recipient.openCount > 0 && (
                      <View style={styles.openBadge}>
                        <Text style={styles.openBadgeText}>{recipient.openCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Action Button */}
      {campaign.status === 'DRAFT' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={[styles.actionBtn, isSending && styles.btnDisabled]}
            onPress={handleSendNow}
            disabled={isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.background} />
                <Text style={styles.actionBtnText}>Send Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {failedCount > 0 && campaign.status === 'COMPLETED' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={[styles.retryBtn, isSending && styles.btnDisabled]}
            onPress={handleRetry}
            disabled={isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color={colors.text} />
                <Text style={styles.retryBtnText}>Retry {failedCount} Failed</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  backLink: {
    padding: spacing.sm,
  },
  backLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backBtn: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
  },
  section: {
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  subjectText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  recipientSchool: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  failureReason: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.error,
    marginTop: spacing.xs,
  },
  recipientStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divisionBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  divisionText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  statusIcon: {
    position: 'relative',
  },
  openBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionBtnText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  retryBtnText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  btnDisabled: {
    opacity: 0.5,
  },
})

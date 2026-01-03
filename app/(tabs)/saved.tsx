import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useCoachesStore } from '@/stores/coachesStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme'
import type { SavedCoach, OutreachStatus } from '@/types'

const STATUS_OPTIONS: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'NOT_CONTACTED', label: 'Not Contacted', color: colors.textMuted },
  { value: 'SENT', label: 'Sent', color: colors.primary },
  { value: 'WAITING', label: 'Waiting', color: colors.warning },
  { value: 'RESPONDED', label: 'Responded', color: colors.success },
]

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'NOT_CONTACTED', label: 'Not Contacted' },
  { value: 'SENT', label: 'Sent' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESPONDED', label: 'Responded' },
]

export default function SavedScreen() {
  const insets = useSafeAreaInsets()
  const { primaryColor } = usePartnerBranding()

  const {
    savedCoaches,
    isLoading,
    fetchSavedCoaches,
    updateOutreachStatus,
    deleteSavedCoach,
  } = useCoachesStore()

  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedCoach, setSelectedCoach] = useState<SavedCoach | null>(null)

  useEffect(() => {
    analytics.screenView('Saved Coaches')
  }, [])

  const filteredCoaches =
    activeFilter === 'all'
      ? savedCoaches
      : savedCoaches.filter((sc) => sc.outreachStatus === activeFilter)

  const handleStatusChange = async (savedCoach: SavedCoach, status: OutreachStatus) => {
    try {
      await updateOutreachStatus(savedCoach.id, status)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      analytics.updateOutreachStatus(status)
      setSelectedCoach(null)
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            } catch (err) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
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

  const getStatusBadgeVariant = (status: OutreachStatus): 'default' | 'success' | 'warning' | 'primary' => {
    switch (status) {
      case 'RESPONDED':
        return 'success'
      case 'WAITING':
        return 'warning'
      case 'SENT':
        return 'primary'
      default:
        return 'default'
    }
  }

  const renderSavedCoach = ({ item }: { item: SavedCoach }) => {
    const coach = item.collegeCoach
    const statusOption = STATUS_OPTIONS.find((s) => s.value === item.outreachStatus)

    return (
      <Card style={styles.coachCard}>
        <View style={styles.coachHeader}>
          <View style={styles.coachInfo}>
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.coachTitle}>{coach.title}</Text>
            <Text style={styles.schoolName}>{coach.school}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <TouchableOpacity
          style={styles.statusContainer}
          onPress={() => setSelectedCoach(item)}
        >
          <Badge
            label={statusOption?.label || 'Unknown'}
            variant={getStatusBadgeVariant(item.outreachStatus)}
          />
          <Text style={styles.changeStatus}>Tap to change</Text>
        </TouchableOpacity>

        {/* Contact Actions */}
        {(coach.email || coach.twitter) && (
          <View style={styles.contactActions}>
            {coach.email && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContactEmail(coach.email!)}
              >
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            {coach.twitter && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleContactTwitter(coach.twitter!)}
              >
                <Text style={styles.contactButtonText}>Twitter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Last Contacted */}
        {item.lastContactedAt && (
          <Text style={styles.lastContacted}>
            Last contacted: {new Date(item.lastContactedAt).toLocaleDateString()}
          </Text>
        )}
      </Card>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Saved Coaches</Text>
        <Text style={styles.subtitle}>{savedCoaches.length} coaches saved</Text>
      </View>

      {/* Filter Tabs */}
      <FlatList
        horizontal
        data={FILTER_TABS}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        style={styles.filterTabs}
        contentContainerStyle={styles.filterTabsContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === item.value && { backgroundColor: primaryColor },
            ]}
            onPress={() => {
              setActiveFilter(item.value)
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === item.value && { color: colors.background },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Coaches List */}
      <FlatList
        data={filteredCoaches}
        keyExtractor={(item) => item.id}
        renderItem={renderSavedCoach}
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
            <Text style={styles.emptyTitle}>No coaches yet</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Start by searching and saving coaches you want to contact.'
                : 'No coaches with this status.'}
            </Text>
          </View>
        }
      />

      {/* Status Picker Modal */}
      {selectedCoach && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setSelectedCoach(null)}
            activeOpacity={1}
          />
          <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <Text style={styles.modalSubtitle}>{selectedCoach.collegeCoach.name}</Text>

            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  selectedCoach.outreachStatus === option.value && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange(selectedCoach, option.value)}
              >
                <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                <Text style={styles.statusOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setSelectedCoach(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  filterTabs: {
    maxHeight: 44,
    marginBottom: spacing.md,
  },
  filterTabsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  coachCard: {
    gap: spacing.sm,
  },
  coachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  coachTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  schoolName: {
    fontSize: fontSize.base,
    color: colors.text,
    marginTop: spacing.xs,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    color: colors.textMuted,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  changeStatus: {
    fontSize: fontSize.xs,
    color: colors.textDim,
  },
  contactActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  lastContacted: {
    fontSize: fontSize.xs,
    color: colors.textDim,
  },
  empty: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: `${colors.primary}10`,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
})

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCoachesStore, useSavedCoachIds } from '@/stores/coachesStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme'
import type { CollegeCoach } from '@/types'

const DIVISIONS = ['D1 FBS', 'D1 FCS', 'D2', 'D3', 'NAIA']

export default function CoachesScreen() {
  const insets = useSafeAreaInsets()
  const { primaryColor } = usePartnerBranding()

  const {
    coaches,
    isLoading,
    isSaving,
    error,
    hasMore,
    searchQuery,
    fetchCoaches,
    searchCoaches,
    saveCoach,
    clearSearch,
  } = useCoachesStore()

  const savedCoachIds = useSavedCoachIds()
  const [localQuery, setLocalQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)

  useEffect(() => {
    analytics.screenView('Coaches')
    fetchCoaches(true)
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim()) {
        searchCoaches(localQuery)
      } else if (searchQuery) {
        clearSearch()
        fetchCoaches(true)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localQuery])

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore && !searchQuery) {
      fetchCoaches()
    }
  }, [isLoading, hasMore, searchQuery])

  const handleSaveCoach = async (coach: CollegeCoach) => {
    try {
      await saveCoach(coach.id)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      analytics.saveCoach(coach.id, coach.school)
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const renderCoach = ({ item: coach }: { item: CollegeCoach }) => {
    const isSaved = savedCoachIds.has(coach.id)

    return (
      <Card style={styles.coachCard}>
        <View style={styles.coachHeader}>
          <View style={styles.coachInfo}>
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.coachTitle}>{coach.title}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, isSaved && styles.savedButton]}
            onPress={() => !isSaved && handleSaveCoach(coach)}
            disabled={isSaved || isSaving}
          >
            <Text style={[styles.saveButtonText, isSaved && { color: colors.success }]}>
              {isSaved ? '✓ Saved' : '+ Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.schoolName}>{coach.school}</Text>

        <View style={styles.badges}>
          {coach.division && (
            <Badge label={coach.division.replace('_', ' ')} variant="primary" />
          )}
          {coach.conference && <Badge label={coach.conference} />}
        </View>

        {(coach.email || coach.twitter) && (
          <View style={styles.contact}>
            {coach.email && (
              <Text style={styles.contactText} numberOfLines={1}>
                {coach.email}
              </Text>
            )}
          </View>
        )}
      </Card>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search coaches, schools, conferences..."
          placeholderTextColor={colors.textDim}
          value={localQuery}
          onChangeText={setLocalQuery}
          returnKeyType="search"
        />
      </View>

      {/* Division Filters */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={DIVISIONS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedDivision === item && { backgroundColor: primaryColor },
              ]}
              onPress={() => {
                setSelectedDivision(selectedDivision === item ? null : item)
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDivision === item && { color: colors.background },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Coaches List */}
      <FlatList
        data={coaches}
        keyExtractor={(item) => item.id}
        renderItem={renderCoach}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No coaches found' : 'Search for coaches above'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={primaryColor} />
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  filters: {
    marginBottom: spacing.md,
  },
  filtersContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChipText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
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
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedButton: {
    backgroundColor: `${colors.success}20`,
    borderColor: colors.success,
  },
  saveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  schoolName: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  contact: {
    marginTop: spacing.xs,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  errorContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  empty: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
  },
  loading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
})

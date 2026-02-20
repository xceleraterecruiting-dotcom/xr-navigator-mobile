import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptics } from '@/lib/haptics'
import { Ionicons } from '@expo/vector-icons'

import { useRouter } from 'expo-router'
import { SchoolLogo } from '@/components/ui/SchoolLogo'
import { SearchResultsSkeleton } from '@/components/ui/Skeleton'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { useChatStore } from '@/stores/chatStore'
import { useCoachesStore, useSavedCoaches } from '@/stores/coachesStore'
import { useSubscriptionStore, useUsage } from '@/stores/subscriptionStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useDrawerStore } from '@/stores/drawerStore'
import { analytics } from '@/lib/analytics'
import { UsageBanner } from '@/components/UsageBanner'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { coachCardA11y } from '@/lib/accessibility'
import { FLATLIST_OPTIMIZATIONS } from '@/lib/performance'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows, divisionColors } from '@/constants/theme'
import type { CollegeCoach } from '@/types'

const DIVISIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Power 4', value: 'D1_FBS_P4' },
  { label: 'Group of 5', value: 'D1_FBS_G5' },
  { label: 'FCS', value: 'D1_FCS' },
  { label: 'D2', value: 'D2' },
  { label: 'D3', value: 'D3' },
]

const POSITIONS = ['QB', 'RB', 'WR', 'OL', 'DL', 'LB', 'DB', 'ST', 'HC', 'RC']

const CONFERENCES_BY_DIVISION: Record<string, string[]> = {
  D1_FBS_P4: ['SEC', 'Big Ten', 'Big 12', 'ACC'],
  D1_FBS_G5: ['AAC', 'Sun Belt', 'MAC', 'Mountain West', 'CUSA'],
  D1_FCS: ['Big Sky', 'CAA', 'MVFC', 'Southland', 'OVC', 'Patriot', 'Big South-OVC', 'NEC', 'Pioneer', 'Ivy League', 'MEAC', 'SWAC'],
  D2: ['GLIAC', 'PSAC', 'GAC', 'LSC', 'GNAC', 'NSIC', 'CIAA', 'SIAC', 'Gulf South', 'SAC'],
  D3: ['WIAC', 'OAC', 'CCIW', 'NWC', 'Centennial', 'NESCAC', 'Liberty League', 'UAA'],
}

const REGIONS = ['Southeast', 'Southwest', 'Midwest', 'Northeast', 'West']

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

function getConferencesForDivision(division: string): string[] {
  if (!division) {
    return Object.values(CONFERENCES_BY_DIVISION).flat()
  }
  return CONFERENCES_BY_DIVISION[division] || []
}

function getDivisionLabel(division: string): string {
  switch (division) {
    case 'D1_FBS_P4': return 'D1 FBS P4'
    case 'D1_FBS_G5': return 'D1 FBS G5'
    case 'D1_FCS': return 'D1 FCS'
    default: return division.replace(/_/g, ' ')
  }
}

export default function CoachesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt)

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
    setFilters,
  } = useCoachesStore()

  const usage = useUsage()
  const fetchUsage = useSubscriptionStore((s) => s.fetchUsage)
  const savedCoaches = useSavedCoaches()
  const savedCoachIds = useMemo(
    () => new Set(savedCoaches.map((sc) => sc.collegeCoachId)),
    [savedCoaches]
  )
  const [localQuery, setLocalQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [selectedPosition, setSelectedPosition] = useState<string>('')
  const [limitModal, setLimitModal] = useState<string | null>(null)
  const [detailCoach, setDetailCoach] = useState<CollegeCoach | null>(null)
  const [selectedConference, setSelectedConference] = useState<string>('')
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedState, setSelectedState] = useState<string>('')
  const [showPositionPicker, setShowPositionPicker] = useState(false)
  const [showDivisionPicker, setShowDivisionPicker] = useState(false)
  const [showConferencePicker, setShowConferencePicker] = useState(false)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [showStatePicker, setShowStatePicker] = useState(false)

  const isFirstMount = React.useRef(true)

  useEffect(() => {
    analytics.screenView('Coaches')
    fetchUsage()
    fetchCoaches(true)
  }, [])

  // Re-fetch when filters change (skip first mount since useEffect above handles it)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    setFilters({
      division: selectedDivision ? (selectedDivision as any) : undefined,
      position: selectedPosition ? (selectedPosition as any) : undefined,
      conference: selectedConference || undefined,
      region: selectedRegion || undefined,
      state: selectedState || undefined,
    })
    requestAnimationFrame(() => fetchCoaches(true))
  }, [selectedDivision, selectedPosition, selectedConference, selectedRegion, selectedState])

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
      haptics.success()
      analytics.saveCoach(coach.id, coach.school)
      fetchUsage()
    } catch (err: any) {
      if (err?.code === 'DAILY_LIMIT') {
        setLimitModal(err.message)
      }
      haptics.error()
    }
  }

  const renderCoach = useCallback(({ item: coach }: { item: CollegeCoach }) => {
    const isSaved = savedCoachIds.has(coach.id)
    const divColors = coach.division ? (divisionColors[coach.division] || divisionColors.NAIA) : null
    const a11yProps = coachCardA11y({
      name: coach.name,
      title: coach.title,
      school: coach.school,
      division: coach.division,
    })

    return (
      <TouchableOpacity
        style={styles.coachCard}
        onPress={() => setDetailCoach(coach)}
        activeOpacity={0.85}
        {...a11yProps}
      >
        <View style={styles.coachCardInner}>
          {/* Row 1: Name + Division badge */}
          <View style={styles.nameRow}>
            <Text style={styles.coachName} numberOfLines={1}>{coach.name}</Text>
            {divColors && (
              <View style={[styles.divBadge, { backgroundColor: divColors.bg, borderColor: divColors.border }]}>
                <Text style={[styles.divBadgeText, { color: divColors.text }]}>
                  {getDivisionLabel(coach.division!)}
                </Text>
              </View>
            )}
          </View>

          {/* Row 2: Title */}
          <Text style={styles.coachTitle} numberOfLines={1}>{coach.title}</Text>

          {/* Row 3: School with logo + conference */}
          <View style={styles.schoolRow}>
            <View style={styles.logoWrap}>
              <SchoolLogo schoolName={coach.school} size={28} />
            </View>
            <Text style={styles.schoolName} numberOfLines={1}>{coach.school}</Text>
            {coach.conference && (
              <Text style={styles.confText}>{coach.conference}</Text>
            )}
          </View>

          {/* Row 4: Action buttons */}
          <View style={styles.actionRow}>
            {coach.email && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Linking.openURL(`mailto:${coach.email}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>Email</Text>
              </TouchableOpacity>
            )}
            {coach.twitter && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Linking.openURL(`https://twitter.com/${coach.twitter?.replace('@', '')}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>Twitter</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                isSaved ? styles.savedBtn : styles.saveBtn,
              ]}
              onPress={() => !isSaved && handleSaveCoach(coach)}
              disabled={isSaved || isSaving}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSaved ? 'star' : 'star-outline'}
                size={13}
                color={isSaved ? primaryColor : colors.text}
              />
              <Text style={[styles.actionBtnText, isSaved && { color: primaryColor }]}>
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  }, [savedCoachIds, isSaving])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner screen="coaches" />
      {/* Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={{ marginRight: spacing.sm }}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Find Coaches</Text>
        </View>
        <Text style={styles.screenSubtitle}>Browse 7,000+ college coaches</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coaches, schools, positions..."
            placeholderTextColor={colors.textDim}
            value={localQuery}
            onChangeText={setLocalQuery}
            returnKeyType="search"
          />
          {localQuery.length > 0 && (
            <TouchableOpacity onPress={() => setLocalQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersRowContent}
      >
        {/* Position Picker */}
        <TouchableOpacity
          style={[styles.filterPicker, selectedPosition ? styles.filterPickerActive : null]}
          onPress={() => setShowPositionPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPickerText, selectedPosition && styles.filterPickerTextActive]}>
            {selectedPosition || 'Position'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={selectedPosition ? colors.background : colors.textDim} />
        </TouchableOpacity>

        {/* Division Picker */}
        <TouchableOpacity
          style={[styles.filterPicker, selectedDivision ? styles.filterPickerActive : null]}
          onPress={() => setShowDivisionPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPickerText, selectedDivision && styles.filterPickerTextActive]}>
            {selectedDivision ? DIVISIONS.find(d => d.value === selectedDivision)?.label : 'Division'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={selectedDivision ? colors.background : colors.textDim} />
        </TouchableOpacity>

        {/* Region Picker */}
        <TouchableOpacity
          style={[styles.filterPicker, selectedRegion ? styles.filterPickerActive : null]}
          onPress={() => setShowRegionPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPickerText, selectedRegion && styles.filterPickerTextActive]}>
            {selectedRegion || 'Region'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={selectedRegion ? colors.background : colors.textDim} />
        </TouchableOpacity>

        {/* State Picker */}
        <TouchableOpacity
          style={[styles.filterPicker, selectedState ? styles.filterPickerActive : null]}
          onPress={() => setShowStatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPickerText, selectedState && styles.filterPickerTextActive]}>
            {selectedState || 'State'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={selectedState ? colors.background : colors.textDim} />
        </TouchableOpacity>

        {/* Conference Picker */}
        <TouchableOpacity
          style={[styles.filterPicker, selectedConference ? styles.filterPickerActive : null]}
          onPress={() => setShowConferencePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterPickerText, selectedConference && styles.filterPickerTextActive]}>
            {selectedConference || 'Conference'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={selectedConference ? colors.background : colors.textDim} />
        </TouchableOpacity>

        {/* Clear filters */}
        {(selectedPosition || selectedDivision || selectedConference || selectedRegion || selectedState) && (
          <TouchableOpacity
            style={styles.clearFilters}
            onPress={() => {
              setSelectedPosition('')
              setSelectedDivision('')
              setSelectedConference('')
              setSelectedRegion('')
              setSelectedState('')
              haptics.light()
            }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Usage */}
      {usage?.coachViews && (
        <View style={styles.usageBannerWrap}>
          <UsageBanner label="Coach Views" usage={usage.coachViews} />
        </View>
      )}

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
        // Performance optimizations
        {...FLATLIST_OPTIMIZATIONS}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.listContent}>
              <SearchResultsSkeleton count={6} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="american-football-outline" size={48} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No coaches found' : 'Discover Coaches'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Try different search terms or filters'
                  : 'Search by name, school, or conference to find your match'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading && coaches.length > 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator color={primaryColor} size="small" />
              <Text style={styles.loadingText}>Loading more coaches...</Text>
            </View>
          ) : null
        }
      />

      <LimitReachedModal
        message={limitModal || ''}
        visible={!!limitModal}
        onDismiss={() => setLimitModal(null)}
      />

      {/* ── Position Picker Modal ── */}
      {showPositionPicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowPositionPicker(false)} activeOpacity={1} />
          <View style={[styles.pickerModal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>POSITION</Text>
            <TouchableOpacity
              style={[styles.pickerOption, !selectedPosition && styles.pickerOptionActive]}
              onPress={() => { setSelectedPosition(''); setShowPositionPicker(false); haptics.light() }}
            >
              <Text style={[styles.pickerOptionText, !selectedPosition && styles.pickerOptionTextActive]}>All Positions</Text>
              {!selectedPosition && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {POSITIONS.map((pos) => {
              const isActive = selectedPosition === pos
              return (
                <TouchableOpacity
                  key={pos}
                  style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                  onPress={() => { setSelectedPosition(pos); setShowPositionPicker(false); haptics.light() }}
                >
                  <Text style={[styles.pickerOptionText, isActive && styles.pickerOptionTextActive]}>{pos}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* ── Division Picker Modal ── */}
      {showDivisionPicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowDivisionPicker(false)} activeOpacity={1} />
          <View style={[styles.pickerModal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>DIVISION</Text>
            {DIVISIONS.map((div) => {
              const isActive = selectedDivision === div.value
              return (
                <TouchableOpacity
                  key={div.value || 'all'}
                  style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                  onPress={() => {
                    setSelectedDivision(div.value)
                    // Clear conference if it's not valid for the new division
                    if (selectedConference) {
                      const valid = getConferencesForDivision(div.value)
                      if (!valid.includes(selectedConference)) {
                        setSelectedConference('')
                      }
                    }
                    setShowDivisionPicker(false)
                    haptics.light()
                  }}
                >
                  <Text style={[styles.pickerOptionText, isActive && styles.pickerOptionTextActive]}>{div.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* ── Conference Picker Modal ── */}
      {showConferencePicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowConferencePicker(false)} activeOpacity={1} />
          <View style={[styles.pickerModal, styles.pickerModalTall, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>CONFERENCE</Text>
            <FlatList
              data={[{ label: 'All Conferences', value: '' }, ...getConferencesForDivision(selectedDivision).map(c => ({ label: c, value: c }))]}
              keyExtractor={(item) => item.value || 'all'}
              renderItem={({ item }) => {
                const isActive = selectedConference === item.value
                return (
                  <TouchableOpacity
                    style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                    onPress={() => { setSelectedConference(item.value); setShowConferencePicker(false); haptics.light() }}
                  >
                    <Text style={[styles.pickerOptionText, isActive && styles.pickerOptionTextActive]}>{item.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      )}

      {/* ── Region Picker Modal ── */}
      {showRegionPicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowRegionPicker(false)} activeOpacity={1} />
          <View style={[styles.pickerModal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>REGION</Text>
            <TouchableOpacity
              style={[styles.pickerOption, !selectedRegion && styles.pickerOptionActive]}
              onPress={() => { setSelectedRegion(''); setShowRegionPicker(false); haptics.light() }}
            >
              <Text style={[styles.pickerOptionText, !selectedRegion && styles.pickerOptionTextActive]}>All Regions</Text>
              {!selectedRegion && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {REGIONS.map((reg) => {
              const isActive = selectedRegion === reg
              return (
                <TouchableOpacity
                  key={reg}
                  style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                  onPress={() => {
                    setSelectedRegion(reg)
                    // Clear state filter when region is selected
                    if (selectedState) setSelectedState('')
                    setShowRegionPicker(false)
                    haptics.light()
                  }}
                >
                  <Text style={[styles.pickerOptionText, isActive && styles.pickerOptionTextActive]}>{reg}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* ── State Picker Modal ── */}
      {showStatePicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBg} onPress={() => setShowStatePicker(false)} activeOpacity={1} />
          <View style={[styles.pickerModal, styles.pickerModalTall, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}>STATE</Text>
            <FlatList
              data={[{ label: 'All States', value: '' }, ...STATES.map(st => ({ label: `${STATE_NAMES[st]} (${st})`, value: st }))]}
              keyExtractor={(item) => item.value || 'all'}
              renderItem={({ item }) => {
                const isActive = selectedState === item.value
                return (
                  <TouchableOpacity
                    style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                    onPress={() => {
                      setSelectedState(item.value)
                      // Clear region filter when state is selected
                      if (item.value && selectedRegion) setSelectedRegion('')
                      setShowStatePicker(false)
                      haptics.light()
                    }}
                  >
                    <Text style={[styles.pickerOptionText, isActive && styles.pickerOptionTextActive]}>{item.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </View>
      )}

      {/* ── Coach Detail Modal ── */}
      {detailCoach && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setDetailCoach(null)}
            activeOpacity={1}
          />
          <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />

            {/* Close */}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setDetailCoach(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Coach info */}
            <Text style={styles.modalName}>{detailCoach.name}</Text>
            <Text style={styles.modalTitle}>{detailCoach.title}</Text>

            {/* Division + Conference */}
            <View style={styles.modalBadges}>
              {detailCoach.division && (() => {
                const dc = divisionColors[detailCoach.division] || divisionColors.NAIA
                return (
                  <View style={[styles.modalDivBadge, { backgroundColor: dc.bg, borderColor: dc.border }]}>
                    <Text style={[styles.modalDivText, { color: dc.text }]}>
                      {getDivisionLabel(detailCoach.division)}
                    </Text>
                  </View>
                )
              })()}
              {detailCoach.conference && (
                <Text style={styles.modalConf}>{detailCoach.conference}</Text>
              )}
            </View>

            {/* School */}
            <View style={styles.modalSchoolRow}>
              <Text style={styles.modalLabel}>School</Text>
              <View style={styles.modalSchoolInner}>
                <SchoolLogo schoolName={detailCoach.school} size={24} />
                <Text style={styles.modalSchool}>{detailCoach.school}</Text>
              </View>
            </View>

            {/* Email */}
            {detailCoach.email && (
              <View style={styles.modalInfoRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.modalInfoText, { color: colors.primary }]}>{detailCoach.email}</Text>
              </View>
            )}

            {/* Twitter */}
            {detailCoach.twitter && (
              <View style={styles.modalInfoRow}>
                <Ionicons name="logo-twitter" size={16} color={colors.textMuted} />
                <Text style={[styles.modalInfoText, { color: colors.primary }]}>@{detailCoach.twitter.replace('@', '')}</Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.modalActions}>
              {detailCoach.email && (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: primaryColor }]}
                  onPress={() => {
                    Linking.openURL(`mailto:${detailCoach.email}`)
                    setDetailCoach(null)
                  }}
                >
                  <Text style={styles.modalActionText}>Send Email</Text>
                </TouchableOpacity>
              )}
              {detailCoach.twitter && (
                <TouchableOpacity
                  style={styles.modalActionBtnOutline}
                  onPress={() => {
                    Linking.openURL(`https://twitter.com/${detailCoach.twitter?.replace('@', '')}`)
                    setDetailCoach(null)
                  }}
                >
                  <Text style={styles.modalActionOutlineText}>View Twitter</Text>
                </TouchableOpacity>
              )}
              {(() => {
                const isSaved = savedCoachIds.has(detailCoach.id)
                return (
                  <TouchableOpacity
                    style={[styles.modalActionBtnOutline, isSaved && { borderColor: primaryColor }]}
                    onPress={() => {
                      if (!isSaved) handleSaveCoach(detailCoach)
                    }}
                    disabled={isSaved || isSaving}
                  >
                    <Ionicons name={isSaved ? 'star' : 'star-outline'} size={14} color={isSaved ? primaryColor : colors.text} />
                    <Text style={[styles.modalActionOutlineText, isSaved && { color: primaryColor }]}>
                      {isSaved ? 'Saved' : 'Save Coach'}
                    </Text>
                  </TouchableOpacity>
                )
              })()}
            </View>

            {/* AI approach link */}
            <TouchableOpacity
              style={styles.approachLink}
              activeOpacity={0.7}
              onPress={() => {
                const coach = detailCoach
                setPendingPrompt(`How should I approach ${coach.name}, ${coach.title} at ${coach.school}? What should I say in my first message?`)
                setDetailCoach(null)
                router.push('/(tabs)/insight')
              }}
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
              <Text style={styles.approachText}>How should I approach this coach?</Text>
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
  screenHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  screenSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textDim,
    fontFamily: fontFamily.medium,
    marginTop: 2,
  },
  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
    fontFamily: fontFamily.medium,
    paddingVertical: spacing.md,
  },
  clearButton: {
    padding: spacing.xs,
  },
  // Filter pickers row
  filtersRow: {
    marginBottom: spacing.sm,
  },
  filtersRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPickerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPickerText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
  },
  filterPickerTextActive: {
    color: colors.background,
  },
  clearFilters: {
    padding: spacing.xs,
  },
  // Picker modal
  pickerModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  pickerModalTall: {
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  pickerOptionActive: {
    backgroundColor: colors.primaryLight,
  },
  pickerOptionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  pickerOptionTextActive: {
    color: colors.primary,
  },
  usageBannerWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  // Coach card — matches web layout
  coachCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  coachCardInner: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  coachName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    flex: 1,
  },
  divBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  divBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.3,
  },
  coachTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  schoolName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
    flex: 1,
  },
  confText: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.regular,
  },
  // Action buttons row — matches web (Email, Twitter, Save)
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  saveBtn: {
    borderColor: colors.border,
  },
  savedBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.borderAccent,
  },
  // Error
  errorContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  // Empty
  empty: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  // Loading
  loading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.medium,
  },
  // ── Coach Detail Modal ──
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalBg: {
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
  modalClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1,
  },
  modalName: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: 2,
    paddingRight: 40,
  },
  modalTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginBottom: spacing.md,
  },
  modalBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalDivBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  modalDivText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
  },
  modalConf: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  modalSchoolRow: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  modalSchoolInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalSchool: {
    fontSize: fontSize.base,
    color: colors.text,
    fontFamily: fontFamily.semibold,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalInfoText: {
    fontSize: fontSize.sm,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalActionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  modalActionBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActionOutlineText: {
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

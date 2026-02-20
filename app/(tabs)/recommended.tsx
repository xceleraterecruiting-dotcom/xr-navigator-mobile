import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { SchoolLogo } from '@/components/ui/SchoolLogo'
import { useAthleteStore } from '@/stores/athleteStore'
import { useCoachesStore, useSavedCoaches } from '@/stores/coachesStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { api } from '@/lib/api'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows, divisionColors } from '@/constants/theme'
import type { CollegeCoach } from '@/types'

const DIVISION_LABELS: Record<string, string> = {
  D1_FBS_P4: 'D1 Power 4',
  D1_FBS_G5: 'D1 Group of 5',
  D1_FCS: 'D1 FCS',
  D2: 'D2',
  D3: 'D3',
  NAIA: 'NAIA',
  JUCO: 'JUCO',
}

// Filter options
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K', 'P', 'ATH']
const DIVISIONS = [
  { value: 'D1_FBS_P4', label: 'D1 Power 4' },
  { value: 'D1_FBS_G5', label: 'D1 Group of 5' },
  { value: 'D1_FCS', label: 'D1 FCS' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
  { value: 'NAIA', label: 'NAIA' },
]
const REGIONS = ['Southeast', 'Southwest', 'Midwest', 'Northeast', 'West']
const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]

// State names for display
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

// Neighboring states for "NEAR YOU" badge
const STATE_NEIGHBORS: Record<string, string[]> = {
  AL: ['FL', 'GA', 'MS', 'TN'],
  AK: [],
  AZ: ['CA', 'CO', 'NM', 'NV', 'UT'],
  AR: ['LA', 'MO', 'MS', 'OK', 'TN', 'TX'],
  CA: ['AZ', 'NV', 'OR'],
  CO: ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
  CT: ['MA', 'NY', 'RI'],
  DE: ['MD', 'NJ', 'PA'],
  FL: ['AL', 'GA'],
  GA: ['AL', 'FL', 'NC', 'SC', 'TN'],
  HI: [],
  ID: ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  IL: ['IN', 'IA', 'KY', 'MO', 'WI'],
  IN: ['IL', 'KY', 'MI', 'OH'],
  IA: ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'],
  KS: ['CO', 'MO', 'NE', 'OK'],
  KY: ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'],
  LA: ['AR', 'MS', 'TX'],
  ME: ['NH'],
  MD: ['DE', 'PA', 'VA', 'WV'],
  MA: ['CT', 'NH', 'NY', 'RI', 'VT'],
  MI: ['IN', 'OH', 'WI'],
  MN: ['IA', 'ND', 'SD', 'WI'],
  MS: ['AL', 'AR', 'LA', 'TN'],
  MO: ['AR', 'IL', 'IA', 'KS', 'KY', 'NE', 'OK', 'TN'],
  MT: ['ID', 'ND', 'SD', 'WY'],
  NE: ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
  NV: ['AZ', 'CA', 'ID', 'OR', 'UT'],
  NH: ['MA', 'ME', 'VT'],
  NJ: ['DE', 'NY', 'PA'],
  NM: ['AZ', 'CO', 'OK', 'TX', 'UT'],
  NY: ['CT', 'MA', 'NJ', 'PA', 'VT'],
  NC: ['GA', 'SC', 'TN', 'VA'],
  ND: ['MN', 'MT', 'SD'],
  OH: ['IN', 'KY', 'MI', 'PA', 'WV'],
  OK: ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'],
  OR: ['CA', 'ID', 'NV', 'WA'],
  PA: ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'],
  RI: ['CT', 'MA'],
  SC: ['GA', 'NC'],
  SD: ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
  TN: ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
  TX: ['AR', 'LA', 'NM', 'OK'],
  UT: ['AZ', 'CO', 'ID', 'NV', 'NM', 'WY'],
  VT: ['MA', 'NH', 'NY'],
  VA: ['KY', 'MD', 'NC', 'TN', 'WV'],
  WA: ['ID', 'OR'],
  WV: ['KY', 'MD', 'OH', 'PA', 'VA'],
  WI: ['IA', 'IL', 'MI', 'MN'],
  WY: ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
}

// Common school → state mapping for "NEAR YOU"
const SCHOOL_STATES: Record<string, string> = {
  'Alabama': 'AL', 'Auburn': 'AL', 'Troy': 'AL', 'South Alabama': 'AL', 'UAB': 'AL',
  'Arizona State': 'AZ', 'Arizona': 'AZ', 'Northern Arizona': 'AZ',
  'Arkansas': 'AR', 'Arkansas State': 'AR',
  'USC': 'CA', 'UCLA': 'CA', 'Stanford': 'CA', 'Cal': 'CA', 'San Diego State': 'CA', 'Fresno State': 'CA', 'San Jose State': 'CA',
  'Colorado': 'CO', 'Colorado State': 'CO', 'Air Force': 'CO',
  'UConn': 'CT', 'Connecticut': 'CT', 'Yale': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL', 'Florida State': 'FL', 'Miami': 'FL', 'UCF': 'FL', 'USF': 'FL', 'FIU': 'FL', 'FAU': 'FL',
  'Georgia': 'GA', 'Georgia Tech': 'GA', 'Georgia State': 'GA', 'Georgia Southern': 'GA', 'Kennesaw State': 'GA',
  'Hawaii': 'HI',
  'Boise State': 'ID', 'Idaho': 'ID',
  'Illinois': 'IL', 'Northwestern': 'IL', 'Northern Illinois': 'IL',
  'Indiana': 'IN', 'Purdue': 'IN', 'Notre Dame': 'IN', 'Ball State': 'IN',
  'Iowa': 'IA', 'Iowa State': 'IA',
  'Kansas': 'KS', 'Kansas State': 'KS',
  'Kentucky': 'KY', 'Louisville': 'KY', 'Western Kentucky': 'KY', 'Eastern Kentucky': 'KY',
  'LSU': 'LA', 'Louisiana': 'LA', 'Louisiana Tech': 'LA', 'Tulane': 'LA',
  'Maryland': 'MD', 'Navy': 'MD',
  'Boston College': 'MA', 'Massachusetts': 'MA', 'UMass': 'MA', 'Harvard': 'MA',
  'Michigan': 'MI', 'Michigan State': 'MI', 'Central Michigan': 'MI', 'Eastern Michigan': 'MI', 'Western Michigan': 'MI',
  'Minnesota': 'MN',
  'Mississippi State': 'MS', 'Ole Miss': 'MS', 'Southern Miss': 'MS',
  'Missouri': 'MO',
  'Montana': 'MT', 'Montana State': 'MT',
  'Nebraska': 'NE',
  'UNLV': 'NV', 'Nevada': 'NV',
  'Rutgers': 'NJ',
  'New Mexico': 'NM', 'New Mexico State': 'NM',
  'Syracuse': 'NY', 'Army': 'NY', 'Buffalo': 'NY',
  'North Carolina': 'NC', 'NC State': 'NC', 'Duke': 'NC', 'Wake Forest': 'NC', 'Charlotte': 'NC', 'East Carolina': 'NC', 'Appalachian State': 'NC',
  'North Dakota State': 'ND', 'North Dakota': 'ND',
  'Ohio State': 'OH', 'Cincinnati': 'OH', 'Ohio': 'OH', 'Akron': 'OH', 'Bowling Green': 'OH', 'Kent State': 'OH', 'Miami (OH)': 'OH', 'Toledo': 'OH',
  'Oklahoma': 'OK', 'Oklahoma State': 'OK', 'Tulsa': 'OK',
  'Oregon': 'OR', 'Oregon State': 'OR', 'Portland State': 'OR',
  'Penn State': 'PA', 'Pittsburgh': 'PA', 'Temple': 'PA',
  'South Carolina': 'SC', 'Clemson': 'SC', 'Coastal Carolina': 'SC',
  'South Dakota State': 'SD', 'South Dakota': 'SD',
  'Tennessee': 'TN', 'Vanderbilt': 'TN', 'Memphis': 'TN', 'Middle Tennessee': 'TN', 'ETSU': 'TN',
  'Texas': 'TX', 'Texas A&M': 'TX', 'TCU': 'TX', 'Baylor': 'TX', 'Texas Tech': 'TX', 'Houston': 'TX', 'SMU': 'TX', 'North Texas': 'TX', 'UTSA': 'TX', 'UTEP': 'TX', 'Rice': 'TX',
  'Utah': 'UT', 'Utah State': 'UT', 'BYU': 'UT',
  'Virginia': 'VA', 'Virginia Tech': 'VA', 'Old Dominion': 'VA', 'James Madison': 'VA', 'Liberty': 'VA',
  'Washington': 'WA', 'Washington State': 'WA',
  'West Virginia': 'WV', 'Marshall': 'WV',
  'Wisconsin': 'WI',
  'Wyoming': 'WY',
}

function getSchoolState(schoolName: string): string | null {
  // Exact match
  if (SCHOOL_STATES[schoolName]) return SCHOOL_STATES[schoolName]
  // Partial match — check if school name contains a known key
  for (const [school, state] of Object.entries(SCHOOL_STATES)) {
    if (schoolName.toLowerCase().includes(school.toLowerCase()) ||
        school.toLowerCase().includes(schoolName.toLowerCase())) {
      return state
    }
  }
  return null
}

function isNearAthlete(athleteState: string | null, schoolName: string): boolean {
  if (!athleteState) return false
  const st = athleteState.toUpperCase().trim()
  const schoolSt = getSchoolState(schoolName)
  if (!schoolSt) return false
  if (st === schoolSt) return true
  return (STATE_NEIGHBORS[st] || []).includes(schoolSt)
}

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

export default function RecommendedScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)
  const athlete = useAthleteStore((s) => s.athlete)
  const savedCoaches = useSavedCoaches()
  const savedCoachIds = useMemo(
    () => new Set(savedCoaches.map((sc) => sc.collegeCoachId)),
    [savedCoaches]
  )
  const { saveCoach } = useCoachesStore()

  const [coaches, setCoaches] = useState<CollegeCoach[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [detailCoach, setDetailCoach] = useState<CollegeCoach | null>(null)

  // Filter state
  const [filterPosition, setFilterPosition] = useState<string | null>(null)
  const [filterDivision, setFilterDivision] = useState<string | null>(null)
  const [filterRegion, setFilterRegion] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<string | null>(null)
  const [showFilterModal, setShowFilterModal] = useState<'position' | 'division' | 'region' | 'state' | null>(null)

  const position = athlete?.position || 'ATH'
  const targetLevel = athlete?.targetLevel || 'D1_FBS_G5'
  const athleteState = athlete?.state || null

  // Count active filters
  const activeFilterCount = [filterPosition, filterDivision, filterRegion, filterState].filter(Boolean).length

  useEffect(() => {
    analytics.screenView('Recommended')
    fetchRecommended()
  }, [athlete?.id, filterPosition, filterDivision, filterRegion, filterState])

  const fetchRecommended = async () => {
    setIsLoading(true)
    try {
      // Server handles position keyword matching + division mapping from athlete profile
      // Pass any active filters
      const results = await api.getRecommendedCoaches({
        limit: 500,
        position: filterPosition || undefined,
        division: filterDivision || undefined,
        region: filterRegion || undefined,
        state: filterState || undefined,
      })

      // Sort: near athlete first, then alphabetical by school
      results.sort((a, b) => {
        const aNear = isNearAthlete(athleteState, a.school) ? 1 : 0
        const bNear = isNearAthlete(athleteState, b.school) ? 1 : 0
        if (bNear !== aNear) return bNear - aNear
        return a.school.localeCompare(b.school)
      })

      setCoaches(results)
    } catch (err) {
      if (__DEV__) console.warn('Failed to fetch recommended coaches:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearAllFilters = () => {
    setFilterPosition(null)
    setFilterDivision(null)
    setFilterRegion(null)
    setFilterState(null)
    haptics.light()
  }

  const handleSave = async (coach: CollegeCoach) => {
    try {
      await saveCoach(coach.id)
      haptics.success()
    } catch {
      haptics.error()
    }
  }

  const renderCoach = useCallback(({ item: coach }: { item: CollegeCoach }) => {
    const isSaved = savedCoachIds.has(coach.id)
    const divStyle = coach.division ? getDivisionStyle(coach.division) : null
    const nearYou = isNearAthlete(athleteState, coach.school)

    return (
      <TouchableOpacity
        style={styles.coachCard}
        onPress={() => { setDetailCoach(coach); haptics.light() }}
        activeOpacity={0.7}
      >
        {/* Top row: Name + badges */}
        <View style={styles.coachTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.coachTitle} numberOfLines={1}>{coach.title}</Text>
          </View>
          <View style={styles.badgeRow}>
            {nearYou && (
              <View style={styles.nearBadge}>
                <Ionicons name="location" size={10} color={colors.success} />
                <Text style={styles.nearBadgeText}>NEAR YOU</Text>
              </View>
            )}
            {divStyle && (
              <View style={[styles.divBadge, { backgroundColor: divStyle.bg, borderColor: divStyle.border }]}>
                <Text style={[styles.divBadgeText, { color: divStyle.text }]}>
                  {coach.division === 'D1_FBS_P4' ? 'D1 FBS P4' :
                   coach.division === 'D1_FBS_G5' ? 'D1 FBS G5' :
                   coach.division === 'D1_FCS' ? 'D1 FCS' : divStyle.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* School row */}
        <View style={styles.schoolRow}>
          <SchoolLogo schoolName={coach.school} size={24} />
          <View>
            <Text style={styles.schoolName}>{coach.school}</Text>
            {coach.conference && <Text style={styles.conferenceName}>{coach.conference}</Text>}
          </View>
        </View>

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setDetailCoach(coach)
              haptics.light()
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {coach.email && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnBordered]}
              onPress={() => { Linking.openURL(`mailto:${coach.email}`); haptics.light() }}
            >
              <Text style={styles.actionBtnText}>Email</Text>
            </TouchableOpacity>
          )}

          {coach.twitter && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnBordered]}
              onPress={() => { Linking.openURL(`https://twitter.com/${coach.twitter!.replace('@', '')}`); haptics.light() }}
            >
              <Text style={styles.actionBtnText}>Twitter</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnBordered,
              isSaved && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            onPress={() => { if (!isSaved) handleSave(coach) }}
          >
            <Ionicons name="star" size={14} color={isSaved ? colors.primary : colors.textMuted} />
            <Text style={[styles.actionBtnText, isSaved && { color: colors.primary }]}>
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }, [savedCoachIds, athleteState])

  // Build subtitle based on active filters or defaults
  const subtitle = useMemo(() => {
    const parts: string[] = []
    if (filterPosition) {
      parts.push(`${filterPosition} coaches`)
    } else if (position) {
      parts.push(`${position} coaches`)
    }
    if (filterDivision) {
      parts.push(DIVISION_LABELS[filterDivision] || filterDivision)
    } else if (targetLevel) {
      parts.push(DIVISION_LABELS[targetLevel])
    }
    if (filterRegion) {
      parts.push(filterRegion)
    }
    if (filterState) {
      parts.push(STATE_NAMES[filterState] || filterState)
    }
    parts.push(`${coaches.length} coaches`)
    return parts.join(' · ')
  }, [filterPosition, filterDivision, filterRegion, filterState, position, targetLevel, coaches.length])

  // Helper to get filter chip label
  const getFilterLabel = (type: string, value: string | null, defaultLabel: string) => {
    if (!value) return defaultLabel
    if (type === 'division') return DIVISION_LABELS[value] || value
    if (type === 'state') return value // Just show state code
    return value
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { openDrawer(); haptics.light() }}
          hitSlop={8}
        >
          <Ionicons name="menu" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Ionicons name="star" size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>Coach Directory</Text>
          </View>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Position filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterPosition && styles.filterChipActive]}
            onPress={() => { setShowFilterModal('position'); haptics.light() }}
          >
            <Text style={[styles.filterChipText, filterPosition && styles.filterChipTextActive]}>
              {filterPosition || 'Position'}
            </Text>
            <Ionicons
              name={filterPosition ? 'close-circle' : 'chevron-down'}
              size={14}
              color={filterPosition ? colors.primary : colors.textMuted}
              onPress={filterPosition ? (e) => { e.stopPropagation(); setFilterPosition(null); haptics.light() } : undefined}
            />
          </TouchableOpacity>

          {/* Division filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterDivision && styles.filterChipActive]}
            onPress={() => { setShowFilterModal('division'); haptics.light() }}
          >
            <Text style={[styles.filterChipText, filterDivision && styles.filterChipTextActive]}>
              {getFilterLabel('division', filterDivision, 'Division')}
            </Text>
            <Ionicons
              name={filterDivision ? 'close-circle' : 'chevron-down'}
              size={14}
              color={filterDivision ? colors.primary : colors.textMuted}
              onPress={filterDivision ? (e) => { e.stopPropagation(); setFilterDivision(null); haptics.light() } : undefined}
            />
          </TouchableOpacity>

          {/* Region filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterRegion && styles.filterChipActive]}
            onPress={() => { setShowFilterModal('region'); haptics.light() }}
          >
            <Text style={[styles.filterChipText, filterRegion && styles.filterChipTextActive]}>
              {filterRegion || 'Region'}
            </Text>
            <Ionicons
              name={filterRegion ? 'close-circle' : 'chevron-down'}
              size={14}
              color={filterRegion ? colors.primary : colors.textMuted}
              onPress={filterRegion ? (e) => { e.stopPropagation(); setFilterRegion(null); haptics.light() } : undefined}
            />
          </TouchableOpacity>

          {/* State filter */}
          <TouchableOpacity
            style={[styles.filterChip, filterState && styles.filterChipActive]}
            onPress={() => { setShowFilterModal('state'); haptics.light() }}
          >
            <Text style={[styles.filterChipText, filterState && styles.filterChipTextActive]}>
              {filterState || 'State'}
            </Text>
            <Ionicons
              name={filterState ? 'close-circle' : 'chevron-down'}
              size={14}
              color={filterState ? colors.primary : colors.textMuted}
              onPress={filterState ? (e) => { e.stopPropagation(); setFilterState(null); haptics.light() } : undefined}
            />
          </TouchableOpacity>

          {/* Clear all (only show if filters active) */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={clearAllFilters}
            >
              <Ionicons name="close" size={14} color={colors.error} />
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={primaryColor} size="large" />
        </View>
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(item) => item.id}
          renderItem={renderCoach}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search" size={40} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No coaches found</Text>
              <Text style={styles.emptyText}>
                Try browsing all coaches instead.
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)/coaches')}
              >
                <Text style={[styles.browseBtnText, { color: primaryColor }]}>Browse All Coaches</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Filter Selection Modal */}
      <Modal
        visible={showFilterModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setShowFilterModal(null)}
            activeOpacity={1}
          />
          <View style={[styles.filterModal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.filterModalTitle}>
              {showFilterModal === 'position' && 'Select Position'}
              {showFilterModal === 'division' && 'Select Division'}
              {showFilterModal === 'region' && 'Select Region'}
              {showFilterModal === 'state' && 'Select State'}
            </Text>

            <ScrollView style={styles.filterModalScroll} showsVerticalScrollIndicator={false}>
              {/* Position options */}
              {showFilterModal === 'position' && POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.filterOption, filterPosition === pos && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterPosition(filterPosition === pos ? null : pos)
                    setShowFilterModal(null)
                    haptics.light()
                  }}
                >
                  <Text style={[styles.filterOptionText, filterPosition === pos && styles.filterOptionTextActive]}>
                    {pos}
                  </Text>
                  {filterPosition === pos && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Division options */}
              {showFilterModal === 'division' && DIVISIONS.map((div) => (
                <TouchableOpacity
                  key={div.value}
                  style={[styles.filterOption, filterDivision === div.value && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterDivision(filterDivision === div.value ? null : div.value)
                    setShowFilterModal(null)
                    haptics.light()
                  }}
                >
                  <Text style={[styles.filterOptionText, filterDivision === div.value && styles.filterOptionTextActive]}>
                    {div.label}
                  </Text>
                  {filterDivision === div.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Region options */}
              {showFilterModal === 'region' && REGIONS.map((reg) => (
                <TouchableOpacity
                  key={reg}
                  style={[styles.filterOption, filterRegion === reg && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterRegion(filterRegion === reg ? null : reg)
                    // Clear state filter if region is selected (they're mutually exclusive for geo filtering)
                    if (filterRegion !== reg) setFilterState(null)
                    setShowFilterModal(null)
                    haptics.light()
                  }}
                >
                  <Text style={[styles.filterOptionText, filterRegion === reg && styles.filterOptionTextActive]}>
                    {reg}
                  </Text>
                  {filterRegion === reg && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* State options */}
              {showFilterModal === 'state' && STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.filterOption, filterState === st && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterState(filterState === st ? null : st)
                    // Clear region filter if state is selected
                    if (filterState !== st) setFilterRegion(null)
                    setShowFilterModal(null)
                    haptics.light()
                  }}
                >
                  <Text style={[styles.filterOptionText, filterState === st && styles.filterOptionTextActive]}>
                    {STATE_NAMES[st]} ({st})
                  </Text>
                  {filterState === st && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Coach Detail Modal */}
      {detailCoach && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setDetailCoach(null)}
            activeOpacity={1}
          />
          <View style={[styles.modal, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <SchoolLogo schoolName={detailCoach.school} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalName}>{detailCoach.name}</Text>
                <Text style={styles.modalTitle}>{detailCoach.title}</Text>
                <Text style={styles.modalSchool}>{detailCoach.school}{detailCoach.conference ? ` · ${detailCoach.conference}` : ''}</Text>
              </View>
            </View>

            {detailCoach.email && (
              <TouchableOpacity
                style={styles.modalContact}
                onPress={() => Linking.openURL(`mailto:${detailCoach.email}`)}
              >
                <Ionicons name="mail-outline" size={16} color={colors.primary} />
                <Text style={styles.modalContactText}>{detailCoach.email}</Text>
              </TouchableOpacity>
            )}

            {detailCoach.twitter && (
              <TouchableOpacity
                style={styles.modalContact}
                onPress={() => Linking.openURL(`https://twitter.com/${detailCoach.twitter!.replace('@', '')}`)}
              >
                <Ionicons name="logo-twitter" size={16} color={colors.primary} />
                <Text style={styles.modalContactText}>{detailCoach.twitter}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              {detailCoach.email && (
                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={() => Linking.openURL(`mailto:${detailCoach.email}`)}
                >
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  <Text style={styles.modalActionBtnText}>Send Email</Text>
                </TouchableOpacity>
              )}
              {detailCoach.twitter && (
                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={() => Linking.openURL(`https://twitter.com/${detailCoach.twitter!.replace('@', '')}`)}
                >
                  <Ionicons name="logo-twitter" size={18} color={colors.primary} />
                  <Text style={styles.modalActionBtnText}>View Twitter</Text>
                </TouchableOpacity>
              )}
            </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginTop: 2,
    padding: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  // Filter bar
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  clearFiltersText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.error,
  },

  // Filter modal
  filterModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    maxHeight: '70%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  filterModalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  filterModalScroll: {
    flexGrow: 0,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: `${colors.primary}10`,
  },
  filterOptionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  filterOptionTextActive: {
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },

  // List
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Coach card
  coachCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  coachTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  coachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  coachTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  nearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  nearBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.success,
    letterSpacing: 0.5,
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
    letterSpacing: 0.5,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  schoolName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary || colors.text,
  },
  conferenceName: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textDim,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnBordered: {
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  actionBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  browseBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  browseBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },

  // Modal
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modalName: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  modalTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  modalSchool: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  modalContact: {
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
  modalActionBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
})

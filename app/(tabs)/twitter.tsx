import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SchoolLogo } from '@/components/ui/SchoolLogo'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useCoachesStore } from '@/stores/coachesStore'
import { api } from '@/lib/api'
import { CoachCardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { Ionicons } from '@expo/vector-icons'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius, fontFamily} from '@/constants/theme'
import type { TwitterCoachMatch, TwitterDMStatus, Division } from '@/types'

const PAGE_SIZE = 20

const DIVISION_FILTERS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Power 4', value: 'D1_FBS_P4' },
  { label: 'G5', value: 'D1_FBS_G5' },
  { label: 'FCS', value: 'D1_FCS' },
  { label: 'D2', value: 'D2' },
  { label: 'D3', value: 'D3' },
  { label: 'NAIA', value: 'NAIA' },
  { label: 'JUCO', value: 'JUCO' },
]

function divisionColor(division: Division | string | null): string {
  switch (division) {
    case 'D1_FBS_P4': return '#D4A857' // gold/amber
    case 'D1_FBS_G5': return '#22C55E' // emerald
    case 'D1_FCS': return '#3B82F6'    // blue
    default: return colors.textMuted   // gray
  }
}

function divisionLabel(division: string | null): string {
  if (!division) return ''
  return division.replace(/_/g, ' ')
}

function dmStatusConfig(status: TwitterDMStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'dm_sent': return { label: 'DM Sent', color: '#3B82F6', bg: '#3B82F620' }
    case 'follow_up_sent': return { label: 'Follow-up Sent', color: '#8B5CF6', bg: '#8B5CF620' }
    case 'replied': return { label: 'Replied', color: colors.success, bg: `${colors.success}20` }
    default: return { label: 'Not Contacted', color: colors.textMuted, bg: `${colors.textMuted}15` }
  }
}

export default function TwitterScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)
  const saveCoach = useCoachesStore((s) => s.saveCoach)

  // Data
  const [connected, setConnected] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [matches, setMatches] = useState<TwitterCoachMatch[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [newThisWeek, setNewThisWeek] = useState(0)
  const [dmdCount, setDmdCount] = useState(0)
  const [repliedCount, setRepliedCount] = useState(0)
  const [athletePosition, setAthletePosition] = useState<string | null>(null)

  // Filters
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [positionFilter, setPositionFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // UI
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  // Modal
  const [selectedCoach, setSelectedCoach] = useState<TwitterCoachMatch | null>(null)
  const [generatedDM, setGeneratedDM] = useState('')
  const [isGeneratingDM, setIsGeneratingDM] = useState(false)
  const [isMarkingSent, setIsMarkingSent] = useState(false)
  const [isSavingCoach, setIsSavingCoach] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    analytics.screenView('Twitter')
    loadFollowers(true)
  }, [])

  // Reload when filters change
  useEffect(() => {
    if (!isLoading) {
      loadFollowers(true)
    }
  }, [selectedDivision, positionFilter])

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (!isLoading) loadFollowers(true)
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  const loadFollowers = async (reset = false) => {
    if (reset) {
      setIsLoading(true)
      setOffset(0)
    } else {
      setIsLoadingMore(true)
    }

    const nextOffset = reset ? 0 : offset

    try {
      const data = await api.getTwitterFollowers({
        division: selectedDivision || undefined,
        position: positionFilter && athletePosition ? athletePosition : undefined,
        search: searchQuery.trim() || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      })

      setConnected(data.connected)
      setUsername(data.username)
      setTotalCount(data.totalCount)
      setNewThisWeek(data.newMatchesThisWeek)
      setDmdCount(data.dmdCount)
      setRepliedCount(data.repliedCount)
      if (data.athleteProfile?.position) {
        setAthletePosition(data.athleteProfile.position)
      }

      if (reset) {
        setMatches(data.matches)
      } else {
        setMatches((prev) => [...prev, ...data.matches])
      }

      setOffset(nextOffset + data.matches.length)
      setHasMore(data.matches.length >= PAGE_SIZE)
    } catch (err) {
      // UI shows empty/error state on failure
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const handleEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      loadFollowers(false)
    }
  }, [isLoadingMore, hasMore, isLoading, offset, selectedDivision, positionFilter, searchQuery])

  const handleConnect = async () => {
    try {
      // Generate PKCE pair locally (standard for native OAuth)
      const codeVerifierBytes = await Crypto.getRandomBytesAsync(32)
      const codeVerifier = btoa(String.fromCharCode(...codeVerifierBytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const challengeHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      )
      const codeChallenge = challengeHex
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      // Get auth URL from backend
      const { authUrl } = await api.getTwitterAuthMobile(codeChallenge)

      // Open in-app browser that catches redirect to app scheme
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        'xrnavigator://twitter-callback'
      )

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        if (error) {
          toast.show(error === 'denied' ? 'Authorization was denied' : 'Connection failed', 'error')
          return
        }

        if (code) {
          // Exchange code + verifier for tokens
          await api.exchangeTwitterCode({ code, codeVerifier })
          haptics.success()
          loadFollowers(true)
        }
      }
    } catch (err: any) {
      toast.show(err?.message || 'Failed to connect Twitter', 'error')
    }
  }

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const data = await api.scanTwitterFollowers()
      haptics.success()
      if (data.newMatches > 0) {
        toast.show(`Found ${data.newMatches} new coach match${data.newMatches > 1 ? 'es' : ''}!`, 'success')
      } else {
        toast.show('No new coach matches found', 'info')
      }
      loadFollowers(true)
    } catch (err: any) {
      toast.show(err?.message || 'Scan failed', 'error')
      haptics.error()
    } finally {
      setIsScanning(false)
    }
  }

  // --- Coach Detail Modal Actions ---

  const handleGenerateDM = async (isFollowUp = false) => {
    if (!selectedCoach) return
    setIsGeneratingDM(true)
    try {
      const data = await api.generateTwitterDM({
        coachId: selectedCoach.coach.id,
        coachName: selectedCoach.coach.name,
        school: selectedCoach.coach.school,
        title: selectedCoach.coach.title,
        isFollowUp,
      })
      setGeneratedDM(data.message)
      haptics.light()
    } catch (err: any) {
      toast.show(err?.message || 'Failed to generate DM', 'error')
    } finally {
      setIsGeneratingDM(false)
    }
  }

  const handleCopyAndOpenX = async () => {
    if (!selectedCoach || !generatedDM.trim()) return
    await Clipboard.setStringAsync(generatedDM.trim())
    haptics.success()
    toast.show('DM copied to clipboard!', 'success')
    // Open coach's X profile (not messages/compose which requires user ID)
    const handle = selectedCoach.coach.twitter?.replace('@', '') || ''
    if (handle) {
      await Linking.openURL(`https://twitter.com/${handle}`)
    }
  }

  const handleMarkAsSent = async () => {
    if (!selectedCoach) return
    setIsMarkingSent(true)
    try {
      await api.sendTwitterDM({ coachId: selectedCoach.coach.id, message: generatedDM.trim() || undefined })
      haptics.success()
      // Update local state
      setMatches((prev) =>
        prev.map((m) =>
          m.id === selectedCoach.id
            ? { ...m, dmStatus: m.dmStatus === 'not_contacted' ? 'dm_sent' as const : 'follow_up_sent' as const }
            : m
        )
      )
      setDmdCount((c) => c + 1)
      setGeneratedDM('')
      toast.show(`DM to ${selectedCoach.coach.name} tracked`, 'success')
    } catch (err: any) {
      toast.show(err?.message || 'Failed to mark as sent', 'error')
    } finally {
      setIsMarkingSent(false)
    }
  }

  const handleMarkReplied = async () => {
    if (!selectedCoach) return
    try {
      await api.sendTwitterDM({ coachId: selectedCoach.coach.id, markReplied: true })
      haptics.success()
      setMatches((prev) =>
        prev.map((m) =>
          m.id === selectedCoach.id ? { ...m, dmStatus: 'replied' as const } : m
        )
      )
      setRepliedCount((c) => c + 1)
      setSelectedCoach(null)
    } catch (err: any) {
      toast.show(err?.message || 'Failed to update status', 'error')
    }
  }

  const handleSaveCoach = async () => {
    if (!selectedCoach) return
    setIsSavingCoach(true)
    try {
      await saveCoach(selectedCoach.coach.id)
      haptics.success()
      toast.show(`${selectedCoach.coach.name} saved`, 'success')
    } catch (err: any) {
      if (err?.message?.includes('already')) {
        toast.show('Coach already saved', 'info')
      } else {
        toast.show(err?.message || 'Failed to save coach', 'error')
      }
    } finally {
      setIsSavingCoach(false)
    }
  }

  const handleAskInsight = () => {
    setSelectedCoach(null)
    router.push('/(tabs)/insight' as any)
  }

  // --- Render Helpers ---

  const renderCoachCard = useCallback(({ item }: { item: TwitterCoachMatch }) => {
    const dm = dmStatusConfig(item.dmStatus)
    const divColor = divisionColor(item.coach.division)

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedCoach(item)
          setGeneratedDM('')
          haptics.light()
        }}
      >
        <Card style={styles.coachCard}>
          <View style={styles.cardTopRow}>
            <SchoolLogo schoolName={item.coach.school} size={36} />
            <View style={styles.cardInfo}>
              <Text style={styles.coachName}>{item.coach.name}</Text>
              <Text style={styles.coachTitle}>{item.coach.title}</Text>
              <Text style={styles.coachSchool}>{item.coach.school}</Text>
            </View>
            <View style={styles.cardBadges}>
              {item.coach.division && (
                <View style={[styles.divisionBadge, { backgroundColor: `${divColor}20` }]}>
                  <Text style={[styles.divisionBadgeText, { color: divColor }]}>
                    {divisionLabel(item.coach.division)}
                  </Text>
                </View>
              )}
              <View style={[styles.dmStatusPill, { backgroundColor: dm.bg }]}>
                <Text style={[styles.dmStatusText, { color: dm.color }]}>{dm.label}</Text>
              </View>
            </View>
          </View>
          {item.coach.twitter && (
            <Text style={styles.twitterHandle}>@{item.coach.twitter.replace('@', '')}</Text>
          )}
        </Card>
      </TouchableOpacity>
    )
  }, [])

  const filteredMatchCount = matches.length

  // --- Not Connected ---
  if (!isLoading && !connected) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Coaches Following You</Text>
          <Text style={styles.headerSubtitle}>Connect Twitter/X to discover coaches</Text>
        </View>
        <View style={styles.connectContainer}>
          <Text style={styles.connectIcon}>X</Text>
          <Text style={styles.connectTitle}>Connect Your Twitter/X Account</Text>
          <Text style={styles.connectDescription}>
            We'll scan your followers to find college coaches and help you reach out directly via DM.
          </Text>
          <Button title="Connect Twitter/X" onPress={handleConnect} fullWidth />
        </View>
      </View>
    )
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Coaches Following You</Text>
        </View>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <CoachCardSkeleton />
          <CoachCardSkeleton />
          <CoachCardSkeleton />
          <CoachCardSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header + Stats */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={{ marginRight: spacing.sm }}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { flex: 1 }]}>Coaches Following You</Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScan}
            disabled={isScanning}
          >
            <Text style={styles.scanButtonText}>{isScanning ? 'Scanning...' : 'Scan'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: primaryColor }]}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{dmdCount}</Text>
            <Text style={styles.statLabel}>DM'd</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{repliedCount}</Text>
            <Text style={styles.statLabel}>Replied</Text>
          </View>
          {newThisWeek > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.warning }]}>{newThisWeek}</Text>
                <Text style={styles.statLabel}>New</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
          {DIVISION_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterPill,
                selectedDivision === f.value && { backgroundColor: primaryColor, borderColor: primaryColor },
              ]}
              onPress={() => {
                setSelectedDivision(f.value)
                haptics.light()
              }}
            >
              <Text style={[
                styles.filterPillText,
                selectedDivision === f.value && { color: colors.background },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          {athletePosition && (
            <TouchableOpacity
              style={[
                styles.filterPill,
                positionFilter && { backgroundColor: primaryColor, borderColor: primaryColor },
              ]}
              onPress={() => {
                setPositionFilter(!positionFilter)
                haptics.light()
              }}
            >
              <Text style={[
                styles.filterPillText,
                positionFilter && { color: colors.background },
              ]}>
                My Position ({athletePosition})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search coaches, schools..."
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <Text style={styles.matchCountText}>{filteredMatchCount} match{filteredMatchCount !== 1 ? 'es' : ''}</Text>
        </View>
      </View>

      {/* Coach List */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderCoachCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={primaryColor} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedDivision || positionFilter ? 'No matches found' : 'No coach matches yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedDivision || positionFilter
                ? 'Try adjusting your filters or search.'
                : 'Tap "Scan" to find college coaches who follow you on Twitter/X.'}
            </Text>
          </View>
        }
      />

      {/* Coach Detail Modal */}
      <Modal
        visible={!!selectedCoach}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCoach(null)}
      >
        {selectedCoach && (
          <CoachDetailModal
            coach={selectedCoach}
            generatedDM={generatedDM}
            setGeneratedDM={setGeneratedDM}
            isGeneratingDM={isGeneratingDM}
            isMarkingSent={isMarkingSent}
            isSavingCoach={isSavingCoach}
            onClose={() => setSelectedCoach(null)}
            onGenerateDM={handleGenerateDM}
            onCopyAndOpenX={handleCopyAndOpenX}
            onMarkAsSent={handleMarkAsSent}
            onMarkReplied={handleMarkReplied}
            onSaveCoach={handleSaveCoach}
            onAskInsight={handleAskInsight}
            primaryColor={primaryColor}
            insets={insets}
          />
        )}
      </Modal>
    </View>
  )
}

// --- Coach Detail Modal Component ---

interface CoachDetailModalProps {
  coach: TwitterCoachMatch
  generatedDM: string
  setGeneratedDM: (v: string) => void
  isGeneratingDM: boolean
  isMarkingSent: boolean
  isSavingCoach: boolean
  onClose: () => void
  onGenerateDM: (isFollowUp?: boolean) => void
  onCopyAndOpenX: () => void
  onMarkAsSent: () => void
  onMarkReplied: () => void
  onSaveCoach: () => void
  onAskInsight: () => void
  primaryColor: string
  insets: { top: number; bottom: number }
}

function CoachDetailModal({
  coach,
  generatedDM,
  setGeneratedDM,
  isGeneratingDM,
  isMarkingSent,
  isSavingCoach,
  onClose,
  onGenerateDM,
  onCopyAndOpenX,
  onMarkAsSent,
  onMarkReplied,
  onSaveCoach,
  onAskInsight,
  primaryColor,
  insets,
}: CoachDetailModalProps) {
  const dm = dmStatusConfig(coach.dmStatus)
  const divColor = divisionColor(coach.coach.division)
  const isFollowUp = coach.dmStatus === 'dm_sent' || coach.dmStatus === 'follow_up_sent'

  return (
    <KeyboardAvoidingView
      style={modalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[modalStyles.header, { paddingTop: insets.top || spacing.lg }]}>
        <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
          <Text style={modalStyles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={modalStyles.scroll}
        contentContainerStyle={[modalStyles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Coach Info */}
        <View style={modalStyles.coachInfo}>
          <View style={modalStyles.coachInfoHeader}>
            <SchoolLogo schoolName={coach.coach.school} size={48} />
            <View style={modalStyles.coachInfoText}>
              <Text style={modalStyles.coachName}>{coach.coach.name}</Text>
              <Text style={modalStyles.coachTitle}>{coach.coach.title}</Text>
              <Text style={modalStyles.coachSchool}>{coach.coach.school}</Text>
            </View>
          </View>
          <View style={modalStyles.badgeRow}>
            {coach.coach.division && (
              <View style={[styles.divisionBadge, { backgroundColor: `${divColor}20` }]}>
                <Text style={[styles.divisionBadgeText, { color: divColor }]}>
                  {divisionLabel(coach.coach.division)}
                </Text>
              </View>
            )}
            <View style={[styles.dmStatusPill, { backgroundColor: dm.bg }]}>
              <Text style={[styles.dmStatusText, { color: dm.color }]}>{dm.label}</Text>
            </View>
          </View>
          {coach.coach.twitter && (
            <TouchableOpacity onPress={() => Linking.openURL(`https://twitter.com/${coach.coach.twitter!.replace('@', '')}`)}>
              <Text style={modalStyles.twitterLink}>@{coach.coach.twitter.replace('@', '')}</Text>
            </TouchableOpacity>
          )}
          {coach.coach.conference && (
            <Text style={modalStyles.conference}>{coach.coach.conference}</Text>
          )}
        </View>

        {/* AI DM Composer */}
        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>AI DM Composer</Text>

          {!generatedDM ? (
            <Button
              title={isGeneratingDM ? 'Generating...' : (isFollowUp ? 'Generate Follow-up DM' : 'Generate DM')}
              onPress={() => onGenerateDM(isFollowUp)}
              disabled={isGeneratingDM}
              fullWidth
            />
          ) : (
            <>
              <TextInput
                style={modalStyles.dmInput}
                multiline
                value={generatedDM}
                onChangeText={setGeneratedDM}
                placeholder="Edit your message..."
                placeholderTextColor={colors.textDim}
              />
              <Text style={modalStyles.charCount}>{generatedDM.length} characters</Text>

              <View style={modalStyles.dmActions}>
                <TouchableOpacity
                  style={[modalStyles.dmActionButton, { backgroundColor: primaryColor }]}
                  onPress={onCopyAndOpenX}
                >
                  <Text style={modalStyles.dmActionButtonText}>Copy & Open X</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.dmActionButton, { backgroundColor: colors.success }]}
                  onPress={onMarkAsSent}
                  disabled={isMarkingSent}
                >
                  <Text style={modalStyles.dmActionButtonText}>
                    {isMarkingSent ? '...' : 'Mark as Sent'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={modalStyles.regenerateButton}
                onPress={() => onGenerateDM(isFollowUp)}
                disabled={isGeneratingDM}
              >
                <Text style={modalStyles.regenerateText}>
                  {isGeneratingDM ? 'Regenerating...' : 'Regenerate'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>Actions</Text>

          <View style={modalStyles.actionGrid}>
            <TouchableOpacity
              style={modalStyles.actionCard}
              onPress={onSaveCoach}
              disabled={isSavingCoach}
            >
              <Text style={modalStyles.actionEmoji}>+</Text>
              <Text style={modalStyles.actionLabel}>{isSavingCoach ? 'Saving...' : 'Save Coach'}</Text>
            </TouchableOpacity>

            {coach.dmStatus !== 'replied' && coach.dmStatus !== 'not_contacted' && (
              <TouchableOpacity style={modalStyles.actionCard} onPress={onMarkReplied}>
                <Text style={modalStyles.actionEmoji}>*</Text>
                <Text style={modalStyles.actionLabel}>Mark Replied</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={modalStyles.actionCard} onPress={onAskInsight}>
              <Text style={modalStyles.actionEmoji}>?</Text>
              <Text style={modalStyles.actionLabel}>Ask XR Insight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  scanButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  // Filters
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.sm,
  },
  filterPills: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterPillText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  matchCountText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
  // Coach Cards
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  coachCard: {
    gap: spacing.xs,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.sm,
    marginLeft: spacing.sm,
  },
  coachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  coachTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  coachSchool: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: fontFamily.medium,
    marginTop: 2,
  },
  cardBadges: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  divisionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  divisionBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  dmStatusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  dmStatusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
  },
  twitterHandle: {
    fontSize: fontSize.xs,
    color: colors.textDim,
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  // Empty
  empty: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  // Connect
  connectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  connectIcon: {
    fontSize: 48,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  connectTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  connectDescription: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
})

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  closeText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  // Coach Info
  coachInfo: {
    gap: spacing.xs,
  },
  coachInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  coachInfoText: {
    flex: 1,
    gap: spacing.xs,
  },
  coachName: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  coachTitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  coachSchool: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontFamily: fontFamily.medium,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  twitterLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  conference: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  // Section
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  // DM
  dmInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    textAlign: 'right',
  },
  dmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dmActionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dmActionButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.background,
  },
  regenerateButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  regenerateText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontFamily: fontFamily.medium,
  },
  // Actions
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionEmoji: {
    fontSize: 20,
    color: colors.text,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
})

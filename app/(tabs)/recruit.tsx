import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Linking,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'

import { api } from '@/lib/api'
import { haptics } from '@/lib/haptics'
import { useToast } from '@/components/ui/Toast'
import { useDrawerStore } from '@/stores/drawerStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { colors, spacing, fontSize, borderRadius, fontFamily } from '@/constants/theme'
import type { RecruitPageResponse } from '@/types'

type Tab = 'FILM' | 'STATS' | 'EVALUATION' | 'RECRUITING' | 'ACADEMICS' | 'CONTACT'

const TABS: Tab[] = ['FILM', 'STATS', 'EVALUATION', 'RECRUITING', 'ACADEMICS', 'CONTACT']

const positionLabels: Record<string, string> = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End',
  OL: 'Offensive Line', DL: 'Defensive Line', EDGE: 'Edge Rusher', LB: 'Linebacker',
  CB: 'Cornerback', S: 'Safety', K: 'Kicker', P: 'Punter', ATH: 'Athlete',
}

export default function RecruitScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const toast = useToast()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)

  const [data, setData] = useState<RecruitPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('FILM')

  // Film editing states
  const [hudlInput, setHudlInput] = useState('')
  const [youtubeInput, setYoutubeInput] = useState('')
  const [twitterInput, setTwitterInput] = useState('')
  const [instagramInput, setInstagramInput] = useState('')
  const [savingLinks, setSavingLinks] = useState(false)

  // Stats editing states
  const [heightFeet, setHeightFeet] = useState('')
  const [heightInches, setHeightInches] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [fortyInput, setFortyInput] = useState('')
  const [shuttleInput, setShuttleInput] = useState('')
  const [verticalInput, setVerticalInput] = useState('')
  const [broadJumpInput, setBroadJumpInput] = useState('')
  const [benchInput, setBenchInput] = useState('')
  const [squatInput, setSquatInput] = useState('')
  const [savingStats, setSavingStats] = useState(false)

  // Academics editing states
  const [gpaInput, setGpaInput] = useState('')
  const [weightedGpaInput, setWeightedGpaInput] = useState('')
  const [coreGpaInput, setCoreGpaInput] = useState('')
  const [satInput, setSatInput] = useState('')
  const [actInput, setActInput] = useState('')
  const [ncaaEligibleInput, setNcaaEligibleInput] = useState(false)
  const [majorInput, setMajorInput] = useState('')
  const [classRankInput, setClassRankInput] = useState('')
  const [savingAcademics, setSavingAcademics] = useState(false)

  // Contact editing states
  const [playerEmailInput, setPlayerEmailInput] = useState('')
  const [playerPhoneInput, setPlayerPhoneInput] = useState('')
  const [parentNameInput, setParentNameInput] = useState('')
  const [parentEmailInput, setParentEmailInput] = useState('')
  const [parentPhoneInput, setParentPhoneInput] = useState('')
  const [hsCoachNameInput, setHsCoachNameInput] = useState('')
  const [hsCoachTitleInput, setHsCoachTitleInput] = useState('')
  const [hsCoachEmailInput, setHsCoachEmailInput] = useState('')
  const [hsCoachPhoneInput, setHsCoachPhoneInput] = useState('')
  const [coachNotesInput, setCoachNotesInput] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  // Recruiting editing states
  const [offersInput, setOffersInput] = useState('')
  const [savingRecruiting, setSavingRecruiting] = useState(false)

  // Upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Analytics expanded
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const result = await api.getRecruitPage()
      setData(result)
      const c = result.card

      // Initialize Film inputs
      setHudlInput(c.hudlUrl || '')
      setYoutubeInput(c.youtubeUrl || '')
      setTwitterInput(c.twitterHandle || '')
      setInstagramInput(c.instagramHandle || '')

      // Initialize Stats inputs
      if (c.height) {
        const match = c.height.match(/(\d+)'(\d+)"?/)
        if (match) {
          setHeightFeet(match[1])
          setHeightInches(match[2])
        }
      }
      setWeightInput(c.weight?.toString() || '')
      setFortyInput(c.fortyTime?.toString() || '')
      setShuttleInput(c.shuttleTime?.toString() || '')
      setVerticalInput(c.verticalJump?.toString() || '')
      setBroadJumpInput(c.broadJump?.toString() || '')
      setBenchInput(c.benchPress?.toString() || '')
      setSquatInput(c.squat?.toString() || '')

      // Initialize Academics inputs
      setGpaInput(c.gpa?.toString() || '')
      setWeightedGpaInput(c.weightedGpa?.toString() || '')
      setCoreGpaInput(c.coreGpa?.toString() || '')
      setSatInput(c.satScore?.toString() || '')
      setActInput(c.actScore?.toString() || '')
      setNcaaEligibleInput(c.ncaaEligible || false)
      setMajorInput(c.intendedMajor || '')
      setClassRankInput(c.classRank || '')

      // Initialize Contact inputs
      setPlayerEmailInput(c.playerEmail || '')
      setPlayerPhoneInput(c.playerPhone || '')
      setParentNameInput(c.parentName || '')
      setParentEmailInput(c.parentEmail || '')
      setParentPhoneInput(c.parentPhone || '')
      setHsCoachNameInput(c.hsCoachName || '')
      setHsCoachTitleInput(c.hsCoachTitle || '')
      setHsCoachEmailInput(c.hsCoachEmail || '')
      setHsCoachPhoneInput(c.hsCoachPhone || '')
      setCoachNotesInput(c.coachNotes || '')

      // Initialize Recruiting inputs
      setOffersInput(c.offers?.join(', ') || '')
    } catch (err: any) {
      toast.show(err?.message || 'Failed to load recruit page', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData()
  }

  const handleShare = async () => {
    if (!data?.card.shareUrl) return
    haptics.light()
    try {
      await Share.share({
        message: `Check out my recruiting profile: ${data.card.shareUrl}`,
        url: data.card.shareUrl,
      })
    } catch {}
  }

  const handleCopyCoachLink = async () => {
    if (!data?.card.coachLinkUrl) return
    haptics.success()
    await Clipboard.setStringAsync(data.card.coachLinkUrl)
    toast.show('Coach link copied!', 'success')
  }

  const handleCopySocialLink = async () => {
    if (!data?.card.shareUrl) return
    haptics.success()
    await Clipboard.setStringAsync(data.card.shareUrl)
    toast.show('Social link copied!', 'success')
  }

  const handleOpenUrl = (url: string | null) => {
    if (!url) return
    haptics.light()
    Linking.openURL(url.startsWith('http') ? url : `https://${url}`)
  }

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true)
      try {
        // Create form data
        const formData = new FormData()
        const uri = result.assets[0].uri
        const filename = uri.split('/').pop() || 'photo.jpg'
        const match = /\.(\w+)$/.exec(filename)
        const type = match ? `image/${match[1]}` : 'image/jpeg'

        formData.append('file', {
          uri,
          name: filename,
          type,
        } as any)
        formData.append('cardId', data?.card.id || '')

        // Upload
        const response = await fetch('https://www.xceleraterecruiting.com/api/pro/recruiting-card/upload-photo', {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        if (response.ok) {
          toast.show('Photo uploaded!', 'success')
          loadData() // Refresh to get new photo
        } else {
          throw new Error('Upload failed')
        }
      } catch (err: any) {
        toast.show(err?.message || 'Failed to upload photo', 'error')
      } finally {
        setUploadingPhoto(false)
      }
    }
  }

  const handleSaveLinks = async () => {
    setSavingLinks(true)
    haptics.light()
    try {
      await api.updateRecruitLinks({
        hudlUrl: hudlInput.trim() || undefined,
        youtubeUrl: youtubeInput.trim() || undefined,
        twitterHandle: twitterInput.trim().replace('@', '') || undefined,
        instagramHandle: instagramInput.trim().replace('@', '') || undefined,
      })
      toast.show('Links saved!', 'success')
      haptics.success()
      loadData()
    } catch (err: any) {
      toast.show(err?.message || 'Failed to save', 'error')
    } finally {
      setSavingLinks(false)
    }
  }

  const handleSaveStats = async () => {
    setSavingStats(true)
    haptics.light()
    try {
      const height = heightFeet && heightInches ? `${heightFeet}'${heightInches}"` : undefined
      await api.updateRecruitLinks({
        height: height || undefined,
        weight: weightInput ? parseInt(weightInput, 10) : undefined,
        fortyTime: fortyInput ? parseFloat(fortyInput) : undefined,
        shuttleTime: shuttleInput ? parseFloat(shuttleInput) : undefined,
        verticalJump: verticalInput ? parseFloat(verticalInput) : undefined,
        broadJump: broadJumpInput ? parseFloat(broadJumpInput) : undefined,
        benchPress: benchInput ? parseInt(benchInput, 10) : undefined,
        squat: squatInput ? parseInt(squatInput, 10) : undefined,
      })
      toast.show('Stats saved!', 'success')
      haptics.success()
      loadData()
    } catch (err: any) {
      toast.show(err?.message || 'Failed to save', 'error')
    } finally {
      setSavingStats(false)
    }
  }

  const handleSaveAcademics = async () => {
    setSavingAcademics(true)
    haptics.light()
    try {
      await api.updateRecruitLinks({
        gpa: gpaInput ? parseFloat(gpaInput) : undefined,
        weightedGpa: weightedGpaInput ? parseFloat(weightedGpaInput) : undefined,
        coreGpa: coreGpaInput ? parseFloat(coreGpaInput) : undefined,
        satScore: satInput ? parseInt(satInput, 10) : undefined,
        actScore: actInput ? parseInt(actInput, 10) : undefined,
        ncaaEligible: ncaaEligibleInput,
        intendedMajor: majorInput.trim() || undefined,
        classRank: classRankInput.trim() || undefined,
      })
      toast.show('Academics saved!', 'success')
      haptics.success()
      loadData()
    } catch (err: any) {
      toast.show(err?.message || 'Failed to save', 'error')
    } finally {
      setSavingAcademics(false)
    }
  }

  const handleSaveContact = async () => {
    setSavingContact(true)
    haptics.light()
    try {
      await api.updateRecruitLinks({
        playerEmail: playerEmailInput.trim() || undefined,
        playerPhone: playerPhoneInput.trim() || undefined,
        parentName: parentNameInput.trim() || undefined,
        parentEmail: parentEmailInput.trim() || undefined,
        parentPhone: parentPhoneInput.trim() || undefined,
        hsCoachName: hsCoachNameInput.trim() || undefined,
        hsCoachTitle: hsCoachTitleInput.trim() || undefined,
        hsCoachEmail: hsCoachEmailInput.trim() || undefined,
        hsCoachPhone: hsCoachPhoneInput.trim() || undefined,
        coachNotes: coachNotesInput.trim() || undefined,
        twitterHandle: twitterInput.trim().replace('@', '') || undefined,
        instagramHandle: instagramInput.trim().replace('@', '') || undefined,
      })
      toast.show('Contact info saved!', 'success')
      haptics.success()
      loadData()
    } catch (err: any) {
      toast.show(err?.message || 'Failed to save', 'error')
    } finally {
      setSavingContact(false)
    }
  }

  const handleSaveRecruiting = async () => {
    setSavingRecruiting(true)
    haptics.light()
    try {
      const offers = offersInput.split(',').map(s => s.trim()).filter(Boolean)
      await api.updateRecruitLinks({
        offers,
        ncaaEligible: ncaaEligibleInput,
      })
      toast.show('Recruiting info saved!', 'success')
      haptics.success()
      loadData()
    } catch (err: any) {
      toast.show(err?.message || 'Failed to save', 'error')
    } finally {
      setSavingRecruiting(false)
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    )
  }

  if (!data?.card) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="document-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Recruit Page Yet</Text>
        <Text style={styles.emptyText}>Complete your profile to generate your recruit page</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: primaryColor }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.primaryButtonText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { card, views, analytics, followers } = data

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'FILM':
        return (
          <View style={styles.tabContent}>
            {/* Hudl */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.filmIcon, { backgroundColor: '#FF6B00' }]}>
                  <Text style={styles.filmIconText}>H</Text>
                </View>
                <Text style={styles.cardTitle}>Hudl Highlights</Text>
              </View>
              <TextInput
                style={styles.input}
                value={hudlInput}
                onChangeText={setHudlInput}
                placeholder="hudl.com/video/..."
                placeholderTextColor={colors.textMuted}
              />
              {card.hudlUrl && (
                <TouchableOpacity style={styles.openButton} onPress={() => handleOpenUrl(card.hudlUrl)}>
                  <Ionicons name="open-outline" size={16} color={primaryColor} />
                  <Text style={[styles.openButtonText, { color: primaryColor }]}>Open in Hudl</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* YouTube */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.filmIcon, { backgroundColor: '#FF0000' }]}>
                  <Ionicons name="logo-youtube" size={18} color="#FFF" />
                </View>
                <Text style={styles.cardTitle}>YouTube</Text>
              </View>
              <TextInput
                style={styles.input}
                value={youtubeInput}
                onChangeText={setYoutubeInput}
                placeholder="youtube.com/watch?v=..."
                placeholderTextColor={colors.textMuted}
              />
              {card.youtubeUrl && (
                <TouchableOpacity style={styles.openButton} onPress={() => handleOpenUrl(card.youtubeUrl)}>
                  <Ionicons name="open-outline" size={16} color={primaryColor} />
                  <Text style={[styles.openButtonText, { color: primaryColor }]}>Watch on YouTube</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveLinks}
              disabled={savingLinks}
            >
              {savingLinks ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Save Film Links</Text>
              )}
            </TouchableOpacity>
          </View>
        )

      case 'STATS':
        return (
          <View style={styles.tabContent}>
            {/* Measurables */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Measurables</Text>

              {/* Height */}
              <Text style={styles.inputLabel}>Height</Text>
              <View style={styles.heightRow}>
                <TextInput
                  style={[styles.input, styles.heightInput]}
                  value={heightFeet}
                  onChangeText={setHeightFeet}
                  placeholder="Ft"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <Text style={styles.heightSeparator}>'</Text>
                <TextInput
                  style={[styles.input, styles.heightInput]}
                  value={heightInches}
                  onChangeText={setHeightInches}
                  placeholder="In"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.heightSeparator}>"</Text>
              </View>

              {/* Weight */}
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="185"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              {/* 40-Yard Dash */}
              <Text style={styles.inputLabel}>40-Yard Dash (seconds)</Text>
              <TextInput
                style={styles.input}
                value={fortyInput}
                onChangeText={setFortyInput}
                placeholder="4.52"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Shuttle */}
              <Text style={styles.inputLabel}>Pro Shuttle (seconds)</Text>
              <TextInput
                style={styles.input}
                value={shuttleInput}
                onChangeText={setShuttleInput}
                placeholder="4.12"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Vertical */}
              <Text style={styles.inputLabel}>Vertical Jump (inches)</Text>
              <TextInput
                style={styles.input}
                value={verticalInput}
                onChangeText={setVerticalInput}
                placeholder="32"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Broad Jump */}
              <Text style={styles.inputLabel}>Broad Jump (inches)</Text>
              <TextInput
                style={styles.input}
                value={broadJumpInput}
                onChangeText={setBroadJumpInput}
                placeholder="108"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Bench Press */}
              <Text style={styles.inputLabel}>Bench Press (reps @ 185)</Text>
              <TextInput
                style={styles.input}
                value={benchInput}
                onChangeText={setBenchInput}
                placeholder="12"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              {/* Squat */}
              <Text style={styles.inputLabel}>Squat (lbs)</Text>
              <TextInput
                style={styles.input}
                value={squatInput}
                onChangeText={setSquatInput}
                placeholder="315"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveStats}
              disabled={savingStats}
            >
              {savingStats ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Save Stats</Text>
              )}
            </TouchableOpacity>
          </View>
        )

      case 'EVALUATION':
        return (
          <View style={styles.tabContent}>
            {card.xrRating ? (
              <>
                {/* XR Rating */}
                <View style={styles.card}>
                  <View style={styles.ratingHeader}>
                    <View style={[styles.ratingBadge, { backgroundColor: primaryColor }]}>
                      <Text style={styles.ratingNumber}>{card.xrRating}</Text>
                    </View>
                    <View style={styles.ratingInfo}>
                      <Text style={styles.ratingLabel}>XR Rating</Text>
                      {card.xrProjection && (
                        <Text style={[styles.projectionText, { color: primaryColor }]}>{card.xrProjection}</Text>
                      )}
                    </View>
                  </View>

                  {/* Summary */}
                  {card.xrSummary && (
                    <Text style={styles.summaryText}>{card.xrSummary}</Text>
                  )}
                </View>

                {/* Strengths */}
                {card.xrStrengths?.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Strengths</Text>
                    <View style={styles.tagsRow}>
                      {card.xrStrengths.map((s, i) => (
                        <View key={i} style={[styles.tag, styles.strengthTag]}>
                          <Text style={styles.strengthTagText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Areas to Improve */}
                {card.xrWeaknesses?.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Areas to Improve</Text>
                    <View style={styles.tagsRow}>
                      {card.xrWeaknesses.map((w, i) => (
                        <View key={i} style={[styles.tag, styles.weaknessTag]}>
                          <Text style={styles.weaknessTagText}>{w}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.card}>
                <Ionicons name="film-outline" size={48} color={colors.textMuted} style={{ alignSelf: 'center' }} />
                <Text style={styles.emptyCardTitle}>No Evaluation Yet</Text>
                <Text style={styles.emptyCardText}>Get your film evaluated by XR AI to see your rating and analysis</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: primaryColor, alignSelf: 'center' }]}
                  onPress={() => router.push('/(tabs)/evaluate')}
                >
                  <Text style={styles.primaryButtonText}>Get Evaluated</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )

      case 'RECRUITING':
        return (
          <View style={styles.tabContent}>
            {/* Offers */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Offers</Text>
              <Text style={styles.inputLabel}>Schools with Offers (comma separated)</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={offersInput}
                onChangeText={setOffersInput}
                placeholder="Alabama, Georgia, Ohio State..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              {/* Current Offers Display */}
              {offersInput.split(',').filter(s => s.trim()).length > 0 && (
                <View style={[styles.tagsRow, { marginTop: spacing.md }]}>
                  {offersInput.split(',').filter(s => s.trim()).map((offer, i) => (
                    <View key={i} style={[styles.tag, { backgroundColor: `${primaryColor}20`, borderColor: primaryColor }]}>
                      <Text style={[styles.tagText, { color: primaryColor }]}>{offer.trim()}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* NCAA Eligible Toggle */}
              <TouchableOpacity
                style={[styles.toggleRow, { marginTop: spacing.lg }]}
                onPress={() => setNcaaEligibleInput(!ncaaEligibleInput)}
              >
                <View style={[styles.toggleBox, ncaaEligibleInput && { backgroundColor: primaryColor, borderColor: primaryColor }]}>
                  {ncaaEligibleInput && <Ionicons name="checkmark" size={16} color={colors.background} />}
                </View>
                <Text style={styles.toggleLabel}>NCAA Eligibility Confirmed</Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveRecruiting}
              disabled={savingRecruiting}
            >
              {savingRecruiting ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Save Recruiting Info</Text>
              )}
            </TouchableOpacity>

            {/* Coach Followers */}
            {followers && followers.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Coaches Following You</Text>
                {followers.map((f, i) => (
                  <View key={f.id} style={[styles.followerRow, i < followers.length - 1 && styles.followerBorder]}>
                    <View>
                      <Text style={styles.followerName}>{f.name}</Text>
                      <Text style={styles.followerSchool}>{f.school}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )

      case 'ACADEMICS':
        return (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Academic Profile</Text>

              {/* GPA */}
              <Text style={styles.inputLabel}>Unweighted GPA</Text>
              <TextInput
                style={styles.input}
                value={gpaInput}
                onChangeText={setGpaInput}
                placeholder="3.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Weighted GPA */}
              <Text style={styles.inputLabel}>Weighted GPA</Text>
              <TextInput
                style={styles.input}
                value={weightedGpaInput}
                onChangeText={setWeightedGpaInput}
                placeholder="4.2"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* Core GPA */}
              <Text style={styles.inputLabel}>Core GPA (NCAA)</Text>
              <TextInput
                style={styles.input}
                value={coreGpaInput}
                onChangeText={setCoreGpaInput}
                placeholder="3.3"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              {/* SAT Score */}
              <Text style={styles.inputLabel}>SAT Score</Text>
              <TextInput
                style={styles.input}
                value={satInput}
                onChangeText={setSatInput}
                placeholder="1200"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              {/* ACT Score */}
              <Text style={styles.inputLabel}>ACT Score</Text>
              <TextInput
                style={styles.input}
                value={actInput}
                onChangeText={setActInput}
                placeholder="25"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              {/* Intended Major */}
              <Text style={styles.inputLabel}>Intended Major</Text>
              <TextInput
                style={styles.input}
                value={majorInput}
                onChangeText={setMajorInput}
                placeholder="Business, Engineering..."
                placeholderTextColor={colors.textMuted}
              />

              {/* Class Rank */}
              <Text style={styles.inputLabel}>Class Rank</Text>
              <TextInput
                style={styles.input}
                value={classRankInput}
                onChangeText={setClassRankInput}
                placeholder="Top 10%, 25/250..."
                placeholderTextColor={colors.textMuted}
              />

              {/* NCAA Eligible Toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setNcaaEligibleInput(!ncaaEligibleInput)}
              >
                <View style={[styles.toggleBox, ncaaEligibleInput && { backgroundColor: primaryColor, borderColor: primaryColor }]}>
                  {ncaaEligibleInput && <Ionicons name="checkmark" size={16} color={colors.background} />}
                </View>
                <Text style={styles.toggleLabel}>NCAA Eligibility Confirmed</Text>
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveAcademics}
              disabled={savingAcademics}
            >
              {savingAcademics ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Save Academics</Text>
              )}
            </TouchableOpacity>
          </View>
        )

      case 'CONTACT':
        return (
          <View style={styles.tabContent}>
            {/* Player Contact */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Player Contact</Text>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={playerEmailInput}
                onChangeText={setPlayerEmailInput}
                placeholder="athlete@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={playerPhoneInput}
                onChangeText={setPlayerPhoneInput}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Social */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Social Media</Text>
              <View style={styles.socialInputRow}>
                <Ionicons name="logo-twitter" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.socialInput}
                  value={twitterInput}
                  onChangeText={setTwitterInput}
                  placeholder="@username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.socialInputRow}>
                <Ionicons name="logo-instagram" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.socialInput}
                  value={instagramInput}
                  onChangeText={setInstagramInput}
                  placeholder="@username"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Parent/Guardian */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Parent/Guardian</Text>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={parentNameInput}
                onChangeText={setParentNameInput}
                placeholder="Parent/Guardian Name"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={parentEmailInput}
                onChangeText={setParentEmailInput}
                placeholder="parent@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={parentPhoneInput}
                onChangeText={setParentPhoneInput}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* HS Coach */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>High School Coach</Text>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={hsCoachNameInput}
                onChangeText={setHsCoachNameInput}
                placeholder="Coach Name"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={hsCoachTitleInput}
                onChangeText={setHsCoachTitleInput}
                placeholder="Head Coach, Position Coach..."
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={hsCoachEmailInput}
                onChangeText={setHsCoachEmailInput}
                placeholder="coach@school.edu"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={hsCoachPhoneInput}
                onChangeText={setHsCoachPhoneInput}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Coach Notes */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Notes for Coaches</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={coachNotesInput}
                onChangeText={setCoachNotesInput}
                placeholder="Any additional information coaches should know..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveContact}
              disabled={savingContact}
            >
              {savingContact ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Save Contact Info</Text>
              )}
            </TouchableOpacity>
          </View>
        )
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>XR Recruit Page</Text>
        <TouchableOpacity onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={primaryColor} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickPhoto} disabled={uploadingPhoto}>
            {card.profileImageUrl ? (
              <Image source={{ uri: card.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{card.firstName?.[0]}{card.lastName?.[0]}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Ionicons name="camera" size={14} color={colors.background} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{card.firstName} {card.lastName}</Text>
            <Text style={styles.profilePosition}>
              {positionLabels[card.position] || card.position} • Class of {card.gradYear}
            </Text>
            {card.highSchool && (
              <Text style={styles.profileSchool}>
                {card.highSchool}{card.city && card.state ? ` • ${card.city}, ${card.state}` : ''}
              </Text>
            )}

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              {card.height && <QuickStat label="HT" value={card.height} />}
              {card.weight && <QuickStat label="WT" value={`${card.weight}`} />}
              {card.fortyTime && <QuickStat label="40" value={card.fortyTime.toFixed(2)} />}
              {card.gpa && <QuickStat label="GPA" value={card.gpa.toFixed(2)} />}
            </View>
          </View>
        </View>

        {/* Share Links */}
        <View style={styles.shareSection}>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: primaryColor }]} onPress={handleCopyCoachLink}>
            <Ionicons name="mail-outline" size={16} color={colors.background} />
            <Text style={styles.shareButtonText}>Copy Coach Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButtonSecondary} onPress={handleCopySocialLink}>
            <Ionicons name="link-outline" size={16} color={colors.text} />
            <Text style={styles.shareButtonSecondaryText}>Copy Social Link</Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Summary */}
        <TouchableOpacity
          style={styles.analyticsBar}
          onPress={() => setAnalyticsExpanded(!analyticsExpanded)}
        >
          <View style={styles.analyticsStats}>
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsNumber, { color: primaryColor }]}>{analytics.totalViews}</Text>
              <Text style={styles.analyticsLabel}>Views</Text>
            </View>
            <View style={styles.analyticsStatDivider} />
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsNumber, { color: colors.success }]}>{analytics.schoolsDetected}</Text>
              <Text style={styles.analyticsLabel}>Schools</Text>
            </View>
            <View style={styles.analyticsStatDivider} />
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsNumber, { color: colors.purple }]}>{analytics.statesReached}</Text>
              <Text style={styles.analyticsLabel}>States</Text>
            </View>
          </View>
          <Ionicons name={analyticsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Expanded Analytics */}
        {analyticsExpanded && analytics.schools.length > 0 && (
          <View style={styles.analyticsExpanded}>
            <Text style={styles.analyticsExpandedTitle}>Schools Detected</Text>
            <View style={styles.schoolsGrid}>
              {analytics.schools.map((school, i) => (
                <View key={i} style={styles.schoolChip}>
                  <Text style={styles.schoolChipText}>{school}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { borderBottomColor: primaryColor }]}
                onPress={() => { setActiveTab(tab); haptics.light() }}
              >
                <Text style={[styles.tabText, activeTab === tab && { color: primaryColor }]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>
    </View>
  )
}

// Helper Components
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.quickStat}>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  )
}

function StatItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text },

  // Profile Section
  profileSection: {
    flexDirection: 'row', padding: spacing.lg, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontFamily: fontFamily.bold, color: colors.background },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, color: colors.text },
  profilePosition: { fontSize: fontSize.sm, color: colors.primary, fontFamily: fontFamily.medium, marginTop: 2 },
  profileSchool: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  quickStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickStat: { backgroundColor: colors.card, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  quickStatValue: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, color: colors.text },
  quickStatLabel: { fontSize: 10, color: colors.textMuted },

  // Share Section
  shareSection: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  shareButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs,
  },
  shareButtonText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.background },
  shareButtonSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: borderRadius.md, gap: spacing.xs,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  shareButtonSecondaryText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, color: colors.text },

  // Analytics
  analyticsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  analyticsStats: { flexDirection: 'row', alignItems: 'center' },
  analyticsStat: { alignItems: 'center', paddingHorizontal: spacing.md },
  analyticsStatDivider: { width: 1, height: 24, backgroundColor: colors.border },
  analyticsNumber: { fontSize: fontSize.lg, fontFamily: fontFamily.bold },
  analyticsLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  analyticsExpanded: { padding: spacing.lg, backgroundColor: colors.card },
  analyticsExpandedTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: spacing.sm },
  schoolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  schoolChip: { backgroundColor: colors.cardHover, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  schoolChipText: { fontSize: fontSize.xs, color: colors.text },

  // Tabs
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.md },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, color: colors.textMuted, letterSpacing: 0.5 },

  // Tab Content
  tabContent: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.text },
  filmIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filmIconText: { fontSize: 18, fontFamily: fontFamily.bold, color: '#FFF' },
  input: {
    backgroundColor: colors.cardHover, borderRadius: borderRadius.md, padding: spacing.md,
    fontSize: fontSize.sm, color: colors.text, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium, color: colors.textMuted,
    marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  heightRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  heightInput: {
    width: 60, textAlign: 'center',
  },
  heightSeparator: {
    fontSize: fontSize.lg, color: colors.textMuted, fontFamily: fontFamily.bold,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md,
  },
  toggleBox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: fontSize.sm, color: colors.text, fontFamily: fontFamily.medium,
  },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  openButtonText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium },
  saveButton: {
    paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md,
  },
  saveButtonText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.background },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statItem: {
    width: '48%', backgroundColor: colors.cardHover, padding: spacing.md,
    borderRadius: borderRadius.md, alignItems: 'center',
  },
  statValue: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: spacing.md },

  // Rating
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  ratingBadge: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ratingNumber: { fontSize: 24, fontFamily: fontFamily.bold, color: colors.background },
  ratingInfo: { flex: 1 },
  ratingLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  projectionText: { fontSize: fontSize.base, fontFamily: fontFamily.semibold },
  summaryText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, borderWidth: 1 },
  tagText: { fontSize: fontSize.xs, fontFamily: fontFamily.medium },
  strengthTag: { backgroundColor: `${colors.success}20`, borderColor: colors.success },
  strengthTagText: { fontSize: fontSize.xs, color: colors.success, fontFamily: fontFamily.medium },
  weaknessTag: { backgroundColor: `${colors.warning}20`, borderColor: colors.warning },
  weaknessTagText: { fontSize: fontSize.xs, color: colors.warning, fontFamily: fontFamily.medium },

  // Contact
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  contactName: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.text, marginBottom: spacing.sm },
  socialInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  socialInput: { flex: 1, backgroundColor: colors.cardHover, borderRadius: borderRadius.md, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text },

  // Followers
  followerRow: { paddingVertical: spacing.sm },
  followerBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  followerName: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.text },
  followerSchool: { fontSize: fontSize.xs, color: colors.textMuted },

  // Empty states
  emptyTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.semibold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.xl },
  emptyCardTitle: { fontSize: fontSize.base, fontFamily: fontFamily.semibold, color: colors.text, textAlign: 'center', marginTop: spacing.md },
  emptyCardText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  primaryButton: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  primaryButtonText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.background },
})

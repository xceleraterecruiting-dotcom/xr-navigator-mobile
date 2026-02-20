import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { haptics } from '@/lib/haptics'
import { Ionicons } from '@expo/vector-icons'
// Lazy import — native module may not be in current dev client build
let DocumentPicker: typeof import('expo-document-picker') | null = null
try {
  DocumentPicker = require('expo-document-picker')
} catch {
  // Native module not available in this build
}

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ProfileSkeleton } from '@/components/ui/Skeleton'
import { useAthleteStore } from '@/stores/athleteStore'
import { useIsPro } from '@/stores/subscriptionStore'
import { useDrawerStore } from '@/stores/drawerStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { uploadFile } from '@/lib/upload'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows } from '@/constants/theme'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K', 'P', 'ATH']

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

const TARGET_LEVELS = [
  { value: 'D1_FBS_P4', label: 'D1 FBS (Power 4)' },
  { value: 'D1_FBS_G5', label: 'D1 FBS (Group of 5)' },
  { value: 'D1_FCS', label: 'D1 FCS' },
  { value: 'D2', label: 'D2' },
  { value: 'D3', label: 'D3' },
  { value: 'NAIA', label: 'NAIA' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()
  const { user } = useUser()
  const { primaryColor, isPhenom } = usePartnerBranding()
  const isPro = useIsPro()
  const openDrawer = useDrawerStore((s) => s.open)

  const toast = useToast()
  const { athlete, isLoading, fetchAthlete, updateProfile } = useAthleteStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    analytics.screenView('Profile')
  }, [])

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/(auth)/sign-in')
        },
      },
    ])
  }

  const handleSave = async () => {
    try {
      const updates: Record<string, any> = {}
      Object.entries(editedValues).forEach(([key, value]) => {
        if (['height', 'weight', 'gradYear', 'sat', 'act'].includes(key)) {
          updates[key] = value ? parseInt(value, 10) : null
        } else if (['gpa', 'fortyYard'].includes(key)) {
          updates[key] = value ? parseFloat(value) : null
        } else {
          updates[key] = value || null
        }
      })

      await updateProfile(updates)
      analytics.updateProfile(Object.keys(updates))
      haptics.success()
      setIsEditing(false)
      setEditedValues({})
    } catch (err) {
      haptics.error()
      toast.show('Failed to update profile', 'error')
    }
  }

  const handleUploadEval = async () => {
    if (!DocumentPicker) {
      Alert.alert('Not Available', 'Document picker is not available in this build.')
      return
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      })

      if (result.canceled || !result.assets?.[0]) return

      const file = result.assets[0]
      setIsUploading(true)
      haptics.light()

      const uploaded = await uploadFile(
        'evaluationUpload',
        file.uri,
        file.name,
        file.mimeType || 'application/pdf',
        file.size || 0,
      )

      await updateProfile({
        evaluationFileUrl: uploaded.url,
        evaluationStatus: 'UPLOADED',
        evaluationUpdatedAt: new Date().toISOString(),
      } as any)

      await fetchAthlete()
      haptics.success()
      toast.show('Evaluation uploaded!', 'success')
    } catch (err: any) {
      haptics.error()
      toast.show(err?.message || 'Failed to upload evaluation', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const getValue = (key: string) => {
    if (isEditing && key in editedValues) {
      return editedValues[key]
    }
    return athlete?.[key as keyof typeof athlete]?.toString() || ''
  }

  const setValue = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
  }

  const calculateCompletion = () => {
    if (!athlete) return 0
    const fields = ['position', 'gradYear', 'height', 'weight', 'gpa', 'highSchool', 'city', 'state']
    const filled = fields.filter((f) => athlete[f as keyof typeof athlete])
    return Math.round((filled.length / fields.length) * 100)
  }

  const completion = calculateCompletion()

  const formatHeight = (inches: number | null) => {
    if (!inches) return '-'
    const feet = Math.floor(inches / 12)
    const remainingInches = inches % 12
    return `${feet}'${remainingInches}"`
  }

  // Show skeleton on initial load
  if (isLoading && !athlete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ProfileSkeleton />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <OfflineBanner screen="profile" />
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchAthlete}
          tintColor={primaryColor}
        />
      }
      keyboardShouldPersistTaps="handled"
    >
      {/* Menu Button */}
      <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={{ alignSelf: 'flex-start', padding: spacing.sm, marginBottom: spacing.xs }}>
        <Ionicons name="menu" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {athlete?.firstName?.[0]?.toUpperCase() || user?.firstName?.[0] || '?'}
            </Text>
          </View>
        </View>
        <Text style={styles.name}>
          {athlete?.firstName || user?.firstName} {athlete?.lastName || user?.lastName}
        </Text>
        <Text style={styles.email}>{athlete?.email || user?.primaryEmailAddress?.emailAddress}</Text>

        {athlete?.position && (
          <View style={styles.positionBadge}>
            <Text style={styles.positionBadgeText}>{athlete.position}</Text>
            {athlete?.gradYear && (
              <Text style={styles.positionBadgeClass}>Class of {athlete.gradYear}</Text>
            )}
          </View>
        )}

        {isPhenom && (
          <View style={styles.phenomBadge}>
            <Text style={styles.phenomBadgeText}>PHENOM ELITE ATHLETE</Text>
          </View>
        )}
      </View>

      {/* Measurables Stats Row — like web public card */}
      <View style={styles.measurablesCard}>
        <MeasurableStat
          value={formatHeight(athlete?.height || null)}
          label="HEIGHT"
          accent={!!athlete?.height}
        />
        <View style={styles.measurableDivider} />
        <MeasurableStat
          value={athlete?.weight ? `${athlete.weight}` : '-'}
          label="WEIGHT"
          unit="lbs"
          accent={!!athlete?.weight}
        />
        <View style={styles.measurableDivider} />
        <MeasurableStat
          value={athlete?.fortyYard ? `${athlete.fortyYard}` : '-'}
          label="40-YD"
          accent={!!athlete?.fortyYard}
        />
        <View style={styles.measurableDivider} />
        <MeasurableStat
          value={athlete?.gpa ? `${athlete.gpa.toFixed(2)}` : '-'}
          label="GPA"
          accent={!!athlete?.gpa}
        />
      </View>

      {/* Profile Completion */}
      <View style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <Text style={styles.completionTitle}>PROFILE COMPLETION</Text>
          <Text style={[styles.completionPercent, { color: completion === 100 ? colors.success : primaryColor }]}>
            {completion}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${completion}%`,
                backgroundColor: completion === 100 ? colors.success : primaryColor,
              },
            ]}
          />
        </View>
        {completion < 100 && (
          <Text style={styles.completionHint}>
            Complete your profile to stand out to college coaches
          </Text>
        )}
        {completion === 100 && (
          <Text style={[styles.completionHint, { color: colors.success }]}>
            Profile complete — you're ready to recruit
          </Text>
        )}
      </View>

      {/* Edit Toggle */}
      <View style={styles.editToggle}>
        <Text style={styles.sectionTitle}>PROFILE INFORMATION</Text>
        <TouchableOpacity
          onPress={() => {
            if (isEditing) {
              setEditedValues({})
            }
            setIsEditing(!isEditing)
            haptics.light()
          }}
          style={[styles.editButtonWrap, isEditing && styles.editButtonWrapActive]}
        >
          <Text style={[styles.editButton, { color: isEditing ? colors.background : primaryColor }]}>
            {isEditing ? 'CANCEL' : 'EDIT'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BASIC INFO</Text>

        {isEditing ? (
          <>
            <View style={styles.row}>
              <Input
                label="First Name"
                value={getValue('firstName')}
                onChangeText={(v) => setValue('firstName', v)}
                containerStyle={styles.halfInput}
              />
              <Input
                label="Last Name"
                value={getValue('lastName')}
                onChangeText={(v) => setValue('lastName', v)}
                containerStyle={styles.halfInput}
              />
            </View>
            <Input
              label="Position"
              value={getValue('position')}
              onChangeText={(v) => setValue('position', v)}
              placeholder="e.g., QB, WR, LB"
            />
            <Input
              label="Graduation Year"
              value={getValue('gradYear')}
              onChangeText={(v) => setValue('gradYear', v)}
              keyboardType="number-pad"
              placeholder="e.g., 2026"
            />
            <Input
              label="Twitter Handle"
              value={getValue('twitter')}
              onChangeText={(v) => setValue('twitter', v)}
              placeholder="@username"
              autoCapitalize="none"
            />
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoItem label="Position" value={athlete?.position || '-'} accent={!!athlete?.position} />
            <InfoItem label="Class" value={athlete?.gradYear?.toString() || '-'} accent={!!athlete?.gradYear} />
            <InfoItem label="Twitter" value={athlete?.twitter ? `@${athlete.twitter}` : '-'} />
          </View>
        )}
      </View>

      {/* School Info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SCHOOL INFO</Text>

        {isEditing ? (
          <>
            <Input
              label="High School Name"
              value={getValue('highSchool')}
              onChangeText={(v) => setValue('highSchool', v)}
              placeholder="e.g., Lincoln High School"
            />
            <View style={styles.row}>
              <Input
                label="City"
                value={getValue('city')}
                onChangeText={(v) => setValue('city', v)}
                placeholder="e.g., Dallas"
                containerStyle={styles.halfInput}
              />
              <Input
                label="State"
                value={getValue('state')}
                onChangeText={(v) => setValue('state', v)}
                placeholder="e.g., TX"
                autoCapitalize="characters"
                containerStyle={styles.halfInput}
              />
            </View>
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoItem label="High School" value={athlete?.highSchool || '-'} />
            <InfoItem
              label="Location"
              value={
                athlete?.city && athlete?.state
                  ? `${athlete.city}, ${athlete.state}`
                  : '-'
              }
            />
          </View>
        )}
      </View>

      {/* Measurables */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ATHLETIC MEASURABLES</Text>

        {isEditing ? (
          <>
            <View style={styles.row}>
              <Input
                label="Height (inches)"
                value={getValue('height')}
                onChangeText={(v) => setValue('height', v)}
                keyboardType="number-pad"
                placeholder="e.g., 74"
                containerStyle={styles.halfInput}
              />
              <Input
                label="Weight (lbs)"
                value={getValue('weight')}
                onChangeText={(v) => setValue('weight', v)}
                keyboardType="number-pad"
                placeholder="e.g., 185"
                containerStyle={styles.halfInput}
              />
            </View>
            <Input
              label="40-Yard Dash"
              value={getValue('fortyYard')}
              onChangeText={(v) => setValue('fortyYard', v)}
              keyboardType="decimal-pad"
              placeholder="e.g., 4.52"
            />
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoItem label="Height" value={formatHeight(athlete?.height || null)} accent={!!athlete?.height} />
            <InfoItem label="Weight" value={athlete?.weight ? `${athlete.weight} lbs` : '-'} accent={!!athlete?.weight} />
            <InfoItem
              label="40-Yard"
              value={athlete?.fortyYard ? `${athlete.fortyYard}s` : '-'}
              accent={!!athlete?.fortyYard}
            />
          </View>
        )}
      </View>

      {/* Academics */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACADEMICS</Text>

        {isEditing ? (
          <>
            <Input
              label="GPA"
              value={getValue('gpa')}
              onChangeText={(v) => setValue('gpa', v)}
              keyboardType="decimal-pad"
              placeholder="e.g., 3.5"
            />
            <View style={styles.row}>
              <Input
                label="SAT"
                value={getValue('sat')}
                onChangeText={(v) => setValue('sat', v)}
                keyboardType="number-pad"
                placeholder="e.g., 1200"
                containerStyle={styles.halfInput}
              />
              <Input
                label="ACT"
                value={getValue('act')}
                onChangeText={(v) => setValue('act', v)}
                keyboardType="number-pad"
                placeholder="e.g., 25"
                containerStyle={styles.halfInput}
              />
            </View>
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoItem label="GPA" value={athlete?.gpa?.toFixed(2) || '-'} accent={!!athlete?.gpa} />
            <InfoItem label="SAT" value={athlete?.sat?.toString() || '-'} accent={!!athlete?.sat} />
            <InfoItem label="ACT" value={athlete?.act?.toString() || '-'} accent={!!athlete?.act} />
          </View>
        )}
      </View>

      {/* Recruiting */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>RECRUITING</Text>

        {isEditing ? (
          <>
            <Input
              label="Hudl Highlight Video"
              value={getValue('hudlUrl')}
              onChangeText={(v) => setValue('hudlUrl', v)}
              placeholder="https://hudl.com/video/..."
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.selectWrapper}>
              <Text style={styles.selectLabel}>Target Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                <View style={styles.chipsRow}>
                  {TARGET_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.chip,
                        getValue('targetLevel') === level.value && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setValue('targetLevel', level.value)
                        haptics.light()
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          getValue('targetLevel') === level.value && styles.chipTextSelected,
                        ]}
                      >
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoItem label="Hudl" value={athlete?.hudlUrl ? 'Linked ✓' : '-'} accent={!!athlete?.hudlUrl} />
            <InfoItem
              label="Target Level"
              value={TARGET_LEVELS.find((l) => l.value === athlete?.targetLevel)?.label || '-'}
              accent={!!athlete?.targetLevel}
            />
            <InfoItem label="Twitter" value={athlete?.twitter ? `@${athlete.twitter}` : '-'} />
          </View>
        )}
      </View>

      {/* Save Button */}
      {isEditing && (
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={isLoading}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      )}

      {/* Evaluation Upload */}
      {!isEditing && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EVALUATION</Text>
          <TouchableOpacity
            style={styles.evalUploadBtn}
            onPress={handleUploadEval}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#0A0A0A" />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={20} color="#0A0A0A" />
                <Text style={styles.evalUploadText}>Upload Evaluation</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.evalHint}>
            Upload your evaluation as a PDF to connect it to your profile
          </Text>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}

function InfoItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent && styles.infoValueAccent]}>{value}</Text>
    </View>
  )
}

function MeasurableStat({ value, label, unit, accent }: { value: string; label: string; unit?: string; accent?: boolean }) {
  return (
    <View style={styles.measurableStat}>
      <View style={styles.measurableValueRow}>
        <Text style={[styles.measurableValue, accent && styles.measurableValueAccent]}>{value}</Text>
        {unit && value !== '-' && <Text style={styles.measurableUnit}>{unit}</Text>}
      </View>
      <Text style={styles.measurableLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.gold,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  avatarPro: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    ...shadows.sm,
  },
  proBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: colors.background,
    letterSpacing: 1.5,
  },
  name: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: spacing.xs,
  },
  // Position badge
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  positionBadgeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  positionBadgeClass: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  // Measurables card
  measurablesCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  measurableStat: {
    flex: 1,
    alignItems: 'center',
  },
  measurableValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  measurableValue: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  measurableValueAccent: {
    color: colors.text,
  },
  measurableUnit: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textDim,
  },
  measurableLabel: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 1,
    marginTop: 2,
  },
  measurableDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  // Phenom badge
  phenomBadge: {
    marginTop: spacing.md,
    backgroundColor: `${colors.phenomRed}20`,
    borderWidth: 1,
    borderColor: colors.phenomRed,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  phenomBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.phenomRed,
    letterSpacing: 1,
  },
  // Upgrade card
  upgradeCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    width: '100%',
    gap: spacing.md,
    ...shadows.gold,
  },
  upgradeIconBg: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeIcon: {
    fontSize: 20,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    lineHeight: 18,
  },
  upgradeArrow: {
    // kept for compat
  },
  // Completion card
  completionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 1.5,
  },
  completionPercent: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completionHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  // Edit toggle
  editToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 2,
  },
  editButtonWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  editButtonWrapActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  editButton: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
  },
  // Section
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    marginBottom: spacing.md,
    letterSpacing: 1.5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoItem: {
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
    marginTop: spacing.xs,
  },
  infoValueAccent: {
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  // Select / Chips
  selectWrapper: {
    marginTop: spacing.sm,
  },
  selectLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.textDim,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipsScroll: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardHover,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  // Sign out
  signOutButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  signOutText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 1.5,
  },
  // Evaluation upload
  evalUploaded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  evalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  evalBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.success,
  },
  evalReplaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  evalReplaceText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  evalUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  evalUploadText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: '#0A0A0A',
  },
  evalHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textDim,
    marginTop: spacing.sm,
  },
})

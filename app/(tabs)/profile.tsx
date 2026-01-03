import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAthleteStore } from '@/stores/athleteStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K', 'P', 'ATH']

export default function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()
  const { user } = useUser()
  const { primaryColor, isPhenom } = usePartnerBranding()

  const { athlete, isLoading, fetchAthlete, updateProfile } = useAthleteStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

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
      // Convert string values to appropriate types
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setIsEditing(false)
      setEditedValues({})
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert('Error', 'Failed to update profile')
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

  // Calculate profile completion
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

  return (
    <ScrollView
      style={styles.container}
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
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {athlete?.firstName?.[0]?.toUpperCase() || user?.firstName?.[0] || '?'}
          </Text>
        </View>
        <Text style={styles.name}>
          {athlete?.firstName || user?.firstName} {athlete?.lastName || user?.lastName}
        </Text>
        <Text style={styles.email}>{athlete?.email || user?.primaryEmailAddress?.emailAddress}</Text>

        {isPhenom && (
          <Badge label="Phenom Elite Athlete" variant="primary" style={{ marginTop: spacing.sm }} />
        )}
      </View>

      {/* Profile Completion */}
      <Card style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <Text style={styles.completionTitle}>Profile Completion</Text>
          <Text style={[styles.completionPercent, { color: primaryColor }]}>{completion}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${completion}%`, backgroundColor: primaryColor },
            ]}
          />
        </View>
        {completion < 100 && (
          <Text style={styles.completionHint}>
            Complete your profile to stand out to college coaches
          </Text>
        )}
      </Card>

      {/* Edit Toggle */}
      <View style={styles.editToggle}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <TouchableOpacity
          onPress={() => {
            if (isEditing) {
              setEditedValues({})
            }
            setIsEditing(!isEditing)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
        >
          <Text style={[styles.editButton, { color: primaryColor }]}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Basic Info */}
      <Card style={styles.section}>
        <Text style={styles.sectionLabel}>Basic Info</Text>

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
          </>
        ) : (
          <View style={styles.infoGrid}>
            <InfoItem label="Position" value={athlete?.position || '-'} />
            <InfoItem label="Class" value={athlete?.gradYear?.toString() || '-'} />
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
      </Card>

      {/* Measurables */}
      <Card style={styles.section}>
        <Text style={styles.sectionLabel}>Athletic Measurables</Text>

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
            <InfoItem label="Height" value={formatHeight(athlete?.height || null)} />
            <InfoItem label="Weight" value={athlete?.weight ? `${athlete.weight} lbs` : '-'} />
            <InfoItem
              label="40-Yard"
              value={athlete?.fortyYard ? `${athlete.fortyYard}s` : '-'}
            />
          </View>
        )}
      </Card>

      {/* Academics */}
      <Card style={styles.section}>
        <Text style={styles.sectionLabel}>Academics</Text>

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
            <InfoItem label="GPA" value={athlete?.gpa?.toFixed(2) || '-'} />
            <InfoItem label="SAT" value={athlete?.sat?.toString() || '-'} />
            <InfoItem label="ACT" value={athlete?.act?.toString() || '-'} />
          </View>
        )}
      </Card>

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

      {/* Sign Out */}
      <Button
        title="Sign Out"
        variant="ghost"
        onPress={handleSignOut}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.background,
  },
  name: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  completionCard: {
    marginBottom: spacing.lg,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  completionPercent: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  editToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  editButton: {
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
})

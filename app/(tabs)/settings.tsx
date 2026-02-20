import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'

import { api } from '@/lib/api'
import { analytics } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { useToast } from '@/components/ui/Toast'
import { useIsPro } from '@/stores/subscriptionStore'
import { colors, spacing, fontSize, borderRadius, fontFamily } from '@/constants/theme'
import type { UserSettings } from '@/types'

export default function SettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const openDrawer = useDrawerStore((s) => s.open)
  const { signOut } = useAuth()
  const isPro = useIsPro()

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')

  useEffect(() => {
    analytics.screenView('Settings')
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.getSettings()
      setSettings(data)
    } catch {
      toast.show('Failed to load settings', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async (key: keyof UserSettings, value: boolean) => {
    if (!settings) return
    const prev = settings[key]
    setSettings({ ...settings, [key]: value })
    haptics.selection()
    try {
      await api.updateSettings({ [key]: value })
    } catch {
      setSettings({ ...settings, [key]: prev })
      toast.show('Failed to update setting', 'error')
    }
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          haptics.medium()
          await signOut()
        },
      },
    ])
  }

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return
    haptics.heavy()
    try {
      await api.deleteAccount()
      toast.show('Account deleted', 'info')
      await signOut()
    } catch {
      toast.show('Failed to delete account', 'error')
    }
  }

  const SettingRow = ({
    icon,
    label,
    value,
    onToggle,
  }: {
    icon: keyof typeof Ionicons.glyphMap
    label: string
    value: boolean
    onToggle: (v: boolean) => void
  }) => (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: `${colors.primary}60` }}
        thumbColor={value ? colors.primary : colors.textDim}
      />
    </View>
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.backBtn}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        {settings && (
          <>
            <SettingRow
              icon="mail-outline"
              label="Weekly Summary"
              value={settings.notifyWeeklySummary}
              onToggle={(v) => updateSetting('notifyWeeklySummary', v)}
            />
            <SettingRow
              icon="chatbubble-outline"
              label="Coach Responses"
              value={settings.notifyCoachResponse}
              onToggle={(v) => updateSetting('notifyCoachResponse', v)}
            />
            <SettingRow
              icon="trophy-outline"
              label="Challenge Reminders"
              value={settings.notifyChallengeReminders}
              onToggle={(v) => updateSetting('notifyChallengeReminders', v)}
            />
          </>
        )}

        {/* Privacy */}
        <Text style={styles.sectionHeader}>Privacy</Text>
        {settings && (
          <>
            <SettingRow
              icon="eye-outline"
              label="Profile Visibility"
              value={settings.profileVisibility}
              onToggle={(v) => updateSetting('profileVisibility', v)}
            />
            <SettingRow
              icon="share-social-outline"
              label="Activity Sharing"
              value={settings.activitySharing}
              onToggle={(v) => updateSetting('activitySharing', v)}
            />
          </>
        )}

        {/* Subscription */}
        <Text style={styles.sectionHeader}>Subscription</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(tabs)/upgrade')}
          activeOpacity={0.7}
        >
          <Ionicons name="diamond-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionLabel}>Current Plan</Text>
            <Text style={styles.actionSub}>{isPro ? 'Pro' : 'Free'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </TouchableOpacity>

        {/* Support */}
        <Text style={styles.sectionHeader}>Support</Text>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => Linking.openURL('https://www.xceleraterecruiting.com/help')}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
          <Text style={styles.actionLabel}>Help Center</Text>
          <Ionicons name="open-outline" size={16} color={colors.textDim} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => Linking.openURL('mailto:support@xceleraterecruiting.com')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.textMuted} />
          <Text style={styles.actionLabel}>Send Feedback</Text>
          <Ionicons name="open-outline" size={16} color={colors.textDim} />
        </TouchableOpacity>

        {/* Account */}
        <Text style={styles.sectionHeader}>Account</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
          <Text style={styles.actionLabel}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => setDeleteConfirm(!deleteConfirm)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
          <Text style={[styles.actionLabel, { color: colors.error }]}>Delete Account</Text>
        </TouchableOpacity>

        {deleteConfirm && (
          <View style={styles.deleteSection}>
            <Text style={styles.deleteWarning}>
              This action is permanent. Type DELETE to confirm.
            </Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="Type DELETE"
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.deleteBtn, deleteText !== 'DELETE' && { opacity: 0.4 }]}
              onPress={handleDeleteAccount}
              disabled={deleteText !== 'DELETE'}
            >
              <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  backBtn: { padding: spacing.sm },
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, color: colors.text },

  sectionHeader: {
    fontSize: fontSize.xs, fontFamily: fontFamily.bold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },

  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settingLabel: { flex: 1, fontSize: fontSize.base, fontFamily: fontFamily.medium, color: colors.text },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  actionLabel: { flex: 1, fontSize: fontSize.base, fontFamily: fontFamily.medium, color: colors.text },
  actionSub: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.textMuted },

  deleteSection: {
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
  },
  deleteWarning: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.error, marginBottom: spacing.sm },
  deleteInput: {
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: `${colors.error}30`,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.base, fontFamily: fontFamily.medium, color: colors.text,
    marginBottom: spacing.sm,
  },
  deleteBtn: {
    backgroundColor: colors.error, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  deleteBtnText: { fontSize: fontSize.sm, fontFamily: fontFamily.bold, color: colors.text },
})

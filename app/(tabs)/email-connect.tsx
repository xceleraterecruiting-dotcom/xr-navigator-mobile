import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { haptics } from '@/lib/haptics'
import { analytics } from '@/lib/analytics'
import { startEmailOAuth } from '@/lib/email-oauth'
import { useToast } from '@/components/ui/Toast'
import { useDrawerStore } from '@/stores/drawerStore'
import { useCampaignStore, useEmailStatus } from '@/stores/campaignStore'
import { colors, spacing, fontSize, borderRadius, fontFamily, cardStyles } from '@/constants/theme'

export default function EmailConnectScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()
  const openDrawer = useDrawerStore((s) => s.open)

  const emailStatus = useEmailStatus()
  const fetchEmailStatus = useCampaignStore((s) => s.fetchEmailStatus)
  const disconnectEmail = useCampaignStore((s) => s.disconnectEmail)

  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  useEffect(() => {
    analytics.screenView('EmailConnect')
    fetchEmailStatus()
  }, [])

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    setIsConnecting(true)
    setConnectingProvider(provider)
    haptics.medium()

    try {
      const result = await startEmailOAuth(provider)

      if (result.success) {
        toast.show(`${provider === 'gmail' ? 'Gmail' : 'Outlook'} connected`, 'success')
        await fetchEmailStatus()
        analytics.track('email_connected', { provider })
      } else {
        toast.show(result.error || 'Connection failed', 'error')
      }
    } catch (error) {
      toast.show('Failed to connect email', 'error')
    } finally {
      setIsConnecting(false)
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = (connectionId: string, email: string) => {
    Alert.alert(
      'Disconnect Email',
      `Are you sure you want to disconnect ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            haptics.medium()
            try {
              await disconnectEmail(connectionId)
              toast.show('Email disconnected', 'info')
              analytics.track('email_disconnected')
            } catch {
              toast.show('Failed to disconnect', 'error')
            }
          },
        },
      ]
    )
  }

  const activeConnection = emailStatus?.activeConnection

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            openDrawer()
            haptics.light()
          }}
          style={styles.backBtn}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Integration</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Status Card */}
        <View style={[cardStyles.base, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <Ionicons
              name={activeConnection ? 'checkmark-circle' : 'mail-outline'}
              size={32}
              color={activeConnection ? colors.success : colors.textMuted}
            />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {activeConnection ? 'Connected' : 'Not Connected'}
              </Text>
              {activeConnection && (
                <Text style={styles.statusEmail}>{activeConnection.email}</Text>
              )}
            </View>
          </View>

          {!activeConnection && (
            <Text style={styles.statusDescription}>
              Connect your email to send personalized messages to coaches directly from your Gmail or Outlook account.
            </Text>
          )}
        </View>

        {/* Connected Accounts */}
        {emailStatus?.connections && emailStatus.connections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Accounts</Text>
            {emailStatus.connections.map((conn) => (
              <View key={conn.id} style={[cardStyles.base, styles.connectionCard]}>
                <View style={styles.connectionInfo}>
                  <Ionicons
                    name={conn.provider === 'GMAIL' ? 'mail' : 'mail-outline'}
                    size={24}
                    color={conn.isActive ? colors.primary : colors.textMuted}
                  />
                  <View style={styles.connectionText}>
                    <Text style={styles.connectionEmail}>{conn.email}</Text>
                    <Text style={styles.connectionProvider}>
                      {conn.provider === 'GMAIL' ? 'Gmail' : 'Outlook'}
                      {conn.hasError && ' • Error'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDisconnect(conn.id, conn.email)}
                  style={styles.disconnectBtn}
                >
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Connect Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeConnection ? 'Add Another Account' : 'Connect Your Email'}
          </Text>

          <TouchableOpacity
            style={[styles.providerBtn, isConnecting && styles.providerBtnDisabled]}
            onPress={() => handleConnect('gmail')}
            disabled={isConnecting}
            activeOpacity={0.7}
          >
            {isConnecting && connectingProvider === 'gmail' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <View style={[styles.providerIcon, { backgroundColor: '#EA4335' }]}>
                  <Ionicons name="mail" size={20} color="#fff" />
                </View>
                <Text style={styles.providerText}>Connect Gmail</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.providerBtn, isConnecting && styles.providerBtnDisabled]}
            onPress={() => handleConnect('outlook')}
            disabled={isConnecting}
            activeOpacity={0.7}
          >
            {isConnecting && connectingProvider === 'outlook' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <View style={[styles.providerIcon, { backgroundColor: '#0078D4' }]}>
                  <Ionicons name="mail" size={20} color="#fff" />
                </View>
                <Text style={styles.providerText}>Connect Outlook</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="shield-checkmark" size={20} color={colors.textMuted} />
          <Text style={styles.infoText}>
            Emails are sent from your personal account. We never store your email content or access your inbox.
          </Text>
        </View>

        {/* Go to Campaigns */}
        {activeConnection && (
          <TouchableOpacity
            style={styles.campaignBtn}
            onPress={() => {
              haptics.light()
              router.push('/(tabs)/campaigns' as any)
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.campaignBtnText}>Go to Campaigns</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  statusEmail: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  connectionText: {
    flex: 1,
  },
  connectionEmail: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  connectionProvider: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  disconnectBtn: {
    padding: spacing.xs,
  },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  providerBtnDisabled: {
    opacity: 0.6,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 20,
  },
  campaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  campaignBtnText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
})

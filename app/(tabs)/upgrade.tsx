import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import type { PurchasesPackage } from 'react-native-purchases'

import { Button } from '@/components/ui/Button'
import { useSubscriptionStore, useIsPro } from '@/stores/subscriptionStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius, fontFamily} from '@/constants/theme'

const PRO_FEATURES = [
  { icon: 'sparkles' as const, label: 'Unlimited AI Messages', detail: 'Ask XR Insight anything, anytime' },
  { icon: 'search' as const, label: 'Unlimited Coach Views', detail: 'Browse every coach in the database' },
  { icon: 'star' as const, label: 'Unlimited Saved Coaches', detail: 'Build your full recruiting list' },
  { icon: 'logo-twitter' as const, label: 'X Coach Matches', detail: 'See which college coaches follow you' },
  { icon: 'card' as const, label: 'Recruiting Card', detail: 'Shareable profile card for coaches' },
  { icon: 'calendar' as const, label: 'Personalized 8-Week Plan', detail: 'Step-by-step recruiting action plan' },
]

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)
  const isPro = useIsPro()
  const {
    packages,
    isLoading,
    isRestoring,
    error,
    fetchOfferings,
    purchase,
    restorePurchases,
    clearError,
  } = useSubscriptionStore()

  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null)

  useEffect(() => {
    analytics.screenView('Upgrade')
    fetchOfferings()
  }, [])

  // Auto-select annual package by default
  useEffect(() => {
    if (packages.length > 0 && !selectedPkg) {
      const annual = packages.find((p) => p.packageType === 'ANNUAL')
      setSelectedPkg(annual ?? packages[0])
    }
  }, [packages])

  const handlePurchase = async () => {
    if (!selectedPkg) return
    haptics.medium()
    const success = await purchase(selectedPkg)
    if (success) {
      haptics.success()
    }
  }

  const handleRestore = async () => {
    haptics.light()
    await restorePurchases()
  }

  const getPackageLabel = (pkg: PurchasesPackage) => {
    if (pkg.packageType === 'ANNUAL') return 'Annual'
    if (pkg.packageType === 'MONTHLY') return 'Monthly'
    return pkg.identifier
  }

  const getPackagePrice = (pkg: PurchasesPackage) => {
    return pkg.product.priceString
  }

  const getPackageSubtext = (pkg: PurchasesPackage) => {
    if (pkg.packageType === 'ANNUAL') {
      const monthly = pkg.product.price / 12
      return `${monthly.toFixed(2)}/mo`
    }
    return '/month'
  }

  if (isPro) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.proActive}>
            <Text style={styles.proActiveEmoji}>*</Text>
            <Text style={styles.proActiveTitle}>You're Pro!</Text>
            <Text style={styles.proActiveText}>
              You have full access to all XR Navigator features.
            </Text>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>
            Unlock the full recruiting toolkit
          </Text>
        </View>

        {/* Error */}
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
            <Text style={styles.errorText}>{error}</Text>
          </TouchableOpacity>
        )}

        {/* Plan Selector */}
        {packages.length > 0 ? (
          <View style={styles.plans}>
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.identifier === pkg.identifier
              const isAnnual = pkg.packageType === 'ANNUAL'
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.planCard,
                    isSelected && { borderColor: primaryColor, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    setSelectedPkg(pkg)
                    haptics.light()
                  }}
                >
                  {isAnnual && (
                    <View style={[styles.saveBadge, { backgroundColor: primaryColor }]}>
                      <Text style={styles.saveBadgeText}>SAVE 30%</Text>
                    </View>
                  )}
                  <Text style={styles.planLabel}>{getPackageLabel(pkg)}</Text>
                  <Text style={[styles.planPrice, isSelected && { color: primaryColor }]}>
                    {getPackagePrice(pkg)}
                  </Text>
                  <Text style={styles.planSubtext}>{getPackageSubtext(pkg)}</Text>
                  {isSelected && (
                    <View style={[styles.selectedDot, { backgroundColor: primaryColor }]} />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={primaryColor} style={styles.loader} />
        ) : null}

        {/* Pro Features List */}
        <View style={styles.featuresList}>
          <Text style={styles.featuresHeading}>Everything you get with Pro</Text>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDetail}>{f.detail}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>
          ))}
        </View>

        {/* Price + Value Anchor + Purchase Button */}
        <View style={styles.actions}>
          <Text style={styles.valueAnchor}>Less than $1/day to get recruited</Text>
          {selectedPkg && (
            <Text style={styles.priceDisplay}>
              {getPackagePrice(selectedPkg)}<Text style={styles.pricePeriod}>/{selectedPkg.packageType === 'ANNUAL' ? 'year' : 'month'}</Text>
            </Text>
          )}

          <Button
            title={isLoading ? 'Processing...' : 'Subscribe Now'}
            onPress={handlePurchase}
            loading={isLoading}
            disabled={!selectedPkg || isLoading}
            fullWidth
          />

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            <Text style={styles.restoreText}>
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <Text style={styles.legal}>
          Payment will be charged to your Apple ID account. Subscription automatically
          renews unless canceled at least 24 hours before the end of the current period.
          Manage subscriptions in Settings.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.xceleraterecruiting.com/terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.xceleraterecruiting.com/privacy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.xceleraterecruiting.com/eula')}>
            <Text style={styles.legalLink}>EULA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorBanner: {
    backgroundColor: `${colors.error}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  plans: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: borderRadius.sm,
  },
  saveBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  planLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    marginBottom: spacing.xs,
  },
  planPrice: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  planSubtext: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    marginTop: 2,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  loader: {
    paddingVertical: spacing.xl,
  },
  featuresList: {
    marginBottom: spacing.xl,
  },
  featuresHeading: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  featureDetail: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  valueAnchor: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  priceDisplay: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  pricePeriod: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  legal: {
    fontSize: 10,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: spacing.md,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  legalLink: {
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    fontSize: 12,
    color: colors.textDim,
  },
  proActive: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  proActiveEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  proActiveTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  proActiveText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
})

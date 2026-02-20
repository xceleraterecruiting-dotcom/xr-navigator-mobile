import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { analytics } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { useDrawerStore } from '@/stores/drawerStore'
import { colors, spacing, fontSize, fontFamily, borderRadius } from '@/constants/theme'

const EVAL_SITE_URL = 'https://www.xceleraterecruiting.com/evaluate'

const SELLING_POINTS = [
  {
    icon: 'school-outline' as const,
    title: 'College Projection',
    description: 'Find out exactly where you can play at the next level — from Power 4 to D3.',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'Professional Scouting Report',
    description: 'Get a detailed evaluation written like a real college scout would assess your film.',
  },
  {
    icon: 'share-social-outline' as const,
    title: 'Shareable Graphics & Edits',
    description: 'Multiple recruiting graphics you can 1-tap share directly to social media. Stand out to coaches instantly.',
    highlight: true,
  },
]

export default function EvaluateInfoScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const openDrawer = useDrawerStore((s) => s.open)

  React.useEffect(() => {
    analytics.screenView('Evaluate Info')
  }, [])

  const handleGetEvaluation = async () => {
    haptics.medium()
    await WebBrowser.openBrowserAsync(EVAL_SITE_URL)
  }

  const handleUploadExisting = () => {
    haptics.light()
    router.push('/(tabs)/profile')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} style={styles.backButton}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Film Evaluation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="film-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Get Scouted by AI</Text>
          <Text style={styles.heroSubtitle}>
            Upload your game film and receive a professional scouting report,
            college projection, and shareable recruiting graphics.
          </Text>
        </Animated.View>

        {/* Selling Points */}
        <View style={styles.sellingPoints}>
          {SELLING_POINTS.map((point, index) => (
            <Animated.View
              key={point.title}
              entering={FadeInDown.delay(200 + index * 100).duration(500)}
              style={[styles.sellingCard, point.highlight && styles.sellingCardHighlight]}
            >
              <View style={[styles.sellingIcon, point.highlight && styles.sellingIconHighlight]}>
                <Ionicons
                  name={point.icon}
                  size={24}
                  color={point.highlight ? colors.primary : colors.textMuted}
                />
              </View>
              <View style={styles.sellingContent}>
                <Text style={styles.sellingTitle}>{point.title}</Text>
                <Text style={styles.sellingDescription}>{point.description}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleGetEvaluation}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={20} color="#0A0A0A" />
            <Text style={styles.ctaButtonText}>Get Your Evaluation</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Upload Existing */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.uploadSection}>
          <View style={styles.divider} />
          <Text style={styles.uploadLabel}>Already have an evaluation?</Text>
          <TouchableOpacity onPress={handleUploadExisting} activeOpacity={0.7}>
            <Text style={styles.uploadLink}>Upload it to your profile</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  sellingPoints: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  sellingCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sellingCardHighlight: {
    borderColor: colors.borderAccent,
    backgroundColor: colors.primaryLight,
  },
  sellingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sellingIconHighlight: {
    backgroundColor: 'rgba(212,168,87,0.25)',
  },
  sellingContent: {
    flex: 1,
  },
  sellingTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: 4,
  },
  sellingDescription: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  ctaButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: '#0A0A0A',
  },
  uploadSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  uploadLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textDim,
    marginBottom: spacing.xs,
  },
  uploadLink: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.primary,
  },
})

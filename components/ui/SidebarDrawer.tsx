import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useIsPro } from '@/stores/subscriptionStore'
import { haptics } from '@/lib/haptics'
import { colors, spacing, fontSize, borderRadius, fontFamily } from '@/constants/theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  route: string
  pro?: boolean
  badge?: string
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: '',
    items: [
      { icon: 'home-outline', label: 'Dashboard', route: '/(tabs)' },
    ],
  },
  {
    title: 'RECRUITING',
    items: [
      { icon: 'search-outline', label: 'Coaches', route: '/(tabs)/coaches' },
      { icon: 'star-outline', label: 'Saved Coaches', route: '/(tabs)/saved' },
      { icon: 'send-outline', label: 'Outreach', route: '/(tabs)/campaigns' },
      { icon: 'sparkles-outline', label: 'XR Insight', route: '/(tabs)/insight' },
    ],
  },
  {
    title: 'TRAINING',
    items: [
      { icon: 'school-outline', label: 'The XR Method', route: '/(tabs)/bootcamp', badge: 'NEW' },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { icon: 'film-outline', label: 'AI Film Evaluation', route: '/(tabs)/evaluate' },
      { icon: 'document-text-outline', label: 'XR Recruit Page', route: '/(tabs)/recruit' },
    ],
  },
  {
    title: 'PROGRESS',
    items: [
      { icon: 'trophy-outline', label: 'Challenges & XP', route: '/(tabs)/challenges' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { icon: 'person-outline', label: 'Profile', route: '/(tabs)/profile' },
      { icon: 'settings-outline', label: 'Settings', route: '/(tabs)/settings' },
    ],
  },
]

interface SidebarDrawerProps {
  visible: boolean
  onClose: () => void
}

export function SidebarDrawer({ visible, onClose }: SidebarDrawerProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isPro = useIsPro()
  const translateX = useSharedValue(-DRAWER_WIDTH)
  const backdropOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 200 })
      backdropOpacity.value = withTiming(1, { duration: 200 })
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 150 })
      backdropOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [visible])

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: visible ? 'auto' as const : 'none' as const,
  }))

  const handleNavigate = (route: string) => {
    haptics.light()
    onClose()
    setTimeout(() => {
      router.push(route as any)
    }, 150)
  }

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, drawerStyle, { paddingTop: insets.top + spacing.md }]}>
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="navigate" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.appName}>XR Navigator</Text>
              <Text style={styles.appSub}>Recruiting Made Simple</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <Animated.ScrollView
          style={styles.menuScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {MENU_SECTIONS.map((section, idx) => (
            <View key={section.title || `section-${idx}`} style={styles.section}>
              {section.title !== '' && <Text style={styles.sectionTitle}>{section.title}</Text>}
              {section.items.map((item) => {
                // Hide "Upgrade to Pro" if already Pro
                if (item.route === '/(tabs)/upgrade' && isPro) return null

                return (
                  <TouchableOpacity
                    key={item.route}
                    style={styles.menuItem}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name={item.icon as any} size={20} color={colors.textMuted} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.pro && !isPro && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>PRO</Text>
                      </View>
                    )}
                    {item.badge && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </Animated.ScrollView>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 200,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 201,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  appSub: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  menuScroll: {
    flex: 1,
  },
  section: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.textDim,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  proBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  proBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
})

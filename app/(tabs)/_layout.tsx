import React, { useEffect } from 'react'
import { Tabs, Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { View, Text, ActivityIndicator, StyleSheet, Linking, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useAthleteStore, useIsCoachAccount, useNeedsOnboarding } from '@/stores/athleteStore'
import { useCoachesStore } from '@/stores/coachesStore'
import { useDrawerStore } from '@/stores/drawerStore'
import { SidebarDrawer } from '@/components/ui/SidebarDrawer'
import { Button } from '@/components/ui/Button'
import { colors, spacing, fontSize } from '@/constants/theme'

// Tab icons — 6 core tabs
const TAB_ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  index: { focused: 'home', outline: 'home-outline' },
  coaches: { focused: 'search', outline: 'search-outline' },
  saved: { focused: 'star', outline: 'star-outline' },
  campaigns: { focused: 'mail', outline: 'mail-outline' },
  insight: { focused: 'sparkles', outline: 'sparkles-outline' },
  profile: { focused: 'person', outline: 'person-outline' },
}

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const iconSet = TAB_ICONS[name]
  const iconName = iconSet ? (focused ? iconSet.focused : iconSet.outline) : 'ellipse-outline'
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={iconName as any} size={22} color={color} />
      {focused && (
        <View style={[styles.iconDot, { backgroundColor: color }]} />
      )}
    </View>
  )
}

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

function CoachAccountScreen() {
  const { signOut } = useAuth()

  return (
    <View style={styles.coachScreen}>
      <Ionicons name="shield-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
      <Text style={styles.coachTitle}>Coach Account Detected</Text>
      <Text style={styles.coachText}>
        Coach features are available on the web at xceleraterecruiting.com. This app is designed for athletes.
      </Text>
      <Button
        title="Open Web Dashboard"
        onPress={() => Linking.openURL('https://www.xceleraterecruiting.com')}
        style={{ marginTop: spacing.lg }}
      />
      <Button
        title="Sign Out"
        variant="ghost"
        onPress={() => signOut()}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  )
}

const SCREEN_WIDTH = Dimensions.get('window').width
const EDGE_WIDTH = 30 // Width of the edge detection zone

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const { primaryColor } = usePartnerBranding()
  const fetchAthlete = useAthleteStore((state) => state.fetchAthlete)
  const fetchSavedCoaches = useCoachesStore((state) => state.fetchSavedCoaches)
  const isCoachAccount = useIsCoachAccount()
  const needsOnboarding = useNeedsOnboarding()
  const { isOpen: drawerOpen, close: closeDrawer, open: openDrawer } = useDrawerStore()

  // Edge swipe gesture to open drawer
  const edgeSwipeGesture = Gesture.Pan()
    .activeOffsetX(20)
    .onStart((e) => {
      // Only trigger if starting from left edge
      if (e.x < EDGE_WIDTH && !drawerOpen) {
        openDrawer()
      }
    })

  // Fetch initial data when authenticated
  useEffect(() => {
    if (isSignedIn) {
      fetchAthlete()
      fetchSavedCoaches()
    }
  }, [isSignedIn])

  if (!isLoaded) {
    return <SplashScreen />
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  // Redirect coaches to web
  if (isCoachAccount) {
    return <CoachAccountScreen />
  }

  // Redirect to sign-in if no athlete profile (they can create account or sign in)
  if (needsOnboarding) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <GestureDetector gesture={edgeSwipeGesture}>
      <View style={{ flex: 1 }}>
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: 8,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ focused, color }) => <TabIcon name="index" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="coaches"
          options={{
            title: 'Coaches',
            tabBarIcon: ({ focused, color }) => <TabIcon name="coaches" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            href: null,
            title: 'Saved',
          }}
        />
        <Tabs.Screen
          name="campaigns"
          options={{
            title: 'Outreach',
            tabBarIcon: ({ focused, color }) => <TabIcon name="campaigns" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="insight"
          options={{
            title: 'XR Insight',
            tabBarIcon: ({ focused, color }) => <TabIcon name="insight" focused={focused} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused, color }) => <TabIcon name="profile" focused={focused} color={color} />,
          }}
        />
        {/* Hidden screens - accessible via navigation but not shown in tab bar */}
        <Tabs.Screen
          name="twitter"
          options={{ href: null, title: 'Twitter' }}
        />
        <Tabs.Screen
          name="upgrade"
          options={{ href: null, title: 'Upgrade' }}
        />
        <Tabs.Screen
          name="evaluate"
          options={{ href: null, title: 'Evaluate' }}
        />
        <Tabs.Screen
          name="challenges"
          options={{ href: null, title: 'Challenges' }}
        />
        <Tabs.Screen
          name="settings"
          options={{ href: null, title: 'Settings' }}
        />
        <Tabs.Screen
          name="recruit"
          options={{ href: null, title: 'Recruit' }}
        />
        <Tabs.Screen
          name="plan"
          options={{ href: null, title: 'Plan' }}
        />
        <Tabs.Screen
          name="bootcamp"
          options={{ href: null, title: 'XR Method' }}
        />
        <Tabs.Screen
          name="recommended"
          options={{ href: null, title: 'Recommended' }}
        />
        <Tabs.Screen
          name="outreach"
          options={{ href: null, title: 'Outreach' }}
        />
        <Tabs.Screen
          name="email-connect"
          options={{ href: null, title: 'Email Connect' }}
        />
        </Tabs>

        {/* Side Drawer */}
        <SidebarDrawer visible={drawerOpen} onClose={closeDrawer} />
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  iconDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  coachScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  coachTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  coachText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})

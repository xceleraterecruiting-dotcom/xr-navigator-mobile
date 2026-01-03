import React, { useEffect } from 'react'
import { Tabs, Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'

import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { useAthleteStore } from '@/stores/athleteStore'
import { useCoachesStore } from '@/stores/coachesStore'
import { colors, fontSize } from '@/constants/theme'

// Tab icons (using text for simplicity - can replace with icons later)
function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    index: '🏠',
    coaches: '🔍',
    saved: '⭐',
    insight: '✨',
    profile: '👤',
  }
  return (
    <View style={styles.iconContainer}>
      <Text style={[
        styles.iconEmoji,
        { opacity: focused ? 1 : 0.6 },
        focused && { transform: [{ scale: 1.1 }] }
      ]}>
        {icons[name] || '•'}
      </Text>
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

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const { primaryColor } = usePartnerBranding()
  const fetchAthlete = useAthleteStore((state) => state.fetchAthlete)
  const fetchSavedCoaches = useCoachesStore((state) => state.fetchSavedCoaches)

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

  return (
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
          title: 'Saved',
          tabBarIcon: ({ focused, color }) => <TabIcon name="saved" focused={focused} color={color} />,
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
    </Tabs>
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
  iconEmoji: {
    fontSize: 22,
  },
  iconDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
})

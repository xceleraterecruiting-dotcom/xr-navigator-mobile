/**
 * App Entry Point - Route Guard
 *
 * Redirects users to the appropriate screen based on auth state:
 * - Not signed in → Sign In page
 * - Signed in but no profile → Onboarding
 * - Signed in with profile → Main tabs
 */

import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useAthleteStore, useNeedsOnboarding } from '@/stores/athleteStore'
import { colors } from '@/constants/theme'

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth()
  const fetchAthlete = useAthleteStore((s) => s.fetchAthlete)
  const athlete = useAthleteStore((s) => s.athlete)
  const needsOnboarding = useNeedsOnboarding()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkProfile = async () => {
      if (isLoaded && isSignedIn) {
        try {
          await fetchAthlete()
        } catch (err) {
          if (__DEV__) console.log('[Index] Error fetching athlete:', err)
        }
      }
      setChecking(false)
    }

    if (isLoaded) {
      checkProfile()
    }
  }, [isLoaded, isSignedIn])

  // Show loading while checking auth/profile
  if (!isLoaded || checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  // Not signed in → Sign In (NOT onboarding)
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  // Signed in but no profile → Onboarding
  if (needsOnboarding) {
    return <Redirect href="/(onboarding)" />
  }

  // Signed in with profile → Main app
  return <Redirect href="/(tabs)" />
}

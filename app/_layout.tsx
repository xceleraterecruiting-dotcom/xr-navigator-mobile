import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View } from 'react-native'
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  useFonts,
  Rajdhani_400Regular,
  Rajdhani_500Medium,
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani'
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'

import { ToastProvider } from '@/components/ui/Toast'
import { tokenCache } from '@/lib/auth'
import { setAuthFunctions } from '@/lib/api'
import { setSSEAuthFunction } from '@/lib/sse'
import { setUploadAuthToken } from '@/lib/upload'
import { initAnalytics } from '@/lib/analytics'
import { initSentry } from '@/lib/sentry'
import { initRevenueCat, identifyUser as rcIdentify, logOutUser as rcLogOut } from '@/lib/revenuecat'
import { useNotifications, useInitialNotification, useTokenRefresh } from '@/lib/notifications'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NetworkBanner } from '@/components/NetworkBanner'
import { colors } from '@/constants/theme'

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

// Initialize services
initSentry()
initAnalytics()
initRevenueCat()

function AuthSetup() {
  const { getToken, signOut, userId, isSignedIn } = useAuth()
  const checkEntitlements = useSubscriptionStore((s) => s.checkEntitlements)

  // Set up notification listeners
  useNotifications()
  useInitialNotification()
  useTokenRefresh()

  useEffect(() => {
    // Connect auth to API client, SSE, and upload
    setAuthFunctions(getToken, signOut)
    setSSEAuthFunction(getToken)
    setUploadAuthToken(getToken)
  }, [getToken, signOut])

  // Identify user with RevenueCat and check entitlements
  useEffect(() => {
    if (isSignedIn && userId) {
      rcIdentify(userId)
        .then(() => checkEntitlements())
        .catch((err) => { if (__DEV__) console.warn('RevenueCat init failed:', err) })
    } else if (!isSignedIn) {
      rcLogOut()
    }
  }, [isSignedIn, userId])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    BebasNeue_400Regular,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkLoaded>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <SafeAreaProvider>
              <ToastProvider>
                <AuthSetup />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                >
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
                </Stack>
                <NetworkBanner />
                <StatusBar style="light" />
              </ToastProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ClerkLoaded>
      </ClerkProvider>
    </ErrorBoundary>
  )
}

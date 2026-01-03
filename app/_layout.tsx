import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { tokenCache } from '@/lib/auth'
import { setAuthFunctions } from '@/lib/api'
import { setSSEAuthFunction } from '@/lib/sse'
import { initAnalytics } from '@/lib/analytics'
import { initSentry } from '@/lib/sentry'
import { colors } from '@/constants/theme'

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

// Initialize services
initSentry()
initAnalytics()

function AuthSetup() {
  const { getToken, signOut } = useAuth()

  useEffect(() => {
    // Connect auth to API client and SSE
    setAuthFunctions(getToken, signOut)
    setSSEAuthFunction(getToken)
  }, [getToken, signOut])

  return null
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
          <SafeAreaProvider>
            <AuthSetup />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="light" />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  )
}

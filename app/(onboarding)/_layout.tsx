import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'

export default function OnboardingLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  // Safety net: if signed out, redirect to sign-in
  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false,
      }}
    />
  )
}

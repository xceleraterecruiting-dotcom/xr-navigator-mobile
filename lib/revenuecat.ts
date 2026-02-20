import Purchases, { LOG_LEVEL } from 'react-native-purchases'

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || ''

let initialized = false

export async function initRevenueCat() {
  if (initialized || !REVENUECAT_API_KEY) return

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR)
  Purchases.configure({ apiKey: REVENUECAT_API_KEY })
  initialized = true
}

export async function identifyUser(clerkUserId: string) {
  if (!initialized) return
  try {
    await Purchases.logIn(clerkUserId)
  } catch {
    // Non-critical — entitlements will be checked on next app launch
  }
}

export async function logOutUser() {
  if (!initialized) return
  try {
    await Purchases.logOut()
  } catch {
    // Non-critical — user is signing out anyway
  }
}

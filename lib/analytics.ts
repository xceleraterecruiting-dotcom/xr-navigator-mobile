import * as Amplitude from '@amplitude/analytics-react-native'
import type { Athlete, OutreachStatus } from '@/types'

// Initialize in app entry
export function initAnalytics() {
  const key = process.env.EXPO_PUBLIC_AMPLITUDE_KEY
  if (key) {
    Amplitude.init(key)
  }
}

// Track events
export const analytics = {
  // Auth
  signUp: (method: 'email' | 'google' | 'apple', partner?: string) => {
    Amplitude.track('Sign Up', { method, partner })
  },

  signIn: (method: 'email' | 'google' | 'apple') => {
    Amplitude.track('Sign In', { method })
  },

  // Coaches
  searchCoaches: (query: string, filters: object) => {
    Amplitude.track('Search Coaches', { query, ...filters })
  },

  viewCoach: (coachId: string, school: string, division: string | null) => {
    Amplitude.track('View Coach', { coachId, school, division })
  },

  saveCoach: (coachId: string, school: string) => {
    Amplitude.track('Save Coach', { coachId, school })
  },

  updateOutreachStatus: (status: OutreachStatus) => {
    Amplitude.track('Update Outreach Status', { status })
  },

  // XR Insight
  sendMessage: (messageLength: number, conversationId: string) => {
    Amplitude.track('Send Insight Message', { messageLength, conversationId })
  },

  // Engagement
  screenView: (screenName: string) => {
    Amplitude.track('Screen View', { screen: screenName })
  },

  // Profile
  updateProfile: (fields: string[]) => {
    Amplitude.track('Update Profile', { fields })
  },
}

// User identification
export function identifyUser(athlete: Athlete) {
  const identify = new Amplitude.Identify()
  identify.set('position', athlete.position || 'unknown')
  identify.set('gradYear', athlete.gradYear || 0)
  identify.set('partner', athlete.partner || 'none')
  identify.set('state', athlete.state || 'unknown')
  Amplitude.identify(identify)
  Amplitude.setUserId(athlete.id)
}

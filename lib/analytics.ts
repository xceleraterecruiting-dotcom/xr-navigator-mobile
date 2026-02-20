import * as Amplitude from '@amplitude/analytics-react-native'
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency'
import { Platform } from 'react-native'
import type { Athlete, OutreachStatus } from '@/types'

let trackingAllowed = false

// Initialize in app entry — must be called after app mounts (not in module scope)
export async function initAnalytics() {
  // On iOS 14+, request ATT permission before initializing analytics
  if (Platform.OS === 'ios') {
    const { status } = await requestTrackingPermissionsAsync()
    trackingAllowed = status === 'granted'
  } else {
    // Android doesn't require ATT
    trackingAllowed = true
  }

  if (!trackingAllowed) return

  const key = process.env.EXPO_PUBLIC_AMPLITUDE_KEY
  if (key) {
    Amplitude.init(key)
  }
}

function safeTrack(event: string, properties?: Record<string, unknown>) {
  if (!trackingAllowed) return
  Amplitude.track(event, properties)
}

// Track events
export const analytics = {
  // ─────────────────────────────────────────────────────────────────────────────
  // CRITICAL EVENTS (spec: "instrument FIRST")
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Track when athlete sends outreach (email or DM)
   */
  outreachSent: (props: {
    channel: 'email' | 'twitter'
    coachId: string
    coachSchool?: string
    campaignId?: string
    isAiPersonalized: boolean
    isFirstOutreach: boolean
  }) => {
    safeTrack('outreach_sent', props)
  },

  /**
   * Track when a coach replies to athlete
   */
  replyReceived: (props: {
    channel: 'email' | 'twitter'
    coachId: string
    responseTimeMs: number
  }) => {
    safeTrack('outreach_reply_received', props)
  },

  /**
   * Track when athlete shares their profile/card
   */
  profileShared: (props: {
    shareType: 'card' | 'link' | 'page'
    destination: 'twitter' | 'instagram' | 'copy' | 'sms' | 'other'
  }) => {
    safeTrack('profile_shared', props)
  },

  /**
   * Track daily streak maintenance
   */
  streakMaintained: (props: {
    streakLength: number
    targetsCompleted: number
  }) => {
    safeTrack('streak_maintained', props)
  },

  /**
   * Track campaign creation
   */
  campaignCreated: (props: {
    channelCount: number
    recipientCount: number
    templateType: string
  }) => {
    safeTrack('campaign_created', props)
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SECONDARY EVENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Track dashboard CTA taps
   */
  dashboardCTATapped: (ctaType: string, context?: string) => {
    safeTrack('dashboard_cta_tapped', { cta_type: ctaType, context })
  },

  /**
   * Track when coach modal is opened
   */
  coachModalOpened: (coachId: string, source: string) => {
    safeTrack('coach_modal_opened', { coach_id: coachId, source })
  },

  /**
   * Track search performed
   */
  searchPerformed: (props: {
    queryLength: number
    positionFilter?: string
    divisionFilter?: string
    conferenceFilter?: string
    resultCount: number
  }) => {
    safeTrack('search_performed', props)
  },

  /**
   * Track Smart CTA interactions
   */
  smartCTATapped: (props: {
    action: string
    coachId: string
    coachSchool: string
    interestScore: number
  }) => {
    safeTrack('smart_cta_tapped', props)
  },

  /**
   * Track filter changes
   */
  filterChanged: (props: {
    filterType: string
    filterValue: string
    screen: string
  }) => {
    safeTrack('filter_changed', props)
  },

  /**
   * Track Live Intel interactions
   */
  intelEventTapped: (props: {
    eventType: string
    coachId?: string
    action: string
  }) => {
    safeTrack('intel_event_tapped', props)
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LEGACY EVENTS (keeping for backward compatibility)
  // ─────────────────────────────────────────────────────────────────────────────

  // Auth
  signUp: (method: 'email' | 'google' | 'apple', partner?: string) => {
    safeTrack('Sign Up', { method, partner })
  },

  signIn: (method: 'email' | 'google' | 'apple') => {
    safeTrack('Sign In', { method })
  },

  // Coaches
  searchCoaches: (query: string, filters: object) => {
    safeTrack('Search Coaches', { query, ...filters })
  },

  viewCoach: (coachId: string, school: string, division: string | null) => {
    safeTrack('View Coach', { coachId, school, division })
  },

  saveCoach: (coachId: string, school: string) => {
    safeTrack('Save Coach', { coachId, school })
  },

  updateOutreachStatus: (status: OutreachStatus) => {
    safeTrack('Update Outreach Status', { status })
  },

  // XR Insight
  sendMessage: (messageLength: number, conversationId: string) => {
    safeTrack('Send Insight Message', { messageLength, conversationId })
  },

  // Engagement
  screenView: (screenName: string) => {
    safeTrack('Screen View', { screen: screenName })
  },

  // Profile
  updateProfile: (fields: string[]) => {
    safeTrack('Update Profile', { fields })
  },

  // Generic event
  track: (event: string, properties?: Record<string, unknown>) => {
    safeTrack(event, properties)
  },
}

// User identification with extended properties
export function identifyUser(athlete: Athlete & {
  totalOutreachSent?: number
  savedCoachesCount?: number
}) {
  if (!trackingAllowed) return

  const identify = new Amplitude.Identify()

  // Basic profile
  identify.set('position', athlete.position || 'unknown')
  identify.set('gradYear', athlete.gradYear || 0)
  identify.set('partner', athlete.partner || 'none')
  identify.set('state', athlete.state || 'unknown')

  // Engagement metrics
  identify.set('xp', athlete.xp || 0)
  identify.set('current_streak', athlete.streak || 0)

  // Derived properties
  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(athlete.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  identify.set('days_since_signup', daysSinceSignup)

  // Activity counts (if available)
  if (athlete.totalOutreachSent !== undefined) {
    identify.set('total_outreach_sent', athlete.totalOutreachSent)
  }
  if (athlete.savedCoachesCount !== undefined) {
    identify.set('saved_coaches_count', athlete.savedCoachesCount)
  }

  Amplitude.identify(identify)
  Amplitude.setUserId(athlete.id)
}

/**
 * Update user properties after actions (e.g., after sending outreach)
 */
export function updateUserProperties(props: Record<string, unknown>) {
  if (!trackingAllowed) return
  const identify = new Amplitude.Identify()
  Object.entries(props).forEach(([key, value]) => {
    identify.set(key, value as string | number)
  })
  Amplitude.identify(identify)
}

/**
 * Increment user property (e.g., total_outreach_sent)
 */
export function incrementUserProperty(property: string, amount = 1) {
  if (!trackingAllowed) return
  const identify = new Amplitude.Identify()
  identify.add(property, amount)
  Amplitude.identify(identify)
}

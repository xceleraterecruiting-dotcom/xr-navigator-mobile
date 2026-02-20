/**
 * Error States & Microcopy
 *
 * Standardized error messages and CTAs for all error scenarios.
 * Ensures consistent UX and actionable guidance.
 */

import { colors } from '@/constants/theme'

export type ErrorColor = 'warning' | 'error' | 'info' | 'ghost' | 'accent'

export interface ErrorState {
  cta: string | null
  ctaColor: ErrorColor
  message: string | ((context: string) => string)
  icon?: string
}

// Alias for ErrorState (used in ErrorState.tsx component)
export type ErrorWithCTA = ErrorState

/**
 * Email-related errors
 */
export const EMAIL_ERRORS = {
  bounced: {
    cta: 'Try Different Email →',
    ctaColor: 'warning' as ErrorColor,
    message: (email: string) => `Email to ${email} bounced. Check the address.`,
    icon: 'mail-unread-outline',
  },

  rateLimited: {
    cta: 'Schedule for Later →',
    ctaColor: 'ghost' as ErrorColor,
    message: "Gmail daily limit reached. We'll send this at 8am tomorrow.",
    icon: 'time-outline',
  },

  oauthExpired: {
    cta: 'Reconnect Gmail →',
    ctaColor: 'warning' as ErrorColor,
    message: 'Your Gmail connection expired. Reconnect to send emails.',
    icon: 'refresh-outline',
  },

  sendFailed: {
    cta: 'Retry →',
    ctaColor: 'ghost' as ErrorColor,
    message: 'Failed to send email. Please try again.',
    icon: 'alert-circle-outline',
  },
}

/**
 * Twitter/X-related errors
 */
export const TWITTER_ERRORS = {
  dmFailed: {
    cta: 'Request Follow →',
    ctaColor: 'info' as ErrorColor,
    message: 'Coach must follow you before you can DM. Try following first.',
    icon: 'logo-twitter',
  },

  oauthExpired: {
    cta: 'Reconnect 𝕏 →',
    ctaColor: 'warning' as ErrorColor,
    message: 'Your 𝕏 connection expired. Reconnect to send DMs.',
    icon: 'refresh-outline',
  },

  rateLimited: {
    cta: 'Try Again Later',
    ctaColor: 'ghost' as ErrorColor,
    message: '𝕏 rate limit reached. Try again in a few minutes.',
    icon: 'time-outline',
  },
}

/**
 * Coach engagement state errors
 */
export const COACH_STATES = {
  optedOut: {
    cta: null,
    ctaColor: 'ghost' as ErrorColor,
    message: 'This coach has opted out of emails.',
    icon: 'close-circle-outline',
  },

  noResponse7Days: {
    cta: 'Final Follow Up →',
    ctaColor: 'warning' as ErrorColor,
    message: "It's been 7 days. One more follow-up, then move on.",
    icon: 'time-outline',
  },

  noResponse14Days: {
    cta: 'Move On',
    ctaColor: 'ghost' as ErrorColor,
    message: 'No response in 2 weeks. Focus on coaches who engage.',
    icon: 'arrow-forward-outline',
  },

  alreadyContacted: {
    cta: 'View History →',
    ctaColor: 'ghost' as ErrorColor,
    message: "You've already contacted this coach recently.",
    icon: 'checkmark-circle-outline',
  },
}

/**
 * Network errors
 */
export const NETWORK_ERRORS = {
  offline: {
    cta: 'Retry',
    ctaColor: 'ghost' as ErrorColor,
    message: "Can't reach the server right now. Your message is saved — we'll send it when you're back online.",
    icon: 'cloud-offline-outline',
  },

  timeout: {
    cta: 'Retry',
    ctaColor: 'ghost' as ErrorColor,
    message: 'Request timed out. Please try again.',
    icon: 'hourglass-outline',
  },

  serverError: {
    cta: 'Retry',
    ctaColor: 'ghost' as ErrorColor,
    message: 'Something went wrong on our end. Please try again.',
    icon: 'warning-outline',
  },

  unauthorized: {
    cta: 'Sign In →',
    ctaColor: 'accent' as ErrorColor,
    message: 'Please sign in to continue.',
    icon: 'log-in-outline',
  },
}

/**
 * Throttling/limits
 */
export function getThrottleError(remaining: number): ErrorState {
  return {
    cta: 'Schedule the rest?',
    ctaColor: 'info',
    message: `You can send ${remaining} more today.`,
    icon: 'speedometer-outline',
  }
}

/**
 * Empty states
 */
export const EMPTY_STATES: Record<string, ErrorState> = {
  noCoaches: {
    message: 'No coaches found. Try adjusting your filters or search for something else.',
    icon: 'search-outline',
    cta: 'Clear Filters',
    ctaColor: 'ghost',
  },

  noSavedCoaches: {
    message: 'No saved coaches yet. Search for coaches and save them to your pipeline.',
    icon: 'bookmark-outline',
    cta: 'Find Coaches →',
    ctaColor: 'accent',
  },

  noIntel: {
    message: 'No activity yet. Send your first message to start seeing coach engagement.',
    icon: 'pulse-outline',
    cta: 'Start Outreach →',
    ctaColor: 'accent',
  },

  noMessages: {
    message: 'No messages yet. Your conversation history will appear here.',
    icon: 'chatbubbles-outline',
    cta: null,
    ctaColor: 'ghost',
  },

  noCampaigns: {
    message: 'No campaigns yet. Create a campaign to reach multiple coaches at once.',
    icon: 'mail-outline',
    cta: 'Create Campaign →',
    ctaColor: 'accent',
  },

  noNotifications: {
    message: "You're all caught up! No notifications.",
    icon: 'notifications-outline',
    cta: null,
    ctaColor: 'ghost',
  },
}

/**
 * Loading states
 */
export const LOADING_STATES = {
  coaches: 'Loading coaches...',
  pipeline: 'Loading your pipeline...',
  intel: 'Loading activity...',
  profile: 'Loading profile...',
  sending: 'Sending message...',
  saving: 'Saving...',
  deleting: 'Removing...',
  searching: 'Searching...',
}

/**
 * Success states
 */
export const SUCCESS_STATES = {
  messageSent: (coachName: string) => `Message sent to ${coachName}`,
  coachSaved: (coachName: string) => `${coachName} saved to your pipeline`,
  coachRemoved: (coachName: string) => `${coachName} removed`,
  profileUpdated: 'Profile updated successfully',
  settingsSaved: 'Settings saved',
  emailConnected: 'Email connected successfully',
  twitterConnected: '𝕏 connected successfully',
}

/**
 * Get error color value
 */
export function getErrorColorValue(color: ErrorColor): string {
  const colorMap: Record<ErrorColor, string> = {
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    ghost: colors.textSecondary,
    accent: colors.accent,
  }
  return colorMap[color]
}

/**
 * Get error message string (resolves functions)
 */
export function getErrorMessage(
  error: ErrorState,
  context?: string
): string {
  if (typeof error.message === 'function') {
    return error.message(context || '')
  }
  return error.message
}

/**
 * Determine error type from HTTP status code
 */
export function getErrorFromStatus(status: number): ErrorState {
  switch (status) {
    case 401:
      return NETWORK_ERRORS.unauthorized
    case 408:
    case 504:
      return NETWORK_ERRORS.timeout
    case 429:
      return getThrottleError(0)
    case 500:
    case 502:
    case 503:
      return NETWORK_ERRORS.serverError
    default:
      return NETWORK_ERRORS.serverError
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(status: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(status)
}

/**
 * Progressive Disclosure System
 *
 * Dashboard sections appear as the user progresses through their recruiting journey.
 * This creates a less overwhelming first-run experience.
 *
 * Progression:
 * - First open: Show "Send your first message" card
 * - After 1st outreach: Show Live Intel
 * - After 3 outreaches: Show Recommended Coaches
 * - After 7 outreaches: Show Pipeline chart
 */

import type { SavedCoach } from '@/types'

export interface DashboardSections {
  showFirstRunCard: boolean
  showLiveIntel: boolean
  showRecommendedCoaches: boolean
  showPipelineChart: boolean
  showFullStats: boolean
}

export interface ProgressState {
  outreachCount: number
  savedCount: number
  hasConnectedTwitter: boolean
  hasConnectedEmail: boolean
  daysActive: number
}

/**
 * Calculate which dashboard sections to show based on user progress
 */
export function getDashboardSections(
  savedCoaches: SavedCoach[],
  options?: {
    twitterConnected?: boolean
    emailConnected?: boolean
    accountCreatedAt?: Date
    // Use this when the accurate outreachCount from the athlete API is available
    outreachCount?: number
  }
): DashboardSections {
  // Use outreachCount from athlete API if provided, otherwise fall back to savedCoaches filter
  const outreachCount = options?.outreachCount ?? savedCoaches.filter(
    (c) => c.outreachStatus !== 'NOT_CONTACTED'
  ).length

  const savedCount = savedCoaches.length

  return {
    // Show first-run card only when no outreach has been sent
    showFirstRunCard: outreachCount === 0,

    // Show Live Intel after first outreach
    showLiveIntel: outreachCount >= 1,

    // Show Recommended Coaches after 3 outreaches (user is engaged)
    showRecommendedCoaches: outreachCount >= 3 || savedCount >= 5,

    // Show Pipeline chart after 7 outreaches (power user)
    showPipelineChart: outreachCount >= 7,

    // Show full stats (streak, XP, etc.) after first save
    showFullStats: savedCount >= 1,
  }
}

/**
 * Get the appropriate welcome message based on progress
 */
export function getWelcomeMessage(
  firstName: string,
  progress: ProgressState
): { title: string; subtitle: string } {
  const { outreachCount, savedCount, daysActive } = progress

  if (outreachCount === 0 && savedCount === 0) {
    return {
      title: `Welcome, ${firstName}`,
      subtitle: "Let's find coaches who are the right fit for you.",
    }
  }

  if (outreachCount === 0 && savedCount > 0) {
    return {
      title: `Ready to reach out?`,
      subtitle: `You've saved ${savedCount} coaches. Time to make contact.`,
    }
  }

  if (outreachCount < 5) {
    return {
      title: `Keep it going, ${firstName}`,
      subtitle: `${outreachCount} coaches contacted. Build momentum.`,
    }
  }

  if (daysActive >= 7) {
    return {
      title: `Welcome back`,
      subtitle: `You're building real connections.`,
    }
  }

  return {
    title: `Great progress, ${firstName}`,
    subtitle: `${outreachCount} coaches contacted. You're on track.`,
  }
}

/**
 * Get first-run card content based on what the user should do next
 */
export function getFirstRunAction(
  savedCount: number,
  hasEmail: boolean,
  hasTwitter: boolean
): {
  icon: string
  title: string
  description: string
  action: 'search' | 'email' | 'dm' | 'connect'
  ctaLabel: string
} {
  // No coaches saved yet
  if (savedCount === 0) {
    return {
      icon: 'search',
      title: 'Find Your First Coach',
      description: 'Search for coaches that match your position and goals.',
      action: 'search',
      ctaLabel: 'Search Coaches →',
    }
  }

  // Has saved coaches but no email connected
  if (!hasEmail && !hasTwitter) {
    return {
      icon: 'mail',
      title: 'Connect Your Email',
      description: 'Send personalized emails directly from XR Navigator.',
      action: 'connect',
      ctaLabel: 'Connect Email →',
    }
  }

  // Ready to send
  if (hasEmail) {
    return {
      icon: 'send',
      title: 'Send Your First Message',
      description: "You're ready to reach out. Make that first connection.",
      action: 'email',
      ctaLabel: 'Start Outreach →',
    }
  }

  // Only Twitter
  return {
    icon: 'logo-twitter',
    title: 'Send Your First DM',
    description: 'Reach out to coaches who follow you on X.',
    action: 'dm',
    ctaLabel: 'Send DM →',
  }
}

/**
 * Get milestone celebration data
 */
export function getMilestone(
  outreachCount: number,
  previousCount: number
): { reached: boolean; type: string; message: string } | null {
  const milestones = [
    { count: 1, type: 'first_outreach', message: 'First message sent!' },
    { count: 5, type: 'momentum', message: '5 coaches contacted!' },
    { count: 10, type: 'dedicated', message: '10 coaches reached!' },
    { count: 25, type: 'serious', message: '25 coaches contacted!' },
    { count: 50, type: 'committed', message: '50 coaches reached!' },
    { count: 100, type: 'all_in', message: '100 coaches contacted!' },
  ]

  for (const milestone of milestones) {
    if (outreachCount >= milestone.count && previousCount < milestone.count) {
      return {
        reached: true,
        type: milestone.type,
        message: milestone.message,
      }
    }
  }

  return null
}

/**
 * Calculate user engagement level for analytics
 */
export function getEngagementLevel(progress: ProgressState): 'new' | 'active' | 'engaged' | 'power' {
  const { outreachCount, savedCount, daysActive } = progress

  if (outreachCount >= 20 && daysActive >= 14) return 'power'
  if (outreachCount >= 5 || (savedCount >= 10 && daysActive >= 7)) return 'engaged'
  if (outreachCount >= 1 || savedCount >= 3) return 'active'
  return 'new'
}

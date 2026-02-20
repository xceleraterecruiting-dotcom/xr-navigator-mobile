/**
 * Smart CTA Logic
 *
 * Context-aware call-to-action buttons based on outreach state
 *
 * Priority order:
 * 1. Coach replied → "Send Thank You"
 * 2. Coach opened → "Follow Up"
 * 3. Email sent → "Follow Up"
 * 4. Has email → "Send Email"
 * 5. Has Twitter → "Send DM"
 * 6. Default → "View Coach"
 */

import { colors } from '@/constants/theme'

// Engagement data from the enhanced saved-coaches API
export interface CoachEngagement {
  // Email engagement
  lastEmailSent: string | null
  lastEmailOpened: string | null
  lastEmailReplied: string | null
  emailOpenCount: number
  emailClickCount: number
  // Twitter engagement
  twitterDiscoveredAt: string | null
  twitterRespondedAt: string | null
  twitterEngagementScore: number | null
  lastDmAt: string | null
  // Channel availability
  hasEmail: boolean
  hasTwitter: boolean
}

export interface SmartCTA {
  label: string
  action: 'reply' | 'followup' | 'email' | 'dm' | 'view'
  color: string
  variant: 'accent' | 'success' | 'info' | 'ghost'
}

/**
 * Get the appropriate CTA based on coach engagement state
 */
export function getSmartCTA(engagement: CoachEngagement): SmartCTA {
  const {
    lastEmailOpened,
    lastEmailReplied,
    twitterRespondedAt,
    lastEmailSent,
    lastDmAt,
    hasEmail,
    hasTwitter,
  } = engagement

  // 1. Coach replied (email or Twitter) → Thank them
  if (lastEmailReplied || twitterRespondedAt) {
    return {
      label: 'Send Thank You →',
      action: 'reply',
      color: colors.success,
      variant: 'success',
    }
  }

  // 2. Coach opened email → Follow up
  if (lastEmailOpened) {
    return {
      label: 'Follow Up →',
      action: 'followup',
      color: colors.accent,
      variant: 'accent',
    }
  }

  // 3. Email sent but not opened → Generic follow up
  if (lastEmailSent) {
    return {
      label: 'Follow Up →',
      action: 'followup',
      color: colors.textTertiary,
      variant: 'ghost',
    }
  }

  // 4. DM sent but no response → Follow up on Twitter
  if (lastDmAt) {
    return {
      label: 'Follow Up DM →',
      action: 'dm',
      color: colors.info,
      variant: 'info',
    }
  }

  // 5. Has email but not contacted → Send email
  if (hasEmail) {
    return {
      label: 'Send Email →',
      action: 'email',
      color: colors.accent,
      variant: 'accent',
    }
  }

  // 6. Has Twitter but not contacted → Send DM
  if (hasTwitter) {
    return {
      label: 'Send DM →',
      action: 'dm',
      color: colors.info,
      variant: 'info',
    }
  }

  // 7. Default → View coach profile
  return {
    label: 'View Coach →',
    action: 'view',
    color: colors.textTertiary,
    variant: 'ghost',
  }
}

/**
 * Get secondary CTAs (other available actions)
 */
export function getSecondaryCTAs(engagement: CoachEngagement): SmartCTA[] {
  const primary = getSmartCTA(engagement)
  const secondary: SmartCTA[] = []

  // If primary isn't email and coach has email
  if (primary.action !== 'email' && engagement.hasEmail) {
    secondary.push({
      label: 'Email',
      action: 'email',
      color: colors.textTertiary,
      variant: 'ghost',
    })
  }

  // If primary isn't DM and coach has Twitter
  if (primary.action !== 'dm' && engagement.hasTwitter) {
    secondary.push({
      label: 'DM on 𝕏',
      action: 'dm',
      color: colors.textTertiary,
      variant: 'ghost',
    })
  }

  return secondary
}

/**
 * Get interest level based on engagement signals
 */
export function getInterestLevel(engagement: CoachEngagement): {
  score: number
  label: string
  color: string
} {
  let score = 0

  // Email signals
  if (engagement.lastEmailReplied) score += 40
  else if (engagement.lastEmailOpened) score += 20
  if (engagement.emailOpenCount > 2) score += 10
  if (engagement.emailClickCount > 0) score += 15

  // Twitter signals
  if (engagement.twitterRespondedAt) score += 40
  else if (engagement.twitterDiscoveredAt) score += 15
  if (engagement.twitterEngagementScore && engagement.twitterEngagementScore > 50) {
    score += 10
  }

  // Normalize to 0-100
  score = Math.min(100, score)

  // Determine label and color
  if (score >= 50) {
    return {
      score,
      label: 'High Interest',
      color: '#FF6B6B', // Red/hot
    }
  }
  if (score >= 20) {
    return {
      score,
      label: 'Warming Up',
      color: colors.warning,
    }
  }
  return {
    score,
    label: '',
    color: colors.textTertiary,
  }
}

/**
 * Get follow-up guidance based on days since last contact
 */
export function getFollowUpGuidance(engagement: CoachEngagement): string | null {
  const lastContact = engagement.lastEmailSent || engagement.lastDmAt
  if (!lastContact) return null

  const daysSince = Math.floor(
    (Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSince >= 14) {
    return "No response in 2 weeks. Focus on coaches who engage."
  }
  if (daysSince >= 7) {
    return "It's been 7 days. One more follow-up, then move on."
  }
  if (daysSince >= 3) {
    return "Good time for a follow-up message."
  }
  return null
}

/**
 * Unified Outreach Store
 *
 * Aggregates saved coaches, email engagement, and Twitter data
 * into a pipeline-first view organized by outreach status.
 */

import { create } from 'zustand'
import { api } from '@/lib/api'
import type { SavedCoach, TwitterCoachMatch, CollegeCoach } from '@/types'

// Unified outreach item that can represent email or Twitter outreach
export interface OutreachItem {
  id: string
  coach: CollegeCoach
  savedCoachId?: string  // If from saved coaches
  twitterMatchId?: string  // If from Twitter

  // Status
  status: 'engaged' | 'waiting' | 'responded' | 'need_contact'

  // Channels available
  hasEmail: boolean
  hasTwitter: boolean
  isFollowingOnTwitter: boolean

  // Engagement signals
  emailSentAt: string | null
  emailOpenedAt: string | null
  emailOpenCount: number
  emailRepliedAt: string | null
  twitterDiscoveredAt: string | null
  twitterDmSentAt: string | null
  twitterRepliedAt: string | null

  // Computed
  isHot: boolean  // Multiple opens, recent follow, etc.
  lastActivityAt: string | null
  daysSinceContact: number | null
  suggestedAction: 'send_email' | 'send_dm' | 'follow_up' | 'view_reply' | 'thank_you'
}

export interface OutreachSection {
  key: 'engaged' | 'waiting' | 'responded' | 'need_contact'
  title: string
  subtitle: string
  items: OutreachItem[]
  emptyMessage: string
}

interface OutreachState {
  sections: OutreachSection[]
  isLoading: boolean
  error: string | null
  twitterConnected: boolean
  emailConnected: boolean
  lastRefresh: string | null
}

interface OutreachActions {
  fetchOutreach: () => Promise<void>
  refresh: () => Promise<void>
}

type OutreachStore = OutreachState & OutreachActions

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

function computeStatus(item: {
  emailSentAt: string | null
  emailOpenedAt: string | null
  emailRepliedAt: string | null
  twitterDmSentAt: string | null
  twitterRepliedAt: string | null
  twitterDiscoveredAt: string | null
  isFollowingOnTwitter: boolean
}): 'engaged' | 'waiting' | 'responded' | 'need_contact' {
  // Responded - highest priority
  if (item.emailRepliedAt || item.twitterRepliedAt) {
    return 'responded'
  }

  // Engaged - coach showed interest
  if (item.emailOpenedAt) {
    return 'engaged'
  }

  // Recently followed on Twitter = engaged
  if (item.isFollowingOnTwitter && item.twitterDiscoveredAt) {
    const discoveredDate = new Date(item.twitterDiscoveredAt)
    const daysSinceDiscovered = daysBetween(discoveredDate, new Date())
    if (daysSinceDiscovered <= 7) {
      return 'engaged'
    }
  }

  // Waiting - sent but no engagement yet
  if (item.emailSentAt || item.twitterDmSentAt) {
    return 'waiting'
  }

  // Need to contact
  return 'need_contact'
}

function computeSuggestedAction(item: OutreachItem): OutreachItem['suggestedAction'] {
  if (item.status === 'responded') {
    return 'view_reply'
  }

  if (item.status === 'engaged') {
    return 'thank_you'
  }

  if (item.status === 'waiting') {
    // Suggest follow up after 5 days
    if (item.daysSinceContact && item.daysSinceContact >= 5) {
      return 'follow_up'
    }
    return 'follow_up'
  }

  // Need to contact - prefer email if available
  if (item.hasEmail) {
    return 'send_email'
  }
  if (item.hasTwitter || item.isFollowingOnTwitter) {
    return 'send_dm'
  }
  return 'send_email'
}

function isHotLead(item: OutreachItem): boolean {
  // Multiple email opens
  if (item.emailOpenCount >= 2) return true

  // Opened recently (within 24 hours)
  if (item.emailOpenedAt) {
    const openedDate = new Date(item.emailOpenedAt)
    const hoursSinceOpened = (Date.now() - openedDate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceOpened <= 24) return true
  }

  // New Twitter follower (within 3 days)
  if (item.isFollowingOnTwitter && item.twitterDiscoveredAt) {
    const discoveredDate = new Date(item.twitterDiscoveredAt)
    const daysSinceDiscovered = daysBetween(discoveredDate, new Date())
    if (daysSinceDiscovered <= 3) return true
  }

  return false
}

export const useOutreachStore = create<OutreachStore>((set, get) => ({
  sections: [],
  isLoading: false,
  error: null,
  twitterConnected: false,
  emailConnected: false,
  lastRefresh: null,

  fetchOutreach: async () => {
    set({ isLoading: true, error: null })

    try {
      // Fetch all data sources in parallel
      const [savedCoachesResult, twitterResult, emailStatusResult] = await Promise.allSettled([
        api.getSavedCoaches(),
        api.getTwitterFollowers().catch(() => null),
        api.getEmailStatus().catch(() => null),
      ])

      const savedCoaches: SavedCoach[] = savedCoachesResult.status === 'fulfilled'
        ? savedCoachesResult.value
        : []

      const twitterData = twitterResult.status === 'fulfilled' && twitterResult.value
        ? twitterResult.value
        : null

      const emailStatus = emailStatusResult.status === 'fulfilled'
        ? emailStatusResult.value
        : null

      const twitterConnected = twitterData?.connected ?? false
      const emailConnected = !!emailStatus?.activeConnection

      // Build a map of Twitter matches by coach ID for quick lookup
      const twitterMatchMap = new Map<string, TwitterCoachMatch>()
      if (twitterData?.matches) {
        for (const match of twitterData.matches) {
          twitterMatchMap.set(match.coach.id, match)
        }
      }

      // Process saved coaches into outreach items
      const outreachItems: OutreachItem[] = []
      const processedCoachIds = new Set<string>()

      for (const sc of savedCoaches) {
        const coach = sc.collegeCoach
        const engagement = sc.engagement
        const twitterMatch = twitterMatchMap.get(coach.id)

        processedCoachIds.add(coach.id)

        const emailSentAt = engagement?.lastEmailSent ?? null
        const emailOpenedAt = engagement?.lastEmailOpened ?? null
        const emailRepliedAt = engagement?.lastEmailReplied ?? null
        const twitterDiscoveredAt = twitterMatch?.discoveredAt ?? engagement?.twitterDiscoveredAt ?? null
        const twitterDmSentAt = engagement?.lastDmAt ?? null
        const twitterRepliedAt = engagement?.twitterRespondedAt ?? null
        const isFollowingOnTwitter = !!twitterMatch

        const itemBase = {
          emailSentAt,
          emailOpenedAt,
          emailRepliedAt,
          twitterDmSentAt,
          twitterRepliedAt,
          twitterDiscoveredAt,
          isFollowingOnTwitter,
        }

        const status = computeStatus(itemBase)

        // Calculate days since last contact
        const lastContactDate = emailSentAt || twitterDmSentAt
        const daysSinceContact = lastContactDate
          ? daysBetween(new Date(lastContactDate), new Date())
          : null

        // Calculate last activity
        const activityDates = [
          emailOpenedAt,
          emailRepliedAt,
          twitterDiscoveredAt,
          twitterRepliedAt,
        ].filter(Boolean) as string[]

        const lastActivityAt = activityDates.length > 0
          ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null

        const item: OutreachItem = {
          id: sc.id,
          coach,
          savedCoachId: sc.id,
          twitterMatchId: twitterMatch?.id,
          status,
          hasEmail: !!coach.email,
          hasTwitter: !!coach.twitter,
          isFollowingOnTwitter,
          emailSentAt,
          emailOpenedAt,
          emailOpenCount: engagement?.emailOpenCount ?? 0,
          emailRepliedAt,
          twitterDiscoveredAt,
          twitterDmSentAt,
          twitterRepliedAt,
          isHot: false, // Will be computed below
          lastActivityAt,
          daysSinceContact,
          suggestedAction: 'send_email', // Will be computed below
        }

        item.isHot = isHotLead(item)
        item.suggestedAction = computeSuggestedAction(item)

        outreachItems.push(item)
      }

      // Add Twitter followers who aren't in saved coaches
      if (twitterData?.matches) {
        for (const match of twitterData.matches) {
          if (processedCoachIds.has(match.coach.id)) continue

          const coach = match.coach
          const twitterDiscoveredAt = match.discoveredAt
          const twitterRepliedAt = match.dmStatus === 'replied' ? twitterDiscoveredAt : null
          const twitterDmSentAt = match.dmStatus === 'dm_sent' || match.dmStatus === 'follow_up_sent'
            ? twitterDiscoveredAt
            : null

          const itemBase = {
            emailSentAt: null,
            emailOpenedAt: null,
            emailRepliedAt: null,
            twitterDmSentAt,
            twitterRepliedAt,
            twitterDiscoveredAt,
            isFollowingOnTwitter: true,
          }

          const status = computeStatus(itemBase)

          const item: OutreachItem = {
            id: `twitter-${match.id}`,
            coach,
            twitterMatchId: match.id,
            status,
            hasEmail: !!coach.email,
            hasTwitter: !!coach.twitter,
            isFollowingOnTwitter: true,
            emailSentAt: null,
            emailOpenedAt: null,
            emailOpenCount: 0,
            emailRepliedAt: null,
            twitterDiscoveredAt,
            twitterDmSentAt,
            twitterRepliedAt,
            isHot: false,
            lastActivityAt: twitterDiscoveredAt,
            daysSinceContact: twitterDmSentAt
              ? daysBetween(new Date(twitterDmSentAt), new Date())
              : null,
            suggestedAction: 'send_dm',
          }

          item.isHot = isHotLead(item)
          item.suggestedAction = computeSuggestedAction(item)

          outreachItems.push(item)
        }
      }

      // Group by status
      const engaged = outreachItems
        .filter(i => i.status === 'engaged')
        .sort((a, b) => {
          // Hot leads first, then by last activity
          if (a.isHot && !b.isHot) return -1
          if (!a.isHot && b.isHot) return 1
          const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
          const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
          return bTime - aTime
        })

      const waiting = outreachItems
        .filter(i => i.status === 'waiting')
        .sort((a, b) => {
          // Oldest first (need follow up sooner)
          const aTime = a.emailSentAt || a.twitterDmSentAt
          const bTime = b.emailSentAt || b.twitterDmSentAt
          if (!aTime) return 1
          if (!bTime) return -1
          return new Date(aTime).getTime() - new Date(bTime).getTime()
        })

      const responded = outreachItems
        .filter(i => i.status === 'responded')
        .sort((a, b) => {
          // Most recent replies first
          const aTime = a.emailRepliedAt || a.twitterRepliedAt
          const bTime = b.emailRepliedAt || b.twitterRepliedAt
          if (!aTime) return 1
          if (!bTime) return -1
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })

      const needContact = outreachItems
        .filter(i => i.status === 'need_contact')
        .sort((a, b) => {
          // Prioritize those with more channels, then by name
          const aChannels = (a.hasEmail ? 1 : 0) + (a.hasTwitter || a.isFollowingOnTwitter ? 1 : 0)
          const bChannels = (b.hasEmail ? 1 : 0) + (b.hasTwitter || b.isFollowingOnTwitter ? 1 : 0)
          if (aChannels !== bChannels) return bChannels - aChannels
          return a.coach.name.localeCompare(b.coach.name)
        })

      const sections: OutreachSection[] = [
        {
          key: 'engaged',
          title: 'Engaged',
          subtitle: 'Coaches showing interest right now',
          items: engaged,
          emptyMessage: 'No engaged coaches yet. Send some emails!',
        },
        {
          key: 'waiting',
          title: 'Waiting for Reply',
          subtitle: 'Sent, awaiting response',
          items: waiting,
          emptyMessage: 'No pending outreach',
        },
        {
          key: 'responded',
          title: 'Responded',
          subtitle: 'Coaches who replied',
          items: responded,
          emptyMessage: 'No responses yet',
        },
        {
          key: 'need_contact',
          title: 'Need to Contact',
          subtitle: 'Saved coaches to reach out to',
          items: needContact,
          emptyMessage: 'Save coaches from the directory to get started',
        },
      ]

      set({
        sections,
        twitterConnected,
        emailConnected,
        isLoading: false,
        lastRefresh: new Date().toISOString(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load outreach data'
      set({ error: message, isLoading: false })
    }
  },

  refresh: async () => {
    await get().fetchOutreach()
  },
}))

// Selectors
export const useOutreachSections = () => useOutreachStore((s) => s.sections)
export const useOutreachLoading = () => useOutreachStore((s) => s.isLoading)
export const useOutreachError = () => useOutreachStore((s) => s.error)
export const useTwitterConnected = () => useOutreachStore((s) => s.twitterConnected)
export const useEmailConnected = () => useOutreachStore((s) => s.emailConnected)

// Get counts for badges
export const useEngagedCount = () => useOutreachStore((s) =>
  s.sections.find(sec => sec.key === 'engaged')?.items.length ?? 0
)
export const useHotCount = () => useOutreachStore((s) =>
  s.sections.find(sec => sec.key === 'engaged')?.items.filter(i => i.isHot).length ?? 0
)

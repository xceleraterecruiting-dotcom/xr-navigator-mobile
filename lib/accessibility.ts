/**
 * Accessibility Helpers
 *
 * Standardized accessibility labels and roles for all components
 * Ensures WCAG AA compliance and great VoiceOver/TalkBack experience
 */

import type { AccessibilityRole, AccessibilityState } from 'react-native'

// Type for accessibility props
export interface A11yProps {
  accessibilityLabel: string
  accessibilityRole?: AccessibilityRole
  accessibilityHint?: string
  accessibilityState?: AccessibilityState
  accessible?: boolean
}

/**
 * Coach card accessibility
 */
export function coachCardA11y(coach: {
  name: string
  title?: string | null
  school: string
  division?: string | null
}): A11yProps {
  const parts = [coach.name]
  if (coach.title) parts.push(coach.title)
  parts.push(`at ${coach.school}`)
  if (coach.division) parts.push(formatDivision(coach.division))

  return {
    accessibilityLabel: parts.join(', '),
    accessibilityRole: 'button',
    accessibilityHint: 'Double tap to view coach details',
  }
}

/**
 * Smart CTA button accessibility
 */
export function smartCTAA11y(
  coachName: string,
  action: string
): A11yProps {
  return {
    accessibilityLabel: `${action} with ${coachName}`,
    accessibilityRole: 'button',
  }
}

/**
 * Interest level accessibility
 */
export function interestLevelA11y(
  score: number,
  guidance: string
): A11yProps {
  return {
    accessibilityLabel: `Interest level ${score} out of 100. ${guidance}`,
    accessibilityRole: 'progressbar',
  }
}

/**
 * Intel event accessibility
 */
export function intelEventA11y(event: {
  coachName: string | null
  school: string | null
  description: string
  timestamp: Date | string
}): A11yProps {
  const timeAgo = formatTimeAgo(event.timestamp)
  const who = event.coachName || `Someone from ${event.school}` || 'A coach'

  return {
    accessibilityLabel: `${who} ${event.description}, ${timeAgo}`,
    accessibilityRole: 'button',
    accessibilityHint: 'Double tap for action options',
  }
}

/**
 * Tab bar item accessibility
 */
export function tabA11y(
  name: string,
  isActive: boolean
): A11yProps {
  return {
    accessibilityLabel: `${name} tab${isActive ? ', selected' : ''}`,
    accessibilityRole: 'tab',
    accessibilityState: { selected: isActive },
  }
}

/**
 * Pipeline chart accessibility (read as summary)
 */
export function pipelineChartA11y(stats: {
  saved: number
  sent: number
  opened: number
  replied: number
  interested: number
  offered: number
}): A11yProps {
  return {
    accessibilityLabel: `Pipeline summary: ${stats.saved} saved, ${stats.sent} sent, ${stats.opened} opened, ${stats.replied} replied, ${stats.interested} interested, ${stats.offered} offers`,
    accessibilityRole: 'summary',
  }
}

/**
 * Stat card accessibility
 */
export function statCardA11y(
  value: number | string,
  label: string,
  trend?: 'up' | 'down' | 'neutral'
): A11yProps {
  let trendText = ''
  if (trend === 'up') trendText = ', trending up'
  if (trend === 'down') trendText = ', trending down'

  return {
    accessibilityLabel: `${value} ${label}${trendText}`,
    accessibilityRole: 'text',
  }
}

/**
 * Search input accessibility
 */
export function searchInputA11y(
  placeholder: string,
  hasResults: boolean,
  resultCount?: number
): A11yProps {
  let hint = 'Enter search terms'
  if (hasResults && resultCount !== undefined) {
    hint = `${resultCount} result${resultCount !== 1 ? 's' : ''} found`
  }

  return {
    accessibilityLabel: placeholder,
    accessibilityRole: 'search',
    accessibilityHint: hint,
  }
}

/**
 * Filter chip accessibility
 */
export function filterChipA11y(
  label: string,
  isSelected: boolean
): A11yProps {
  return {
    accessibilityLabel: `${label} filter${isSelected ? ', selected' : ''}`,
    accessibilityRole: 'button',
    accessibilityState: { selected: isSelected },
  }
}

/**
 * Modal accessibility
 */
export function modalA11y(title: string): A11yProps {
  return {
    accessibilityLabel: `${title} dialog`,
    accessibilityRole: 'alert',
    accessible: true,
  }
}

/**
 * Loading state accessibility
 */
export function loadingA11y(context: string): A11yProps {
  return {
    accessibilityLabel: `Loading ${context}`,
    accessibilityRole: 'progressbar',
    accessibilityState: { busy: true },
  }
}

/**
 * Error state accessibility
 */
export function errorA11y(message: string): A11yProps {
  return {
    accessibilityLabel: `Error: ${message}`,
    accessibilityRole: 'alert',
  }
}

/**
 * Empty state accessibility
 */
export function emptyStateA11y(context: string, action?: string): A11yProps {
  let hint = ''
  if (action) hint = `Double tap to ${action}`

  return {
    accessibilityLabel: `No ${context} yet`,
    accessibilityHint: hint,
  }
}

// Helper functions

function formatDivision(division: string): string {
  const map: Record<string, string> = {
    D1_FBS_P4: 'Division 1 Power 4',
    D1_FBS_G5: 'Division 1 Group of 5',
    D1_FCS: 'Division 1 FCS',
    D2: 'Division 2',
    D3: 'Division 3',
    NAIA: 'NAIA',
    JUCO: 'Junior College',
  }
  return map[division] || division
}

function formatTimeAgo(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

/**
 * Screen reader announcement helper
 * Use with AccessibilityInfo.announceForAccessibility()
 */
export const announcements = {
  coachSaved: (coachName: string) => `${coachName} saved to your list`,
  coachRemoved: (coachName: string) => `${coachName} removed from your list`,
  messageSent: (coachName: string) => `Message sent to ${coachName}`,
  searchResults: (count: number) => `${count} coach${count !== 1 ? 'es' : ''} found`,
  filterApplied: (filter: string) => `${filter} filter applied`,
  filterCleared: () => 'Filters cleared',
  refreshComplete: () => 'Content refreshed',
  errorOccurred: (context: string) => `Error ${context}. Please try again.`,
  loadingComplete: (context: string) => `${context} loaded`,
}

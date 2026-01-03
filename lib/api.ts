import * as Sentry from '@sentry/react-native'
import type { Athlete, CollegeCoach, SavedCoach, Conversation, CoachFilters, OutreachStatus } from '@/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.xceleraterecruiting.com'

// Will be set by the auth provider
let getToken: () => Promise<string | null> = async () => null
let signOut: () => Promise<void> = async () => {}

export function setAuthFunctions(
  tokenGetter: () => Promise<string | null>,
  signOutFn: () => Promise<void>
) {
  getToken = tokenGetter
  signOut = signOutFn
}

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text()
    let message = 'Something went wrong'
    let code: string | undefined

    try {
      const parsed = JSON.parse(errorBody)
      message = parsed.error || parsed.message || message
      code = parsed.code
    } catch {}

    // Handle specific status codes
    switch (response.status) {
      case 401:
        // Token expired - sign out
        await signOut()
        throw new APIError(401, 'Session expired. Please sign in again.', 'AUTH_EXPIRED')
      case 429:
        throw new APIError(429, 'Too many requests. Please wait a moment.', 'RATE_LIMITED')
      case 500:
        Sentry.captureMessage(`Server error: ${message}`, 'error')
        throw new APIError(500, 'Server error. Please try again later.', 'SERVER_ERROR')
      default:
        throw new APIError(response.status, message, code)
    }
  }

  return response.json()
}

function qs(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

class APIClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await getToken()
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    return handleResponse<T>(res)
  }

  // Athlete
  getAthlete = () => this.fetch<Athlete>('/api/athlete')

  updateProfile = (data: Partial<Athlete>) =>
    this.fetch<Athlete>('/api/athlete/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    })

  // Coaches
  getCoaches = (params: CoachFilters) =>
    this.fetch<CollegeCoach[]>(`/api/coaches?${qs(params)}`)

  searchCoaches = (query: string) =>
    this.fetch<CollegeCoach[]>(`/api/coaches/search?q=${encodeURIComponent(query)}`)

  // Saved Coaches
  getSavedCoaches = () =>
    this.fetch<SavedCoach[]>('/api/saved-coaches')

  saveCoach = (coachId: string) =>
    this.fetch<SavedCoach>('/api/saved-coaches', {
      method: 'POST',
      body: JSON.stringify({ coachId })
    })

  updateOutreachStatus = (id: string, status: OutreachStatus) =>
    this.fetch<SavedCoach>(`/api/saved-coaches/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })

  deleteSavedCoach = (id: string) =>
    this.fetch<void>(`/api/saved-coaches/${id}`, { method: 'DELETE' })

  // Conversations
  getConversations = () =>
    this.fetch<Conversation[]>('/api/conversations')

  getConversation = (id: string) =>
    this.fetch<Conversation>(`/api/conversations/${id}`)

  deleteConversation = (id: string) =>
    this.fetch<void>(`/api/conversations/${id}`, { method: 'DELETE' })
}

export const api = new APIClient()

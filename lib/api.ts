import * as Sentry from '@sentry/react-native'
import type {
  Athlete, CollegeCoach, SavedCoach, Conversation, CoachFilters, OutreachStatus,
  SubscriptionResponse, Graphic, TemplateId, FilmEvaluation, FilmEvaluationDetail,
  CreateEvaluationResponse, TwitterFollowersResponse, TwitterScanResponse,
  TwitterFollowersParams, TwitterDMGenerateResponse, RecruitingCard,
  CardGenerateResponse, CardAnalyticsResponse, CardFollower, ChallengesResponse,
  PlanResponse, PlanGenerateResponse, PlanWeekDetail, UserSettings, Notification,
  RecruitPageResponse, EmailConnectionStatus, Campaign, CampaignDetail,
  CampaignTemplatesResponse, CreateCampaignParams, SendCampaignParams,
  DailyPlanResponse,
} from '@/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.xceleraterecruiting.com'

// Will be set by the auth provider
// Clerk's getToken accepts { skipCache?: boolean } to force refresh
let getToken: (options?: { skipCache?: boolean }) => Promise<string | null> = async () => null
let signOut: () => Promise<void> = async () => {}

export function setAuthFunctions(
  tokenGetter: (options?: { skipCache?: boolean }) => Promise<string | null>,
  signOutFn: () => Promise<void>
) {
  getToken = tokenGetter
  signOut = signOutFn
}

// Simple delay helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Default timeout for API requests (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000

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

    // Handle specific status codes (401 handled in fetch method for retry logic)
    switch (response.status) {
      case 429:
        throw new APIError(429, message, 'DAILY_LIMIT')
      case 500:
        Sentry.captureMessage(`Server error: ${message}`, 'error')
        throw new APIError(500, 'Server error. Please try again later.', 'SERVER_ERROR')
      case 503:
        throw new APIError(503, 'This feature is coming soon.', 'FEATURE_DISABLED')
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
  private async fetch<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
    const token = await getToken()
    let res: Response

    const doFetch = async (authToken: string | null) => {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'Content-Type': 'application/json',
            'X-Platform': 'mobile',
            ...options?.headers,
          },
        })
        return response
      } finally {
        clearTimeout(timeoutId)
      }
    }

    try {
      res = await doFetch(token)
    } catch (err: any) {
      // Check if this was a timeout (abort)
      if (err?.name === 'AbortError') {
        throw new APIError(0, 'Request timed out. Please check your connection and try again.', 'TIMEOUT')
      }
      // Network error - retry once after short delay
      if (!isRetry) {
        await delay(1000)
        try {
          res = await doFetch(token)
        } catch (retryErr: any) {
          if (retryErr?.name === 'AbortError') {
            throw new APIError(0, 'Request timed out. Please check your connection and try again.', 'TIMEOUT')
          }
          throw new APIError(0, 'No internet connection. Please check your network and try again.', 'NETWORK_ERROR')
        }
      } else {
        throw new APIError(0, 'No internet connection. Please check your network and try again.', 'NETWORK_ERROR')
      }
    }

    // Handle 401 - try refreshing token once before signing out
    if (res.status === 401 && !isRetry) {
      const freshToken = await getToken({ skipCache: true }) // Force refresh
      if (freshToken && freshToken !== token) {
        // Got a new token, retry the request
        return this.fetch<T>(endpoint, options, true)
      }
      // Token refresh failed or returned same token - sign out
      await signOut()
      throw new APIError(401, 'Session expired. Please sign in again.', 'AUTH_EXPIRED')
    }

    if (res.status === 401) {
      // Already retried, sign out
      await signOut()
      throw new APIError(401, 'Session expired. Please sign in again.', 'AUTH_EXPIRED')
    }

    return handleResponse<T>(res)
  }

  // Generic request method for custom endpoints
  request = <T>(endpoint: string, options?: RequestInit) =>
    this.fetch<T>(endpoint, options)

  // Athlete - returns { athlete, _debug } for identity debugging
  getAthlete = () => this.fetch<{ athlete: Athlete; _debug?: { receivedClerkId: string | null; timestamp: string; userFound?: boolean; athleteFound?: boolean } }>('/api/athlete')

  updateProfile = (data: Partial<Athlete>) =>
    this.fetch<Athlete>('/api/athlete/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    })

  // Coaches — API returns { coaches: [...] }
  getCoaches = async (params: CoachFilters): Promise<CollegeCoach[]> => {
    // Map mobile params to what the API expects
    const apiParams: Record<string, any> = {}
    if (params.division) apiParams.division = params.division
    if (params.conference) apiParams.conference = params.conference
    if (params.position) apiParams.position = params.position
    if (params.search) apiParams.search = params.search
    if (params.limit) apiParams.limit = params.limit
    if (params.state) apiParams.state = params.state
    if (params.region) apiParams.region = params.region
    const data = await this.fetch<{ coaches: CollegeCoach[] }>(`/api/coaches?${qs(apiParams)}`)
    return data.coaches
  }

  searchCoaches = async (query: string): Promise<CollegeCoach[]> => {
    const data = await this.fetch<{ coaches: CollegeCoach[] }>(`/api/coaches?search=${encodeURIComponent(query)}`)
    return data.coaches
  }

  // Recommended coaches — curated based on position, evaluation level, and preferences
  // Supports filters: position, division, state, region
  getRecommendedCoaches = async (params?: {
    limit?: number
    position?: string
    division?: string
    state?: string
    region?: string
  }): Promise<CollegeCoach[]> => {
    const queryParams: Record<string, any> = {}
    if (params?.limit) queryParams.limit = params.limit
    if (params?.position) queryParams.position = params.position
    if (params?.division) queryParams.division = params.division
    if (params?.state) queryParams.state = params.state
    if (params?.region) queryParams.region = params.region

    const queryString = qs(queryParams)
    const url = queryString ? `/api/athlete/recommended-coaches?${queryString}` : '/api/athlete/recommended-coaches'
    const data = await this.fetch<{ coaches: CollegeCoach[] }>(url)
    return data.coaches
  }

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

  // Subscription & Usage
  getSubscription = () =>
    this.fetch<SubscriptionResponse>('/api/pro/subscription')

  // Evaluations
  listEvaluations = () =>
    this.fetch<{ evaluations: FilmEvaluation[] }>('/api/evaluate/list')

  // Graphics
  createGraphic = (evaluationId: string, templateId: TemplateId) =>
    this.fetch<{ graphic: Graphic }>('/api/graphics/create', {
      method: 'POST',
      body: JSON.stringify({ evaluationId, templateId }),
    })

  listGraphics = () =>
    this.fetch<{ graphics: Graphic[] }>('/api/graphics/create')

  // Twitter (all endpoints include source=mobile to bypass Pro gate)
  getTwitterAuth = () =>
    this.fetch<{ url: string }>('/api/twitter/auth?source=mobile')

  getTwitterAuthMobile = (codeChallenge: string) =>
    this.fetch<{ authUrl: string; state: string }>('/api/twitter/auth/mobile?source=mobile', {
      method: 'POST',
      body: JSON.stringify({ codeChallenge }),
    })

  exchangeTwitterCode = (data: { code: string; codeVerifier: string }) =>
    this.fetch<{ success: boolean; username: string }>('/api/twitter/exchange?source=mobile', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  getTwitterFollowers = (params?: TwitterFollowersParams) => {
    const query = params ? qs({ ...params, source: 'mobile' }) : 'source=mobile'
    return this.fetch<TwitterFollowersResponse>(`/api/twitter/followers?${query}`)
  }

  scanTwitterFollowers = () =>
    this.fetch<TwitterScanResponse>('/api/twitter/followers?source=mobile', { method: 'POST' })

  generateTwitterDM = (data: { coachId: string; coachName: string; school: string; title: string; isFollowUp?: boolean }) =>
    this.fetch<TwitterDMGenerateResponse>('/api/twitter/dm/generate?source=mobile', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  sendTwitterDM = (data: { coachId: string; message?: string; markReplied?: boolean }) =>
    this.fetch<{ sent: boolean; dmId: string }>('/api/twitter/dm?source=mobile', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  disconnectTwitter = () =>
    this.fetch<void>('/api/twitter/disconnect?source=mobile', { method: 'POST' })

  // Film Evaluation (detailed)
  createEvaluation = (data: { position: string; videoUrl: string; videoFileName?: string }) =>
    this.fetch<CreateEvaluationResponse>('/api/evaluate/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  getEvaluation = (id: string) =>
    this.fetch<{ evaluation: FilmEvaluationDetail }>(`/api/evaluate/${id}`)

  getEvaluations = () =>
    this.fetch<{ evaluations: FilmEvaluation[] }>('/api/evaluate/list')

  // Recruiting Card
  generateCard = (evaluationId?: string) =>
    this.fetch<CardGenerateResponse>('/api/card/generate', {
      method: 'POST',
      body: JSON.stringify(evaluationId ? { evaluationId } : {}),
    })

  getCard = (slug: string) =>
    this.fetch<RecruitingCard>(`/api/card/${slug}`)

  getCardAnalytics = () =>
    this.fetch<CardAnalyticsResponse>('/api/card/analytics')

  getCardFollowers = () =>
    this.fetch<{ followers: CardFollower[] }>('/api/card/followers')

  notifyFollowers = (updateType: string) =>
    this.fetch<{ success: boolean }>('/api/card/notify-followers', {
      method: 'POST',
      body: JSON.stringify({ updateType }),
    })

  // Recruit Page (athlete's public profile)
  getRecruitPage = () =>
    this.fetch<RecruitPageResponse>('/api/recruit')

  updateRecruitLinks = (data: {
    // Film/Social
    hudlUrl?: string
    youtubeUrl?: string
    twitterHandle?: string
    instagramHandle?: string
    highlightDescription?: string
    // Stats
    height?: string
    weight?: number
    fortyTime?: number
    shuttleTime?: number
    verticalJump?: number
    broadJump?: number
    benchPress?: number
    squat?: number
    // Academics
    gpa?: number
    weightedGpa?: number
    coreGpa?: number
    satScore?: number
    actScore?: number
    ncaaEligible?: boolean
    intendedMajor?: string
    classRank?: string
    // Contact
    playerEmail?: string
    playerPhone?: string
    parentName?: string
    parentEmail?: string
    parentPhone?: string
    hsCoachName?: string
    hsCoachTitle?: string
    hsCoachEmail?: string
    hsCoachPhone?: string
    coachNotes?: string
    // Recruiting
    offers?: string[]
  }) =>
    this.fetch<{ success: boolean }>('/api/recruit', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })

  // Challenges & XP
  getChallenges = () =>
    this.fetch<ChallengesResponse>('/api/challenges')

  assignChallenges = () =>
    this.fetch<{ assigned: any[] }>('/api/challenges/assign', { method: 'POST' })

  // Recruiting Plan
  // Daily AI Insight
  getDailyInsight = () =>
    this.fetch<{ insight: string }>('/api/ai-insight/daily')

  // Daily Plan (Recommended Coaches) - matches web dashboard
  getDailyPlan = () =>
    this.fetch<DailyPlanResponse>('/api/daily-plan')

  // Complete a daily plan task (mark coach as contacted)
  completeTask = (data: { taskId: string; taskType: string; xp: number; coachId: string; contactMethod: 'email' | 'twitter' }) =>
    this.fetch<{ success: boolean }>('/api/tasks/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  getPlan = () =>
    this.fetch<PlanResponse>('/api/plan')

  generatePlan = (data?: { dreamSchools?: string[]; geographyPrefs?: string[] }) =>
    this.fetch<PlanGenerateResponse>('/api/plan/generate', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })

  getPlanWeek = (weekNumber: number) =>
    this.fetch<PlanWeekDetail>(`/api/plan/${weekNumber}`)

  completePlanWeek = (weekNumber: number) =>
    this.fetch<{ success: boolean }>(`/api/plan/${weekNumber}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'complete' }),
    })

  regeneratePlan = (reason: string, data?: { dreamSchools?: string[]; geographyPrefs?: string[] }) =>
    this.fetch<{ success: boolean; planId: string }>('/api/plan/regenerate', {
      method: 'POST',
      body: JSON.stringify({ reason, ...data }),
    })

  // Settings
  getSettings = () =>
    this.fetch<UserSettings>('/api/settings')

  updateSettings = (data: Partial<UserSettings>) =>
    this.fetch<UserSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })

  deleteAccount = () =>
    this.fetch<{ success: boolean }>('/api/settings', { method: 'DELETE' })

  // Notifications
  getNotifications = () =>
    this.fetch<{ notifications: Notification[] }>('/api/notifications')

  markNotificationRead = (id: string) =>
    this.fetch<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' })

  markAllNotificationsRead = () =>
    this.fetch<{ success: boolean }>('/api/notifications/read-all', { method: 'PATCH' })

  registerPushToken = (token: string) =>
    this.fetch<{ success: boolean }>('/api/notifications/register-push', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })

  getUnreadCount = () =>
    this.fetch<{ count: number }>('/api/notifications/unread-count')

  // Onboarding
  submitOnboarding = (data: Record<string, any>) =>
    this.fetch<{ success: boolean }>('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  // Email Connection
  getEmailStatus = () =>
    this.fetch<EmailConnectionStatus>('/api/email/mobile/status')

  getEmailAuthUrl = (provider: 'gmail' | 'outlook', codeChallenge: string) =>
    this.fetch<{ authUrl: string; state: string }>('/api/email/mobile/auth', {
      method: 'POST',
      body: JSON.stringify({ provider, codeChallenge }),
    })

  exchangeEmailCode = (data: { code: string; state: string; codeVerifier: string; provider: string }) =>
    this.fetch<{ success: boolean; email: string; provider: string }>('/api/email/mobile/exchange', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  disconnectEmail = (connectionId: string) =>
    this.fetch<{ success: boolean }>('/api/email/mobile/status', {
      method: 'DELETE',
      body: JSON.stringify({ connectionId }),
    })

  // Campaigns
  getCampaigns = () =>
    this.fetch<{ campaigns: Campaign[] }>('/api/campaigns')

  getCampaign = (id: string) =>
    this.fetch<{ campaign: CampaignDetail }>(`/api/campaigns/${id}`)

  createCampaign = (data: CreateCampaignParams) =>
    this.fetch<{ campaign: Campaign }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  updateCampaign = (id: string, data: Partial<CreateCampaignParams>) =>
    this.fetch<{ campaign: Campaign }>(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })

  deleteCampaign = (id: string) =>
    this.fetch<{ success: boolean }>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    })

  sendCampaign = (id: string, params: SendCampaignParams) =>
    this.fetch<{ success: boolean; sentCount?: number; failedCount?: number }>(`/api/campaigns/${id}/send`, {
      method: 'POST',
      body: JSON.stringify(params),
    })

  getCampaignTemplates = () =>
    this.fetch<CampaignTemplatesResponse>('/api/campaigns/templates')

  addCampaignRecipients = (campaignId: string, coachIds: string[]) =>
    this.fetch<{ added: number; skipped: number }>(`/api/campaigns/${campaignId}/recipients`, {
      method: 'POST',
      body: JSON.stringify({ coachIds }),
    })

  removeCampaignRecipient = (campaignId: string, recipientId: string) =>
    this.fetch<{ success: boolean }>(`/api/campaigns/${campaignId}/recipients?recipientId=${recipientId}`, {
      method: 'DELETE',
    })

  getCampaignAnalytics = (id: string) =>
    this.fetch<any>(`/api/campaigns/${id}/analytics`)

  // AI Email Generation
  generateAIEmails = (campaignId: string, templateCategory: string) =>
    this.fetch<{
      success: boolean
      stats: { total: number; generated: number; failed: number; tokensUsed: number }
      samples: Array<{
        recipientId: string
        coachName: string
        school: string
        division: string
        subject: string
        body: string
        confidenceScore: number
      }>
    }>(`/api/campaigns/${campaignId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ templateCategory }),
    })

  getAIGenerationStatus = (campaignId: string) =>
    this.fetch<{
      status: string
      aiEnabled: boolean
      templateCategory: string | null
      generatedAt: string | null
      stats: { total: number; generated: number; failed: number }
      samples: Array<{
        recipientId: string
        coachName: string
        school: string
        division: string
        subject: string
        body: string
        confidenceScore: number
      }>
    }>(`/api/campaigns/${campaignId}/generate`)

  // ============================================
  // RECRUITING READINESS SCORE
  // ============================================

  getReadinessScore = () =>
    this.fetch<{
      score: number
      trend: 'up' | 'down' | 'stable'
      factors: Array<{
        name: string
        score: number
        weight: number
        tip: string
        current?: string
        target?: string
      }>
      cachedAt: string
    }>('/api/athlete/readiness-score')

  // ============================================
  // NEXT BEST MOVE
  // ============================================

  getNextBestMove = () =>
    this.fetch<{
      type: 'response' | 'follower' | 'hot_click' | 'click' | 'hot_open' | 'follow_up' | 'start'
      coach: {
        id: string
        name: string
        school: string
        title: string | null
        division: string | null
      } | null
      savedCoachId?: string
      message: string
      actionLabel: string
      actionRoute: string
      priority: number
    }>('/api/athlete/next-best-move')

  // Mark a saved coach contact as sent (updates lastContactedAt)
  markFollowUpSent = (savedCoachId: string) =>
    this.fetch<{ id: string }>(`/api/saved-coaches/${savedCoachId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ outreachStatus: 'SENT' }),
    })

  // ============================================
  // RECRUITING FUNNEL
  // ============================================

  getRecruitingFunnel = () =>
    this.fetch<{
      contacted: number
      opened: number
      clicked: number
      interested: number
      percentages: {
        opened: number
        clicked: number
        interested: number
      }
      gap: {
        hasGap: boolean
        clickedWithoutResponse: number
        message: string | null
      }
    }>('/api/athlete/funnel')

  // ============================================
  // XR METHOD BOOTCAMP
  // ============================================

  getBootcamp = () =>
    this.fetch<BootcampResponse>('/api/bootcamp')

  enrollBootcamp = () =>
    this.fetch<BootcampEnrollResponse>('/api/bootcamp/enroll', { method: 'POST' })

  getBootcampWeek = (weekNumber: number) =>
    this.fetch<BootcampWeekResponse>(`/api/bootcamp/week/${weekNumber}`)

  updateBootcampProgress = (data: { weekNumber: number; action: 'increment' | 'complete' | 'set'; amount?: number }) =>
    this.fetch<BootcampProgressUpdateResponse>('/api/bootcamp/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  getBootcampProgress = () =>
    this.fetch<BootcampProgressResponse>('/api/bootcamp/progress')

  gradeMessage = (data: { message: string; coachId?: string; schoolName?: string }) =>
    this.fetch<MessageGradeResult>('/api/bootcamp/grade', {
      method: 'POST',
      body: JSON.stringify(data),
    })

  quickCheckMessage = (message: string) =>
    this.fetch<QuickCheckResult>('/api/bootcamp/grade', {
      method: 'POST',
      body: JSON.stringify({ message, quickCheck: true }),
    })
}

// ============================================
// BOOTCAMP TYPES
// ============================================

export interface BootcampTargetSchool {
  id: string
  name: string
  division: string
  conference: string | null
  state: string | null
  matchScore: number
  reasons: string[]
  coachId: string | null
  coachName: string | null
  coachTitle: string | null
  coachEmail: string | null
  contacted?: boolean
}

export interface BootcampWeek {
  weekNumber: number
  theme: string
  title: string
  goal: string
  description: string
  targetCount: number
  progress: number
  isUnlocked: boolean
  isCompleted: boolean
  isCurrent: boolean
  completedAt: string | null
}

export interface BootcampResponse {
  enrolled: boolean
  needsOnboarding?: boolean
  needsProfile?: boolean
  enrollment?: {
    id: string
    status: string
    currentWeek: number
    startedAt: string
    completedAt: string | null
    lastActiveAt: string
  }
  progress?: {
    completedWeeks: number
    totalWeeks: number
    percentComplete: number
  }
  weeks?: BootcampWeek[]
  targetSchools?: {
    perfectFit: number
    dream: number
    safe: number
    projection: string | null
  }
  currentWeekCoaches?: BootcampTargetSchool[]
}

export interface BootcampEnrollResponse {
  enrollment: {
    id: string
    status: string
    currentWeek: number
  }
  targetSchools: {
    perfectFit: BootcampTargetSchool[]
    dream: BootcampTargetSchool[]
    safe: BootcampTargetSchool[]
    generatedAt: string
    projection: string | null
  }
  message: string
}

export interface BootcampWeekResponse {
  weekNumber: number
  theme: string
  title: string
  goal: string
  description: string
  targetCount: number
  coachSource: string
  tips: string[]
  isUnlocked: boolean
  isCompleted: boolean
  completedAt: string | null
  progress: number
  target: number
  coaches: BootcampTargetSchool[]
  showMicroRunCTA: boolean
}

export interface BootcampProgressUpdateResponse {
  weekNumber: number
  progress: number
  target: number
  isComplete: boolean
  weekUnlocked: number | null
  graduated: boolean
  currentWeek: number
}

export interface BootcampProgressResponse {
  currentWeek: number
  status: string
  weeks: Array<{
    weekNumber: number
    progress: number
    target: number
    isComplete: boolean
    isUnlocked: boolean
    completedAt: string | null
  }>
  completedWeeks: number
  graduated: boolean
}

export interface MessageGradeResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string
  strengths: string[]
  improvements: string[]
  checklist: {
    greeting: { present: boolean; feedback: string }
    introduction: { present: boolean; feedback: string }
    standoutTrait: { present: boolean; feedback: string }
    whyThisSchool: { present: boolean; feedback: string }
    hudlLink: { present: boolean; feedback: string }
    professionalClose: { present: boolean; feedback: string }
  }
  suggestedVersion?: string
}

export interface QuickCheckResult {
  quickCheck: true
  hasGreeting: boolean
  hasHudlLink: boolean
  wordCount: number
  estimatedReadTime: string
}

export const api = new APIClient()

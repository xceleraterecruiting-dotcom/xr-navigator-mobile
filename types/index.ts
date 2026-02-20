export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'EDGE' | 'LB' | 'CB' | 'S' | 'K' | 'P' | 'ATH'

export type Division = 'D1_FBS_P4' | 'D1_FBS_G5' | 'D1_FCS' | 'D2' | 'D3' | 'NAIA' | 'JUCO'

export type OutreachStatus = 'NOT_CONTACTED' | 'SENT' | 'WAITING' | 'RESPONDED'

export interface Athlete {
  id: string
  clerkUserId: string
  firstName: string
  lastName: string
  email: string
  position: Position | null
  gradYear: number | null
  highSchool: string | null
  city: string | null
  state: string | null
  height: number | null
  weight: number | null
  fortyYard: number | null
  gpa: number | null
  sat: number | null
  act: number | null
  hudlUrl: string | null
  maxprepsUrl: string | null
  twitter: string | null
  partner: string | null
  targetLevel: string | null
  onboardingComplete: boolean
  xp: number
  streak: number
  // Outreach count from sent emails (matches web dashboard)
  outreachCount: number
  createdAt: string
  updatedAt: string
}

export interface CollegeCoach {
  id: string
  name: string
  title: string
  school: string
  conference: string | null
  division: Division | null
  email: string | null
  twitter: string | null
  phone: string | null
  imageUrl: string | null
  state?: string | null
}

// Engagement data from enhanced saved-coaches API
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

export interface SavedCoach {
  id: string
  athleteId: string
  collegeCoachId: string
  collegeCoach: CollegeCoach
  outreachStatus: OutreachStatus
  lastContactedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  // Enhanced engagement data (from /api/saved-coaches)
  engagement?: CoachEngagement
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  athleteId: string
  title: string | null
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface CoachFilters {
  division?: Division
  conference?: string
  position?: Position
  search?: string
  page?: number
  limit?: number
  state?: string
  region?: string
}

// Usage & Subscription
export interface UsageItem {
  used: number
  limit: number
  remaining: number
  atLimit: boolean
  period: 'day' | 'lifetime' | 'year'
}

export interface SubscriptionUsage {
  aiMessages: UsageItem
  coachViews: UsageItem
  filmEvals: UsageItem
  graphics: UsageItem
  savedCoaches: UsageItem
}

export interface SubscriptionInfo {
  plan: string
  isPro: boolean
  usage: SubscriptionUsage
}

export interface SubscriptionResponse {
  subscription: SubscriptionInfo
  proEnabled: boolean
}

// Graphics
export interface Graphic {
  id: string
  imageUrl: string
  templateId: string
  isWatermarked: boolean
  createdAt: string
}

export type TemplateId = 'scout_report' | 'hype_card' | 'clean_pro' | 'midnight_elite' | 'gameday'

export interface FilmEvaluation {
  id: string
  position: string | null
  overallRating: number | null
  starRating: string | null
  status: string
  createdAt: string
  athlete: {
    id: string
    firstName: string
    lastName: string
    position: string | null
  }
}

// Twitter
export type TwitterDMStatus = 'not_contacted' | 'dm_sent' | 'follow_up_sent' | 'replied'

export interface TwitterCoachMatch {
  id: string
  matchType: string
  discoveredAt: string
  actionTaken: string | null
  dmStatus: TwitterDMStatus
  coach: CollegeCoach
}

export interface TwitterFollowersResponse {
  connected: boolean
  username: string | null
  lastScanAt: string | null
  matches: TwitterCoachMatch[]
  totalCount: number
  newMatchesThisWeek: number
  dmdCount: number
  repliedCount: number
  athleteProfile: { position: string | null }
}

export interface TwitterScanResponse {
  totalFollowers: number
  coachMatches: TwitterCoachMatch[]
  newMatches: number
}

export interface TwitterDMGenerateResponse {
  message: string
}

export interface TwitterFollowersParams {
  division?: string
  position?: string
  search?: string
  sort?: string
  limit?: number
  offset?: number
}

// Film Evaluation (detailed)
export interface FilmEvaluationDetail {
  id: string
  athleteId: string
  position: string
  videoUrl: string
  videoFileName: string | null
  status: string
  overallRating: number | null
  starRating: number | null
  recruitingLevel: string | null
  summary: string | null
  strengths: string[]
  weaknesses: string[]
  traits: string[]
  createdAt: string
  completedAt: string | null
  athlete: {
    id: string
    firstName: string
    lastName: string
    heightInches: number | null
    weightLbs: number | null
    gradYear: number | null
    highSchoolName: string | null
    position: string | null
  }
  recruitingCardSlug: string | null
}

export interface CreateEvaluationResponse {
  evaluation: {
    id: string
    athleteId: string
    position: string
    videoUrl: string
    videoFileName: string | null
    status: 'pending'
    createdAt: string
  }
  pipeline: 'split' | 'hybrid' | 'original'
}

// Recruiting Card
export interface RecruitingCard {
  id: string
  slug: string
  firstName: string
  lastName: string
  position: string | null
  gradYear: number | null
  highSchool: string | null
  city: string | null
  state: string | null
  profileImageUrl: string | null
  height: string | null
  weight: string | null
  fortyTime: number | null
  gpa: number | null
  satScore: number | null
  actScore: number | null
  hudlUrl: string | null
  twitterHandle: string | null
  instagramHandle: string | null
  xrRating: number | null
  xrStarRating: number | null
  xrProjection: string | null
  xrStrengths: string[] | null
  xrWeaknesses: string[] | null
  xrSummary: string | null
  xrTraits: string[] | null
  latestEvaluation: {
    id: string
    overallRating: number | null
    starRating: number | null
    recruitingLevel: string | null
    summary: string | null
    strengths: string[]
    weaknesses: string[]
    traits: string[]
  } | null
  generatedAt: string
  updatedAt: string
}

export interface CardGenerateResponse {
  success: boolean
  card: {
    id: string
    slug: string
    firstName: string
    lastName: string
    position: string | null
    gradYear: number | null
    xrRating: number | null
    xrProjection: string | null
    generatedAt: string
  }
  url: string
}

export interface CardAnalyticsResponse {
  card: {
    id: string
    slug: string
    name: string
    position: string | null
    gradYear: number | null
    xrRating: number | null
    xrProjection: string | null
    generatedAt: string
    lastViewedAt: string | null
    url: string
  } | null
  analytics: any | null
  isPro: boolean
  hasCard: boolean
}

export interface CardFollower {
  id: string
  name: string
  email: string
  school: string
  schoolLogoUrl: string | null
  createdAt: string
}

// Recruit Page Response
export interface RecruitPageResponse {
  card: {
    id: string
    slug: string
    coachLinkCode: string | null
    coachLinkUrl: string
    shareUrl: string
    firstName: string
    lastName: string
    position: string
    gradYear: number
    highSchool: string | null
    city: string | null
    state: string | null
    profileImageUrl: string | null
    height: string | null
    weight: number | null
    fortyTime: number | null
    shuttleTime: number | null
    verticalJump: number | null
    broadJump: number | null
    benchPress: number | null
    squat: number | null
    gpa: number | null
    weightedGpa: number | null
    coreGpa: number | null
    satScore: number | null
    actScore: number | null
    ncaaEligible: boolean | null
    intendedMajor: string | null
    classRank: string | null
    hudlUrl: string | null
    youtubeUrl: string | null
    trainingVideos: Array<{ url: string; title: string; type: string }> | null
    twitterHandle: string | null
    instagramHandle: string | null
    playerEmail: string | null
    playerPhone: string | null
    parentName: string | null
    parentEmail: string | null
    parentPhone: string | null
    hsCoachName: string | null
    hsCoachTitle: string | null
    hsCoachEmail: string | null
    hsCoachPhone: string | null
    coachNotes: string | null
    offers: string[]
    xrRating: number | null
    xrProjection: string | null
    xrStrengths: string[]
    xrWeaknesses: string[]
    xrSummary: string | null
  }
  views: Array<{
    id: string
    timestamp: string
    schoolIdentified: string | null
    ipCity: string | null
    ipRegion: string | null
  }>
  followers: Array<{
    id: string
    name: string
    email: string
    school: string
    createdAt: string
  }>
  analytics: {
    totalViews: number
    schoolsDetected: number
    statesReached: number
    schools: string[]
  }
}

// Daily Plan (Recommended Coaches)
export type TaskType = 'CONTACT'

export interface DailyTask {
  id: string
  type: TaskType
  title: string
  description: string
  reason: string
  xp: number
  coachId: string
  coachName: string
  coachTitle: string
  school: string
  division: string
  conference: string | null
  twitter?: string
  email?: string
  actionUrl: string
  actionType: 'twitter_dm' | 'email'
  actionLabel: string
}

export interface DailyPlanResponse {
  tasks: DailyTask[]
  completedCount: number
  totalCount: number
  totalXp: number
  earnedXp: number
  athleteXp: number
}

// Challenges & XP
export interface XPInfo {
  total: number
  level: number
  levelName: string
  xpInCurrentLevel: number
  xpToNextLevel: number
  xpPerLevel: number
}

export interface StreakInfo {
  current: number
  longest: number
  nextMilestone: { days: number; title: string; xpBonus: number; icon: string } | null
  lastEarnedMilestone: { days: number; title: string; xpBonus: number; icon: string } | null
  milestones: Array<{ days: number; title: string; xpBonus: number; icon: string }>
}

export interface Challenge {
  id: string
  title: string
  description: string
  progress: number
  targetCount: number
  xpReward: number
  completed: boolean
  expiresAt: string
}

export interface Badge {
  id: string
  name: string
  icon: string
  earnedAt: string
}

export interface ChallengesResponse {
  xp: XPInfo
  streak: StreakInfo
  dailyChallenges: Challenge[]
  weeklyChallenges: Challenge[]
  badges: Badge[]
}

// Recruiting Plan
export interface RecruitingPlan {
  id: string
  status: string
  cycleNumber: number
  projectedLevel: string | null
  currentWeek: number
  completedWeeks: number
  totalSchoolsTargeted: number
  schoolsContacted: number
  startDate: string
  endDate: string
  generatedForSeason: string | null
}

export interface PlanWeekSummary {
  weekNumber: number
  theme: string
  focusTitle: string
  focusDescription: string | null
  status: string
  tasksTotal: number
  tasksCompleted: number
  weeklyGoals: string | null
  targetSchoolCount: number
  weekStartDate: string | null
  weekEndDate: string | null
}

export interface PlanProgress {
  completedWeeks: number
  totalWeeks: number
  completedTasks: number
  totalTasks: number
  percentComplete: number
  currentWeekNumber: number
}

export interface PlanResponse {
  plan: RecruitingPlan | null
  weeks: PlanWeekSummary[]
  progress: PlanProgress
}

export interface PlanGenerateResponse {
  success: boolean
  planId: string
  plan: {
    id: string
    status: string
    cycleNumber: number
    projectedLevel: string | null
    currentWeek: number
    totalSchoolsTargeted: number
    startDate: string
    endDate: string
    weeks: Array<{
      weekNumber: number
      theme: string
      focusTitle: string
      status: string
    }>
  } | null
}

export interface PlanWeekDetail {
  week: PlanWeekSummary & {
    unlockedAt: string | null
    completedAt: string | null
    schoolsContacted: number
  }
  targetSchools: Array<{
    id: string
    name: string
    division: string
    state: string | null
  }>
  isLocked: boolean
  isActive: boolean
  isCompleted: boolean
}

// Settings
export interface UserSettings {
  notifyWeeklySummary: boolean
  notifyCoachResponse: boolean
  notifyChallengeReminders: boolean
  profileVisibility: boolean
  activitySharing: boolean
}

// Notifications
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

// Email Connection
export interface EmailConnection {
  id: string
  provider: 'GMAIL' | 'OUTLOOK'
  email: string
  isActive: boolean
  connectedAt: string
  lastUsedAt: string | null
  hasError: boolean
  errorMessage: string | null
  dailySendCount: number
}

export interface EmailConnectionStatus {
  connected: boolean
  connections: EmailConnection[]
  activeConnection: {
    id: string
    provider: 'GMAIL' | 'OUTLOOK'
    email: string
  } | null
}

// Email Campaigns
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type RecipientStatus = 'PENDING' | 'SENT' | 'FAILED' | 'BOUNCED'

export interface Campaign {
  id: string
  name: string | null
  subject: string
  status: CampaignStatus
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  totalRecipients: number
  sentCount: number
  failedCount: number
  openCount: number
  clickCount: number
  openRate: number
  clickRate: number
  createdAt: string
}

export interface CampaignRecipient {
  id: string
  status: RecipientStatus
  openCount: number
  clickCount: number
  openedAt: string | null
  sentAt: string | null
  failureReason: string | null
  coach: {
    id: string
    name: string
    school: string
    title: string
    division: Division | null
    email: string | null
  }
}

export interface CampaignDetail extends Campaign {
  body: string
  bodyHtml: string | null
  recipients: CampaignRecipient[]
  connection: {
    id: string
    email: string
    provider: 'GMAIL' | 'OUTLOOK'
  }
}

export interface CampaignTemplate {
  id: string
  name: string
  category: string
  description: string
  subject: string
  body: string
  mergeFieldsUsed: string[]
}

export interface MergeField {
  field: string
  description: string
}

export interface CampaignTemplatesResponse {
  templates: CampaignTemplate[]
  mergeFields: MergeField[]
  categories: Array<{
    id: string
    name: string
    description: string
  }>
}

export interface CreateCampaignParams {
  name?: string
  subject: string
  body: string
  bodyHtml?: string
  recipientCoachIds: string[]
  connectionId: string
}

export interface SendCampaignParams {
  action: 'send' | 'schedule' | 'resume' | 'retry'
  scheduledAt?: string
}

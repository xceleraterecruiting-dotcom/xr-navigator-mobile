import { create } from 'zustand'
import { api } from '@/lib/api'
import { storageHelpers } from '@/lib/storage'
import { identifyUser } from '@/lib/analytics'
import type { Athlete } from '@/types'

// Readiness Score types
interface ScoreFactor {
  name: string
  score: number
  weight: number
  tip: string
  current?: string
  target?: string
}

interface ReadinessScore {
  score: number
  trend: 'up' | 'down' | 'stable'
  factors: ScoreFactor[]
  cachedAt: string
}

// Next Best Move types
interface NextBestMoveCoach {
  id: string
  name: string
  school: string
  title: string | null
  division: string | null
}

interface NextBestMove {
  type: 'response' | 'follower' | 'hot_click' | 'click' | 'hot_open' | 'follow_up' | 'start'
  coach: NextBestMoveCoach | null
  savedCoachId?: string
  message: string
  actionLabel: string
  actionRoute: string
  priority: number
}

// Recruiting Funnel types
interface RecruitingFunnel {
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
}

interface AthleteState {
  athlete: Athlete | null
  isLoading: boolean
  error: string | null
  isCoachAccount: boolean
  needsOnboarding: boolean
  // Readiness Score
  readinessScore: ReadinessScore | null
  isLoadingScore: boolean
  scoreError: string | null
  // Next Best Move
  nextBestMove: NextBestMove | null
  isLoadingMove: boolean
  moveError: string | null
  // Recruiting Funnel
  funnel: RecruitingFunnel | null
  isLoadingFunnel: boolean
  funnelError: string | null
}

interface AthleteActions {
  fetchAthlete: () => Promise<void>
  updateProfile: (data: Partial<Athlete>) => Promise<void>
  clearAthlete: () => Promise<void>
  fetchReadinessScore: () => Promise<void>
  fetchNextBestMove: () => Promise<void>
  fetchRecruitingFunnel: () => Promise<void>
}

type AthleteStore = AthleteState & AthleteActions

export const useAthleteStore = create<AthleteStore>((set, get) => ({
  athlete: null,
  isLoading: false,
  error: null,
  isCoachAccount: false,
  needsOnboarding: false,
  // Readiness Score
  readinessScore: null,
  isLoadingScore: false,
  scoreError: null,
  // Next Best Move
  nextBestMove: null,
  isLoadingMove: false,
  moveError: null,
  // Recruiting Funnel
  funnel: null,
  isLoadingFunnel: false,
  funnelError: null,

  fetchAthlete: async () => {
    set({ isLoading: true, error: null })

    // Try cache first (but don't rely on it for identity verification)
    const cached = await storageHelpers.getAthleteCache()
    if (cached) {
      set({ athlete: cached })
    }

    const MAX_RETRIES = 2
    let lastError: any = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[DEBUG] fetchAthlete attempt ${attempt + 1}/${MAX_RETRIES + 1}`)

      try {
        const response = await api.getAthlete()
        console.log('[DEBUG] /api/athlete SUCCESS')
        console.log('[DEBUG] _debug:', JSON.stringify(response._debug, null, 2))
        console.log('[DEBUG] firstName:', response?.athlete?.firstName)

        const athlete = response.athlete
        set({ athlete, isLoading: false, needsOnboarding: false })
        await storageHelpers.setAthleteCache(athlete)
        identifyUser(athlete)
        return // Success - exit
      } catch (err: any) {
        console.log('[DEBUG] /api/athlete FAILED')
        console.log('[DEBUG] Status:', err?.status)
        console.log('[DEBUG] Response:', JSON.stringify(err?.data || err, null, 2))

        lastError = err
        if (attempt < MAX_RETRIES && err?.status !== 404) {
          console.log('[DEBUG] Retrying in 1s...')
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
      }
    }

    // All retries failed - show explicit error, NOT silent fallback to cached "Athlete"
    const is404 = lastError?.status === 404 || lastError?.message?.includes('not found')
    const message = lastError instanceof Error ? lastError.message : 'Failed to load profile'
    set({
      athlete: is404 ? null : cached, // Only use cache if non-404 error (preserve during network issues)
      error: is404 ? null : message,
      isLoading: false,
      needsOnboarding: is404,
    })
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const athlete = await api.updateProfile(data)
      set({ athlete, isLoading: false })
      await storageHelpers.setAthleteCache(athlete)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  clearAthlete: async () => {
    set({
      athlete: null,
      error: null,
      readinessScore: null,
      nextBestMove: null,
      funnel: null,
    })
    await storageHelpers.delete('athlete_cache')
  },

  fetchReadinessScore: async () => {
    set({ isLoadingScore: true, scoreError: null })
    try {
      console.log('[Dashboard] Fetching readiness score...')
      const score = await api.getReadinessScore()
      console.log('[Dashboard] Readiness score:', score?.score)
      set({ readinessScore: score, isLoadingScore: false })
    } catch (err: any) {
      console.error('[Dashboard] Readiness score error:', err)
      const message = err instanceof Error ? err.message : 'Failed to load score'
      set({ scoreError: message, isLoadingScore: false })
    }
  },

  fetchNextBestMove: async () => {
    set({ isLoadingMove: true, moveError: null })
    try {
      console.log('[Dashboard] Fetching next best move...')
      const move = await api.getNextBestMove()
      console.log('[Dashboard] Next move:', move?.type, move?.message?.slice(0, 50))
      set({ nextBestMove: move, isLoadingMove: false })
    } catch (err: any) {
      console.error('[Dashboard] Next best move error:', err)
      const message = err instanceof Error ? err.message : 'Failed to load next move'
      set({ moveError: message, isLoadingMove: false })
    }
  },

  fetchRecruitingFunnel: async () => {
    set({ isLoadingFunnel: true, funnelError: null })
    try {
      console.log('[Dashboard] Fetching recruiting funnel...')
      const funnel = await api.getRecruitingFunnel()
      console.log('[Dashboard] Funnel:', funnel?.contacted, 'contacted')
      set({ funnel, isLoadingFunnel: false })
    } catch (err: any) {
      console.error('[Dashboard] Funnel error:', err)
      const message = err instanceof Error ? err.message : 'Failed to load funnel'
      set({ funnelError: message, isLoadingFunnel: false })
    }
  },
}))

// Selectors
export const useAthlete = () => useAthleteStore((state) => state.athlete)
export const useIsPhenom = () => useAthleteStore((state) => state.athlete?.partner === 'phenom')
export const useAthleteLoading = () => useAthleteStore((state) => state.isLoading)
export const useIsCoachAccount = () => useAthleteStore((state) => state.isCoachAccount)
export const useNeedsOnboarding = () => useAthleteStore((state) => state.needsOnboarding)
// Readiness Score selectors
export const useReadinessScore = () => useAthleteStore((state) => state.readinessScore)
export const useReadinessScoreLoading = () => useAthleteStore((state) => state.isLoadingScore)
// Next Best Move selectors
export const useNextBestMove = () => useAthleteStore((state) => state.nextBestMove)
export const useNextBestMoveLoading = () => useAthleteStore((state) => state.isLoadingMove)
// Recruiting Funnel selectors
export const useRecruitingFunnel = () => useAthleteStore((state) => state.funnel)
export const useRecruitingFunnelLoading = () => useAthleteStore((state) => state.isLoadingFunnel)

import { create } from 'zustand'
import { api } from '@/lib/api'
import type {
  Campaign,
  CampaignDetail,
  CampaignTemplate,
  EmailConnectionStatus,
  CreateCampaignParams,
  SendCampaignParams,
} from '@/types'

interface AIGenerationResult {
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
}

interface CampaignState {
  campaigns: Campaign[]
  currentCampaign: CampaignDetail | null
  templates: CampaignTemplate[]
  emailStatus: EmailConnectionStatus | null
  isLoading: boolean
  isSending: boolean
  isGenerating: boolean
  aiGenerationResult: AIGenerationResult | null
  error: string | null
}

interface CampaignActions {
  fetchCampaigns: () => Promise<void>
  fetchCampaign: (id: string) => Promise<void>
  createCampaign: (data: CreateCampaignParams) => Promise<Campaign>
  updateCampaign: (id: string, data: Partial<CreateCampaignParams>) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  sendCampaign: (id: string, params: SendCampaignParams) => Promise<{ success: boolean; sentCount?: number }>
  generateAIEmails: (campaignId: string, templateCategory: string) => Promise<AIGenerationResult>
  fetchTemplates: () => Promise<void>
  fetchEmailStatus: () => Promise<void>
  disconnectEmail: (connectionId: string) => Promise<void>
  clearCurrentCampaign: () => void
  clearAIGenerationResult: () => void
  clearError: () => void
}

type CampaignStore = CampaignState & CampaignActions

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: [],
  currentCampaign: null,
  templates: [],
  emailStatus: null,
  isLoading: false,
  isSending: false,
  isGenerating: false,
  aiGenerationResult: null,
  error: null,

  fetchCampaigns: async () => {
    set({ isLoading: true, error: null })
    try {
      const { campaigns } = await api.getCampaigns()
      set({ campaigns, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaigns'
      set({ error: message, isLoading: false })
    }
  },

  fetchCampaign: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const { campaign } = await api.getCampaign(id)
      set({ currentCampaign: campaign, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaign'
      set({ error: message, isLoading: false })
    }
  },

  createCampaign: async (data: CreateCampaignParams) => {
    set({ isLoading: true, error: null })
    try {
      const { campaign } = await api.createCampaign(data)
      set((state) => ({
        campaigns: [campaign, ...state.campaigns],
        isLoading: false,
      }))
      return campaign
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  updateCampaign: async (id: string, data: Partial<CreateCampaignParams>) => {
    set({ isLoading: true, error: null })
    try {
      const { campaign } = await api.updateCampaign(id, data)
      set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? campaign : c)),
        currentCampaign: state.currentCampaign?.id === id
          ? { ...state.currentCampaign, ...campaign }
          : state.currentCampaign,
        isLoading: false,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update campaign'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  deleteCampaign: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.deleteCampaign(id)
      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        currentCampaign: state.currentCampaign?.id === id ? null : state.currentCampaign,
        isLoading: false,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete campaign'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  sendCampaign: async (id: string, params: SendCampaignParams) => {
    set({ isSending: true, error: null })
    try {
      const result = await api.sendCampaign(id, params)
      // Refresh campaign list to get updated status
      await get().fetchCampaigns()
      set({ isSending: false })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send campaign'
      set({ error: message, isSending: false })
      throw err
    }
  },

  generateAIEmails: async (campaignId: string, templateCategory: string) => {
    set({ isGenerating: true, error: null, aiGenerationResult: null })
    try {
      const result = await api.generateAIEmails(campaignId, templateCategory)
      const generationResult: AIGenerationResult = {
        stats: result.stats,
        samples: result.samples,
      }
      set({ isGenerating: false, aiGenerationResult: generationResult })
      return generationResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI emails'
      set({ error: message, isGenerating: false })
      throw err
    }
  },

  fetchTemplates: async () => {
    try {
      const { templates } = await api.getCampaignTemplates()
      set({ templates })
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  },

  fetchEmailStatus: async () => {
    try {
      const status = await api.getEmailStatus()
      set({ emailStatus: status })
    } catch (err) {
      console.error('Failed to fetch email status:', err)
    }
  },

  disconnectEmail: async (connectionId: string) => {
    try {
      await api.disconnectEmail(connectionId)
      await get().fetchEmailStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect email'
      set({ error: message })
      throw err
    }
  },

  clearCurrentCampaign: () => {
    set({ currentCampaign: null })
  },

  clearAIGenerationResult: () => {
    set({ aiGenerationResult: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))

// Selectors
export const useCampaigns = () => useCampaignStore((state) => state.campaigns)
export const useCurrentCampaign = () => useCampaignStore((state) => state.currentCampaign)
export const useCampaignTemplates = () => useCampaignStore((state) => state.templates)
export const useEmailStatus = () => useCampaignStore((state) => state.emailStatus)
export const useIsCampaignLoading = () => useCampaignStore((state) => state.isLoading)
export const useIsCampaignSending = () => useCampaignStore((state) => state.isSending)
export const useIsAIGenerating = () => useCampaignStore((state) => state.isGenerating)
export const useAIGenerationResult = () => useCampaignStore((state) => state.aiGenerationResult)

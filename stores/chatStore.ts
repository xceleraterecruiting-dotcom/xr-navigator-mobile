import { create } from 'zustand'
import { api } from '@/lib/api'
import { streamInsight, type StreamDonePayload } from '@/lib/sse'
import type { Message, Conversation } from '@/types'

interface ChatState {
  messages: Message[]
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  error: string | null
  pendingPrompt: string | null
}

interface ChatActions {
  sendMessage: (content: string) => Promise<void>
  fetchConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  startNewChat: () => void
  clearError: () => void
  setPendingPrompt: (prompt: string | null) => void
}

type ChatStore = ChatState & ChatActions

let cancelStream: (() => void) | null = null

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  error: null,
  pendingPrompt: null,

  setPendingPrompt: (prompt) => {
    set({ pendingPrompt: prompt })
  },

  sendMessage: async (content) => {
    // Cancel any existing stream
    if (cancelStream) {
      cancelStream()
      cancelStream = null
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      streamingContent: '',
      error: null,
    }))

    const allMessages = [...get().messages]

    try {
      cancelStream = await streamInsight(
        allMessages,
        // onChunk — append text (backend sends individual chunks, not cumulative)
        (text) => {
          set((state) => ({ streamingContent: state.streamingContent + text }))
        },
        // onDone
        (payload: StreamDonePayload) => {
          const streamedContent = get().streamingContent
          const assistantMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: streamedContent,
          }
          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isStreaming: false,
            streamingContent: '',
            // Store conversationId if backend sent it
            ...(payload.conversationId
              ? { currentConversationId: payload.conversationId }
              : {}),
          }))
          cancelStream = null

          // Refresh conversation list so new conversation shows up
          get().fetchConversations()
        },
        // onError
        (err) => {
          set({
            error: err.message,
            isStreaming: false,
            streamingContent: '',
          })
          cancelStream = null
        },
        // Pass conversationId for follow-up messages
        get().currentConversationId
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      set({ error: message, isStreaming: false })
    }
  },

  fetchConversations: async () => {
    set({ isLoading: true, error: null })
    try {
      const conversations = await api.getConversations()
      set({ conversations, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations'
      set({ error: message, isLoading: false })
    }
  },

  loadConversation: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const conversation = await api.getConversation(id)
      set({
        messages: conversation.messages,
        currentConversationId: id,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation'
      set({ error: message, isLoading: false })
    }
  },

  deleteConversation: async (id) => {
    try {
      await api.deleteConversation(id)
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        // Clear messages if deleting current conversation
        ...(state.currentConversationId === id
          ? { messages: [], currentConversationId: null }
          : {}),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation'
      set({ error: message })
    }
  },

  startNewChat: () => {
    // Cancel any existing stream
    if (cancelStream) {
      cancelStream()
      cancelStream = null
    }
    set({
      messages: [],
      currentConversationId: null,
      streamingContent: '',
      isStreaming: false,
      error: null,
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))

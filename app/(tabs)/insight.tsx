import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Markdown from 'react-native-markdown-display'
import * as Clipboard from 'expo-clipboard'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

import { useChatStore } from '@/stores/chatStore'
import { useAthleteStore } from '@/stores/athleteStore'
import { useSubscriptionStore, useUsage } from '@/stores/subscriptionStore'
import { useDrawerStore } from '@/stores/drawerStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { analytics } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { useNetworkStatus } from '@/lib/offline'
import { useToast } from '@/components/ui/Toast'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { LimitReachedModal } from '@/components/LimitReachedModal'
import { OfflineScreen } from '@/components/ui/OfflineBanner'
import { colors, spacing, fontSize, borderRadius, fontFamily, shadows } from '@/constants/theme'
import type { Message, Conversation } from '@/types'

const SUGGESTIONS = [
  { icon: 'locate-outline' as const, title: 'My Top 30 Schools', subtitle: 'Based on your profile', prompt: 'Build me a list of my top 30 schools to target based on my profile, including contact information for position coaches and what makes each school a good fit for me.' },
  { icon: 'mail-outline' as const, title: 'Write My First DM', subtitle: 'To a college coach', prompt: 'Help me write my first DM to a college coach. Make it professional but personal, and tell me exactly what to include and what to avoid.' },
  { icon: 'calendar-outline' as const, title: 'What To Do Now', subtitle: 'Next recruiting steps', prompt: 'Based on my grade and recruiting timeline, what should I be doing right now in the recruiting process? Give me a specific action plan for this week.' },
  { icon: 'share-social-outline' as const, title: 'Social Media Posts', subtitle: 'Boost visibility', prompt: 'Give me 5 social media post ideas that will get college coaches to notice me. Include specific templates I can use on Twitter/X.' },
]

// ── Bouncing dots typing indicator ──
function TypingIndicator() {
  const dot1Y = useSharedValue(0)
  const dot2Y = useSharedValue(0)
  const dot3Y = useSharedValue(0)

  useEffect(() => {
    const bounce = (delay: number) =>
      withRepeat(
        withDelay(
          delay,
          withSequence(
            withTiming(-6, { duration: 300, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) })
          )
        ),
        -1,
        false
      )
    dot1Y.value = bounce(0)
    dot2Y.value = bounce(150)
    dot3Y.value = bounce(300)
  }, [])

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1Y.value }] }))
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2Y.value }] }))
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3Y.value }] }))

  return (
    <View style={styles.typingContainer}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={14} color={colors.primary} />
      </View>
      <View style={styles.typingPill}>
        <Animated.View style={[styles.typingDot, dot1Style]} />
        <Animated.View style={[styles.typingDot, dot2Style]} />
        <Animated.View style={[styles.typingDot, dot3Style]} />
      </View>
    </View>
  )
}

// ── Conversation history bottom sheet content ──
function ConversationHistory({
  conversations,
  currentId,
  onSelect,
  onDelete,
  onNewChat,
}: {
  conversations: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNewChat: () => void
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <View style={histStyles.container}>
      <TouchableOpacity style={histStyles.newChatRow} onPress={onNewChat}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={histStyles.newChatText}>New Chat</Text>
      </TouchableOpacity>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              histStyles.convRow,
              item.id === currentId && histStyles.convRowActive,
            ]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <View style={histStyles.convContent}>
              <Text style={histStyles.convTitle} numberOfLines={1}>
                {item.title || 'New conversation'}
              </Text>
              <Text style={histStyles.convDate}>{formatDate(item.updatedAt)}</Text>
            </View>
            <TouchableOpacity
              style={histStyles.deleteBtn}
              onPress={() => onDelete(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={histStyles.emptyText}>No conversations yet</Text>
        }
        contentContainerStyle={histStyles.listContent}
      />
    </View>
  )
}

const histStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  newChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newChatText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  convRowActive: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  convContent: {
    flex: 1,
    gap: 2,
  },
  convTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  convDate: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
})

// ── AI message with copy button ──
function AssistantMessage({ content }: { content: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content)
    haptics.success()
    setCopied(true)
    toast.show('Copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.aiAvatarGlow}>
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        </View>
      </View>
      <View style={styles.assistantContent}>
        <Markdown style={markdownStyles}>{content}</Markdown>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={handleCopy}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={14}
            color={copied ? colors.success : colors.textDim}
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function InsightScreen() {
  const insets = useSafeAreaInsets()
  const { welcome } = useLocalSearchParams<{ welcome?: string }>()
  const { primaryColor } = usePartnerBranding()
  const openDrawer = useDrawerStore((s) => s.open)
  const athlete = useAthleteStore((s) => s.athlete)
  const flatListRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const toast = useToast()
  const welcomeHandled = useRef(false)

  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    pendingPrompt,
    sendMessage,
    startNewChat,
    clearError,
    setPendingPrompt,
    conversations,
    currentConversationId,
    fetchConversations,
    loadConversation,
    deleteConversation,
  } = useChatStore()

  const usage = useUsage()
  const fetchUsage = useSubscriptionStore((s) => s.fetchUsage)
  const [input, setInput] = useState('')
  const [inputHeight, setInputHeight] = useState(44)
  const [limitModal, setLimitModal] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    analytics.screenView('XR Insight')
    fetchUsage()
    fetchConversations()
  }, [])

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    })
    return () => showSub.remove()
  }, [])

  // Scroll when new messages arrive (NOT on every streaming chunk - that causes freeze)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  // Handle pending prompt from other screens
  useEffect(() => {
    if (pendingPrompt && pendingPrompt.length > 0 && !isStreaming) {
      const prompt = pendingPrompt
      setPendingPrompt(null)
      startNewChat()
      setTimeout(() => handleSend(prompt), 200)
    }
  }, [pendingPrompt])

  // Handle welcome param from onboarding completion
  useEffect(() => {
    if (welcome === 'true' && !welcomeHandled.current && !isStreaming) {
      welcomeHandled.current = true
      startNewChat()
      setTimeout(() => {
        handleSend('I just finished setting up my profile. What should I do first to start my recruiting journey?')
      }, 500)
    }
  }, [welcome])

  const handleSend = async (content?: string) => {
    const text = content || input.trim()
    if (!text || isStreaming) return

    setInput('')
    Keyboard.dismiss()
    haptics.light()

    try {
      await sendMessage(text)
      analytics.sendMessage(text.length, 'current')
      fetchUsage()
    } catch (err: any) {
      if (err?.code === 'DAILY_LIMIT') {
        setLimitModal(err.message)
      }
      haptics.error()
    }
  }

  const handleNewChat = () => {
    startNewChat()
    haptics.medium()
  }

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true })
    setShowScrollBtn(false)
  }

  const handleScroll = useCallback((e: any) => {
    const { contentSize, layoutMeasurement, contentOffset } = e.nativeEvent
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y
    setShowScrollBtn(distanceFromBottom > 300)
  }, [])

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user'

    if (isUser) {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubbleWrapper}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{item.content}</Text>
            </View>
          </View>
        </View>
      )
    }

    return <AssistantMessage content={item.content} />
  }, [])

  // Combine messages with streaming message (memoized to prevent unnecessary re-renders)
  const displayMessages = useMemo(() => {
    const msgs = [...messages]
    if (isStreaming && streamingContent) {
      msgs.push({
        id: 'streaming',
        role: 'assistant',
        content: streamingContent,
      })
    }
    return msgs
  }, [messages, isStreaming, streamingContent])

  const showEmptyState = messages.length === 0 && !isStreaming
  const aiLimit = usage?.aiMessages
  const { isConnected } = useNetworkStatus()

  // XR Insight requires internet connection
  if (!isConnected) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={styles.headerLeft}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.modelPill}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.modelText}>XR Insight</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <OfflineScreen
          title="No Connection"
          message="XR Insight needs an internet connection to provide personalized recruiting guidance."
        />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { openDrawer(); haptics.light() }} hitSlop={8} style={styles.headerLeft}>
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modelPill}
          onPress={messages.length > 0 ? handleNewChat : undefined}
          activeOpacity={messages.length > 0 ? 0.7 : 1}
        >
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.modelText}>XR Insight</Text>
          {messages.length > 0 && (
            <Ionicons name="chevron-down" size={12} color={colors.textDim} />
          )}
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {messages.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => {
                  fetchConversations()
                  setHistoryOpen(true)
                  haptics.light()
                }}
              >
                <Ionicons name="time-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={handleNewChat}>
                <Ionicons name="create-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── Error ── */}
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorDismiss}>Tap to dismiss</Text>
        </TouchableOpacity>
      )}

      {/* ── Empty State ── */}
      {showEmptyState ? (
        <Pressable style={styles.emptyState} onPress={Keyboard.dismiss}>
          <View style={styles.emptyCenter}>
            <View style={[styles.logoCircle, shadows.gold]}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={styles.greeting}>
              {athlete?.firstName ? `Hey ${athlete.firstName}` : 'Your Recruiting AI'}
            </Text>

            {/* Athlete stats card - like the website */}
            {athlete?.position && athlete?.height && athlete?.weight && (
              <View style={styles.athleteStatsCard}>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>
                    {Math.floor(athlete.height / 12)}'{athlete.height % 12}"
                  </Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>{athlete.weight} lbs</Text>
                </View>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionBadgeText}>{athlete.position}</Text>
                </View>
                {athlete?.gpa && (
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>{athlete.gpa.toFixed(2)} GPA</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.greetingSubtext}>
              {athlete?.position ? "I've analyzed your profile. What can I help with?" : 'Ask me anything about recruiting'}
            </Text>

            {aiLimit && aiLimit.limit !== -1 && (
              <View style={[styles.usagePill, aiLimit.atLimit && styles.usagePillLimit]}>
                <Text style={[styles.usageText, aiLimit.atLimit && styles.usageTextLimit]}>
                  {aiLimit.used} of {aiLimit.limit} messages today
                </Text>
              </View>
            )}
          </View>

          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionCard}
                onPress={() => handleSend(s.prompt)}
                activeOpacity={0.7}
              >
                <Ionicons name={s.icon} size={18} color={colors.primary} style={styles.suggestionIcon} />
                <Text style={styles.suggestionTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.suggestionSub} numberOfLines={1}>{s.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      ) : (
        /* ── Messages ── */
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={100}
          />

          {/* Scroll-to-bottom FAB */}
          {showScrollBtn && !isStreaming && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.scrollFab}
            >
              <TouchableOpacity
                style={styles.scrollFabBtn}
                onPress={scrollToBottom}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down" size={18} color={colors.primary} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}

      {/* ── Typing indicator ── */}
      {isStreaming && !streamingContent && <TypingIndicator />}

      {/* ── Input Area ── */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom || spacing.md }]}>
        <View style={styles.inputBox}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { height: Math.max(44, inputHeight) }]}
            placeholder="Message XR Insight..."
            placeholderTextColor={colors.textDim}
            multiline
            value={input}
            onChangeText={setInput}
            onContentSizeChange={(e) => {
              setInputHeight(Math.min(120, e.nativeEvent.contentSize.height))
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              input.trim() && !isStreaming && styles.sendBtnActive,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Ionicons name="stop" size={16} color={colors.textDim} />
            ) : (
              <Ionicons
                name="arrow-up"
                size={18}
                color={input.trim() ? colors.background : colors.textDim}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <LimitReachedModal
        message={limitModal || ''}
        visible={!!limitModal}
        onDismiss={() => setLimitModal(null)}
      />

      <BottomSheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        snapPoint={0.6}
        title="Conversations"
      >
        <ConversationHistory
          conversations={conversations}
          currentId={currentConversationId}
          onSelect={(id) => {
            loadConversation(id)
            setHistoryOpen(false)
            haptics.selection()
          }}
          onDelete={(id) => {
            deleteConversation(id)
            haptics.medium()
          }}
          onNewChat={() => {
            startNewChat()
            setHistoryOpen(false)
            haptics.medium()
          }}
        />
      </BottomSheet>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  modelText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  headerLeft: {
    position: 'absolute',
    left: spacing.lg,
    padding: spacing.sm,
  },
  headerRight: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerBtn: {
    padding: spacing.sm,
  },

  // ── Error ──
  errorBanner: {
    backgroundColor: `${colors.error}15`,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  errorDismiss: {
    color: colors.error,
    fontSize: fontSize.xs,
    opacity: 0.6,
    marginTop: 2,
  },

  // ── Empty State ──
  emptyState: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
  },
  emptyCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  greeting: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  athleteStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  statBadgeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  positionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  positionBadgeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  greetingSubtext: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  usagePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usagePillLimit: {
    backgroundColor: `${colors.error}15`,
    borderColor: `${colors.error}30`,
  },
  usageText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  usageTextLimit: {
    color: colors.error,
  },

  // ── Suggestions ──
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  suggestionCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  suggestionIcon: {
    marginBottom: spacing.xs,
  },
  suggestionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  suggestionSub: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },

  // ── Messages ──
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  // User message — right-aligned gradient bubble
  userRow: {
    alignItems: 'flex-end',
  },
  userBubbleWrapper: {
    maxWidth: '80%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  userBubble: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
  },
  userText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  // Assistant message
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  aiAvatarGlow: {
    marginTop: 2,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  assistantContent: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copyBtn: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginTop: 2,
  },

  // ── Typing indicator ──
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  typingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },

  // ── Scroll FAB ──
  scrollFab: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
  },
  scrollFabBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Input ──
  inputArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.text,
    paddingVertical: spacing.sm,
    maxHeight: 120,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
})

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: 24,
  },
  heading1: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  heading2: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  heading3: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontFamily: fontFamily.regular,
    marginBottom: spacing.sm,
  },
  list_item: {
    fontFamily: fontFamily.regular,
    marginBottom: spacing.xs,
  },
  bullet_list: {
    marginBottom: spacing.sm,
  },
  ordered_list: {
    marginBottom: spacing.sm,
  },
  code_inline: {
    backgroundColor: `${colors.text}10`,
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: fontSize.sm,
  },
  fence: {
    backgroundColor: colors.cardElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontFamily: fontFamily.regular,
    textDecorationLine: 'underline',
  },
  strong: {
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  em: {
    fontFamily: fontFamily.regular,
    fontStyle: 'italic',
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    marginVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    opacity: 0.9,
  },
})

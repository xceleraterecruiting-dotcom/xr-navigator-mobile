import React, { useState, useRef, useEffect } from 'react'
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
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Markdown from 'react-native-markdown-display'
import * as Haptics from 'expo-haptics'

import { useChatStore } from '@/stores/chatStore'
import { usePartnerBranding } from '@/hooks/usePartnerBranding'
import { analytics } from '@/lib/analytics'
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme'
import type { Message } from '@/types'

const SUGGESTED_PROMPTS = [
  'How do I write a recruiting email?',
  'What should I include in my highlight video?',
  'When should I start contacting coaches?',
  'How do I prepare for an official visit?',
  'What questions should I ask coaches?',
]

export default function InsightScreen() {
  const insets = useSafeAreaInsets()
  const { primaryColor } = usePartnerBranding()
  const flatListRef = useRef<FlatList>(null)

  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    startNewChat,
    clearError,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [inputHeight, setInputHeight] = useState(44)

  useEffect(() => {
    analytics.screenView('XR Insight')
  }, [])

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })
    return () => showSub.remove()
  }, [])

  // Scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 || streamingContent) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length, streamingContent])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const content = input.trim()
    setInput('')
    Keyboard.dismiss()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      await sendMessage(content)
      analytics.sendMessage(content.length, 'current')
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  const handlePromptPress = (prompt: string) => {
    setInput(prompt)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleNewChat = () => {
    startNewChat()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'

    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {isUser ? (
          <Text style={styles.messageText}>{item.content}</Text>
        ) : (
          <Markdown style={markdownStyles}>{item.content}</Markdown>
        )}
      </View>
    )
  }

  // Combine messages with streaming message
  const displayMessages = [...messages]
  if (isStreaming && streamingContent) {
    displayMessages.push({
      id: 'streaming',
      role: 'assistant',
      content: streamingContent,
    })
  }

  const showSuggestions = messages.length === 0 && !isStreaming

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>XR Insight</Text>
          <Text style={styles.subtitle}>Your AI recruiting advisor</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorDismiss}>Tap to dismiss</Text>
        </TouchableOpacity>
      )}

      {/* Suggested Prompts or Messages */}
      {showSuggestions ? (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Ask me anything about recruiting:</Text>
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionCard}
              onPress={() => handlePromptPress(prompt)}
            >
              <Text style={styles.suggestionText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Streaming Indicator */}
      {isStreaming && !streamingContent && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={styles.typingText}>XR Insight is thinking...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || spacing.md }]}>
        <TextInput
          style={[styles.input, { height: Math.max(44, inputHeight) }]}
          placeholder="Ask anything about recruiting..."
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
            styles.sendButton,
            (!input.trim() || isStreaming) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <Text style={[styles.sendIcon, { color: input.trim() ? primaryColor : colors.textDim }]}>
              ↑
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  newChatButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newChatText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: `${colors.error}20`,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  errorDismiss: {
    color: colors.error,
    fontSize: fontSize.xs,
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  suggestionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  suggestionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionText: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: fontSize.base,
    color: colors.background,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  typingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.text,
    marginRight: spacing.sm,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
})

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  heading1: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  heading2: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginBottom: spacing.sm,
  },
  list_item: {
    marginBottom: spacing.xs,
  },
  bullet_list: {
    marginBottom: spacing.sm,
  },
  code_inline: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fence: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  link: {
    color: colors.primary,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
})

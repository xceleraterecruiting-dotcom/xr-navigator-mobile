import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { haptics } from '@/lib/haptics'
import { analytics } from '@/lib/analytics'
import { useToast } from '@/components/ui/Toast'
import { useCampaignStore, useEmailStatus, useCampaignTemplates, useIsAIGenerating, useAIGenerationResult } from '@/stores/campaignStore'
import { useCoachesStore, useSavedCoaches } from '@/stores/coachesStore'
import { colors, spacing, fontSize, borderRadius, fontFamily, cardStyles, divisionColors } from '@/constants/theme'
import type { SavedCoach, CampaignTemplate, Division } from '@/types'

type AITemplateCategory = 'introduction' | 'highlight-drop' | 'camp-follow-up' | 'visit-request' | 'season-update' | 'follow-up'

const AI_TEMPLATE_CATEGORIES: { id: AITemplateCategory; name: string; description: string }[] = [
  { id: 'introduction', name: 'Introduction', description: 'First contact with coaches' },
  { id: 'highlight-drop', name: 'New Highlights', description: 'Share updated film' },
  { id: 'season-update', name: 'Season Update', description: 'Share recent performance' },
  { id: 'follow-up', name: 'Follow-Up', description: 'Check in after no response' },
  { id: 'camp-follow-up', name: 'Camp Thank You', description: 'After attending a camp' },
  { id: 'visit-request', name: 'Visit Request', description: 'Request campus visit' },
]

type Step = 'recipients' | 'template' | 'ai-preview' | 'compose' | 'review'

const STEPS: { key: Step; title: string }[] = [
  { key: 'recipients', title: 'Recipients' },
  { key: 'template', title: 'Template' },
  { key: 'review', title: 'Review' },
]

const STEPS_WITH_AI: { key: Step; title: string }[] = [
  { key: 'recipients', title: 'Recipients' },
  { key: 'template', title: 'Template' },
  { key: 'ai-preview', title: 'Preview' },
  { key: 'review', title: 'Review' },
]

const STEPS_MANUAL: { key: Step; title: string }[] = [
  { key: 'recipients', title: 'Recipients' },
  { key: 'template', title: 'Template' },
  { key: 'compose', title: 'Compose' },
  { key: 'review', title: 'Review' },
]

export default function NewCampaignScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const toast = useToast()

  const emailStatus = useEmailStatus()
  const templates = useCampaignTemplates()
  const savedCoaches = useSavedCoaches()
  const isGenerating = useIsAIGenerating()
  const aiGenerationResult = useAIGenerationResult()
  const fetchSavedCoaches = useCoachesStore((s) => s.fetchSavedCoaches)
  const fetchTemplates = useCampaignStore((s) => s.fetchTemplates)
  const createCampaign = useCampaignStore((s) => s.createCampaign)
  const sendCampaign = useCampaignStore((s) => s.sendCampaign)
  const generateAIEmails = useCampaignStore((s) => s.generateAIEmails)
  const clearAIGenerationResult = useCampaignStore((s) => s.clearAIGenerationResult)

  const [step, setStep] = useState<Step>('recipients')
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null)
  const [useAI, setUseAI] = useState(false)
  const [selectedAICategory, setSelectedAICategory] = useState<AITemplateCategory | null>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    analytics.screenView('NewCampaign')
    fetchSavedCoaches()
    fetchTemplates()
    clearAIGenerationResult()
  }, [])

  // Filter coaches with email
  const coachesWithEmail = savedCoaches.filter((sc) => sc.collegeCoach.email)

  // Determine which steps to show
  const activeSteps = useAI ? STEPS_WITH_AI : (selectedTemplate ? STEPS_MANUAL : STEPS)
  const currentStepIndex = activeSteps.findIndex((s) => s.key === step)

  const canProceed = useCallback(() => {
    switch (step) {
      case 'recipients':
        return selectedCoachIds.size > 0 && selectedCoachIds.size <= 50
      case 'template':
        return useAI ? !!selectedAICategory : true
      case 'ai-preview':
        return !!aiGenerationResult && aiGenerationResult.stats.generated > 0
      case 'compose':
        return subject.trim().length > 0 && body.trim().length > 0
      case 'review':
        return true
      default:
        return false
    }
  }, [step, selectedCoachIds.size, subject, body, useAI, selectedAICategory, aiGenerationResult])

  const handleNext = async () => {
    if (!canProceed()) return
    haptics.light()

    // Special handling for AI flow - trigger generation when moving from template to preview
    if (step === 'template' && useAI && selectedAICategory) {
      await handleAIGenerate()
      return
    }

    const nextIndex = currentStepIndex + 1
    if (nextIndex < activeSteps.length) {
      setStep(activeSteps[nextIndex].key)
    }
  }

  const handleAIGenerate = async () => {
    if (!emailStatus?.activeConnection || !selectedAICategory) return

    setIsCreating(true)
    haptics.medium()

    try {
      // First create the campaign
      const campaign = await createCampaign({
        name: campaignName || `AI Campaign - ${new Date().toLocaleDateString()}`,
        subject: 'AI Generated', // Placeholder, will be replaced by AI
        body: 'AI Generated', // Placeholder, will be replaced by AI
        recipientCoachIds: Array.from(selectedCoachIds),
        connectionId: emailStatus.activeConnection.id,
      })

      setCreatedCampaignId(campaign.id)

      // Then generate AI emails
      await generateAIEmails(campaign.id, selectedAICategory)

      analytics.track('ai_emails_generated', {
        recipientCount: selectedCoachIds.size,
        templateCategory: selectedAICategory,
      })

      setStep('ai-preview')
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Failed to generate AI emails', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleBack = () => {
    haptics.light()
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(activeSteps[prevIndex].key)
    } else {
      router.back()
    }
  }

  const toggleCoach = (coachId: string) => {
    haptics.selection()
    setSelectedCoachIds((prev) => {
      const next = new Set(prev)
      if (next.has(coachId)) {
        next.delete(coachId)
      } else if (next.size < 50) {
        next.add(coachId)
      } else {
        toast.show('Maximum 50 coaches per campaign', 'error')
      }
      return next
    })
  }

  const selectTemplate = (template: CampaignTemplate) => {
    haptics.medium()
    setSelectedTemplate(template)
    setSubject(template.subject)
    setBody(template.body)
    setStep('compose')
  }

  const skipTemplate = () => {
    haptics.light()
    setStep('compose')
  }

  const handleSend = async () => {
    if (!emailStatus?.activeConnection) {
      toast.show('No email connection', 'error')
      return
    }

    haptics.medium()

    // For AI flow, campaign is already created
    if (useAI && createdCampaignId) {
      setIsSending(true)
      try {
        const result = await sendCampaign(createdCampaignId, { action: 'send' })

        if (result.success) {
          toast.show(`Campaign sent to ${result.sentCount} coaches`, 'success')
          analytics.track('ai_campaign_sent', {
            sentCount: result.sentCount,
            templateCategory: selectedAICategory,
          })
        } else {
          toast.show('Some emails failed to send', 'error')
        }

        router.replace(`/campaign/${createdCampaignId}` as any)
      } catch (error) {
        toast.show(error instanceof Error ? error.message : 'Failed to send campaign', 'error')
      } finally {
        setIsSending(false)
      }
      return
    }

    // Manual flow - create then send
    setIsCreating(true)

    try {
      // Create campaign
      const campaign = await createCampaign({
        name: campaignName || undefined,
        subject,
        body,
        recipientCoachIds: Array.from(selectedCoachIds),
        connectionId: emailStatus.activeConnection.id,
      })

      analytics.track('campaign_created', {
        recipientCount: selectedCoachIds.size,
        hasTemplate: !!selectedTemplate,
      })

      // Send immediately
      setIsSending(true)
      const result = await sendCampaign(campaign.id, { action: 'send' })

      if (result.success) {
        toast.show(`Campaign sent to ${result.sentCount} coaches`, 'success')
        analytics.track('campaign_sent', {
          sentCount: result.sentCount,
        })
      } else {
        toast.show('Some emails failed to send', 'error')
      }

      router.replace(`/campaign/${campaign.id}` as any)
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Failed to send campaign', 'error')
    } finally {
      setIsCreating(false)
      setIsSending(false)
    }
  }

  const renderRecipients = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepDescription}>
        Select up to 50 coaches to include in this campaign. Only coaches with email addresses are shown.
      </Text>

      {coachesWithEmail.length === 0 ? (
        <View style={styles.emptyCoaches}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No saved coaches with email addresses</Text>
          <TouchableOpacity
            style={styles.addCoachBtn}
            onPress={() => router.push('/(tabs)/coaches')}
          >
            <Text style={styles.addCoachBtnText}>Find Coaches</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionCount}>
              {selectedCoachIds.size} / 50 selected
            </Text>
            {selectedCoachIds.size > 0 && (
              <TouchableOpacity onPress={() => setSelectedCoachIds(new Set())}>
                <Text style={styles.clearBtn}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {coachesWithEmail.map((sc) => (
            <TouchableOpacity
              key={sc.id}
              style={[
                styles.coachRow,
                selectedCoachIds.has(sc.collegeCoach.id) && styles.coachRowSelected,
              ]}
              onPress={() => toggleCoach(sc.collegeCoach.id)}
              activeOpacity={0.7}
            >
              <View style={styles.checkbox}>
                {selectedCoachIds.has(sc.collegeCoach.id) && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{sc.collegeCoach.name}</Text>
                <Text style={styles.coachSchool}>
                  {sc.collegeCoach.title} • {sc.collegeCoach.school}
                </Text>
              </View>
              {sc.collegeCoach.division && (
                <View
                  style={[
                    styles.divisionBadge,
                    {
                      backgroundColor:
                        divisionColors[sc.collegeCoach.division]?.bg || colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.divisionText,
                      {
                        color:
                          divisionColors[sc.collegeCoach.division]?.text || colors.textMuted,
                      },
                    ]}
                  >
                    {sc.collegeCoach.division.replace('_', ' ')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  )

  const renderTemplates = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepDescription}>
        Choose how to create your emails.
      </Text>

      {/* AI Option */}
      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Text style={styles.sectionHeaderText}>AI Personalized</Text>
        <View style={styles.aiFreeBadge}>
          <Text style={styles.aiFreeBadgeText}>FREE</Text>
        </View>
      </View>

      <Text style={styles.aiDescription}>
        AI generates a unique, personalized email for each coach based on your profile and the XR Method. No two emails are alike.
      </Text>

      {AI_TEMPLATE_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            cardStyles.base,
            styles.aiCategoryCard,
            selectedAICategory === cat.id && useAI && styles.aiCategoryCardSelected,
          ]}
          onPress={() => {
            haptics.selection()
            setUseAI(true)
            setSelectedAICategory(cat.id)
            setSelectedTemplate(null)
          }}
          activeOpacity={0.7}
        >
          <View style={styles.aiCategoryCheck}>
            {selectedAICategory === cat.id && useAI && (
              <Ionicons name="checkmark" size={16} color={colors.primary} />
            )}
          </View>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{cat.name}</Text>
            <Text style={styles.templateDesc}>{cat.description}</Text>
          </View>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      ))}

      {/* Manual Templates */}
      <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
        <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.sectionHeaderText, { color: colors.textMuted }]}>Manual Templates</Text>
      </View>

      <TouchableOpacity
        style={[cardStyles.base, styles.templateCard, styles.skipCard]}
        onPress={() => {
          setUseAI(false)
          setSelectedAICategory(null)
          skipTemplate()
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="create-outline" size={24} color={colors.textMuted} />
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>Start from Scratch</Text>
          <Text style={styles.templateDesc}>Write your own custom email</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {templates.map((template) => (
        <TouchableOpacity
          key={template.id}
          style={[cardStyles.base, styles.templateCard]}
          onPress={() => {
            setUseAI(false)
            setSelectedAICategory(null)
            selectTemplate(template)
          }}
          activeOpacity={0.7}
        >
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateDesc}>{template.description}</Text>
            <View style={styles.templateCategory}>
              <Text style={styles.categoryText}>{template.category}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  const renderAIPreview = () => {
    if (isGenerating || isCreating) {
      return (
        <View style={styles.generatingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>Generating Personalized Emails</Text>
          <Text style={styles.generatingText}>
            AI is crafting unique emails for each of your {selectedCoachIds.size} coaches...
          </Text>
        </View>
      )
    }

    if (!aiGenerationResult) {
      return (
        <View style={styles.generatingState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.generatingTitle}>Generation Failed</Text>
          <Text style={styles.generatingText}>
            Unable to generate personalized emails. Please try again.
          </Text>
        </View>
      )
    }

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={[cardStyles.base, styles.aiStatsCard]}>
          <View style={styles.aiStatRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.aiStatText}>
              {aiGenerationResult.stats.generated} emails generated
            </Text>
          </View>
          {aiGenerationResult.stats.failed > 0 && (
            <View style={styles.aiStatRow}>
              <Ionicons name="alert-circle" size={20} color={colors.warning} />
              <Text style={styles.aiStatText}>
                {aiGenerationResult.stats.failed} will use template fallback
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.previewLabel}>Sample Previews</Text>
        <Text style={styles.stepDescription}>
          Here are samples from different division tiers. Each coach gets a unique email.
        </Text>

        {aiGenerationResult.samples.map((sample, index) => (
          <View key={sample.recipientId} style={[cardStyles.base, styles.sampleCard]}>
            <View style={styles.sampleHeader}>
              <Text style={styles.sampleCoach}>{sample.coachName}</Text>
              <Text style={styles.sampleSchool}>{sample.school}</Text>
              <View style={styles.sampleDivision}>
                <Text style={styles.sampleDivisionText}>{sample.division.replace('_', ' ')}</Text>
              </View>
            </View>
            <View style={styles.sampleContent}>
              <Text style={styles.sampleSubject}>{sample.subject}</Text>
              <Text style={styles.sampleBody}>{sample.body}</Text>
            </View>
            <View style={styles.sampleFooter}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.confidenceText}>
                {sample.confidenceScore}% confidence
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    )
  }

  const renderCompose = () => (
    <KeyboardAvoidingView
      style={styles.stepContent}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.inputLabel}>Campaign Name (optional)</Text>
        <TextInput
          style={styles.input}
          value={campaignName}
          onChangeText={setCampaignName}
          placeholder="e.g., January Introduction"
          placeholderTextColor={colors.textDim}
        />

        <Text style={styles.inputLabel}>Subject Line</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Enter subject line"
          placeholderTextColor={colors.textDim}
        />

        <Text style={styles.inputLabel}>Email Body</Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          value={body}
          onChangeText={setBody}
          placeholder="Write your email..."
          placeholderTextColor={colors.textDim}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.mergeFieldHint}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.hintText}>
            Use merge fields like {'{{coachFirstName}}'}, {'{{schoolName}}'}, {'{{athleteName}}'} for personalization.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )

  const renderReview = () => {
    const selectedCoaches = savedCoaches.filter((sc) =>
      selectedCoachIds.has(sc.collegeCoach.id)
    )

    return (
      <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
        <View style={[cardStyles.base, styles.reviewCard]}>
          <Text style={styles.reviewLabel}>Recipients</Text>
          <Text style={styles.reviewValue}>{selectedCoachIds.size} coaches</Text>
        </View>

        {useAI ? (
          <View style={[cardStyles.base, styles.reviewCard]}>
            <Text style={styles.reviewLabel}>Email Type</Text>
            <View style={styles.aiReviewRow}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.reviewValue}>AI Personalized ({selectedAICategory})</Text>
            </View>
            <Text style={styles.aiReviewNote}>
              Each coach receives a unique, personalized email
            </Text>
          </View>
        ) : (
          <>
            <View style={[cardStyles.base, styles.reviewCard]}>
              <Text style={styles.reviewLabel}>Subject</Text>
              <Text style={styles.reviewValue}>{subject}</Text>
            </View>

            <Text style={styles.previewLabel}>Preview</Text>
            <View style={[cardStyles.base, styles.previewCard]}>
              <Text style={styles.previewBody}>{body}</Text>
            </View>
          </>
        )}

        <View style={[cardStyles.base, styles.reviewCard]}>
          <Text style={styles.reviewLabel}>From</Text>
          <Text style={styles.reviewValue}>
            {emailStatus?.activeConnection?.email || 'Not connected'}
          </Text>
        </View>

        <Text style={styles.recipientListLabel}>
          Recipients ({selectedCoaches.length})
        </Text>
        {selectedCoaches.slice(0, 5).map((sc) => (
          <View key={sc.id} style={styles.recipientRow}>
            <Text style={styles.recipientName}>{sc.collegeCoach.name}</Text>
            <Text style={styles.recipientSchool}>{sc.collegeCoach.school}</Text>
          </View>
        ))}
        {selectedCoaches.length > 5 && (
          <Text style={styles.moreRecipients}>
            +{selectedCoaches.length - 5} more coaches
          </Text>
        )}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Campaign</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        {activeSteps.map((s, i) => (
          <View key={s.key} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                i <= currentStepIndex && styles.progressDotActive,
              ]}
            >
              {i < currentStepIndex && (
                <Ionicons name="checkmark" size={12} color={colors.background} />
              )}
            </View>
            <Text
              style={[
                styles.progressLabel,
                i === currentStepIndex && styles.progressLabelActive,
              ]}
            >
              {s.title}
            </Text>
          </View>
        ))}
      </View>

      {/* Step Content */}
      {step === 'recipients' && renderRecipients()}
      {step === 'template' && renderTemplates()}
      {step === 'ai-preview' && renderAIPreview()}
      {step === 'compose' && renderCompose()}
      {step === 'review' && renderReview()}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step === 'review' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, (isCreating || isSending) && styles.btnDisabled]}
            onPress={handleSend}
            disabled={isCreating || isSending}
            activeOpacity={0.8}
          >
            {isCreating || isSending ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.background} />
                <Text style={styles.primaryBtnText}>Send Campaign</Text>
              </>
            )}
          </TouchableOpacity>
        ) : step === 'ai-preview' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, !canProceed() && styles.btnDisabled]}
            onPress={handleNext}
            disabled={!canProceed() || isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Approve & Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        ) : step === 'template' && useAI && selectedAICategory ? (
          <TouchableOpacity
            style={[styles.primaryBtn, (isCreating || isGenerating) && styles.btnDisabled]}
            onPress={handleNext}
            disabled={isCreating || isGenerating}
            activeOpacity={0.8}
          >
            {isCreating || isGenerating ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={colors.background} />
                <Text style={styles.primaryBtnText}>Generate AI Emails</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, !canProceed() && styles.btnDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  backBtn: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textDim,
  },
  progressLabelActive: {
    color: colors.primary,
  },
  stepContent: {
    flex: 1,
    padding: spacing.md,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectionCount: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  clearBtn: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.error,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  coachRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  coachSchool: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  divisionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  divisionText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
  },
  emptyCoaches: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addCoachBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  addCoachBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  skipCard: {
    borderStyle: 'dashed',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  templateDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  templateCategory: {
    marginTop: spacing.xs,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.text,
  },
  bodyInput: {
    minHeight: 200,
  },
  mergeFieldHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
  },
  hintText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 18,
  },
  reviewCard: {
    marginBottom: spacing.sm,
  },
  reviewLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  reviewValue: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  previewLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  previewCard: {
    marginBottom: spacing.lg,
  },
  previewBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  recipientListLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recipientName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  recipientSchool: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  moreRecipients: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  primaryBtnText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  // AI Template Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiFreeBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
  },
  aiFreeBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
    color: colors.success,
  },
  aiDescription: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  aiCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  aiCategoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  aiCategoryCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // AI Preview Styles
  generatingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  generatingTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  generatingText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  aiStatsCard: {
    marginBottom: spacing.md,
  },
  aiStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiStatText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    color: colors.text,
  },
  sampleCard: {
    marginBottom: spacing.md,
  },
  sampleHeader: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sampleCoach: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  sampleSchool: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  sampleDivision: {
    marginTop: spacing.xs,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  sampleDivisionText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textMuted,
  },
  sampleContent: {
    marginBottom: spacing.sm,
  },
  sampleSubject: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  sampleBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sampleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  // AI Review Styles
  aiReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiReviewNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})

/**
 * BootcampSchoolCard Component
 *
 * Displays a school with expandable coach list:
 * - Collapsed: School logo, name, division, contacted count
 * - Expanded: List of 4 coaches with email buttons
 *
 * Per XR Method Module 4, coaches are shown in priority order:
 * 1. Position coach
 * 2. Recruiting coordinator/director
 * 3. Area recruiter
 * 4. Side of ball coordinator
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInRight } from 'react-native-reanimated'
import { colors, fontFamily, spacing, borderRadius, fontSize } from '@/constants/theme'
import { haptics } from '@/lib/haptics'
import { SchoolLogo } from '@/components/ui/SchoolLogo'
import type { BootcampTargetSchool } from '@/lib/api'

// Division badge colors
const DIVISION_COLORS: Record<string, { bg: string; text: string }> = {
  D1_FBS_P4: { bg: 'rgba(212,168,87,0.2)', text: colors.primary },
  D1_FBS_G5: { bg: 'rgba(34,197,94,0.2)', text: '#22C55E' },
  D1_FCS: { bg: 'rgba(59,130,246,0.2)', text: '#3B82F6' },
  D2: { bg: 'rgba(139,156,173,0.2)', text: colors.textMuted },
  D3: { bg: 'rgba(139,156,173,0.2)', text: colors.textMuted },
  NAIA: { bg: 'rgba(139,156,173,0.2)', text: colors.textMuted },
  JUCO: { bg: 'rgba(139,156,173,0.2)', text: colors.textMuted },
}

interface BootcampSchoolCardProps {
  school: {
    id: string
    name: string
    division: string
    conference: string | null
    state: string | null
    matchScore: number
    reasons: string[]
  }
  coaches: (BootcampTargetSchool & { contacted?: boolean })[]
  isExpanded: boolean
  onToggle: () => void
  onEmailCoach: (coach: BootcampTargetSchool) => void
  index?: number
}

export function BootcampSchoolCard({
  school,
  coaches,
  isExpanded,
  onToggle,
  onEmailCoach,
  index = 0,
}: BootcampSchoolCardProps) {
  const divisionColor = DIVISION_COLORS[school.division] || DIVISION_COLORS.D2

  // Count contacted coaches
  const contactedCount = coaches.filter(c => c.contacted).length
  const totalCoaches = coaches.length
  const allContacted = contactedCount === totalCoaches && totalCoaches > 0

  const handleToggle = () => {
    haptics.light()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onToggle()
  }

  const handleEmailCoach = (coach: BootcampTargetSchool) => {
    haptics.medium()
    onEmailCoach(coach)
  }

  // Format division for display
  const formatDivision = (div: string) => {
    return div.replace(/_/g, ' ').replace('FBS', 'FBS').replace('FCS', 'FCS')
  }

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).duration(300)}>
      <View style={[styles.card, allContacted && styles.cardContacted]}>
        {/* School header - always visible */}
        <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
          <View style={styles.header}>
            {/* School logo */}
            <SchoolLogo schoolName={school.name} size={52} />

            {/* School info */}
            <View style={styles.info}>
              <Text style={styles.schoolName} numberOfLines={1}>
                {school.name}
              </Text>
              <View style={styles.metaRow}>
                {school.conference && (
                  <Text style={styles.conference} numberOfLines={1}>
                    {school.conference}
                  </Text>
                )}
                <View style={[styles.divisionBadge, { backgroundColor: divisionColor.bg }]}>
                  <Text style={[styles.divisionText, { color: divisionColor.text }]}>
                    {formatDivision(school.division)}
                  </Text>
                </View>
              </View>
              {/* Contacted progress */}
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(contactedCount / Math.max(totalCoaches, 1)) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {contactedCount}/{totalCoaches} contacted
                </Text>
              </View>
            </View>

            {/* Expand/collapse button */}
            <View style={styles.expandBtn}>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded: Coach list */}
        {isExpanded && (
          <View style={styles.coachList}>
            {coaches.map((coach, idx) => (
              <View
                key={coach.coachId || `coach-${idx}`}
                style={[styles.coachRow, idx === 0 && styles.coachRowFirst]}
              >
                <View style={styles.coachInfo}>
                  {/* Contacted indicator */}
                  {coach.contacted ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  ) : (
                    <View style={styles.uncontactedDot} />
                  )}
                  <View style={styles.coachText}>
                    <Text style={styles.coachName} numberOfLines={1}>
                      {coach.coachName || 'Coach'}
                    </Text>
                    <Text style={styles.coachTitle} numberOfLines={1}>
                      {coach.coachTitle || 'Coach'}
                    </Text>
                  </View>
                </View>

                {/* Email button */}
                <TouchableOpacity
                  style={[styles.emailBtn, coach.contacted && styles.emailBtnContacted]}
                  onPress={() => handleEmailCoach(coach)}
                >
                  <Ionicons
                    name={coach.contacted ? 'mail-open' : 'mail'}
                    size={16}
                    color={coach.contacted ? colors.textMuted : colors.background}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Fit reason (collapsed only) */}
        {!isExpanded && school.reasons && school.reasons.length > 0 && (
          <View style={styles.fitSection}>
            <View style={styles.fitHeader}>
              <Ionicons name="sparkles" size={11} color={colors.primary} />
              <Text style={styles.fitLabel}>Match</Text>
            </View>
            <Text style={styles.fitText} numberOfLines={1}>
              {school.reasons[0]}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardContacted: {
    backgroundColor: `${colors.success}05`,
    borderColor: `${colors.success}20`,
  },

  // Header (collapsed view)
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    paddingTop: 2,
  },
  schoolName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.text,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  conference: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  divisionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  divisionText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.3,
  },

  // Progress bar
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    minWidth: 80,
    textAlign: 'right',
  },

  // Expand button
  expandBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },

  // Coach list (expanded)
  coachList: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  coachRowFirst: {
    borderTopWidth: 0,
    paddingTop: spacing.md,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  uncontactedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  coachText: {
    flex: 1,
  },
  coachName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: colors.text,
  },
  coachTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Email button
  emailBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnContacted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Fit reason (collapsed)
  fitSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fitLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  fitText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
})

export default BootcampSchoolCard

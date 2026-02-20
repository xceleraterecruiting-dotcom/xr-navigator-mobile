/**
 * BootcampCoachCard Component
 *
 * Displays a coach to contact during bootcamp with:
 * - School logo and division badge
 * - Coach name and title
 * - Contacted status indicator
 * - Action button (email)
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
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

interface BootcampCoachCardProps {
  coach: BootcampTargetSchool & { contacted?: boolean }
  onEmail: () => void
  onViewProfile?: () => void
  index?: number
}

export function BootcampCoachCard({
  coach,
  onEmail,
  onViewProfile,
  index = 0,
}: BootcampCoachCardProps) {
  const divisionColor = DIVISION_COLORS[coach.division] || DIVISION_COLORS.D2
  const isContacted = coach.contacted

  const handleEmail = () => {
    haptics.medium()
    onEmail()
  }

  const handleView = () => {
    haptics.light()
    onViewProfile?.()
  }

  // Format division for display
  const formatDivision = (div: string) => {
    return div.replace(/_/g, ' ').replace('FBS', 'FBS').replace('FCS', 'FCS')
  }

  // Get fit reason from reasons array
  const fitReason = coach.reasons && coach.reasons.length > 0 ? coach.reasons[0] : null

  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(300)}>
      <View style={[styles.card, isContacted && styles.cardContacted]}>
        {/* Contacted badge */}
        {isContacted && (
          <View style={styles.contactedBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={styles.contactedText}>Contacted</Text>
          </View>
        )}

        {/* Top row: Logo, info, actions */}
        <View style={styles.topRow}>
          {/* School logo */}
          <TouchableOpacity onPress={handleView} style={styles.logoWrap}>
            <SchoolLogo schoolName={coach.name} size={48} />
          </TouchableOpacity>

          {/* Coach info */}
          <View style={styles.info}>
            <Text style={styles.coachName} numberOfLines={1}>
              {coach.coachName || 'Position Coach'}
            </Text>
            <Text style={styles.coachTitle} numberOfLines={1}>
              {coach.coachTitle || 'Position Coach'}
            </Text>
            <View style={styles.schoolRow}>
              <Text style={styles.schoolName} numberOfLines={1}>
                {coach.name}
              </Text>
              <View style={[styles.divisionBadge, { backgroundColor: divisionColor.bg }]}>
                <Text style={[styles.divisionText, { color: divisionColor.text }]}>
                  {formatDivision(coach.division)}
                </Text>
              </View>
            </View>
          </View>

          {/* Email button */}
          <TouchableOpacity
            style={[styles.emailBtn, isContacted && styles.emailBtnContacted]}
            onPress={handleEmail}
          >
            <Ionicons
              name={isContacted ? 'mail-open' : 'mail'}
              size={18}
              color={isContacted ? colors.textMuted : colors.background}
            />
          </TouchableOpacity>
        </View>

        {/* Why good fit (if available) */}
        {fitReason && (
          <View style={styles.fitSection}>
            <View style={styles.fitHeader}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={styles.fitLabel}>Why they're a fit</Text>
            </View>
            <Text style={styles.fitText} numberOfLines={2}>
              {fitReason}
            </Text>
          </View>
        )}

        {/* Conference */}
        {coach.conference && (
          <Text style={styles.conference}>{coach.conference}</Text>
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

  // Contacted badge
  contactedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  contactedText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.success,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  logoWrap: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },

  // Info
  info: {
    flex: 1,
    paddingTop: 2,
  },
  coachName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: 2,
  },
  coachTitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  schoolName: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
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

  // Email button
  emailBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnContacted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Why good fit
  fitSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  fitLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  fitText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Conference
  conference: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
})

export default BootcampCoachCard

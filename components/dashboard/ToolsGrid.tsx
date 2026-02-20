/**
 * ToolsGrid Component
 *
 * Dashboard tools section showing quick action buttons.
 * [Insight] [Outreach]
 * [Profile] [Share Card]
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { colors, spacing, borderRadius, fontFamily, fontSize } from '@/constants/theme'
import { analytics } from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Tool {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
  color?: string
  badge?: string
}

interface ToolsGridProps {
  /** Show streak badge on certain tools */
  streakCount?: number
  /** Custom tools (override defaults) */
  tools?: Tool[]
  /** Handler for tool tap (in addition to navigation) */
  onToolPress?: (toolId: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Tools
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TOOLS: Tool[] = [
  {
    id: 'insight',
    label: 'XR Insight',
    icon: 'sparkles',
    route: '/(tabs)/insight',
    color: colors.accent,
  },
  {
    id: 'outreach',
    label: 'Outreach',
    icon: 'mail-outline',
    route: '/(tabs)/campaigns',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    route: '/(tabs)/profile',
  },
  {
    id: 'recruit',
    label: 'Share Card',
    icon: 'share-outline',
    route: '/(tabs)/recruit',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tool Button Component
// ─────────────────────────────────────────────────────────────────────────────

function ToolButton({
  tool,
  index,
  onPress,
}: {
  tool: Tool
  index: number
  onPress: () => void
}) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 })
  }

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 })
  }

  const iconColor = tool.color || colors.textSecondary

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(300)}
      style={[styles.toolWrapper, animatedStyle]}
    >
      <TouchableOpacity
        style={styles.toolButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityLabel={tool.label}
        accessibilityRole="button"
      >
        <View style={[styles.iconContainer, tool.color && { backgroundColor: `${tool.color}15` }]}>
          <Ionicons name={tool.icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.toolLabel}>{tool.label}</Text>
        {tool.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tool.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ToolsGrid({ streakCount, tools, onToolPress }: ToolsGridProps) {
  const router = useRouter()

  // Use custom tools or defaults
  const displayTools = tools || DEFAULT_TOOLS.map((tool) => {
    // Add streak badge to insight tool
    if (tool.id === 'insight' && streakCount && streakCount > 0) {
      return { ...tool, badge: `${streakCount}` }
    }
    return tool
  })

  const handleToolPress = (tool: Tool) => {
    // Track analytics
    analytics.track('dashboard_cta_tapped', { cta_type: tool.id })

    // Custom handler
    onToolPress?.(tool.id)

    // Navigate
    router.push(tool.route as any)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>TOOLS</Text>
      <View style={styles.grid}>
        {displayTools.map((tool, index) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            index={index}
            onPress={() => handleToolPress(tool)}
          />
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Variant (inline row)
// ─────────────────────────────────────────────────────────────────────────────

export function ToolsRow({ tools, onToolPress }: Omit<ToolsGridProps, 'streakCount'>) {
  const router = useRouter()
  const displayTools = tools || DEFAULT_TOOLS

  const handleToolPress = (tool: Tool) => {
    analytics.track('dashboard_cta_tapped', { cta_type: tool.id })
    onToolPress?.(tool.id)
    router.push(tool.route as any)
  }

  return (
    <View style={styles.row}>
      {displayTools.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={styles.rowButton}
          onPress={() => handleToolPress(tool)}
          activeOpacity={0.7}
          accessibilityLabel={tool.label}
          accessibilityRole="button"
        >
          <Ionicons
            name={tool.icon}
            size={18}
            color={tool.color || colors.textSecondary}
          />
          <Text style={styles.rowLabel}>{tool.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toolWrapper: {
    width: '48%',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    color: colors.background,
  },

  // Row variant
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  rowButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
})

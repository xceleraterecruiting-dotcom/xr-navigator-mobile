import { ViewStyle } from 'react-native'

// World-class spec colors
export const colors = {
  // Surface hierarchy (dark to light)
  void: '#06060A',           // Deepest background
  base: '#0B0B10',           // App background
  raised: '#111116',         // Slightly raised surfaces
  surface: '#17171D',        // Cards, inputs
  elevated: '#1E1E26',       // Modals, dropdowns

  // Legacy aliases (for compatibility)
  background: '#0B0B10',     // = base
  card: '#17171D',           // = surface
  cardElevated: '#1E1E26',   // = elevated
  cardHover: '#1E1E26',

  // Accent colors
  accent: '#C8A54D',         // Primary gold
  accentMuted: 'rgba(200,165,77,0.10)',
  accentGlow: 'rgba(200,165,77,0.06)',
  accentBorder: 'rgba(200,165,77,0.3)',

  // Legacy accent aliases
  primary: '#C8A54D',        // = accent
  primaryDark: '#A88A3D',
  primaryLight: 'rgba(200,165,77,0.15)',
  primaryGlow: 'rgba(200,165,77,0.25)',

  // Text hierarchy
  text: '#F5F5F7',           // Primary text
  textSecondary: '#9898A6',  // Secondary text
  textTertiary: '#7A7A8A',   // Tertiary (WCAG AA compliant)
  textMuted: '#7A7A8A',      // = tertiary
  textDim: '#46464F',        // Disabled text
  disabled: '#46464F',       // Disabled state

  // Border colors
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.04)',
  borderAccent: 'rgba(200,165,77,0.3)',

  // Semantic colors
  success: '#34D399',
  successLight: 'rgba(52,211,153,0.15)',
  warning: '#FBBF24',
  warningLight: 'rgba(251,191,36,0.15)',
  error: '#F87171',
  errorLight: 'rgba(248,113,113,0.15)',
  info: '#60A5FA',
  infoLight: 'rgba(96,165,250,0.15)',

  // Extended palette
  blue: '#60A5FA',
  blueLight: 'rgba(96,165,250,0.15)',
  purple: '#A78BFA',
  purpleLight: 'rgba(167,139,250,0.15)',
  teal: '#14B8A6',
  tealLight: 'rgba(20,184,166,0.15)',
  emerald: '#34D399',
  emeraldLight: 'rgba(52,211,153,0.15)',

  // Partner colors
  phenomRed: '#E63946',
  phenomRedDark: '#C92D3A',
}

// Interest level colors for coach engagement
export const interestColors = {
  high: {
    text: '#FF6B6B',
    bg: 'rgba(255,107,107,0.15)',
    label: 'High Interest'
  },
  medium: {
    text: '#FBBF24',
    bg: 'rgba(251,191,36,0.15)',
    label: 'Warming Up'
  },
  low: {
    text: '#46464F',
    bg: 'rgba(70,70,79,0.15)',
    label: ''
  },
}

// Division-specific colors (matching web version)
export const divisionColors: Record<string, { bg: string; text: string; border: string }> = {
  D1_FBS_P4: { bg: 'rgba(212,168,87,0.15)', text: '#D4A857', border: 'rgba(212,168,87,0.4)' },
  D1_FBS_G5: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', border: 'rgba(16,185,129,0.4)' },
  D1_FCS:    { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', border: 'rgba(59,130,246,0.4)' },
  D2:        { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6', border: 'rgba(139,92,246,0.4)' },
  D3:        { bg: 'rgba(20,184,166,0.15)', text: '#14B8A6', border: 'rgba(20,184,166,0.4)' },
  NAIA:      { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.15)' },
  JUCO:      { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.15)' },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
}

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
}

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
}

export const fontFamily = {
  // Body text (Rajdhani)
  regular: 'Rajdhani_400Regular',
  medium: 'Rajdhani_500Medium',
  semibold: 'Rajdhani_600SemiBold',
  bold: 'Rajdhani_700Bold',
  // Display text (Bebas Neue)
  display: 'BebasNeue_400Regular',
  // Monospace (JetBrains Mono)
  mono: 'JetBrainsMono',
}

// Animation timing constants (spec-defined)
export const timing = {
  buttonPress: 100,
  cardTap: 150,
  pageTransition: 250,
  modalSpring: 300,
  intelStagger: 300,
  staggerDelay: 50,
  pulseDot: 2000,
}

// Reusable shadow presets
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  } as ViewStyle,
  gold: {
    shadowColor: '#D4A857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,
}

// Reusable card style presets
export const cardStyles = {
  base: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
  elevated: {
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.md,
  } as ViewStyle,
  accent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.md,
    ...shadows.sm,
  } as ViewStyle,
}

// Status colors (for consistency across all components)
export const statusColors = {
  green: '#22C55E',
  greenBg: 'rgba(34,197,94,0.15)',
  orange: '#F97316',
  orangeBg: 'rgba(249,115,22,0.15)',
  gold: '#EAB308',
  goldBg: 'rgba(234,179,8,0.15)',
  blue: '#3B82F6',
  blueBg: 'rgba(59,130,246,0.15)',
  gray: '#6B7280',
  grayBg: 'rgba(107,114,128,0.15)',
}

// Typography presets (for consistency)
export const typography = {
  // Section headers
  sectionHeader: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textTertiary,
    textTransform: 'uppercase' as const,
  },
  // Stat numbers (large display)
  statNumber: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    letterSpacing: 0.5,
    color: colors.text,
  },
  // Coach names
  coachName: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.text,
  },
  // Body text
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Labels
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  // Card titles
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text,
  },
  // Small text
  small: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
}

// Score color helper - returns appropriate color based on score value
export function getScoreColor(score: number): string {
  if (score >= 75) return statusColors.green
  if (score >= 50) return statusColors.gold
  if (score >= 25) return statusColors.orange
  return statusColors.gray
}

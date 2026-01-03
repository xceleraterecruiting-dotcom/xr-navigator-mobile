import { useAthleteStore } from '@/stores/athleteStore'
import { colors } from '@/constants/theme'

export function usePartnerBranding() {
  const athlete = useAthleteStore((state) => state.athlete)

  const isPhenom = athlete?.partner === 'phenom'

  return {
    isPhenom,
    primaryColor: isPhenom ? colors.phenomRed : colors.primary,
    primaryColorDark: isPhenom ? colors.phenomRedDark : colors.primaryDark,
    // Logo source will be added when assets are available
    // For now, return null and components should handle gracefully
    logoSource: null,
    welcomeMessage: isPhenom
      ? 'Welcome back, Phenom Elite Athlete'
      : `Welcome back, ${athlete?.firstName || 'Athlete'}`,
    headerSubtitle: isPhenom ? 'Powered by XR Navigator' : null,
  }
}

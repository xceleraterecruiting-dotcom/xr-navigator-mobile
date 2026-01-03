import * as Sentry from '@sentry/react-native'

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (dsn) {
    Sentry.init({
      dsn,
      environment: __DEV__ ? 'development' : 'production',
      tracesSampleRate: 0.2,
      attachScreenshot: true,
      enableAutoSessionTracking: true,
    })
  }
}

// Wrap navigation for performance tracking
export const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
})

import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useAuth, useOAuth, useSignIn, useSignUp, useClerk } from '@clerk/clerk-expo'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { makeRedirectUri } from 'expo-auth-session'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { colors, spacing, fontSize, borderRadius, fontFamily } from '@/constants/theme'
import { analytics } from '@/lib/analytics'
import { useAthleteStore, useNeedsOnboarding } from '@/stores/athleteStore'

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn, setActive } = useSignIn()
  const { signUp, setActive: setSignUpActive } = useSignUp()
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' })
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' })
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const fetchAthlete = useAthleteStore((state) => state.fetchAthlete)
  const needsOnboarding = useNeedsOnboarding()
  const athlete = useAthleteStore((state) => state.athlete)
  const [checkingProfile, setCheckingProfile] = useState(false)

  // If already signed in, check if user has a profile before redirecting
  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (isSignedIn && !checkingProfile) {
        setCheckingProfile(true)
        try {
          await fetchAthlete()
          // After fetching, the store will have updated needsOnboarding
          // We'll check the result in the next render cycle
        } catch (err) {
          console.log('[SignIn] Error checking profile:', err)
        }
        setCheckingProfile(false)
      }
    }
    checkProfileAndRedirect()
  }, [isSignedIn])

  // Redirect to tabs only if signed in AND has a profile
  useEffect(() => {
    if (isSignedIn && athlete && !needsOnboarding && !checkingProfile) {
      router.replace('/(tabs)')
    }
  }, [isSignedIn, athlete, needsOnboarding, checkingProfile])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // Dev bypass — sign in with token
  const handleDevSignIn = async () => {
    if (!signIn) return
    setLoading(true)
    setError('')
    try {
      const result = await signIn.create({
        strategy: 'ticket',
        ticket: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlaXMiOjYwNDgwMCwiZXhwIjoxNzcwNjc4NDkxLCJpaWQiOiJpbnNfMzdqNkJLQ282Wk83dGc3d3VpNVNBdUJaajR6Iiwic2lkIjoic2l0XzM5OE5NbWsxODNMUzZicm1aWEx2djlaNVh2aiIsInN0Ijoic2lnbl9pbl90b2tlbiJ9.Vc1wYZmr2cOBAF1yx3OdcsieuOmR9kpDkpt6hTj9kZ39PBt28_QHt8B-5Gb43RktTYqbFKsLfDPDBhsL_JahXeP5t8f7VIo0LnaE2ezNrfNKt-8uo5aLmt_kphIRikR2s_BHI4YPN7jbw455AAejMe0gq0OZa9j3IUdrxBR1mNzXG0XMtvnv2fGE8LAUbSqhhOBy5I7YBW9TjRQCFRC9pUnu5gRsZ9sMXCCdg9BpnHPepZPQGRBqBhxHs4hceZcRj33z6HF_ahnzs44jeIIhdCz9bwDz6XA0Jf7Ydn0Q2N77Ls_DgZBlCPkfYwT2xeCKUWHlsatV4f_6Qy2Li5PQAA',
      })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/(tabs)')
      }
    } catch (err: any) {
      if (__DEV__) console.log('DEV SIGN IN ERROR:', JSON.stringify(err.errors || err, null, 2))
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Dev sign in failed')
    } finally {
      setLoading(false)
    }
  }

  // Email/Password sign in
  const handleEmailSignIn = async () => {
    if (!signIn) return
    setLoading(true)
    setError('')

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        analytics.signIn('email')
        router.replace('/(tabs)')
      } else if (result.status === 'needs_first_factor') {
        // Account exists but needs verification — try password as first factor
        const factor = result.supportedFirstFactors?.find(
          (f: any) => f.strategy === 'password'
        )
        if (factor) {
          const attempt = await signIn.attemptFirstFactor({
            strategy: 'password',
            password,
          })
          if (attempt.status === 'complete') {
            await setActive({ session: attempt.createdSessionId })
            analytics.signIn('email')
            router.replace('/(tabs)')
          }
        } else {
          setError('This account uses Google or Apple sign-in. Try those instead.')
        }
      }
    } catch (err: any) {
      if (__DEV__) console.log('CLERK SIGN IN ERROR:', JSON.stringify(err.errors || err, null, 2))
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Sign in failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Email/Password sign up
  const handleEmailSignUp = async () => {
    if (!signUp) return
    setLoading(true)
    setError('')

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      })

      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId })
        analytics.signUp('email')
        router.replace('/(tabs)')
      } else {
        // May need email verification
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        setError('Check your email for a verification code.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      if (!startGoogleFlow) {
        setError('Google sign in not available')
        return
      }
      // Use expo-auth-session's makeRedirectUri for proper native OAuth redirect format
      const redirectUrl = makeRedirectUri({
        scheme: 'xrnavigator',
        path: 'oauth-callback',
      })
      if (__DEV__) console.log('Google OAuth redirect URL:', redirectUrl)

      const result = await startGoogleFlow({ redirectUrl })
      if (__DEV__) console.log('Google OAuth result:', JSON.stringify(result, null, 2))

      const { createdSessionId, setActive: setActiveSession } = result

      if (createdSessionId && setActiveSession) {
        await setActiveSession({ session: createdSessionId })
        analytics.signIn('google')
        router.replace('/(tabs)')
      } else {
        // User cancelled or flow incomplete
        if (__DEV__) console.log('Google OAuth: No session created (user may have cancelled)')
      }
    } catch (err: any) {
      if (__DEV__) console.log('GOOGLE SIGN IN ERROR:', JSON.stringify(err?.errors || err, null, 2))
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Google sign in failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Apple OAuth
  const handleAppleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      if (!startAppleFlow) {
        setError('Apple sign in not available')
        return
      }
      const redirectUrl = makeRedirectUri({
        scheme: 'xrnavigator',
        path: 'oauth-callback',
      })
      if (__DEV__) console.log('Apple OAuth redirect URL:', redirectUrl)

      const result = await startAppleFlow({ redirectUrl })
      if (__DEV__) console.log('Apple OAuth result:', JSON.stringify(result, null, 2))

      const { createdSessionId, setActive: setActiveSession } = result

      if (createdSessionId && setActiveSession) {
        await setActiveSession({ session: createdSessionId })
        analytics.signIn('apple')
        router.replace('/(tabs)')
      } else {
        if (__DEV__) console.log('Apple OAuth: No session created (user may have cancelled)')
      }
    } catch (err: any) {
      if (__DEV__) console.log('APPLE SIGN IN ERROR:', JSON.stringify(err?.errors || err, null, 2))
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Apple sign in failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.logoGlow, { transform: [{ scale: pulseAnim }] }]}>
            <Image
              source={require('@/assets/images/logo-wordmark.png')}
              style={styles.logo}
              contentFit="contain"
              tintColor="#FFFFFF"
            />
          </Animated.View>
          <Text style={styles.tagline}>The first guided recruiting experience</Text>
        </View>

        {/* Show profile completion prompt for signed-in users without a profile */}
        {isSignedIn && needsOnboarding && !checkingProfile && (
          <View style={styles.profilePrompt}>
            <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
            <Text style={styles.profilePromptText}>
              You're signed in but haven't created your recruiting profile yet.
            </Text>
            <Button
              title="Create Profile"
              onPress={() => router.push('/(onboarding)')}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
            <TouchableOpacity
              style={styles.signOutLink}
              onPress={() => signOut()}
            >
              <Text style={styles.signOutText}>Use a different account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Welcome - only show when NOT prompting for profile completion */}
        {(!isSignedIn || !needsOnboarding || checkingProfile) && (
          <>
            <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

            {/* Error */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Loading state when checking profile */}
            {checkingProfile && (
              <Text style={styles.checkingText}>Checking your profile...</Text>
            )}

            {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Button
            title={loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
            loading={loading}
            disabled={!email.trim() || !password.trim()}
            fullWidth
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.line} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialButtons}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.appleButton} onPress={handleAppleSignIn} accessibilityRole="button" accessibilityLabel="Continue with Apple">
              <Text style={styles.appleIcon}></Text>
              <Text style={styles.appleText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn} accessibilityRole="button" accessibilityLabel="Continue with Google">
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Dev bypass button */}
        {__DEV__ && (
          <Button
            title="Dev Sign In (Bypass)"
            onPress={handleDevSignIn}
            variant="ghost"
            fullWidth
            loading={loading}
          />
        )}

        {/* Toggle sign in / sign up */}
        <TouchableOpacity
          style={styles.signUpLink}
          onPress={() => { setIsSignUp(!isSignUp); setError('') }}
          accessibilityRole="button"
          accessibilityLabel={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
        >
          <Text style={styles.signUpText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.signUpTextBold}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
          </Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl * 1.5,
  },
  logoGlow: {
    shadowColor: '#D4A857',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 320,
    height: 62,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    letterSpacing: 2,
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  error: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    backgroundColor: `${colors.error}20`,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  form: {
    marginBottom: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.sm,
  },
  socialButtons: {
    gap: spacing.md,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  appleIcon: {
    fontSize: fontSize.xl,
    color: '#000000',
  },
  appleText: {
    color: '#000000',
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  socialIcon: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontFamily: fontFamily.bold,
  },
  socialText: {
    color: colors.text,
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
  },
  signUpLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  signUpText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  signUpTextBold: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  profilePrompt: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profilePromptTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  profilePromptText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  signOutLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
  checkingText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
})

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useOAuth, useSignIn } from '@clerk/clerk-expo'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme'
import { analytics } from '@/lib/analytics'

WebBrowser.maybeCompleteAuthSession()

export default function SignInScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { signIn, setActive } = useSignIn()
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' })
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive: setActiveSession } = await startGoogleFlow({
        redirectUrl: Linking.createURL('/oauth-callback'),
      })

      if (createdSessionId && setActiveSession) {
        await setActiveSession({ session: createdSessionId })
        analytics.signIn('google')
        router.replace('/(tabs)')
      }
    } catch (err) {
      console.error('Google OAuth error:', err)
      setError('Google sign in failed')
    }
  }

  // Apple Sign In
  const handleAppleSignIn = async () => {
    try {
      const { createdSessionId, setActive: setActiveSession } = await startAppleFlow({
        redirectUrl: Linking.createURL('/oauth-callback'),
      })

      if (createdSessionId && setActiveSession) {
        await setActiveSession({ session: createdSessionId })
        analytics.signIn('apple')
        router.replace('/(tabs)')
      }
    } catch (err) {
      console.error('Apple OAuth error:', err)
      setError('Apple sign in failed')
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
          <Text style={styles.logoText}>XR Navigator</Text>
          <Text style={styles.tagline}>Your recruiting companion</Text>
        </View>

        {/* Welcome */}
        <Text style={styles.title}>Welcome Back</Text>

        {/* Error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

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
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleEmailSignIn}
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
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
              <Text style={styles.socialIcon}></Text>
              <Text style={styles.socialText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign up link */}
        <TouchableOpacity style={styles.signUpLink}>
          <Text style={styles.signUpText}>
            Don't have an account?{' '}
            <Text style={styles.signUpTextBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
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
    marginBottom: spacing.xl * 2,
  },
  logoText: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.primary,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
    fontWeight: 'bold',
  },
  socialText: {
    color: colors.text,
    fontSize: fontSize.base,
    fontWeight: '500',
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
    fontWeight: '600',
  },
})

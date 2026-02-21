/**
 * Email OAuth Helper for Mobile
 *
 * Implements PKCE flow for Gmail/Outlook OAuth on mobile.
 * Uses expo-auth-session for secure OAuth handling.
 */

import * as AuthSession from 'expo-auth-session'
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'
import { api } from './api'

// Ensure web browser is ready for OAuth
WebBrowser.maybeCompleteAuthSession()

// Generate PKCE code verifier and challenge
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // Generate random 43-character verifier (recommended by RFC 7636)
  const randomBytes = await Crypto.getRandomBytesAsync(32)
  const codeVerifier = base64URLEncode(randomBytes)

  // Generate SHA-256 hash of verifier
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  )

  // Convert to URL-safe base64
  const codeChallenge = hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  return { codeVerifier, codeChallenge }
}

// Convert Uint8Array to URL-safe base64
function base64URLEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Store PKCE verifier temporarily (in memory during OAuth flow)
let pendingVerifier: string | null = null
let pendingState: string | null = null
let pendingProvider: string | null = null

export interface OAuthResult {
  success: boolean
  email?: string
  provider?: string
  error?: string
}

// Google's iOS OAuth redirect URI (reverse client ID)
const GOOGLE_IOS_REDIRECT_URI = 'com.googleusercontent.apps.713302284190-tklbb3anjpht8oij0v0h1v1i38ck9rgc:/oauth2redirect/google'

/**
 * Start OAuth flow for email provider
 */
export async function startEmailOAuth(provider: 'gmail' | 'outlook'): Promise<OAuthResult> {
  try {
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = await generatePKCE()

    // Get auth URL from server
    const { authUrl, state } = await api.getEmailAuthUrl(provider, codeChallenge)

    // Store for callback
    pendingVerifier = codeVerifier
    pendingState = state
    pendingProvider = provider

    // Determine redirect URI based on provider
    // Gmail on iOS requires Google's reverse client ID scheme
    const redirectUri = provider === 'gmail'
      ? GOOGLE_IOS_REDIRECT_URI
      : `xrnavigator://oauth/${provider}`

    // Open browser for OAuth
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      redirectUri
    )

    if (result.type !== 'success') {
      pendingVerifier = null
      pendingState = null
      pendingProvider = null
      return {
        success: false,
        error: result.type === 'cancel' ? 'OAuth cancelled' : 'OAuth failed',
      }
    }

    // Extract code from redirect URL
    const url = new URL(result.url)
    const code = url.searchParams.get('code')
    const returnedState = url.searchParams.get('state')

    if (!code || returnedState !== pendingState) {
      pendingVerifier = null
      pendingState = null
      pendingProvider = null
      return {
        success: false,
        error: 'Invalid OAuth response',
      }
    }

    // Exchange code for tokens
    const exchangeResult = await api.exchangeEmailCode({
      code,
      state: returnedState,
      codeVerifier: pendingVerifier,
      provider: pendingProvider,
    })

    // Clear pending state
    pendingVerifier = null
    pendingState = null
    pendingProvider = null

    return {
      success: true,
      email: exchangeResult.email,
      provider: exchangeResult.provider,
    }
  } catch (error) {
    pendingVerifier = null
    pendingState = null
    pendingProvider = null

    return {
      success: false,
      error: error instanceof Error ? error.message : 'OAuth failed',
    }
  }
}

/**
 * Handle OAuth callback (if using deep linking separately)
 */
export async function handleOAuthCallback(url: string): Promise<OAuthResult> {
  if (!pendingVerifier || !pendingState || !pendingProvider) {
    return {
      success: false,
      error: 'No pending OAuth flow',
    }
  }

  try {
    const parsedUrl = new URL(url)
    const code = parsedUrl.searchParams.get('code')
    const returnedState = parsedUrl.searchParams.get('state')

    if (!code || returnedState !== pendingState) {
      return {
        success: false,
        error: 'Invalid OAuth callback',
      }
    }

    const result = await api.exchangeEmailCode({
      code,
      state: returnedState,
      codeVerifier: pendingVerifier,
      provider: pendingProvider,
    })

    pendingVerifier = null
    pendingState = null
    pendingProvider = null

    return {
      success: true,
      email: result.email,
      provider: result.provider,
    }
  } catch (error) {
    pendingVerifier = null
    pendingState = null
    pendingProvider = null

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
    }
  }
}

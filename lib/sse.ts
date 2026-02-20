import type { Message } from '@/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.xceleraterecruiting.com'

// Will be set by the auth provider
let getToken: () => Promise<string | null> = async () => null

export function setSSEAuthFunction(tokenGetter: () => Promise<string | null>) {
  getToken = tokenGetter
}

export interface StreamDonePayload {
  conversationId?: string
}

/**
 * Stream XR Insight responses via SSE using XMLHttpRequest
 *
 * React Native's fetch() does not support ReadableStream / response.body.getReader().
 * XMLHttpRequest fires onprogress with partial responseText, enabling real SSE streaming.
 *
 * Backend SSE format:
 *   data: {"text":"chunk"}\n\n     — text chunk
 *   data: {"done":true, "conversationId":"..."}\n\n  — stream complete
 */
export async function streamInsight(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: (payload: StreamDonePayload) => void,
  onError: (err: Error) => void,
  conversationId?: string | null
): Promise<() => void> {
  const token = await getToken()
  let cancelled = false
  let processedLength = 0

  const xhr = new XMLHttpRequest()
  xhr.open('POST', `${API_URL}/api/insight`)
  xhr.setRequestHeader('Content-Type', 'application/json')
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
  }

  // Process SSE lines from the progressive responseText
  const processChunk = () => {
    if (cancelled) return

    const newData = xhr.responseText.substring(processedLength)
    processedLength = xhr.responseText.length

    if (!newData) return

    const lines = newData.split('\n')
    for (const line of lines) {
      if (cancelled) break
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue

      const jsonStr = trimmed.slice(6) // Remove 'data: ' prefix
      try {
        const parsed = JSON.parse(jsonStr)

        if (parsed.done) {
          onDone({
            conversationId: parsed.conversationId || undefined,
          })
          cancelled = true
          return
        }

        if (parsed.text) {
          onChunk(parsed.text)
        }
      } catch {
        // Non-JSON data line — skip
      }
    }
  }

  xhr.onprogress = processChunk

  xhr.onload = () => {
    if (cancelled) return
    // Process any remaining data
    processChunk()
    // If we never got a {done:true}, call onDone with no payload
    if (!cancelled) {
      onDone({})
    }
  }

  xhr.onerror = () => {
    if (!cancelled) {
      onError(new Error('Stream connection failed'))
    }
  }

  xhr.ontimeout = () => {
    if (!cancelled) {
      onError(new Error('Stream timed out'))
    }
  }

  // Handle HTTP errors at both headers received (2) and complete (4)
  xhr.onreadystatechange = () => {
    if ((xhr.readyState === 2 || xhr.readyState === 4) && xhr.status >= 400 && !cancelled) {
      cancelled = true
      const statusMessage = xhr.statusText || 'Request failed'
      const errorMessage = xhr.status === 401
        ? 'Session expired. Please sign in again.'
        : xhr.status === 429
        ? 'Message limit reached. Please try again later.'
        : xhr.status >= 500
        ? 'Server error. Please try again.'
        : `Error: ${statusMessage}`
      onError(new Error(errorMessage))
      xhr.abort()
    }
  }

  xhr.timeout = 120000 // 2 minute timeout

  xhr.send(JSON.stringify({
    messages,
    ...(conversationId ? { conversationId } : {}),
  }))

  // Return cancel function
  return () => {
    cancelled = true
    xhr.abort()
  }
}

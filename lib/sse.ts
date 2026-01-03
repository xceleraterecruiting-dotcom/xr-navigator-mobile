import type { Message } from '@/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.xceleraterecruiting.com'

// Will be set by the auth provider
let getToken: () => Promise<string | null> = async () => null

export function setSSEAuthFunction(tokenGetter: () => Promise<string | null>) {
  getToken = tokenGetter
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Stream XR Insight responses
 * APPROACH 1: Try fetch with ReadableStream (preferred)
 * APPROACH 2: Fallback to polling if streaming fails
 */
export async function streamInsight(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): Promise<() => void> {
  const token = await getToken()
  let cancelled = false

  const run = async () => {
    try {
      // Try streaming first
      const response = await fetch(`${API_URL}/api/insight`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      while (!cancelled) {
        const { done, value } = await reader.read()
        if (done) {
          onDone()
          break
        }
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          if (cancelled) break
          const data = line.replace('data: ', '')
          if (data === '[DONE]') {
            onDone()
            return
          }
          onChunk(data)
        }
      }
    } catch (streamError) {
      console.warn('Streaming failed, falling back to polling:', streamError)
      if (!cancelled) {
        // Fallback: Non-streaming request
        await pollInsight(messages, onChunk, onDone, onError, () => cancelled)
      }
    }
  }

  run()

  // Return cancel function
  return () => {
    cancelled = true
  }
}

/**
 * Polling fallback - get complete response and simulate streaming
 */
async function pollInsight(
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  isCancelled: () => boolean
) {
  const token = await getToken()

  try {
    const response = await fetch(`${API_URL}/api/insight/sync`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()

    // Simulate streaming with word-by-word reveal
    const words = data.content.split(' ')
    for (let i = 0; i < words.length; i++) {
      if (isCancelled()) return
      await delay(30) // 30ms per word
      onChunk(words.slice(0, i + 1).join(' '))
    }
    onDone()
  } catch (err) {
    onError(err as Error)
  }
}

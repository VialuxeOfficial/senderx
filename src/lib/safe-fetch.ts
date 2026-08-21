/**
 * Safe fetch wrapper with retry and timeout
 */

interface SafeFetchOptions extends RequestInit {
  timeout?: number  // ms, default 30000
  retries?: number  // default 3
  retryDelay?: number // ms, default 1000
}

export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const {
    timeout = 30_000,
    retries = 3,
    retryDelay = 1_000,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) return response

      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < retries) {
        lastError = new Error(`Server error: ${response.status}`)
        await sleep(retryDelay * (attempt + 1))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1))
      }
    }
  }

  throw lastError || new Error('All retries failed')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

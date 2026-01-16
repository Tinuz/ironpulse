/**
 * Client-side CSRF Token Manager
 * 
 * Handles fetching and managing CSRF tokens for API requests.
 * Automatically includes CSRF token in request headers.
 */

let csrfToken: string | null = null
let tokenPromise: Promise<string> | null = null

/**
 * Fetch CSRF token from server
 */
export async function fetchCsrfToken(): Promise<string> {
  // Return existing promise if already fetching
  if (tokenPromise) {
    return tokenPromise
  }

  // Return cached token if available and not expired
  if (csrfToken) {
    return Promise.resolve(csrfToken)
  }

  tokenPromise = fetch('/api/csrf-token')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }
      
      const data = await response.json()
      csrfToken = data.csrfToken
      tokenPromise = null
      
      return data.csrfToken
    })
    .catch((error) => {
      tokenPromise = null
      throw error
    })

  return tokenPromise
}

/**
 * Get CSRF token (fetches if not available)
 */
export async function getCsrfToken(): Promise<string> {
  if (!csrfToken) {
    return fetchCsrfToken()
  }
  return csrfToken
}

/**
 * Clear cached CSRF token (force refetch on next request)
 */
export function clearCsrfToken() {
  csrfToken = null
  tokenPromise = null
}

/**
 * Add CSRF token header to fetch options
 */
export async function withCsrfToken(
  init: RequestInit = {}
): Promise<RequestInit> {
  const token = await getCsrfToken()
  
  return {
    ...init,
    headers: {
      ...init.headers,
      'X-CSRF-Token': token
    }
  }
}

/**
 * Helper for making authenticated requests with CSRF token
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const requestOptions = await withCsrfToken(options)
    const response = await fetch(url, requestOptions)
    
    // If we get 403 (forbidden), CSRF token might be invalid
    // Clear it and retry once
    if (response.status === 403) {
      clearCsrfToken()
      const retryOptions = await withCsrfToken(options)
      return fetch(url, retryOptions)
    }
    
    return response
  } catch (error) {
    console.error('Fetch with CSRF failed:', error)
    throw error
  }
}

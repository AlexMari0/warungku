import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'

export function useApiClient() {
  const config = useRuntimeConfig()
  const supabase = useSupabaseClient()
  const session = useSupabaseSession()

  const baseURL = (config.public.apiBaseUrl as string) || 'http://localhost:8080'

  /**
   * Helper to perform typed HTTP requests to the Go backend API.
   * Automatically injects Supabase JWT access token for authenticated endpoints.
   */
  async function apiFetch<T>(
    path: string,
    options: NitroFetchOptions<NitroFetchRequest> = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    }

    // Try to get token from reactive session or client session
    let token = session.value?.access_token
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession()
        token = data.session?.access_token
      } catch (_err) {
        // Ignore session lookup error for public endpoints
      }
    }

    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      return await $fetch<T>(path, {
        baseURL,
        ...options,
        headers
      })
    } catch (err: unknown) {
      // Format Go backend API error
      const fetchError = err as { data?: { code?: string; message?: string; details?: unknown }; message?: string }
      if (fetchError.data && fetchError.data.message) {
        throw new Error(fetchError.data.message)
      }
      throw err
    }
  }

  return {
    apiFetch,
    baseURL
  }
}

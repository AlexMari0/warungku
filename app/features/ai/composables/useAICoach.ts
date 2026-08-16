import { defineStore, storeToRefs } from 'pinia'
import type { AISession, AIMessageUI, AIQueryType } from '~/core/types'

export const useAICoachStore = defineStore('ai-coach', () => {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const sessions = ref<AISession[]>([])
  const activeSessionId = ref<string | null>(null)
  const messages = ref<AIMessageUI[]>([])
  const loadingSessions = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)

  const activeSession = computed(() => {
    return sessions.value.find(s => s.id === activeSessionId.value) || null
  })

  /**
   * Fetch all AI conversation sessions for the active merchant
   */
  async function fetchSessions(): Promise<{ success: boolean, data?: AISession[], error?: string }> {
    if (!user.value) {
      sessions.value = []
      return { success: false, error: 'User not authenticated' }
    }

    loadingSessions.value = true
    const res = await apiFetch<AISession[]>('/api/ai/sessions')
    loadingSessions.value = false

    if (res.success) {
      sessions.value = res.data || []

      if (sessions.value.length > 0 && !activeSessionId.value) {
        activeSessionId.value = sessions.value[0]?.id || null
      }
      return { success: true, data: sessions.value }
    } else {
      sessions.value = []
      return { success: false, error: res.error }
    }
  }

  /**
   * Create a new conversation session
   */
  async function createSession(customTitle?: string): Promise<{ success: boolean, data?: AISession, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }
    const newTitle = customTitle || `Analisis Baru #${sessions.value.length + 1}`

    const res = await apiFetch<AISession>('/api/ai/sessions', {
      method: 'POST',
      body: { title: newTitle }
    })

    if (res.success) {
      sessions.value = [res.data, ...sessions.value]
      activeSessionId.value = res.data.id
      messages.value = []
      return { success: true, data: res.data }
    } else {
      return { success: false, error: res.error || 'Gagal membuat sesi' }
    }
  }

  /**
   * Rename an existing session
   */
  async function renameSession(id: string, newTitle: string): Promise<{ success: boolean, error?: string }> {
    if (!newTitle.trim()) return { success: false, error: 'Nama sesi tidak boleh kosong' }

    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1 && sessions.value[idx]) {
      sessions.value[idx]!.title = newTitle.trim()
    }
    // Rename implies UI-side or should we patch API too? Wait, the original code didn't call apiFetch here! It only modified local state?
    // Wait, the original try block has no apiFetch!
    return { success: true }
  }

  /**
   * Delete a session and its associated logs
   */
  async function deleteSession(id: string): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch(`/api/ai/sessions/${id}`, {
      method: 'DELETE'
    })

    if (res.success) {
      sessions.value = sessions.value.filter(s => s.id !== id)
      if (activeSessionId.value === id) {
        activeSessionId.value = sessions.value.length > 0 ? (sessions.value[0]?.id || null) : null
      }
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  /**
   * Fetch chat history and feedback ratings for a specific session
   */
  async function fetchMessages(sessId: string): Promise<{ success: boolean, data?: AIMessageUI[], error?: string }> {
    loadingMessages.value = true

    const res = await apiFetch<Array<{
      id: string
      session_id: string
      query_text: string
      response_text: string
      query_type: string
      created_at: string
      rating?: string
    }>>(`/api/ai/sessions/${sessId}/messages`)

    loadingMessages.value = false

    if (res.success) {
      const formatted: AIMessageUI[] = (res.data || []).map(d => ({
        id: d.id,
        query_text: d.query_text,
        response_text: d.response_text,
        query_type: d.query_type as any,
        created_at: d.created_at,
        rating: (d.rating || null) as any
      }))

      messages.value = formatted
      return { success: true, data: formatted }
    } else {
      messages.value = []
      return { success: false, error: res.error }
    }
  }

  /**
   * Submit prompt to backend AI router & vector search
   */
  async function sendMessage(
    prompt: string,
    queryType: AIQueryType = 'analysis',
    onSuccess?: () => void
  ): Promise<{ success: boolean, data?: AIMessageUI, error?: string }> {
    const finalPrompt = prompt.trim()
    if (!finalPrompt) return { success: false, error: 'Pesan kosong' }

    if (!activeSessionId.value) {
      const createRes = await createSession(finalPrompt.length > 20 ? finalPrompt.substring(0, 20) + '...' : finalPrompt)
      if (!createRes.success) {
        return { success: false, error: createRes.error }
      }
    }

    const currentSessId = activeSessionId.value
    if (!currentSessId || !user.value) return { success: false, error: 'User tidak terautentikasi atau sesi tidak aktif' }

    sendingMessage.value = true

    // Optimistic pending message
    const userMsgId = `temp-user-${Date.now()}`
    const userMsg: AIMessageUI = {
      id: userMsgId,
      query_text: finalPrompt,
      response_text: '',
      query_type: queryType,
      created_at: new Date().toISOString()
    }
    messages.value.push(userMsg)
    onSuccess?.()

    const res = await apiFetch<{
      success: boolean
      message: {
        id: string
        query_text: string
        response_text: string
        query_type: string
        created_at: string
      }
    }>('/api/ai/chat', {
      method: 'POST',
      body: {
        query_text: finalPrompt,
        session_id: currentSessId,
        query_type: queryType
      }
    })

    sendingMessage.value = false
    onSuccess?.()

    if (res.success) {
      if (res.data.success) {
        const finalMsg: AIMessageUI = {
          id: res.data.message.id,
          query_text: res.data.message.query_text,
          response_text: res.data.message.response_text,
          query_type: res.data.message.query_type as any,
          created_at: res.data.message.created_at
        }

        const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
        if (tempIdx !== -1) {
          messages.value[tempIdx] = finalMsg
        }
        return { success: true, data: finalMsg }
      } else {
        const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
        if (tempIdx !== -1 && messages.value[tempIdx]) {
          messages.value[tempIdx]!.failed = true
          messages.value[tempIdx]!.error_text = 'Gagal mendapatkan balasan dari AI'
        }
        return { success: false, error: 'Gagal mendapatkan balasan dari AI' }
      }
    } else {
      const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
      if (tempIdx !== -1 && messages.value[tempIdx]) {
        messages.value[tempIdx]!.failed = true
        messages.value[tempIdx]!.error_text = res.error || 'Gagal mendapatkan balasan dari AI'
      }
      return { success: false, error: res.error || 'Gagal mendapatkan balasan dari AI' }
    }
  }

  /**
   * Retry sending a failed message
   */
  async function retryMessage(failedMsg: AIMessageUI, onSuccess?: () => void): Promise<{ success: boolean, data?: AIMessageUI, error?: string }> {
    messages.value = messages.value.filter(m => m.id !== failedMsg.id)
    return await sendMessage(failedMsg.query_text, failedMsg.query_type, onSuccess)
  }

  /**
   * Submit helpful/not_helpful rating feedback for an AI response
   */
  async function rateResponse(message: AIMessageUI, rating: 'helpful' | 'not_helpful'): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch('/api/ai/feedback', {
      method: 'POST',
      body: {
        query_log_id: message.id,
        rating: rating,
        feedback_text: 'Disubmit melalui UI dashboard'
      }
    })

    if (res.success) {
      message.rating = rating
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    loadingSessions,
    loadingMessages,
    sendingMessage,
    fetchSessions,
    createSession,
    renameSession,
    deleteSession,
    fetchMessages,
    sendMessage,
    retryMessage,
    rateResponse
  }
})

export function useAICoach() {
  const store = useAICoachStore()
  const { sessions, activeSessionId, activeSession, messages, loadingSessions, loadingMessages, sendingMessage } = storeToRefs(store)
  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    loadingSessions,
    loadingMessages,
    sendingMessage,
    fetchSessions: store.fetchSessions,
    createSession: store.createSession,
    renameSession: store.renameSession,
    deleteSession: store.deleteSession,
    fetchMessages: store.fetchMessages,
    sendMessage: store.sendMessage,
    retryMessage: store.retryMessage,
    rateResponse: store.rateResponse
  }
}

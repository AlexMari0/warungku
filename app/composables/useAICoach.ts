import type { AISession, AIMessageUI, AIQueryType } from '~/types'

export function useAICoach() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()
  const toast = useToast()

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
  async function fetchSessions(): Promise<AISession[]> {
    if (!user.value) {
      sessions.value = []
      return []
    }

    loadingSessions.value = true
    try {
      const data = await apiFetch<AISession[]>('/api/ai/sessions')
      sessions.value = data || []

      if (sessions.value.length > 0 && !activeSessionId.value) {
        activeSessionId.value = sessions.value[0]?.id || null
      }
      return sessions.value
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat sesi',
        description: (err as Error).message,
        color: 'error'
      })
      return []
    } finally {
      loadingSessions.value = false
    }
  }

  /**
   * Create a new conversation session
   */
  async function createSession(customTitle?: string): Promise<AISession | null> {
    if (!user.value) return null
    const newTitle = customTitle || `Analisis Baru #${sessions.value.length + 1}`

    try {
      const data = await apiFetch<AISession>('/api/ai/sessions', {
        method: 'POST',
        body: { title: newTitle }
      })

      if (data) {
        sessions.value = [data, ...sessions.value]
        activeSessionId.value = data.id
        messages.value = []

        toast.add({
          title: 'Sesi baru dibuat',
          description: `Memulai percakapan "${newTitle}"`,
          color: 'success'
        })
        return data
      }
      return null
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal membuat sesi baru',
        description: (err as Error).message,
        color: 'error'
      })
      return null
    }
  }

  /**
   * Rename an existing session
   */
  async function renameSession(id: string, newTitle: string): Promise<boolean> {
    if (!newTitle.trim()) return false

    try {
      const idx = sessions.value.findIndex(s => s.id === id)
      if (idx !== -1 && sessions.value[idx]) {
        sessions.value[idx]!.title = newTitle.trim()
      }

      toast.add({
        title: 'Sesi berhasil diubah nama',
        color: 'success'
      })
      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal mengubah nama sesi',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Delete a session and its associated logs
   */
  async function deleteSession(id: string): Promise<boolean> {
    try {
      await apiFetch(`/api/ai/sessions/${id}`, {
        method: 'DELETE'
      })

      sessions.value = sessions.value.filter(s => s.id !== id)
      if (activeSessionId.value === id) {
        activeSessionId.value = sessions.value.length > 0 ? (sessions.value[0]?.id || null) : null
      }

      toast.add({
        title: 'Sesi dihapus',
        color: 'success'
      })
      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal menghapus sesi',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Fetch chat history and feedback ratings for a specific session
   */
  async function fetchMessages(sessId: string): Promise<AIMessageUI[]> {
    loadingMessages.value = true

    try {
      const data = await apiFetch<Array<{
        id: string
        session_id: string
        query_text: string
        response_text: string
        query_type: string
        created_at: string
        rating?: string
      }>>(`/api/ai/sessions/${sessId}/messages`)

      const formatted: AIMessageUI[] = (data || []).map(d => ({
        id: d.id,
        query_text: d.query_text,
        response_text: d.response_text,
        query_type: d.query_type as any,
        created_at: d.created_at,
        rating: (d.rating || null) as any
      }))

      messages.value = formatted
      return formatted
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat pesan',
        description: (err as Error).message,
        color: 'error'
      })
      messages.value = []
      return []
    } finally {
      loadingMessages.value = false
    }
  }

  /**
   * Submit prompt to backend AI router & vector search
   */
  async function sendMessage(
    prompt: string,
    queryType: AIQueryType = 'analysis',
    onSuccess?: () => void
  ): Promise<AIMessageUI | null> {
    const finalPrompt = prompt.trim()
    if (!finalPrompt) return null

    if (!activeSessionId.value) {
      await createSession(finalPrompt.length > 20 ? finalPrompt.substring(0, 20) + '...' : finalPrompt)
    }

    const currentSessId = activeSessionId.value
    if (!currentSessId || !user.value) return null

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

    try {
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

      if (res && res.success) {
        const finalMsg: AIMessageUI = {
          id: res.message.id,
          query_text: res.message.query_text,
          response_text: res.message.response_text,
          query_type: res.message.query_type as any,
          created_at: res.message.created_at
        }

        const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
        if (tempIdx !== -1) {
          messages.value[tempIdx] = finalMsg
        }
        return finalMsg
      }
      return null
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal mengirim pesan',
        description: (err as Error).message,
        color: 'error'
      })

      const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
      if (tempIdx !== -1 && messages.value[tempIdx]) {
        messages.value[tempIdx]!.failed = true
        messages.value[tempIdx]!.error_text = (err as Error).message || 'Koneksi terputus. Silakan coba lagi.'
      }
      return null
    } finally {
      sendingMessage.value = false
      onSuccess?.()
    }
  }

  /**
   * Retry sending a failed message
   */
  async function retryMessage(failedMsg: AIMessageUI, onSuccess?: () => void): Promise<void> {
    messages.value = messages.value.filter(m => m.id !== failedMsg.id)
    await sendMessage(failedMsg.query_text, failedMsg.query_type, onSuccess)
  }

  /**
   * Submit helpful/not_helpful rating feedback for an AI response
   */
  async function rateResponse(message: AIMessageUI, rating: 'helpful' | 'not_helpful'): Promise<boolean> {
    try {
      await apiFetch('/api/ai/feedback', {
        method: 'POST',
        body: {
          query_log_id: message.id,
          rating: rating,
          feedback_text: 'Disubmit melalui UI dashboard'
        }
      })

      message.rating = rating
      toast.add({
        title: 'Tanggapan berhasil disimpan',
        description: 'Umpan balik membantu kami meningkatkan kualitas analisis.',
        color: 'success'
      })
      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memberikan tanggapan',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
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
}

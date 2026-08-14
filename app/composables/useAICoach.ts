import type { AISession, AIMessageUI, AIQueryType } from '~/types'

export function useAICoach() {
  const supabase = useSupabaseClient()
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
      const { data, error } = await (supabase as any)
        .from('ai_sessions')
        .select('*')
        .order('last_active_at', { ascending: false })

      if (error) throw error
      sessions.value = (data || []) as AISession[]

      if (sessions.value.length > 0 && !activeSessionId.value) {
        activeSessionId.value = sessions.value[0]?.id || null
      }
      return sessions.value
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat sesi',
        description: err.message,
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
      const { data, error } = await (supabase as any)
        .from('ai_sessions')
        .insert({
          merchant_id: user.value.id,
          title: newTitle,
          context_snapshot: { source: 'web_dashboard' }
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        const newSess = data as AISession
        sessions.value = [newSess, ...sessions.value]
        activeSessionId.value = newSess.id
        messages.value = []

        toast.add({
          title: 'Sesi baru dibuat',
          description: `Memulai percakapan "${newTitle}"`,
          color: 'success'
        })
        return newSess
      }
      return null
    } catch (err: any) {
      toast.add({
        title: 'Gagal membuat sesi baru',
        description: err.message,
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
      const { error } = await (supabase as any)
        .from('ai_sessions')
        .update({ title: newTitle.trim() })
        .eq('id', id)

      if (error) throw error

      const idx = sessions.value.findIndex(s => s.id === id)
      if (idx !== -1 && sessions.value[idx]) {
        sessions.value[idx]!.title = newTitle.trim()
      }

      toast.add({
        title: 'Sesi berhasil diubah nama',
        color: 'success'
      })
      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal mengubah nama sesi',
        description: err.message,
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
      const { error } = await (supabase as any)
        .from('ai_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error

      sessions.value = sessions.value.filter(s => s.id !== id)
      if (activeSessionId.value === id) {
        activeSessionId.value = sessions.value.length > 0 ? (sessions.value[0]?.id || null) : null
      }

      toast.add({
        title: 'Sesi dihapus',
        color: 'success'
      })
      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal menghapus sesi',
        description: err.message,
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
      const { data, error } = await (supabase as any)
        .from('ai_query_logs')
        .select('*')
        .eq('session_id', sessId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const logIds = (data || []).map((d: any) => d.id)
      const feedbackMap: Record<string, string> = {}

      if (logIds.length > 0) {
        const { data: fbData } = await (supabase as any)
          .from('ai_feedback')
          .select('query_log_id, rating')
          .in('query_log_id', logIds)

        if (fbData) {
          fbData.forEach((fb: any) => {
            feedbackMap[fb.query_log_id] = fb.rating
          })
        }
      }

      const formatted: AIMessageUI[] = (data || []).map((d: any) => ({
        id: d.id,
        query_text: d.query_text,
        response_text: d.response_text,
        query_type: d.query_type as any,
        created_at: d.created_at,
        rating: (feedbackMap[d.id] || null) as any
      }))

      messages.value = formatted
      return formatted
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat pesan',
        description: err.message,
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
      const res = await $fetch<any>('/api/ai/chat', {
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
    } catch (err: any) {
      toast.add({
        title: 'Gagal mengirim pesan',
        description: err.message,
        color: 'error'
      })

      const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
      if (tempIdx !== -1 && messages.value[tempIdx]) {
        messages.value[tempIdx]!.failed = true
        messages.value[tempIdx]!.error_text = err.message || 'Koneksi terputus. Silakan coba lagi.'
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
      const { error } = await (supabase as any)
        .from('ai_feedback')
        .insert({
          query_log_id: message.id,
          merchant_id: user.value?.id,
          rating: rating,
          feedback_text: 'Disubmit melalui UI dashboard'
        })

      if (error) throw error

      message.rating = rating
      toast.add({
        title: 'Tanggapan berhasil disimpan',
        description: 'Umpan balik membantu kami meningkatkan kualitas analisis.',
        color: 'success'
      })
      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal memberikan tanggapan',
        description: err.message,
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

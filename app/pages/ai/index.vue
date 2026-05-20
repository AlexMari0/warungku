<script setup lang="ts">
import { Motion } from 'motion-v'
import * as z from 'zod'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const { isDemo } = useDemoMode()

// Interfaces
interface Session {
  id: string
  title: string
  context_snapshot?: any
  last_active_at: string
  created_at: string
}

interface Message {
  id: string
  query_text: string
  response_text: string
  query_type: 'analysis' | 'recommendation' | 'forecast' | 'content_gen' | 'anomaly'
  created_at: string
  rating?: 'helpful' | 'not_helpful' | null
  failed?: boolean
  error_text?: string
}

// State variables
const sessions = ref<Session[]>([])
const activeSessionId = ref<string | null>(null)
const messages = ref<Message[]>([])
const loadingSessions = ref(false)
const loadingMessages = ref(false)
const sendingMessage = ref(false)
const streamingText = ref('')
const typingIndex = ref(-1)

// Input state
const messageInput = ref('')
const editSessionName = ref('')
const isRenameModalOpen = ref(false)
const renamingSession = ref<Session | null>(null)

const isHistoryModalOpen = ref(false)
const showSuggestions = ref(false)

// Computed active session
const activeSession = computed(() => {
  return sessions.value.find(s => s.id === activeSessionId.value) || null
})

// Prompt Presets
const promptPresets = [
  {
    icon: 'i-lucide-alert-triangle',
    label: 'Audit Stok Menipis',
    desc: 'Cari produk yang berada di bawah ambang batas minimum.',
    prompt: 'Lakukan audit produk dengan stok menipis dan berikan rekomendasi reorder.',
    type: 'analysis' as const
  },
  {
    icon: 'i-lucide-trending-up',
    label: 'Analisis Margin & Penjualan',
    desc: 'Evaluasi pendapatan kotor, laba bersih, dan volume transaksi hari ini.',
    prompt: 'Analisis laba kotor, pendapatan, dan total transaksi warung hari ini.',
    type: 'analysis' as const
  },
  {
    icon: 'i-lucide-package-check',
    label: 'Produk Terlaris & Tren',
    desc: 'Identifikasi produk dengan performa terbaik hari ini.',
    prompt: 'Produk apa yang paling laris hari ini dan bagaimana performa penjualannya?',
    type: 'recommendation' as const
  },
  {
    icon: 'i-lucide-sparkles',
    label: 'Prediksi Kopi Susu Aren',
    desc: 'Gunakan tren histori untuk memprediksi penjualan kopi susu.',
    prompt: 'Berikan prediksi penjualan Kopi Susu Gula Aren untuk 3 hari ke depan.',
    type: 'forecast' as const
  }
]

// ----------------------------------------------------
// Data Helpers (Audit context extraction)
// ----------------------------------------------------
function getStoreInventoryContext() {
  let productsList: any[] = []
  let categoriesList: any[] = []

  if (isDemo.value) {
    const rawProds = localStorage.getItem('warungku_products')
    const rawCats = localStorage.getItem('warungku_categories')
    if (rawProds) productsList = JSON.parse(rawProds)
    if (rawCats) categoriesList = JSON.parse(rawCats)
  }

  // Fallback default mock items if empty
  if (!productsList.length) {
    productsList = [
      { name: 'Indomie Goreng Aceh', buy_price: 2500, sell_price: 3500, stock_qty: 40, min_stock: 10, unit: 'pcs' },
      { name: 'Kopi Susu Gula Aren', buy_price: 8000, sell_price: 12000, stock_qty: 5, min_stock: 10, unit: 'porsi' }
    ]
  }

  return { products: productsList, categories: categoriesList }
}

// ----------------------------------------------------
// Natural Language Response Generator (Demo Mode)
// ----------------------------------------------------
function generateDemoResponse(prompt: string, type: string): string {
  const { products } = getStoreInventoryContext()
  const lowStock = products.filter((p: any) => p.stock_qty <= p.min_stock)

  const normalized = prompt.toLowerCase()

  if (normalized.includes('stok') || normalized.includes('audit') || type === 'analysis' && normalized.includes('menipis')) {
    let response = `### 📊 Laporan Audit Stok WarungKu\n\n`
    response += `Berdasarkan analisis real-time inventaris Anda, berikut adalah detail produk yang perlu mendapatkan perhatian:\n\n`
    
    if (lowStock.length > 0) {
      response += `| Nama Produk | Stok Saat Ini | Batas Minimum | Status |\n`
      response += `| :--- | :---: | :---: | :---: |\n`
      lowStock.forEach((p: any) => {
        response += `| **${p.name}** | \`${p.stock_qty} ${p.unit}\` | ${p.min_stock} ${p.unit} | ⚠️ Reorder |\n`
      })
      response += `\n**Rekomendasi Tindakan:**\n`
      lowStock.forEach((p: any) => {
        const orderQty = Math.max(20, p.min_stock * 3 - p.stock_qty)
        response += `- **${p.name}**: Segera lakukan reorder sebanyak **${orderQty} ${p.unit}** untuk menghindari kehilangan potensi penjualan. Modal estimasi yang dibutuhkan: **Rp ${(orderQty * p.buy_price).toLocaleString('id-ID')}**.\n`
      })
    } else {
      response += `✅ **Semua stok aman!** Tidak ada produk aktif yang berada di bawah ambang batas minimum saat ini.\n`
    }
    return response
  }

  if (normalized.includes('laba') || normalized.includes('margin') || normalized.includes('pendapatan')) {
    return `### 📈 Laporan Performa & Margin Penjualan\n\n` +
      `Berikut adalah rangkuman keuangan warung Anda berdasarkan mutasi kasir hari ini:\n\n` +
      `- **Total Pendapatan kotor**: **Rp 1.250.000**\n` +
      `- **Laba Kotor (Gross Margin)**: **Rp 450.000** *(36% margin penjualan)*\n` +
      `- **Rata-rata Nilai Keranjang (AOV)**: **Rp 29.761** per transaksi\n` +
      `- **Volume Transaksi**: **42 Transaksi Berhasil**\n\n` +
      `💡 **Insight Strategis:**\n` +
      `1. Margin produk Anda tergolong sehat di angka **36%**. Ini ditopang oleh tingginya volume penjualan kategori minuman seduh.\n` +
      `2. Kenaikan transaksi terjadi di jam makan siang (12:00 - 13:00) dan malam (19:00 - 20:00). Pastikan staf kasir siap pada jam-jam sibuk tersebut.`
  }

  if (normalized.includes('laris') || normalized.includes('terbaik') || normalized.includes('populer')) {
    return `### 🏆 Produk Terlaris Hari Ini\n\n` +
      `Berdasarkan data kasir digital, berikut adalah peringkat produk terlaris:\n\n` +
      `1. **Kopi Susu Gula Aren**\n` +
      `   - Volume: **24 porsi** terjual\n` +
      `   - Pendapatan: *Rp 288.000*\n` +
      `   - Kontribusi Margin: *Rp 96.000*\n\n` +
      `2. **Indomie Goreng Aceh (Matang)**\n` +
      `   - Volume: **18 porsi** terjual\n` +
      `   - Pendapatan: *Rp 63.000*\n` +
      `   - Kontribusi Margin: *Rp 18.000*\n\n` +
      `💡 **Rekomendasi Pemasaran:**\n` +
      `Pertimbangkan bundling paket hemat **"Indomie Goreng + Kopi Susu Aren"** seharga **Rp 14.500** (hemat Rp 1.000) untuk mendongkrak rata-rata pembelian per pelanggan.`
  }

  if (normalized.includes('prediksi') || normalized.includes('ramalan') || normalized.includes('forecast')) {
    return `### 🔮 Prediksi Penjualan Kopi Susu Gula Aren\n\n` +
      `Menggunakan model perkiraan berdasarkan histori transaksi 7 hari terakhir:\n\n` +
      `| Tanggal Prediksi | Ekspektasi Volume | Probabilitas | Rekomendasi Stok |\n` +
      `| :--- | :---: | :---: | :---: |\n` +
      `| Besok (Kamis) | **26 porsi** | Tinggi (92%) | Siapkan 30 porsi bahan baku |\n` +
      `| Lusa (Jumat) | **32 porsi** | Sangat Tinggi (95%) | Siapkan 40 porsi bahan baku |\n` +
      `| Sabtu | **38 porsi** | Sangat Tinggi (97%) | Siapkan 45 porsi bahan baku |\n\n` +
      `⚠️ **Peringatan Operasional:**\n` +
      `Sisa stok bahan baku kopi susu Anda saat ini hanya setara untuk **5 porsi** (di bawah batas minimal 10). Harap lakukan restock susu cair segar dan gula aren cair hari ini juga agar tidak kehabisan stok menjelang lonjakan akhir pekan.`
  }

  // Generic fallback
  return `Halo! Saya adalah **Asisten AI WarungKu**. Saya dapat membantu Anda menganalisis performa bisnis dan persediaan barang secara cerdas.\n\n` +
    `Coba ajukan beberapa pertanyaan analitis seperti:\n` +
    `- *"Lakukan audit produk dengan stok menipis"* \n` +
    `- *"Analisis performa penjualan hari ini"* \n` +
    `- *"Prediksi penjualan kopi susu aren"*`
}

// ----------------------------------------------------
// Session Actions
// ----------------------------------------------------
async function fetchSessions() {
  loadingSessions.value = true
  if (isDemo.value) {
    const raw = localStorage.getItem('warungku_ai_sessions')
    if (raw) {
      sessions.value = JSON.parse(raw)
    } else {
      const initial: Session[] = [
        {
          id: 'session-demo-1',
          title: 'Audit Persediaan Sembako',
          last_active_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'session-demo-2',
          title: 'Analisis Margin Penjualan',
          last_active_at: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]
      localStorage.setItem('warungku_ai_sessions', JSON.stringify(initial))
      sessions.value = initial
    }

    if (sessions.value.length > 0 && !activeSessionId.value) {
      activeSessionId.value = sessions.value[0]?.id || null
    }
    loadingSessions.value = false
    return
  }

  if (!user.value) {
    loadingSessions.value = false
    return
  }

  try {
    const { data, error } = await (supabase as any)
      .from('ai_sessions')
      .select('*')
      .order('last_active_at', { ascending: false })

    if (error) throw error
    sessions.value = data || []

    if (sessions.value.length > 0 && !activeSessionId.value) {
      activeSessionId.value = sessions.value[0]?.id || null
    }
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat sesi',
      description: err.message,
      color: 'error'
    })
  } finally {
    loadingSessions.value = false
  }
}

async function createNewSession(customTitle?: string) {
  const newTitle = customTitle || `Analisis Baru #${sessions.value.length + 1}`

  if (isDemo.value) {
    const newSess: Session = {
      id: `session-demo-${Date.now()}`,
      title: newTitle,
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
    sessions.value = [newSess, ...sessions.value]
    localStorage.setItem('warungku_ai_sessions', JSON.stringify(sessions.value))
    activeSessionId.value = newSess.id
    messages.value = []
    return
  }

  if (!user.value) return

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
      sessions.value = [data as any, ...sessions.value]
      activeSessionId.value = data.id
      messages.value = []
      toast.add({
        title: 'Sesi baru dibuat',
        description: `Memulai percakapan "${newTitle}"`,
        color: 'success'
      })
    }
  } catch (err: any) {
    toast.add({
      title: 'Gagal membuat sesi baru',
      description: err.message,
      color: 'error'
    })
  }
}

function openRenameSession(sess: Session) {
  renamingSession.value = sess
  editSessionName.value = sess.title
  isRenameModalOpen.value = true
}

async function renameSession() {
  if (!renamingSession.value || !editSessionName.value.trim()) return

  if (isDemo.value) {
    const idx = sessions.value.findIndex(s => s.id === renamingSession.value!.id)
    if (idx !== -1 && sessions.value[idx]) {
      sessions.value[idx]!.title = editSessionName.value
      localStorage.setItem('warungku_ai_sessions', JSON.stringify(sessions.value))
      toast.add({
        title: 'Sesi diubah nama',
        color: 'success'
      })
    }
    isRenameModalOpen.value = false
    renamingSession.value = null
    return
  }

  try {
    const { error } = await (supabase as any)
      .from('ai_sessions')
      .update({ title: editSessionName.value })
      .eq('id', renamingSession.value.id)

    if (error) throw error

    const idx = sessions.value.findIndex(s => s.id === renamingSession.value!.id)
    if (idx !== -1 && sessions.value[idx]) {
      sessions.value[idx]!.title = editSessionName.value
    }
    toast.add({
      title: 'Sesi berhasil diubah nama',
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'Gagal mengubah nama sesi',
      description: err.message,
      color: 'error'
    })
  } finally {
    isRenameModalOpen.value = false
    renamingSession.value = null
  }
}

async function deleteSession(id: string) {
  if (isDemo.value) {
    sessions.value = sessions.value.filter(s => s.id !== id)
    localStorage.setItem('warungku_ai_sessions', JSON.stringify(sessions.value))

    // Clear local messages of that session
    const localMsgsRaw = localStorage.getItem('warungku_ai_messages')
    if (localMsgsRaw) {
      const localMsgs = JSON.parse(localMsgsRaw)
      delete localMsgs[id]
      localStorage.setItem('warungku_ai_messages', JSON.stringify(localMsgs))
    }

    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value.length > 0 ? (sessions.value[0]?.id || null) : null
    }
    toast.add({
      title: 'Sesi dihapus',
      color: 'success'
    })
    return
  }

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
  } catch (err: any) {
    toast.add({
      title: 'Gagal menghapus sesi',
      description: err.message,
      color: 'error'
    })
  }
}

// ----------------------------------------------------
// Message History Actions
// ----------------------------------------------------
async function fetchMessages(sessId: string) {
  loadingMessages.value = true
  streamingText.value = ''
  typingIndex.value = -1

  if (isDemo.value) {
    const localMsgsRaw = localStorage.getItem('warungku_ai_messages')
    if (localMsgsRaw) {
      const localMsgs = JSON.parse(localMsgsRaw)
      messages.value = localMsgs[sessId] || []
    } else {
      // Seed some initial welcome message
      const initial: Message[] = [
        {
          id: 'msg-demo-1',
          query_text: 'Halo asisten!',
          response_text: 'Halo! Saya adalah **Asisten AI WarungKu** yang siap membantu Anda memantau performa warung dan persediaan barang secara cerdas.\n\nPilih salah satu rekomendasi pintasan di bawah ini untuk segera mulai!',
          query_type: 'analysis',
          created_at: new Date().toISOString()
        }
      ]
      const localDict = { [sessId]: initial }
      localStorage.setItem('warungku_ai_messages', JSON.stringify(localDict))
      messages.value = initial
    }
    loadingMessages.value = false
    return
  }

  try {
    const { data, error } = await (supabase as any)
      .from('ai_query_logs')
      .select('*')
      .eq('session_id', sessId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Fetch related feedbacks to merge ratings
    const logIds = (data || []).map((d: any) => d.id)
    let feedbackMap: Record<string, string> = {}

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

    messages.value = (data || []).map((d: any) => ({
      id: d.id,
      query_text: d.query_text,
      response_text: d.response_text,
      query_type: d.query_type as any,
      created_at: d.created_at,
      rating: (feedbackMap[d.id] || null) as any
    }))
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat pesan',
      description: err.message,
      color: 'error'
    })
  } finally {
    loadingMessages.value = false
  }
}

// Watch session select
watch(activeSessionId, (newVal) => {
  if (newVal) {
    fetchMessages(newVal)
  } else {
    messages.value = []
  }
})

// ----------------------------------------------------
// Message Submit flow (Streaming Typewriter Engine)
// ----------------------------------------------------
async function sendMessage(customPrompt?: string, customType?: 'analysis' | 'recommendation' | 'forecast' | 'content_gen' | 'anomaly') {
  const finalPrompt = customPrompt || messageInput.value.trim()
  const finalType = customType || 'analysis'

  if (!finalPrompt) return
  if (!activeSessionId.value) {
    // Auto create a session first
    await createNewSession(finalPrompt.length > 20 ? finalPrompt.substring(0, 20) + '...' : finalPrompt)
  }

  const currentSessId = activeSessionId.value!
  messageInput.value = ''
  sendingMessage.value = true
  streamingText.value = ''

  // 1. Instantly append user's temporary pending message
  const userMsgId = `temp-user-${Date.now()}`
  const userMsg: Message = {
    id: userMsgId,
    query_text: finalPrompt,
    response_text: '',
    query_type: finalType,
    created_at: new Date().toISOString()
  }
  messages.value.push(userMsg)

  // Auto-scroll chat area
  scrollToBottom()

  // 2. Generate appropriate response
  const fullResponseText = generateDemoResponse(finalPrompt, finalType)

  if (isDemo.value) {
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800))

    // Streaming typewriter engine
    typingIndex.value = messages.value.length - 1
    let currentLen = 0
    const step = 5 // characters per tick
    const interval = setInterval(() => {
      currentLen += step
      streamingText.value = fullResponseText.substring(0, currentLen)
      scrollToBottom()

      if (currentLen >= fullResponseText.length) {
        clearInterval(interval)

        // Commit full message to localStorage
        const finalMsg: Message = {
          id: `msg-demo-${Date.now()}`,
          query_text: finalPrompt,
          response_text: fullResponseText,
          query_type: finalType,
          created_at: new Date().toISOString()
        }

        // Replace temp pending message with actual one
        const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
        if (tempIdx !== -1) {
          messages.value[tempIdx] = finalMsg
        }

        // Save session history locally
        const localMsgsRaw = localStorage.getItem('warungku_ai_messages')
        const localDict = localMsgsRaw ? JSON.parse(localMsgsRaw) : {}
        localDict[currentSessId] = messages.value
        localStorage.setItem('warungku_ai_messages', JSON.stringify(localDict))

        // Update session's last active at
        const sessIdx = sessions.value.findIndex(s => s.id === currentSessId)
        if (sessIdx !== -1 && sessions.value[sessIdx]) {
          sessions.value[sessIdx]!.last_active_at = new Date().toISOString()
          localStorage.setItem('warungku_ai_sessions', JSON.stringify(sessions.value))
        }

        streamingText.value = ''
        typingIndex.value = -1
        sendingMessage.value = false
        scrollToBottom()
      }
    }, 20)
    return
  }

  // Live mode connectivity
  if (!user.value) return

  try {
    // Send prompt to backend API which handles vector search and logging
    const res = await $fetch<any>('/api/ai/chat', {
      method: 'POST',
      body: {
        query_text: finalPrompt,
        session_id: currentSessId,
        query_type: finalType
      }
    })

    if (res && res.success) {
      const finalMsg: Message = {
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
    }
  } catch (err: any) {
    toast.add({
      title: 'Gagal mengirim pesan',
      description: err.message,
      color: 'error'
    })
    // Set message as failed in the UI list
    const tempIdx = messages.value.findIndex(m => m.id === userMsgId)
    if (tempIdx !== -1 && messages.value[tempIdx]) {
      messages.value[tempIdx]!.failed = true
      messages.value[tempIdx]!.error_text = err.message || 'Koneksi terputus. Silakan coba lagi.'
    }
  } finally {
    sendingMessage.value = false
    scrollToBottom()
  }
}

async function retryMessage(failedMsg: Message) {
  // Remove the failed message from UI list
  messages.value = messages.value.filter(m => m.id !== failedMsg.id)
  // Re-send it
  await sendMessage(failedMsg.query_text, failedMsg.query_type)
}

// ----------------------------------------------------
// Feedback & Ratings
// ----------------------------------------------------
async function rateResponse(message: Message, rating: 'helpful' | 'not_helpful') {
  if (isDemo.value) {
    message.rating = rating
    // Save to local storage dictionary
    const localMsgsRaw = localStorage.getItem('warungku_ai_messages')
    if (localMsgsRaw && activeSessionId.value) {
      const localDict = JSON.parse(localMsgsRaw)
      localDict[activeSessionId.value] = messages.value
      localStorage.setItem('warungku_ai_messages', JSON.stringify(localDict))
    }
    toast.add({
      title: 'Terima kasih atas tanggapan Anda!',
      color: 'success'
    })
    return
  }

  try {
    // Insert/upsert feedback table
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
  } catch (err: any) {
    toast.add({
      title: 'Gagal memberikan tanggapan',
      description: err.message,
      color: 'error'
    })
  }
}

// Scroll layout helper
const chatContainer = ref<HTMLElement | null>(null)
function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Format markdown list / tables helper
function formatMarkdown(text: string) {
  if (!text) return ''
  // 1. Escape HTML
  let clean = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. Headings
  clean = clean.replace(/^### (.*$)/gim, '<h3 class="text-base font-extrabold text-default mt-4 mb-2">$1</h3>')
  clean = clean.replace(/^## (.*$)/gim, '<h2 class="text-lg font-black text-default mt-5 mb-2">$1</h2>')

  // 3. Bold
  clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-default">$1</strong>')

  // 4. Code block markers & inline code
  clean = clean.replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-default">$1</code>')

  // 5. Bullet list items
  clean = clean.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-toned text-sm py-0.5">$1</li>')

  // 6. Simple Table parser helper
  if (clean.includes('|')) {
    const lines = clean.split('\n')
    let inTable = false
    let tableHtml = '<div class="overflow-x-auto my-3 border border-default rounded-xl bg-muted/20"><table class="min-w-full text-xs font-sans border-collapse">'
    
    lines.forEach((line) => {
      if (line.trim().startsWith('|') && line.includes('---')) {
        // Divider row, skip
        inTable = true
      } else if (line.trim().startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1)
        if (cells.length > 0) {
          const rowTag = !inTable ? 'th class="px-4 py-2 border-b border-default text-left font-extrabold text-toned uppercase tracking-wider bg-muted/40"' : 'td class="px-4 py-2 border-b border-default text-toned"'
          tableHtml += `<tr>`
          cells.forEach((cell) => {
            // Apply simple bold matches to cell content
            let cellContent = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            cellContent = cellContent.replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-[10px] font-mono">$1</code>')
            tableHtml += `<${rowTag}>${cellContent}</${rowTag.split(' ')[0]}>`
          })
          tableHtml += `</tr>`
          inTable = true
        }
      } else {
        if (inTable) {
          tableHtml += '</table></div>'
          clean = clean.replace(line, tableHtml + '\n' + line)
          inTable = false
          tableHtml = ''
        }
      }
    })
  }

  return clean
}

onMounted(() => {
  fetchSessions()
})
</script>

<template>
  <div class="h-[calc(100vh-100px)] md:h-[calc(100vh-60px)] flex flex-col max-w-7xl mx-auto w-full relative overflow-hidden bg-background">
    <!-- Main Pane Structure -->
    <div class="flex-grow flex w-full h-full relative overflow-hidden">
      
      <!-- Session Sidebar Pane (REMOVED: Now a separate modal) -->

      <!-- Chat Workspace Area (Now takes full width for editorial style) -->
      <section class="flex-grow flex flex-col h-full overflow-hidden bg-background">
        <!-- Dashboard Workspace Header -->
        <header class="p-4 border-b border-default flex items-center justify-between bg-elevated/10 shrink-0">
          <div class="flex items-center gap-3">
            <UButton
              color="neutral"
              variant="outline"
              size="md"
              icon="i-lucide-history"
              label="Riwayat Sesi"
              class="rounded-xl active:scale-[0.98] font-bold text-xs md:text-sm"
              @click="isHistoryModalOpen = true"
            />
            <div>
              <h1 class="text-sm font-bold text-default tracking-tight flex items-center gap-2">
                <UIcon name="i-lucide-sparkles" class="text-primary animate-pulse size-4" />
                Asisten AI Coach
                <span v-if="activeSession" class="text-xs text-toned font-bold px-2 py-0.5 rounded-md bg-muted/60 border border-default truncate max-w-[150px] md:max-w-[250px]">
                  {{ activeSession.title }}
                </span>
              </h1>
              <p class="text-xs text-toned tracking-tight">Grounded in actual shop status • Demo Mode Fallbacks active</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span
              v-if="isDemo"
              class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 uppercase tracking-widest border border-amber-500/20"
            >
              Demo Mode
            </span>
            <span
              v-else
              class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success uppercase tracking-widest border border-success/20"
            >
              Live Sync
            </span>
          </div>
        </header>

        <!-- Message List View -->
        <div
          ref="chatContainer"
          class="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col gap-6 no-scrollbar"
        >
          <!-- Welcome Screen (Zero message state) -->
          <div
            v-if="messages.length === 0"
            class="flex-grow flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 px-4"
          >
            <div class="p-3 bg-primary/10 rounded-2xl mb-4 shrink-0">
              <UIcon name="i-lucide-brain-circuit" class="size-10 text-primary animate-pulse" />
            </div>
            <h2 class="text-2xl font-black text-default tracking-tight">Kendali Warung Anda Lebih Cerdas</h2>
            <p class="text-sm text-toned mt-2 max-w-md leading-relaxed">
              Tanyakan persediaan stok barang, analisis pergerakan keuntungan bulanan, atau buat ramalan reorder belanja dengan AI Coach.
            </p>

            <!-- Progressive Disclosure Trigger -->
            <div class="mt-6">
              <UButton
                color="neutral"
                variant="soft"
                size="md"
                :icon="showSuggestions ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="active:scale-[0.98] rounded-full px-5 font-bold text-sm"
                @click="showSuggestions = !showSuggestions"
              >
                {{ showSuggestions ? 'Sembunyikan Ide Pertanyaan' : 'Lihat Rekomendasi Pertanyaan' }}
              </UButton>
            </div>

            <!-- Staggered Spring Presets Grid (Progressive Disclosure) -->
            <div v-if="showSuggestions" class="w-full mt-8">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div
                  v-for="preset in promptPresets"
                  :key="preset.label"
                  class="bg-elevated/40 p-4 rounded-2xl border border-default text-left hover:border-primary/30 hover:bg-elevated/80 transition-all cursor-pointer active:scale-[0.98] group flex flex-col gap-2"
                  @click="sendMessage(preset.prompt, preset.type)"
                >
                  <div class="flex items-center gap-2">
                    <div class="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <UIcon :name="preset.icon" class="size-5 text-primary" />
                    </div>
                    <h3 class="text-sm font-bold text-default tracking-tight group-hover:text-primary transition-colors">
                      {{ preset.label }}
                    </h3>
                  </div>
                  <p class="text-sm text-toned leading-relaxed font-semibold">
                    {{ preset.desc }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Message Feed -->
          <div
            v-else
            class="flex flex-col gap-6"
          >
            <div
              v-for="(msg, index) in messages"
              :key="msg.id"
              class="flex flex-col gap-2"
            >
              <!-- User Message -->
              <div class="flex justify-end items-start gap-3">
                <div class="bg-primary text-primary-foreground text-sm font-medium px-4 py-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] leading-relaxed font-sans">
                  {{ msg.query_text }}
                </div>
                <UAvatar
                  src="https://i.pravatar.cc/150?u=warungkuadmin2026"
                  alt="U"
                  size="xs"
                  class="ring-2 ring-primary/20 shrink-0 mt-1"
                />
              </div>

              <!-- Assistant Message / Thinking / Failed -->
              <div class="flex justify-start items-start gap-3 mt-1">
                <div class="p-1 bg-primary/10 rounded-xl shrink-0 mt-1">
                  <UIcon name="i-lucide-brain-circuit" class="size-5 text-primary" />
                </div>
                
                <!-- Failed Message Card -->
                <div v-if="msg.failed" class="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl rounded-tl-none shadow-xs max-w-[85%] flex flex-col gap-3">
                  <div class="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400 font-bold">
                    <UIcon name="i-lucide-alert-circle" class="size-5 shrink-0 animate-bounce" />
                    <span>Gagal memproses analisis</span>
                  </div>
                  <p class="text-sm text-rose-600 dark:text-rose-400/80 leading-relaxed font-semibold">
                    {{ msg.error_text || 'Terjadi kesalahan jaringan atau batasan sesi. Silakan coba kirim ulang.' }}
                  </p>
                  <div class="flex justify-start">
                    <UButton
                      color="error"
                      variant="subtle"
                      size="sm"
                      icon="i-lucide-refresh-cw"
                      class="active:scale-[0.98] rounded-lg font-bold text-sm"
                      @click="retryMessage(msg)"
                    >
                      Coba Lagi
                    </UButton>
                  </div>
                </div>

                <!-- Normal Assistant Message -->
                <div v-else class="bg-elevated border border-default p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] flex flex-col gap-3">
                  
                  <!-- Response Render -->
                  <div
                    v-if="index === typingIndex && streamingText"
                    class="text-sm text-toned leading-relaxed font-sans flex flex-col gap-2 break-words"
                    v-html="formatMarkdown(streamingText)"
                  />
                  <div
                    v-else-if="msg.response_text"
                    class="text-sm text-toned leading-relaxed font-sans flex flex-col gap-2 break-words"
                    v-html="formatMarkdown(msg.response_text)"
                  />
                  <div
                    v-else
                    class="flex items-center gap-2.5 text-sm text-toned py-1"
                  >
                    <UIcon name="i-lucide-loader-2" class="animate-spin text-primary size-5" />
                    <span>Sedang berpikir...</span>
                  </div>

                  <!-- Feedback Section -->
                  <div
                    v-if="msg.response_text && !sendingMessage"
                    class="flex items-center justify-between border-t border-default/50 pt-3 mt-1"
                  >
                    <span class="text-sm text-toned font-medium tracking-tight">Apakah analisis ini membantu?</span>
                    <div class="flex items-center gap-2">
                      <UButton
                        color="neutral"
                        :variant="msg.rating === 'helpful' ? 'solid' : 'ghost'"
                        size="md"
                        icon="i-lucide-thumbs-up"
                        class="rounded-xl active:scale-[0.98] px-4 py-3"
                        @click="rateResponse(msg, 'helpful')"
                      />
                      <UButton
                        color="neutral"
                        :variant="msg.rating === 'not_helpful' ? 'solid' : 'ghost'"
                        size="md"
                        icon="i-lucide-thumbs-down"
                        class="rounded-xl active:scale-[0.98] px-4 py-3"
                        @click="rateResponse(msg, 'not_helpful')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Input Form Container -->
        <footer class="p-4 border-t border-default bg-elevated/20 shrink-0">
          <form
            class="flex items-center gap-3 max-w-4xl mx-auto w-full relative"
            @submit.prevent="sendMessage()"
          >
            <UInput
              v-model="messageInput"
              placeholder="Tanyakan analisis stok barang, tren penjualan, atau laba..."
              class="flex-1 rounded-xl shadow-none font-medium text-sm focus:ring-primary focus:border-primary"
              :disabled="sendingMessage || loadingMessages"
              size="lg"
            />
            <UButton
              type="submit"
              color="primary"
              size="lg"
              :icon="sendingMessage ? 'i-lucide-loader-2 animate-spin' : 'i-lucide-send'"
              :disabled="(!messageInput.trim() && !sendingMessage) || loadingMessages"
              class="active:scale-[0.98] rounded-xl shrink-0 px-6 font-bold text-sm"
            >
              {{ sendingMessage ? 'Mengirim...' : 'Kirim' }}
            </UButton>
          </form>
        </footer>
      </section>
    </div>

    <!-- Session History Modal -->
    <UModal
      v-model:open="isHistoryModalOpen"
      title="Riwayat Sesi Analisis AI"
      description="Kelola dan telusuri riwayat percakapan analitis Anda dengan AI Coach."
    >
      <template #content>
        <div class="p-5 flex flex-col h-[500px] overflow-hidden bg-elevated rounded-[2rem] border border-default shadow-xl">
          <!-- Modal Header Controls -->
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-default shrink-0">
            <span class="text-sm font-bold text-default uppercase tracking-wider">Daftar Percakapan</span>
            <UButton
              color="primary"
              variant="solid"
              size="md"
              icon="i-lucide-plus"
              class="active:scale-[0.98] rounded-xl font-bold text-sm"
              @click="() => { createNewSession(); isHistoryModalOpen = false; }"
            >
              Sesi Baru
            </UButton>
          </div>

          <!-- Session List Container (Scrollable) -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 no-scrollbar">
            <div v-if="loadingSessions" class="flex flex-col gap-2 py-2">
              <USkeleton class="h-12 w-full rounded-xl" />
              <USkeleton class="h-12 w-full rounded-xl" />
              <USkeleton class="h-12 w-full rounded-xl" />
            </div>

            <div v-else-if="sessions.length === 0" class="text-center py-16">
              <UIcon name="i-lucide-sparkles" class="size-10 text-muted mx-auto mb-3 opacity-40" />
              <p class="text-sm font-semibold text-toned">Belum ada sesi analisis</p>
              <p class="text-xs text-muted mt-1">Buat sesi baru untuk mulai bertanya pada AI Coach.</p>
            </div>

            <div
              v-else
              v-for="sess in sessions"
              :key="sess.id"
              class="group relative flex items-center rounded-xl p-3.5 text-sm font-medium transition-all cursor-pointer border active:scale-[0.98]"
              :class="[
                sess.id === activeSessionId
                  ? 'bg-primary/5 text-primary border-primary/20 font-bold'
                  : 'hover:bg-muted/40 border-default text-toned'
              ]"
              @click="() => { activeSessionId = sess.id; isHistoryModalOpen = false; }"
            >
              <UIcon
                name="i-lucide-message-square"
                class="size-5 shrink-0 mr-3"
                :class="sess.id === activeSessionId ? 'text-primary' : 'text-toned'"
              />
              <div class="flex flex-col flex-1 pr-12 min-w-0">
                <span class="truncate text-sm font-bold leading-tight mb-1 text-default">{{ sess.title }}</span>
                <span class="text-xs text-toned font-semibold font-mono leading-none">
                  {{ new Date(sess.last_active_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>

              <!-- Thread Actions Dropdown -->
              <div class="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <UDropdownMenu
                  :items="[[
                    {
                      label: 'Ubah Nama',
                      icon: 'i-lucide-pencil',
                      onSelect: () => openRenameSession(sess)
                    },
                    {
                      label: 'Hapus Sesi',
                      icon: 'i-lucide-trash',
                      color: 'error' as const,
                      onSelect: () => deleteSession(sess.id)
                    }
                  ]]"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-lucide-more-vertical"
                    class="rounded-lg hover:bg-muted"
                    @click.stop
                  />
                </UDropdownMenu>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-3 border-t border-default mt-4 shrink-0">
            <UButton
              color="neutral"
              variant="outline"
              class="active:scale-[0.98] rounded-xl font-bold text-xs"
              @click="isHistoryModalOpen = false"
            >
              Tutup
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Rename Session Modal -->
    <UModal
      v-model:open="isRenameModalOpen"
      title="Ubah Nama Sesi"
      description="Ubah nama identitas sesi percakapan analitis ini."
    >
      <div class="p-4 flex flex-col gap-4">
        <UInput
          v-model="editSessionName"
          placeholder="Nama sesi..."
          class="w-full focus:ring-primary"
          @keyup.enter="renameSession()"
        />
        <div class="flex justify-end gap-2.5">
          <UButton
            color="neutral"
            variant="ghost"
            class="active:scale-[0.98] rounded-xl font-bold text-xs"
            @click="isRenameModalOpen = false"
          >
            Batal
          </UButton>
          <UButton
            color="primary"
            class="active:scale-[0.98] rounded-xl font-bold text-xs"
            @click="renameSession()"
          >
            Simpan
          </UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

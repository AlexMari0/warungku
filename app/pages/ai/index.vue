<script setup lang="ts">
import type { AIMessageUI } from '~/core/types'

definePageMeta({
  layout: 'default'
})

const {
  sessions,
  activeSessionId,
  activeSession,
  messages,
  loadingSessions,
  loadingMessages,
  sendingMessage,
  fetchSessions,
  createSession: createNewSession,
  renameSession: performRenameSession,
  deleteSession,
  fetchMessages,
  sendMessage: sendCoachMessage,
  retryMessage: retryCoachMessage,
  rateResponse
} = useAICoach()

const streamingText = ref('')
const typingIndex = ref(-1)
const messageInput = ref('')
const isHistoryModalOpen = ref(false)

// Watch session select
watch(activeSessionId, (newVal) => {
  if (newVal) {
    fetchMessages(newVal)
  } else {
    messages.value = []
  }
})

// Scroll layout helper
const chatContainer = ref<HTMLElement | null>(null)
function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Message Submit flow
async function sendMessage(customPrompt?: string, customType?: 'analysis' | 'recommendation' | 'forecast' | 'content_gen' | 'anomaly') {
  const finalPrompt = customPrompt || messageInput.value.trim()
  const finalType = customType || 'analysis'

  if (!finalPrompt) return
  messageInput.value = ''
  await sendCoachMessage(finalPrompt, finalType, scrollToBottom)
}

async function retryMessage(failedMsg: AIMessageUI) {
  await retryCoachMessage(failedMsg, scrollToBottom)
}

onMounted(() => {
  fetchSessions()
})
</script>

<template>
  <div class="h-[calc(100vh-100px)] md:h-[calc(100vh-60px)] flex flex-col max-w-7xl mx-auto w-full relative overflow-hidden bg-background">
    <!-- Main Pane Structure -->
    <div class="flex-grow flex w-full h-full relative overflow-hidden">
      <!-- Chat Workspace Area -->
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
              class="rounded-xl active:scale-[0.98] font-bold text-xs md:text-sm cursor-pointer"
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
              <p class="text-xs text-toned tracking-tight">Grounded in actual shop status • Real-time vector search</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span
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
          <AiPromptPresetsGrid
            v-if="messages.length === 0"
            @select-preset="sendMessage"
          />

          <!-- Active Message Feed -->
          <div
            v-else
            class="flex flex-col gap-6"
          >
            <AiChatMessageBubble
              v-for="(msg, index) in messages"
              :key="msg.id"
              :message="msg"
              :index="index"
              :typing-index="typingIndex"
              :streaming-text="streamingText"
              :sending-message="sendingMessage"
              @retry="retryMessage"
              @rate="rateResponse"
            />
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
              class="active:scale-[0.98] rounded-xl shrink-0 px-6 font-bold text-sm cursor-pointer"
            >
              {{ sendingMessage ? 'Mengirim...' : 'Kirim' }}
            </UButton>
          </form>
        </footer>
      </section>
    </div>

    <!-- Session History & Rename Modals -->
    <AiSessionSidebar
      v-model:is-open="isHistoryModalOpen"
      :sessions="sessions"
      :active-session-id="activeSessionId"
      :loading-sessions="loadingSessions"
      @select-session="activeSessionId = $event"
      @create-session="createNewSession"
      @rename-session="performRenameSession"
      @delete-session="deleteSession"
    />
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

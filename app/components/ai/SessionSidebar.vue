<script setup lang="ts">
import type { AISession } from '~/types'

defineProps<{
  isOpen: boolean
  sessions: AISession[]
  activeSessionId: string | null
  loadingSessions: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'select-session': [sessionId: string]
  'create-session': []
  'rename-session': [sessionId: string, newTitle: string]
  'delete-session': [sessionId: string]
}>()

const isRenameModalOpen = ref(false)
const renamingSession = ref<AISession | null>(null)
const editSessionName = ref('')

function openRenameSession(sess: AISession) {
  renamingSession.value = sess
  editSessionName.value = sess.title
  isRenameModalOpen.value = true
}

function handleRenameSession() {
  if (!renamingSession.value || !editSessionName.value.trim()) return
  emit('rename-session', renamingSession.value.id, editSessionName.value)
  isRenameModalOpen.value = false
  renamingSession.value = null
}
</script>

<template>
  <div>
    <!-- Session History Modal -->
    <UModal
      :open="isOpen"
      title="Riwayat Sesi Analisis AI"
      description="Kelola dan telusuri riwayat percakapan analitis Anda dengan AI Coach."
      @update:open="emit('update:isOpen', $event)"
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
              class="active:scale-[0.98] rounded-xl font-bold text-sm cursor-pointer"
              @click="() => { emit('create-session'); emit('update:isOpen', false); }"
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
              @click="() => { emit('select-session', sess.id); emit('update:isOpen', false); }"
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
                      onSelect: () => emit('delete-session', sess.id)
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
              class="active:scale-[0.98] rounded-xl font-bold text-xs cursor-pointer"
              @click="emit('update:isOpen', false)"
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
          @keyup.enter="handleRenameSession()"
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
            @click="handleRenameSession()"
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

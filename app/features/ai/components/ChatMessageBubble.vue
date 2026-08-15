<script setup lang="ts">
import type { AIMessageUI } from '~/core/types'

defineProps<{
  message: AIMessageUI
  index: number
  typingIndex: number
  streamingText: string
  sendingMessage: boolean
}>()

const emit = defineEmits<{
  retry: [message: AIMessageUI]
  rate: [message: AIMessageUI, rating: 'helpful' | 'not_helpful']
}>()

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
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- User Message -->
    <div class="flex justify-end items-start gap-3">
      <div class="bg-primary text-primary-foreground text-sm font-medium px-4 py-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] leading-relaxed font-sans">
        {{ message.query_text }}
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
      <div v-if="message.failed" class="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl rounded-tl-none shadow-xs max-w-[85%] flex flex-col gap-3">
        <div class="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-400 font-bold">
          <UIcon name="i-lucide-alert-circle" class="size-5 shrink-0 animate-bounce" />
          <span>Gagal memproses analisis</span>
        </div>
        <p class="text-sm text-rose-600 dark:text-rose-400/80 leading-relaxed font-semibold">
          {{ message.error_text || 'Terjadi kesalahan jaringan atau batasan sesi. Silakan coba kirim ulang.' }}
        </p>
        <div class="flex justify-start">
          <UButton
            color="error"
            variant="subtle"
            size="sm"
            icon="i-lucide-refresh-cw"
            class="active:scale-[0.98] rounded-lg font-bold text-sm"
            @click="emit('retry', message)"
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
          v-else-if="message.response_text"
          class="text-sm text-toned leading-relaxed font-sans flex flex-col gap-2 break-words"
          v-html="formatMarkdown(message.response_text)"
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
          v-if="message.response_text && !sendingMessage"
          class="flex items-center justify-between border-t border-default/50 pt-3 mt-1"
        >
          <span class="text-sm text-toned font-medium tracking-tight">Apakah analisis ini membantu?</span>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              :variant="message.rating === 'helpful' ? 'solid' : 'ghost'"
              size="md"
              icon="i-lucide-thumbs-up"
              class="rounded-xl active:scale-[0.98] px-4 py-3"
              @click="emit('rate', message, 'helpful')"
            />
            <UButton
              color="neutral"
              :variant="message.rating === 'not_helpful' ? 'solid' : 'ghost'"
              size="md"
              icon="i-lucide-thumbs-down"
              class="rounded-xl active:scale-[0.98] px-4 py-3"
              @click="emit('rate', message, 'not_helpful')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StoreThemeClasses } from '~/utils/storeThemes'

defineProps<{
  isOpen: boolean
  customerName: string
  orderId: string | undefined
  whatsAppLink: string
  activeThemeClasses: StoreThemeClasses
}>()

const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-elevated border border-default p-8 rounded-[2rem] shadow-2xl text-center space-y-6 relative">
        
        <div
          class="size-16 rounded-full flex items-center justify-center mx-auto"
          :class="[!activeThemeClasses.isCustom ? `${activeThemeClasses.primaryBg} ${activeThemeClasses.textColor}` : '']"
          :style="activeThemeClasses.isCustom ? { backgroundColor: activeThemeClasses.customColor + '1F', color: activeThemeClasses.customColor } : {}"
        >
          <UIcon name="i-lucide-badge-check" class="size-10" />
        </div>

        <div class="space-y-2 text-center">
          <h3 class="text-xl font-black text-default tracking-tight">Pesanan Berhasil Dicatat!</h3>
          <p class="text-xs text-toned font-light">
            Terima kasih <strong>{{ customerName }}</strong>, pesanan Anda telah tersimpan dengan nomor transaksi:
          </p>
          <div class="bg-muted/30 p-2.5 rounded-xl border border-default text-xs font-mono font-bold text-default inline-block mt-2">
            ID: {{ orderId }}
          </div>
        </div>

        <div class="space-y-3.5 text-left border border-default p-4 rounded-2xl bg-muted/5">
          <span class="text-[9px] font-mono font-bold text-muted uppercase tracking-widest block mb-2">Pemberitahuan</span>
          <p class="text-[11px] text-toned leading-relaxed">
            Untuk mempercepat proses pengemasan dan manual payment, mohon klik tombol **Kirim via WhatsApp** di bawah untuk mengirim data belanja langsung ke penjual.
          </p>
        </div>

        <div class="flex flex-col gap-2 pt-2">
          <UButton
            color="success"
            variant="solid"
            icon="i-lucide-message-square"
            class="w-full justify-center py-2.5 rounded-xl font-bold cursor-pointer"
            :to="whatsAppLink"
            target="_blank"
          >
            Kirim via WhatsApp
          </UButton>

          <UButton
            color="neutral"
            variant="soft"
            class="w-full justify-center py-2 rounded-xl cursor-pointer"
            @click="emit('reset')"
          >
            Kembali Belanja
          </UButton>
        </div>

      </div>
    </div>
  </Transition>
</template>

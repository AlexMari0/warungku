<script setup lang="ts">
const emit = defineEmits<{
  'select-preset': [prompt: string, type: 'analysis' | 'recommendation' | 'forecast' | 'content_gen' | 'anomaly']
}>()

const showSuggestions = ref(false)

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
</script>

<template>
  <div class="flex-grow flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 px-4">
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
          @click="emit('select-preset', preset.prompt, preset.type)"
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
</template>

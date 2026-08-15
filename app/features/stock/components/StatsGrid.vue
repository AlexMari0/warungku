<script setup lang="ts">
import { Motion } from 'motion-v'

export interface StockStats {
  totalProducts: number
  lowStock: number
  totalCategories: number
  valuation: number
}

defineProps<{
  stats: StockStats
}>()
</script>

<template>
  <ClientOnly>
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
      <!-- Card 1: Valuation (col-span-5) -->
      <Motion
        class="md:col-span-5"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, type: 'spring', bounce: 0.15, delay: 0.1 }"
      >
        <div class="bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800/80 p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] flex flex-col justify-between min-h-[180px] group transition-all duration-500 hover:-translate-y-1">
          <div class="flex items-start justify-between w-full">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-mono tracking-wider uppercase text-zinc-400">Nilai Aset Inventaris</span>
              <h3 class="text-3xl font-black text-white tracking-tight font-mono truncate mt-1">
                {{ formatRupiah(stats.valuation) }}
              </h3>
            </div>
            <UTooltip text="Buka Riwayat Mutasi Stok" :ui="{ content: 'max-w-fit' }">
              <UButton
                to="/stock/movements"
                icon="i-lucide-history"
                color="neutral"
                variant="subtle"
                label="Riwayat Mutasi"
                class="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 active:scale-95 transition-all text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5"
              />
            </UTooltip>
          </div>
          <div class="flex items-center gap-2 text-xs text-zinc-400 mt-4 font-mono">
            <span class="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Sesuai harga beli modal
          </div>
        </div>
      </Motion>

      <!-- Card 2: Low Stock Warning (col-span-4) -->
      <Motion
        class="md:col-span-4"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, type: 'spring', bounce: 0.15, delay: 0.2 }"
      >
        <div
          class="p-8 rounded-[2rem] flex flex-col justify-between min-h-[180px] group transition-all duration-500 hover:-translate-y-1 border"
          :class="[
            stats.lowStock > 0
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-[0_20px_40px_-15px_rgba(244,63,94,0.08)]'
              : 'bg-zinc-50/40 dark:bg-zinc-900/30 border-zinc-200/60 dark:border-zinc-800 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)]'
          ]"
        >
          <div class="flex items-start justify-between w-full">
            <div class="flex flex-col gap-1">
              <span
                class="text-xs font-mono tracking-wider uppercase"
                :class="[stats.lowStock > 0 ? 'text-rose-600/80 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400']"
              >
                Peringatan Restock
              </span>
              <h3
                class="text-4xl font-black tracking-tight mt-1"
                :class="[stats.lowStock > 0 ? 'text-rose-500 font-mono' : 'text-zinc-950 dark:text-zinc-50 font-mono']"
              >
                {{ stats.lowStock }}
              </h3>
            </div>
            <div
              class="size-10 rounded-xl flex items-center justify-center border transition-colors"
              :class="[stats.lowStock > 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50']"
            >
              <UIcon
                :name="stats.lowStock > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'"
                class="size-5"
              />
            </div>
          </div>
          <div
            class="flex items-center gap-1.5 text-xs font-semibold mt-4"
            :class="[stats.lowStock > 0 ? 'text-rose-500' : 'text-zinc-500 dark:text-zinc-400']"
          >
            <span
              class="size-1.5 rounded-full"
              :class="[stats.lowStock > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500']"
            />
            {{ stats.lowStock > 0 ? 'Produk butuh pengisian stok segera' : 'Seluruh stok barang aman' }}
          </div>
        </div>
      </Motion>

      <!-- Card 3: Metrics List (col-span-3) -->
      <Motion
        class="md:col-span-3"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, type: 'spring', bounce: 0.15, delay: 0.3 }"
      >
        <div class="bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 dark:border-zinc-800/80 p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] flex flex-col justify-between min-h-[180px] group transition-all duration-500 hover:-translate-y-1">
          <div class="flex items-start justify-between w-full h-full">
            <div class="grid grid-cols-2 gap-4 w-full h-full items-center">
              <!-- Total Produk -->
              <div class="flex flex-col gap-1 border-r border-zinc-800/80 pr-4">
                <span class="text-xs font-mono tracking-wider uppercase text-zinc-400">Total Produk</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-3xl font-black text-white font-mono">{{ stats.totalProducts }}</span>
                  <UIcon
                    name="i-lucide-package"
                    class="size-4.5 text-zinc-400 shrink-0 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              <!-- Kategori Katalog -->
              <div class="flex flex-col gap-1 pl-2">
                <span class="text-xs font-mono tracking-wider uppercase text-zinc-400">Kategori</span>
                <div class="flex items-baseline gap-2 mt-1">
                  <span class="text-3xl font-black text-white font-mono">{{ stats.totalCategories }}</span>
                  <UIcon
                    name="i-lucide-tags"
                    class="size-4.5 text-zinc-400 shrink-0 group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs text-zinc-400 mt-4 font-mono">
            <span class="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Sesuai katalog terdaftar
          </div>
        </div>
      </Motion>
    </div>
  </ClientOnly>
</template>

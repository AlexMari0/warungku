<script setup lang="ts">
import type { StockMovementStats } from '~/composables/useStockMovements'

defineProps<{
  stats: StockMovementStats
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
    <!-- Card: Total Logs -->
    <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300 group flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold text-muted tracking-wider uppercase">
          Total Pencatatan
        </p>
        <h3 class="text-2xl font-black text-default tracking-tight">
          {{ stats.totalLogs }}
        </h3>
        <span class="text-xs text-toned font-medium flex items-center gap-1">
          <UIcon name="i-lucide-history" /> Aktivitas Log Logistik
        </span>
      </div>
      <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
        <UIcon
          name="i-lucide-file-text"
          class="size-6"
        />
      </div>
    </div>

    <!-- Card: Total Items Inward -->
    <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300 group flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold text-muted tracking-wider uppercase">
          Barang Masuk (+)
        </p>
        <h3 class="text-2xl font-black text-success tracking-tight">
          {{ stats.itemsIn }}
        </h3>
        <span class="text-xs text-success font-medium flex items-center gap-1">
          <UIcon name="i-lucide-plus" /> Stok Ditambahkan
        </span>
      </div>
      <div class="size-12 rounded-xl bg-success/10 flex items-center justify-center text-success group-hover:scale-105 transition-transform">
        <UIcon
          name="i-lucide-arrow-down-left"
          class="size-6"
        />
      </div>
    </div>

    <!-- Card: Total Items Outward -->
    <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300 group flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold text-muted tracking-wider uppercase">
          Barang Keluar (-)
        </p>
        <h3
          class="text-2xl font-black tracking-tight"
          :class="[stats.itemsOut === 0 ? 'text-default' : 'text-error']"
        >
          {{ stats.itemsOut }}
        </h3>
        <span
          class="text-xs font-medium flex items-center gap-1"
          :class="[stats.itemsOut === 0 ? 'text-toned' : 'text-error']"
        >
          <UIcon :name="stats.itemsOut === 0 ? 'i-lucide-check' : 'i-lucide-minus'" />
          {{ stats.itemsOut === 0 ? 'Stok keluar nihil' : 'Stok Dikurangi / Terjual' }}
        </span>
      </div>
      <div
        class="size-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
        :class="[
          stats.itemsOut === 0
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200/50 dark:border-zinc-700/50'
            : 'bg-error/10 text-error'
        ]"
      >
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-6"
        />
      </div>
    </div>
  </div>
</template>

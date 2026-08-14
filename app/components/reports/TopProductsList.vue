<script setup lang="ts">
export interface TopProductItem {
  name: string
  sku: string
  category: string
  color: string
  qty: number
  revenue: number
  profit: number
}

defineProps<{
  topProducts: TopProductItem[]
}>()
</script>

<template>
  <div class="bg-elevated border border-default rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-default">
          Daftar Produk Terlaris
        </h3>
        <p class="text-xs text-muted mt-1">
          Top 5 produk dengan performa volume penjualan tertinggi dalam periode terpilih
        </p>
      </div>
      <div class="text-amber-500 bg-amber-500/10 p-2 rounded-xl shrink-0">
        <UIcon
          name="i-lucide-award"
          class="size-6 block"
        />
      </div>
    </div>

    <div
      v-if="topProducts.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <UIcon
        name="i-lucide-package"
        class="size-12 text-muted mb-3 opacity-50"
      />
      <p class="text-sm font-medium text-default">
        Belum ada data penjualan produk pada periode ini.
      </p>
    </div>

    <div v-else class="overflow-x-auto border border-default rounded-2xl bg-elevated shadow-xs">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-muted/15 border-b border-default text-[10px] font-extrabold text-muted uppercase tracking-wider">
            <th class="py-3.5 px-6 w-20 text-center">Rank</th>
            <th class="py-3.5 px-6">Nama Produk</th>
            <th class="py-3.5 px-6 text-center">Kuantitas Terjual</th>
            <th class="py-3.5 px-6 text-right">Pendapatan Kotor</th>
            <th class="py-3.5 px-6 text-right">Laba Bersih</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default/40 text-xs sm:text-sm">
          <tr 
            v-for="(p, idx) in topProducts" 
            :key="'top-' + idx"
            class="hover:bg-muted/10 transition-colors"
          >
            <!-- Rank Medal or Badge -->
            <td class="py-4 px-6 text-center font-black">
              <span 
                class="inline-flex items-center justify-center size-6 rounded-lg text-xs font-black font-mono shadow-xs"
                :class="[
                  idx === 0 ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20' :
                  idx === 1 ? 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20' :
                  idx === 2 ? 'bg-amber-700/10 text-amber-800 ring-1 ring-amber-700/20' :
                  'bg-muted/40 text-toned'
                ]"
              >
                #{{ idx + 1 }}
              </span>
            </td>
            
            <!-- Product Details -->
            <td class="py-4 px-6">
              <div class="flex flex-col min-w-[150px]">
                <span class="font-extrabold text-default leading-snug">{{ p.name }}</span>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-[9px] font-mono text-muted uppercase tracking-tight">
                    {{ p.sku || '-' }}
                  </span>
                  <span class="inline-flex items-center gap-1 text-[9px] font-bold text-toned">
                    <span class="size-1.5 rounded-full" :style="{ backgroundColor: p.color || '#9ca3af' }" />
                    {{ p.category }}
                  </span>
                </div>
              </div>
            </td>

            <!-- Quantity -->
            <td class="py-4 px-6 text-center font-extrabold font-mono text-default">
              {{ formatNumber(p.qty || 0) }} pcs
            </td>

            <!-- Revenue -->
            <td class="py-4 px-6 text-right font-extrabold font-mono text-default">
              {{ formatRupiah(p.revenue || 0) }}
            </td>

            <!-- Profit -->
            <td class="py-4 px-6 text-right font-black font-mono text-emerald-500">
              {{ formatRupiah(p.profit || 0) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

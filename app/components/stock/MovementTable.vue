<script setup lang="ts">
import type { StockMovement } from '~/types'

const currentPage = defineModel<number>('currentPage', { default: 1 })

defineProps<{
  movements: StockMovement[]
  loading: boolean
  hasActiveFiltersOrData: boolean
  typeMeta: Record<string, { label: string; icon: string; color: string }>
  totalPages: number
  totalItems: number
  startIndex: number
  endIndex: number
  isInfiniteScrollActive: boolean
  totalLiveCount: number
  hasMore: boolean
  serverLoading: boolean
}>()

const emit = defineEmits<{
  'load-more': []
}>()
</script>

<template>
  <div class="bg-elevated rounded-2xl border border-default shadow-sm overflow-hidden">
    <!-- Table Loader -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-20"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin text-primary size-10"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="movements.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center px-4"
    >
      <UIcon
        name="i-lucide-history"
        class="size-16 text-muted mb-4"
      />
      <h3 class="text-lg font-bold text-default">
        Tidak ada riwayat mutasi
      </h3>
      <p class="text-sm text-muted max-w-sm mt-1">
        Semua transaksi kasir, pembelian, restock barang, dan penyesuaian manual akan otomatis muncul di sini.
      </p>
    </div>

    <!-- Data List Table -->
    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-default bg-muted/20 text-xs font-bold text-muted uppercase tracking-wider">
            <th class="py-4 px-6">
              Waktu Pencatatan
            </th>
            <th class="py-4 px-4">
              Nama Produk
            </th>
            <th class="py-4 px-4 text-center">
              Jenis Mutasi
            </th>
            <th class="py-4 px-4 text-right">
              Mutasi Qty
            </th>
            <th class="py-4 px-4 text-center">
              Sisa Stok
            </th>
            <th class="py-4 px-4 text-right">
              Biaya Satuan
            </th>
            <th class="py-4 px-6">
              Catatan / Keterangan
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="m in movements"
            :key="m.id"
            class="hover:bg-muted/10 transition-colors"
          >
            <!-- Timestamp -->
            <td class="py-4 px-6 text-sm text-toned shrink-0 font-medium">
              {{ formatDate(m.created_at) }}
            </td>

            <!-- Product Info -->
            <td class="py-4 px-4">
              <div class="overflow-hidden">
                <h4 class="font-bold text-sm text-default truncate">
                  {{ m.products?.name }}
                </h4>
                <p
                  v-if="m.products?.sku"
                  class="text-xs text-muted font-mono mt-0.5 truncate"
                >
                  SKU: {{ m.products?.sku }}
                </p>
              </div>
            </td>

            <!-- Type Badge -->
            <td class="py-4 px-4 text-center">
              <span
                v-if="typeMeta[m.type]"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                :class="[
                  m.type === 'purchase' ? 'bg-success/10 text-success border-success/20'
                  : m.type === 'sale' ? 'bg-error/10 text-error border-error/20'
                  : m.type === 'adjustment' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50'
                  : m.type === 'return' ? 'bg-info/10 text-info border-info/20'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400 border-neutral-200/50'
                ]"
              >
                <UIcon
                  :name="typeMeta[m.type]?.icon || 'i-lucide-activity'"
                  class="size-3.5"
                />
                {{ typeMeta[m.type]?.label || m.type }}
              </span>
            </td>

            <!-- Quantity Moved -->
            <td class="py-4 px-4 text-right font-extrabold text-sm">
              <span :class="[m.quantity > 0 ? 'text-success' : 'text-error']">
                {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}
              </span>
              <span class="text-xs text-muted font-normal ml-0.5">{{ m.products?.unit || 'pcs' }}</span>
            </td>

            <!-- Stock Audit (Qty Before & After) -->
            <td class="py-4 px-4 text-center text-sm font-semibold text-default">
              <div class="flex items-center justify-center gap-1.5 text-xs">
                <span class="text-muted">{{ m.qty_before }}</span>
                <UIcon
                  name="i-lucide-arrow-right"
                  class="text-muted size-3"
                />
                <span class="font-bold text-default text-sm">{{ m.qty_after }}</span>
              </div>
            </td>

            <!-- Unit Cost -->
            <td class="py-4 px-4 text-right font-medium text-sm text-default">
              {{ formatRupiah(Number(m.unit_cost)) }}
            </td>

            <!-- Notes -->
            <td class="py-4 px-6 text-sm text-toned max-w-[200px] truncate">
              <UTooltip
                :text="m.notes || 'Tidak ada keterangan tambahan.'"
                :ui="{ content: 'max-w-xs whitespace-normal break-words font-sans' }"
              >
                <span class="truncate block cursor-help">
                  {{ m.notes || 'Tidak ada keterangan tambahan.' }}
                </span>
              </UTooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div
      v-if="!loading && hasActiveFiltersOrData && !isInfiniteScrollActive"
      class="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50"
    >
      <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">
        Menampilkan <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ totalItems > 0 ? startIndex + 1 : 0 }}-{{ Math.min(endIndex, totalItems) }}</span> dari <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ totalItems }}</span> mutasi
      </div>
      
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="subtle"
          size="xs"
          :disabled="currentPage === 1"
          class="rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform"
          @click="currentPage--"
        />
        
        <div class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/30 dark:border-zinc-700/30">
          Halaman {{ currentPage }} / {{ totalPages }}
        </div>
        
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="subtle"
          size="xs"
          :disabled="currentPage === totalPages"
          class="rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform"
          @click="currentPage++"
        />
      </div>
    </div>

    <!-- Infinite Scroll Footer -->
    <div
      v-if="!loading && hasActiveFiltersOrData && isInfiniteScrollActive"
      class="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50"
    >
      <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">
        Menampilkan <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ movements.length }}</span> dari <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ totalLiveCount }}</span> mutasi (Skala Besar)
      </div>
      
      <div class="flex items-center gap-2">
        <UButton
          v-if="hasMore"
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="subtle"
          size="xs"
          :loading="serverLoading"
          class="rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform px-4"
          @click="emit('load-more')"
        >
          Muat Lebih Banyak
        </UButton>
        <span v-else class="text-xs font-medium text-zinc-400 dark:text-zinc-500">
          Semua mutasi telah dimuat
        </span>
      </div>
    </div>
  </div>
</template>

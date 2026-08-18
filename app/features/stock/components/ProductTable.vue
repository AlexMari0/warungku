<script setup lang="ts">
import type { Product, Category } from '~/core/types'

const props = defineProps<{
  products: Product[]
  categories: Category[]
  loading: boolean
}>()

const emit = defineEmits<{
  'edit': [product: Product]
  'delete': [product: Product]
  'toggle-active': [product: Product]
  'create-product': []
}>()

// Search & Filter state
const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const selectedStatus = ref<'all' | 'active' | 'inactive'>('all')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Reset current page when filters change
watch([searchQuery, selectedCategory, selectedStatus], () => {
  currentPage.value = 1
})

// Filtered and searched product list
const filteredProducts = computed(() => {
  return props.products.filter((p) => {
    // 1. Search Query
    const nameMatch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()) : false
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(searchQuery.value.toLowerCase()) : false
    const queryMatch = nameMatch || skuMatch || barcodeMatch

    // 2. Category Filter
    const categoryMatch = !selectedCategory.value || selectedCategory.value === 'all' || p.category_id === selectedCategory.value

    // 3. Status Filter
    const statusMatch = selectedStatus.value === 'all'
      || (selectedStatus.value === 'active' && p.is_active)
      || (selectedStatus.value === 'inactive' && !p.is_active)

    return queryMatch && categoryMatch && statusMatch
  })
})

const totalItems = computed(() => filteredProducts.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1)
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => startIndex.value + itemsPerPage.value)

// Paginated products to display in the table
const paginatedProducts = computed(() => {
  const start = startIndex.value
  const end = start + itemsPerPage.value
  return filteredProducts.value.slice(start, end)
})
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Filters / Controls Toolbar -->
    <div class="bg-white dark:bg-zinc-900 p-5 rounded-[1.75rem] border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <!-- Search Input -->
      <div class="w-full md:max-w-md">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Cari produk berdasarkan nama, SKU, atau barcode..."
          class="w-full"
          size="md"
        />
      </div>

      <!-- Categories & Status Dropdowns -->
      <div class="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
        <!-- Category Filter Select -->
        <USelect
          v-model="selectedCategory"
          placeholder="Semua Kategori"
          class="w-[180px]"
          size="md"
          :items="[
            { label: 'Semua Kategori', value: 'all' },
            ...categories.map(c => ({ label: c.name, value: c.id }))
          ]"
        />

        <!-- Status Filter Select -->
        <USelect
          v-model="selectedStatus"
          placeholder="Semua Status"
          class="w-[140px]"
          size="md"
          :items="[
            { label: 'Semua Status', value: 'all' },
            { label: 'Aktif', value: 'active' },
            { label: 'Nonaktif', value: 'inactive' }
          ]"
        />
      </div>
    </div>

    <!-- Premium Table Section -->
    <div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-[2rem] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.03)] overflow-hidden">
      <!-- Table Loader -->
      <div
        v-if="loading"
        class="flex flex-col w-full"
      >
        <div class="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 py-3.5 px-6 flex items-center justify-between">
          <USkeleton class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700" />
          <div class="flex gap-10">
            <USkeleton class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700" />
            <USkeleton class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700" />
            <USkeleton class="h-4 w-16 bg-zinc-200 dark:bg-zinc-700" />
            <USkeleton class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>
        <div class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          <div v-for="i in 5" :key="i" class="py-3 px-6 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 w-[250px] shrink-0">
              <USkeleton class="size-10 rounded-xl shrink-0" />
              <div class="flex flex-col gap-1.5 w-full">
                <USkeleton class="h-4 w-3/4" />
                <USkeleton class="h-3 w-1/2" />
              </div>
            </div>
            <USkeleton class="h-6 w-24 rounded-full" />
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-4 w-12" />
            <USkeleton class="h-5 w-10 rounded-full" />
            <div class="flex gap-3">
              <USkeleton class="size-7 rounded-lg" />
              <USkeleton class="size-7 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredProducts.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center px-6"
      >
        <div class="size-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50 mb-4">
          <UIcon
            name="i-lucide-package-open"
            class="size-8 text-zinc-400 dark:text-zinc-500"
          />
        </div>
        <h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Tidak ada produk ditemukan
        </h3>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
          Coba ubah kata pencarian Anda, reset filter kategori, atau tambahkan produk baru sekarang!
        </p>
        <UButton
          label="Tambah Produk Baru"
          icon="i-lucide-plus"
          class="mt-4 rounded-xl bg-primary text-white active:scale-95 transition-transform"
          @click="emit('create-product')"
        />
      </div>

      <!-- Data List Table -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th class="py-2.5 px-6">
                Detail Produk
              </th>
              <th class="py-2.5 px-4">
                Kategori
              </th>
              <th class="py-2.5 px-4 text-right">
                Harga Beli
              </th>
              <th class="py-2.5 px-4 text-right">
                Harga Jual
              </th>
              <th class="py-2.5 px-4 text-center">
                Stok
              </th>
              <th class="py-2.5 px-4 text-center">
                Status
              </th>
              <th class="py-2.5 px-6 text-center">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <tr
              v-for="p in paginatedProducts"
              :key="p.id"
              class="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group"
            >
              <!-- Info Name / SKU -->
              <td class="py-2.5 px-6">
                <div class="flex items-center gap-3">
                  <!-- Product Image / Default -->
                  <div class="size-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/40 dark:border-zinc-700/50 shrink-0 overflow-hidden flex items-center justify-center">
                    <img
                      v-if="p.image_url"
                      :src="p.image_url"
                      alt=""
                      class="size-full object-cover"
                    >
                    <UIcon
                      v-else
                      name="i-lucide-image"
                      class="size-5 text-zinc-400 dark:text-zinc-500"
                    />
                  </div>
                  <div class="overflow-hidden">
                    <h4 class="font-bold text-sm text-zinc-900 dark:text-zinc-50 truncate group-hover:text-primary transition-colors">
                      {{ p.name }}
                    </h4>
                    <p class="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate flex items-center gap-2">
                      <span
                        v-if="p.sku"
                        class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded"
                      >SKU: {{ p.sku }}</span>
                      <span
                        v-if="p.barcode"
                        class="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded"
                      >Barcode: {{ p.barcode }}</span>
                      <span
                        v-if="!p.sku && !p.barcode"
                        class="text-zinc-400 dark:text-zinc-500 italic"
                      >No SKU/Barcode</span>
                    </p>
                  </div>
                </div>
              </td>

              <!-- Category Badge -->
              <td class="py-2.5 px-4">
                <div
                  v-if="p.categories"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border border-zinc-200/50 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/50"
                >
                  <span
                    class="size-2 rounded-full shrink-0"
                    :style="{ backgroundColor: p.categories.color || '#9ca3af' }"
                  />
                  <span class="text-zinc-600 dark:text-zinc-300 font-medium">{{ p.categories.name }}</span>
                </div>
                <span
                  v-else
                  class="text-xs text-zinc-400 dark:text-zinc-500 italic"
                >Tanpa Kategori</span>
              </td>

              <!-- Buy Price -->
              <td class="py-2.5 px-4 text-right font-bold font-mono text-sm text-zinc-500 dark:text-zinc-400">
                {{ formatRupiah(p.buy_price) }}
              </td>

              <!-- Sell Price -->
              <td class="py-2.5 px-4 text-right font-bold font-mono text-sm text-zinc-950 dark:text-zinc-50">
                {{ formatRupiah(p.sell_price) }}
              </td>

              <!-- Stock Quantity -->
              <td class="py-2.5 px-4 text-center">
                <div class="inline-flex flex-col items-center">
                  <span class="text-sm font-black font-mono text-zinc-900 dark:text-zinc-50">
                    {{ p.stock_qty }} <span class="text-xs text-zinc-500 dark:text-zinc-400 font-normal font-sans">{{ p.unit }}</span>
                  </span>
                  <span
                    v-if="p.is_active && p.stock_qty <= p.min_stock"
                    class="text-[10px] font-semibold text-rose-500 px-1.5 py-0.2 bg-rose-500/10 border border-rose-500/20 rounded-full mt-0.5 animate-pulse"
                  >
                    Stok Menipis
                  </span>
                </div>
              </td>

              <!-- Status Toggle -->
              <td class="py-2.5 px-4 text-center">
                <USwitch
                  :model-value="p.is_active"
                  size="sm"
                  color="primary"
                  class="mx-auto active:scale-95 transition-transform"
                  @update:model-value="emit('toggle-active', p)"
                />
              </td>

              <!-- Actions -->
              <td class="py-2.5 px-6 text-center">
                <div class="flex items-center justify-center gap-3">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    class="rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform"
                    @click="emit('edit', p)"
                  />
                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="subtle"
                    size="xs"
                    class="rounded-xl border border-rose-200/30 dark:border-rose-900/30 shadow-sm active:scale-95 transition-transform"
                    @click="emit('delete', p)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">
          Menampilkan <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ totalItems > 0 ? startIndex + 1 : 0 }}-{{ Math.min(endIndex, totalItems) }}</span> dari <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ totalItems }}</span> produk
        </div>
        
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="subtle"
            size="xs"
            :disabled="currentPage === 1"
            class="rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-sm active:scale-95 transition-transform"
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
            class="rounded-xl border border-zinc-200 dark:border-zinc-850 shadow-sm active:scale-95 transition-transform"
            @click="currentPage++"
          />
        </div>
      </div>
    </div>
  </div>
</template>

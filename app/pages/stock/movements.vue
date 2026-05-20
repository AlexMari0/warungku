<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const movements = ref<any[]>([])
const loading = ref(false)
const filterType = ref<string>('all')
const searchProduct = ref<string>('')

// Date range filters
const startDate = ref<string>('')
const endDate = ref<string>('')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Types mapping for human readability & badge colors
const typeMeta = {
  purchase: { label: 'Pembelian', icon: 'i-lucide-arrow-down-left', color: 'success' },
  sale: { label: 'Penjualan', icon: 'i-lucide-arrow-up-right', color: 'error' },
  adjustment: { label: 'Penyesuaian', icon: 'i-lucide-sliders', color: 'warning' },
  return: { label: 'Retur', icon: 'i-lucide-rotate-ccw', color: 'info' },
  waste: { label: 'Terbuang/Rusak', icon: 'i-lucide-trash-2', color: 'neutral' }
}

const { isDemo } = useDemoMode()

// Infinite Scroll / Server-Side Filtering Variables
const totalLiveCount = ref(0)
const hasMore = ref(true)
const serverLoading = ref(false)

const isInfiniteScrollActive = computed(() => {
  return !isDemo.value && (totalLiveCount.value > 10000)
})

async function fetchMovements(reset = false) {
  if (isDemo.value) {
    loading.value = true
    const raw = localStorage.getItem('warungku_movements')
    if (raw) {
      let parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 100) {
        parsed = parsed.slice(0, 100)
        localStorage.setItem('warungku_movements', JSON.stringify(parsed))
      }
      movements.value = parsed
    } else {
      const initial = [
        {
          id: 'mov-1',
          merchant_id: 'demo-merchant-id',
          product_id: 'prod-1',
          type: 'adjustment',
          quantity: 40,
          qty_before: 0,
          qty_after: 40,
          unit_cost: 2500,
          notes: 'Stok awal produk baru Indomie Goreng Aceh (Demo)',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          products: { name: 'Indomie Goreng Aceh', sku: 'IND-GOR-ACH', unit: 'pcs' }
        },
        {
          id: 'mov-2',
          merchant_id: 'demo-merchant-id',
          product_id: 'prod-2',
          type: 'adjustment',
          quantity: 5,
          qty_before: 0,
          qty_after: 5,
          unit_cost: 8000,
          notes: 'Stok awal produk baru Kopi Susu Gula Aren (Demo)',
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
          products: { name: 'Kopi Susu Gula Aren', sku: 'KOPI-AREN-01', unit: 'porsi' }
        }
      ]
      localStorage.setItem('warungku_movements', JSON.stringify(initial))
      movements.value = initial
    }
    loading.value = false
    return
  }

  if (!user.value) return

  // First, check the total count in the database if reset or not set yet
  if (reset || totalLiveCount.value === 0) {
    try {
      const { count } = await supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
      totalLiveCount.value = count || 0
    } catch (e) {
      console.error(e)
    }
  }

  if (reset) {
    currentPage.value = 1
    movements.value = []
    hasMore.value = true
  }

  loading.value = movements.value.length === 0
  serverLoading.value = movements.value.length > 0

  try {
    if (isInfiniteScrollActive.value) {
      // Enterprise Server-Side Query (optimized with products!inner for high-performance joins)
      let query = supabase
        .from('stock_movements')
        .select('*, products!inner(name, sku, unit, category_id, categories(name))', { count: 'exact' })

      if (searchProduct.value) {
        query = query.or(`name.ilike.%${searchProduct.value}%,sku.ilike.%${searchProduct.value}%`, { foreignTable: 'products' })
      }
      if (filterType.value && filterType.value !== 'all') {
        query = query.eq('type', filterType.value)
      }
      if (startDate.value) {
        const start = new Date(startDate.value)
        start.setHours(0, 0, 0, 0)
        query = query.gte('created_at', start.toISOString())
      }
      if (endDate.value) {
        const end = new Date(endDate.value)
        end.setHours(23, 59, 59, 999)
        query = query.lte('created_at', end.toISOString())
      }

      const limit = 20
      const from = (currentPage.value - 1) * limit
      const to = from + limit - 1

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const rawData = data as any[] | null
      if (reset) {
        movements.value = rawData || []
      } else {
        const existingIds = new Set(movements.value.map((m: any) => m.id))
        const newItems = (rawData || []).filter((m: any) => !existingIds.has(m.id))
        movements.value = [...movements.value, ...newItems]
      }

      if (count !== null) {
        totalLiveCount.value = count
      }
      hasMore.value = (rawData || []).length === limit
    } else {
      // Standard local / low-volume query
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, products(name, sku, unit, category_id, categories(name))')
        .order('created_at', { ascending: false })

      if (error) throw error
      movements.value = data || []
    }
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat mutasi',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
    serverLoading.value = false
  }
}

// Stats metrics for stock movements
const stats = computed(() => {
  let itemsIn = 0
  let itemsOut = 0
  const totalLogs = isInfiniteScrollActive.value ? totalLiveCount.value : movements.value.length

  movements.value.forEach((m) => {
    if (m.quantity > 0) itemsIn += m.quantity
    else itemsOut += Math.abs(m.quantity)
  })

  return {
    itemsIn,
    itemsOut,
    totalLogs
  }
})

// Filtered movements list
const filteredMovements = computed(() => {
  if (isInfiniteScrollActive.value) {
    return movements.value
  }
  return movements.value.filter((m) => {
    // 1. Search Query (Product Name or SKU)
    const prodName = m.products?.name || ''
    const prodSku = m.products?.sku || ''
    const matchSearch = prodName.toLowerCase().includes(searchProduct.value.toLowerCase())
      || prodSku.toLowerCase().includes(searchProduct.value.toLowerCase())

    // 2. Type Filter
    const matchType = !filterType.value || filterType.value === 'all' || m.type === filterType.value

    // 3. Date Range Filter
    let matchDate = true
    if (startDate.value) {
      const start = new Date(startDate.value)
      start.setHours(0, 0, 0, 0)
      const itemDate = new Date(m.created_at)
      matchDate = matchDate && (itemDate >= start)
    }
    if (endDate.value) {
      const end = new Date(endDate.value)
      end.setHours(23, 59, 59, 999)
      const itemDate = new Date(m.created_at)
      matchDate = matchDate && (itemDate <= end)
    }

    return matchSearch && matchType && matchDate
  })
})

const totalItems = computed(() => isInfiniteScrollActive.value ? totalLiveCount.value : filteredMovements.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1)
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => startIndex.value + itemsPerPage.value)

// Paginated movements list for rendering
const paginatedMovements = computed(() => {
  if (isInfiniteScrollActive.value) {
    return movements.value
  }
  const start = startIndex.value
  const end = start + itemsPerPage.value
  return filteredMovements.value.slice(start, end)
})

// Reset to page 1 on active filters change
watch([searchProduct, filterType, startDate, endDate], () => {
  if (isInfiniteScrollActive.value) {
    fetchMovements(true)
  } else {
    currentPage.value = 1
  }
})

function loadMore() {
  if (serverLoading.value || !hasMore.value) return
  currentPage.value++
  fetchMovements(false)
}

// Format helpers
function formatRupiah(amount: number) {
  if (!amount) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateStr))
}

function triggerDatePicker(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const input = target.querySelector('input[type="date"]') as HTMLInputElement | null
  if (input) {
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        // Fallback for older browsers (e.g. older Safari below iOS 16)
        input.focus()
        input.click()
      }
    } catch (e) {
      // Defensive fallback in case showPicker throws due to user gesture constraints
      try {
        input.focus()
        input.click()
      } catch (err) {}
    }
  }
}

onMounted(() => {
  fetchMovements()
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full">
    <!-- Header banner -->
    <div>
      <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
        <UIcon name="i-lucide-history" class="size-8 text-primary" />
        Riwayat Mutasi Stok
      </h1>
      <p class="text-muted text-sm mt-1.5">
        Audit log dan pembukuan komprehensif atas seluruh barang masuk, keluar, penjualan, dan penyesuaian manual.
      </p>
    </div>

    <!-- 1. Stats Cards Row -->
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

    <!-- 2. Controls Toolbar -->
    <div class="bg-elevated p-4 rounded-2xl border border-default shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
      <!-- Search & Date Filter Group -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
        <!-- Search Input -->
        <div class="w-full sm:max-w-xs">
          <UInput
            v-model="searchProduct"
            icon="i-lucide-search"
            placeholder="Cari nama produk / SKU..."
            class="w-full"
            size="md"
          />
        </div>

        <!-- Date Range Filter -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <UInput
            v-model="startDate"
            type="date"
            icon="i-lucide-calendar"
            placeholder="Select Start Date"
            class="w-full sm:w-[160px]"
            size="md"
            @click="triggerDatePicker"
          />
          <span class="text-xs text-muted font-bold shrink-0">s/d</span>
          <UInput
            v-model="endDate"
            type="date"
            icon="i-lucide-calendar"
            placeholder="Select End Date"
            class="w-full sm:w-[160px]"
            size="md"
            @click="triggerDatePicker"
          />
          <!-- Clear Dates Button -->
          <UButton
            v-if="startDate || endDate"
            icon="i-lucide-x"
            color="neutral"
            variant="subtle"
            size="xs"
            class="rounded-xl shrink-0 active:scale-95 transition-transform"
            @click="startDate = ''; endDate = ''"
          />
        </div>
      </div>

      <!-- Type Filter -->
      <div class="w-full lg:w-[200px] shrink-0">
        <USelect
          v-model="filterType"
          placeholder="Filter Jenis Mutasi"
          class="w-full"
          size="md"
          :items="[
            { label: 'Semua Mutasi', value: 'all' },
            ...Object.entries(typeMeta).map(([val, meta]) => ({ label: meta.label, value: val }))
          ]"
        />
      </div>
    </div>

    <!-- 3. Table Ledger -->
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
        v-else-if="filteredMovements.length === 0"
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
              v-for="m in paginatedMovements"
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
                  v-if="typeMeta[m.type as keyof typeof typeMeta]"
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
                    :name="typeMeta[m.type as keyof typeof typeMeta].icon"
                    class="size-3.5"
                  />
                  {{ typeMeta[m.type as keyof typeof typeMeta].label }}
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
        v-if="!loading && filteredMovements.length > 0 && !isInfiniteScrollActive"
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
        v-if="!loading && filteredMovements.length > 0 && isInfiniteScrollActive"
        class="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50"
      >
        <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">
          Menampilkan <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ filteredMovements.length }}</span> dari <span class="font-bold text-zinc-900 dark:text-zinc-50 font-mono">{{ totalLiveCount }}</span> mutasi (Skala Besar)
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
            @click="loadMore"
          >
            Muat Lebih Banyak
          </UButton>
          <span v-else class="text-xs font-medium text-zinc-400 dark:text-zinc-500">
            Semua mutasi telah dimuat
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

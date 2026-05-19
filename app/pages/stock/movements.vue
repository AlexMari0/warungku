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

// Types mapping for human readability & badge colors
const typeMeta = {
  purchase: { label: 'Pembelian', icon: 'i-lucide-arrow-down-left', color: 'success' },
  sale: { label: 'Penjualan', icon: 'i-lucide-arrow-up-right', color: 'info' },
  adjustment: { label: 'Penyesuaian', icon: 'i-lucide-sliders', color: 'warning' },
  return: { label: 'Retur', icon: 'i-lucide-rotate-ccw', color: 'primary' },
  waste: { label: 'Terbuang/Rusak', icon: 'i-lucide-trash-2', color: 'error' }
}

const { isDemo } = useDemoMode()

async function fetchMovements() {
  if (isDemo.value) {
    loading.value = true
    const raw = localStorage.getItem('warungku_movements')
    if (raw) {
      movements.value = JSON.parse(raw)
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
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name, sku, unit, category_id, categories(name))')
      .order('created_at', { ascending: false })

    if (error) throw error
    movements.value = data || []
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat mutasi',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Stats metrics for stock movements
const stats = computed(() => {
  let itemsIn = 0
  let itemsOut = 0
  const totalLogs = movements.value.length

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
  return movements.value.filter((m) => {
    // 1. Search Query (Product Name or SKU)
    const prodName = m.products?.name || ''
    const prodSku = m.products?.sku || ''
    const matchSearch = prodName.toLowerCase().includes(searchProduct.value.toLowerCase())
      || prodSku.toLowerCase().includes(searchProduct.value.toLowerCase())

    // 2. Type Filter
    const matchType = !filterType.value || filterType.value === 'all' || m.type === filterType.value

    return matchSearch && matchType
  })
})

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

onMounted(() => {
  fetchMovements()
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full">
    <!-- Header banner -->
    <div>
      <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
        📈 Riwayat Mutasi Stok
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
          <h3 class="text-2xl font-black text-error tracking-tight">
            {{ stats.itemsOut }}
          </h3>
          <span class="text-xs text-error font-medium flex items-center gap-1">
            <UIcon name="i-lucide-minus" /> Stok Dikurangi / Terjual
          </span>
        </div>
        <div class="size-12 rounded-xl bg-error/10 flex items-center justify-center text-error group-hover:scale-105 transition-transform">
          <UIcon
            name="i-lucide-arrow-up-right"
            class="size-6"
          />
        </div>
      </div>
    </div>

    <!-- 2. Controls Toolbar -->
    <div class="bg-elevated p-4 rounded-2xl border border-default shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <!-- Search Input -->
      <div class="w-full sm:max-w-md">
        <UInput
          v-model="searchProduct"
          icon="i-lucide-search"
          placeholder="Cari berdasarkan nama produk atau SKU..."
          class="w-full"
          size="md"
        />
      </div>

      <!-- Type Filter -->
      <div class="w-full sm:w-[220px] shrink-0">
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
              v-for="m in filteredMovements"
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
                    m.type === 'purchase' || m.type === 'return' ? 'bg-success/10 text-success border-success/20'
                    : m.type === 'sale' ? 'bg-info/10 text-info border-info/20'
                      : m.type === 'adjustment' ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-error/10 text-error border-error/20'
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
                {{ m.notes || 'Tidak ada keterangan tambahan.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

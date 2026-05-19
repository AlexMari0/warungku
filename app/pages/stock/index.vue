<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { Motion } from 'motion-v'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

// Data states
const products = ref<any[]>([])
const categories = ref<any[]>([])
const loading = ref(false)
const submittings = ref(false)

// Dialog states
const isCategoriesModalOpen = ref(false)
const isProductModalOpen = ref(false)
const editingProduct = ref<any | null>(null)

// Search & Filter state
const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const selectedStatus = ref<'all' | 'active' | 'inactive'>('all')

// Preset units for convenience
const unitOptions = ['pcs', 'box', 'pack', 'kg', 'gr', 'liter', 'ml', 'sachet', 'porsi']

const productSchema = z.object({
  name: z.string().min(3, 'Nama produk minimal 3 karakter'),
  category_id: z.string().nullable().optional(),
  sku: z.string().default(''),
  barcode: z.string().default(''),
  buy_price: z.number().min(0, 'Harga beli tidak boleh negatif'),
  sell_price: z.number().min(0, 'Harga jual tidak boleh negatif'),
  stock_qty: z.number().int().min(0, 'Stok tidak boleh negatif'),
  min_stock: z.number().int().min(0, 'Stok minimum tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan wajib dipilih'),
  image_url: z.string().default(''),
  is_active: z.boolean().default(true)
})

type ProductSchema = z.output<typeof productSchema>

const productState = reactive<Partial<ProductSchema>>({
  name: '',
  category_id: null,
  sku: '',
  barcode: '',
  buy_price: 0,
  sell_price: 0,
  stock_qty: 0,
  min_stock: 0,
  unit: 'pcs',
  image_url: '',
  is_active: true
})

// Fetch all initial data
const { isDemo } = useDemoMode()

async function fetchData() {
  if (isDemo.value) {
    loading.value = true

    // 1. Fetch categories
    const rawCats = localStorage.getItem('warungku_categories')
    if (rawCats) {
      categories.value = JSON.parse(rawCats)
    } else {
      const initial = [
        { id: 'cat-1', name: 'Makanan', color: '#10b981', sort_order: 1, created_at: new Date().toISOString() },
        { id: 'cat-2', name: 'Minuman', color: '#0284c7', sort_order: 2, created_at: new Date().toISOString() },
        { id: 'cat-3', name: 'Rokok & Tembakau', color: '#f43f5e', sort_order: 3, created_at: new Date().toISOString() }
      ]
      localStorage.setItem('warungku_categories', JSON.stringify(initial))
      categories.value = initial
    }

    // 2. Fetch products
    const rawProds = localStorage.getItem('warungku_products')
    if (rawProds) {
      products.value = JSON.parse(rawProds)
    } else {
      const initialProds = [
        {
          id: 'prod-1',
          merchant_id: 'demo-merchant-id',
          category_id: 'cat-1',
          name: 'Indomie Goreng Aceh',
          sku: 'IND-GOR-ACH',
          barcode: '8998888111222',
          buy_price: 2500,
          sell_price: 3500,
          stock_qty: 40,
          min_stock: 10,
          unit: 'pcs',
          image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop',
          is_active: true,
          created_at: new Date().toISOString(),
          categories: { name: 'Makanan', color: '#10b981' }
        },
        {
          id: 'prod-2',
          merchant_id: 'demo-merchant-id',
          category_id: 'cat-2',
          name: 'Kopi Susu Gula Aren',
          sku: 'KOPI-AREN-01',
          barcode: '8997777111333',
          buy_price: 8000,
          sell_price: 12000,
          stock_qty: 5,
          min_stock: 10,
          unit: 'porsi',
          image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop',
          is_active: true,
          created_at: new Date().toISOString(),
          categories: { name: 'Minuman', color: '#0284c7' }
        }
      ]
      localStorage.setItem('warungku_products', JSON.stringify(initialProds))
      products.value = initialProds
    }
    loading.value = false
    return
  }

  if (!user.value) return
  loading.value = true
  try {
    // 1. Fetch Categories for Filter / Dropdowns
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (catError) throw catError
    categories.value = catData || []

    // 2. Fetch Products
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('*, categories(name, color)')
      .order('created_at', { ascending: false })

    if (prodError) throw prodError
    products.value = prodData || []
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat data',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Compute overview statistics
const stats = computed(() => {
  const totalValuation = products.value.reduce((acc, p) => acc + (p.stock_qty * (Number(p.buy_price) || 0)), 0)
  const lowStockCount = products.value.filter(p => p.is_active && p.stock_qty <= p.min_stock).length
  return {
    totalProducts: products.value.length,
    lowStock: lowStockCount,
    totalCategories: categories.value.length,
    valuation: totalValuation
  }
})

// Filtered and searched product list
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
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

// Reset form
function resetProductForm() {
  editingProduct.value = null
  productState.name = ''
  productState.category_id = null
  productState.sku = ''
  productState.barcode = ''
  productState.buy_price = 0
  productState.sell_price = 0
  productState.stock_qty = 0
  productState.min_stock = 0
  productState.unit = 'pcs'
  productState.image_url = ''
  productState.is_active = true
}

// Open modal to add new product
function openAddModal() {
  resetProductForm()
  isProductModalOpen.value = true
}

// Open modal to edit existing product
function openEditModal(product: any) {
  editingProduct.value = product
  productState.name = product.name
  productState.category_id = product.category_id
  productState.sku = product.sku || ''
  productState.barcode = product.barcode || ''
  productState.buy_price = Number(product.buy_price) || 0
  productState.sell_price = Number(product.sell_price) || 0
  productState.stock_qty = product.stock_qty || 0
  productState.min_stock = product.min_stock || 0
  productState.unit = product.unit || 'pcs'
  productState.image_url = product.image_url || ''
  productState.is_active = product.is_active

  isProductModalOpen.value = true
}

// Create or update a product + log stock movements
async function onSubmitProduct(event: FormSubmitEvent<ProductSchema>) {
  if (isDemo.value) {
    submittings.value = true
    const cat = categories.value.find(c => c.id === event.data.category_id)
    const payload = {
      id: editingProduct.value?.id || `prod-${Date.now()}`,
      merchant_id: 'demo-merchant-id',
      category_id: event.data.category_id || null,
      name: event.data.name,
      sku: event.data.sku || null,
      barcode: event.data.barcode || null,
      buy_price: event.data.buy_price,
      sell_price: event.data.sell_price,
      stock_qty: event.data.stock_qty,
      min_stock: event.data.min_stock,
      unit: event.data.unit,
      image_url: event.data.image_url || null,
      is_active: event.data.is_active,
      created_at: editingProduct.value?.created_at || new Date().toISOString(),
      categories: cat ? { name: cat.name, color: cat.color } : null
    }

    let list = [...products.value]
    const movementsList = JSON.parse(localStorage.getItem('warungku_movements') || '[]')

    if (editingProduct.value) {
      const oldQty = editingProduct.value.stock_qty
      const qtyDiff = payload.stock_qty - oldQty

      list = list.map(p => p.id === payload.id ? payload : p)

      if (qtyDiff !== 0) {
        movementsList.unshift({
          id: `mov-${Date.now()}`,
          merchant_id: 'demo-merchant-id',
          product_id: payload.id,
          type: 'adjustment',
          quantity: qtyDiff,
          qty_before: oldQty,
          qty_after: payload.stock_qty,
          unit_cost: payload.buy_price,
          notes: 'Penyesuaian stok manual via edit produk (Demo)',
          created_at: new Date().toISOString(),
          products: { name: payload.name, sku: payload.sku, unit: payload.unit }
        })
      }

      toast.add({
        title: 'Produk diperbarui',
        description: `Produk "${payload.name}" berhasil disimpan (Mode Demo).`,
        color: 'success'
      })
    } else {
      list.push(payload)

      if (payload.stock_qty > 0) {
        movementsList.unshift({
          id: `mov-${Date.now()}`,
          merchant_id: 'demo-merchant-id',
          product_id: payload.id,
          type: 'adjustment',
          quantity: payload.stock_qty,
          qty_before: 0,
          qty_after: payload.stock_qty,
          unit_cost: payload.buy_price,
          notes: 'Stok awal produk baru (Demo)',
          created_at: new Date().toISOString(),
          products: { name: payload.name, sku: payload.sku, unit: payload.unit }
        })
      }

      toast.add({
        title: 'Produk berhasil ditambahkan',
        description: `Produk "${payload.name}" telah terdaftar (Mode Demo).`,
        color: 'success'
      })
    }

    localStorage.setItem('warungku_products', JSON.stringify(list))
    localStorage.setItem('warungku_movements', JSON.stringify(movementsList))
    products.value = list
    isProductModalOpen.value = false
    resetProductForm()
    submittings.value = false
    return
  }

  if (!user.value) return
  submittings.value = true

  try {
    let merchantId = user.value.id
    try {
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id')
        .single() as any
      if (merchantData?.id) {
        merchantId = merchantData.id
      }
    } catch (e) {
      // Fallback
    }

    const payload = {
      merchant_id: merchantId,
      name: event.data.name,
      category_id: event.data.category_id || null,
      sku: event.data.sku || null,
      barcode: event.data.barcode || null,
      buy_price: event.data.buy_price,
      sell_price: event.data.sell_price,
      stock_qty: event.data.stock_qty,
      min_stock: event.data.min_stock,
      unit: event.data.unit,
      image_url: event.data.image_url || null,
      is_active: event.data.is_active
    }

    if (editingProduct.value) {
      // 1. Calculate stock difference for log
      const oldQty = editingProduct.value.stock_qty
      const qtyDiff = payload.stock_qty - oldQty

      // 2. Update product
      const { error } = await (supabase.from('products') as any)
        .update(payload)
        .eq('id', editingProduct.value.id)

      if (error) throw error

      // 3. Log stock movement if qty changed
      if (qtyDiff !== 0) {
        await supabase.from('stock_movements').insert({
          product_id: editingProduct.value.id,
          type: 'adjustment',
          quantity: qtyDiff,
          qty_before: oldQty,
          qty_after: payload.stock_qty,
          unit_cost: payload.buy_price,
          notes: 'Penyesuaian stok manual via edit produk'
        } as any)
      }

      toast.add({
        title: 'Produk diperbarui',
        description: `Produk "${payload.name}" berhasil disimpan.`,
        color: 'success'
      })
    } else {
      // 1. Create new product
      const { data: newProd, error } = await supabase
        .from('products')
        .insert(payload as any)
        .select()
        .single() as any

      if (error) throw error

      // 2. Log initial stock movement if starting stock > 0
      if (payload.stock_qty > 0 && newProd) {
        await supabase.from('stock_movements').insert({
          product_id: newProd.id,
          type: 'adjustment',
          quantity: payload.stock_qty,
          qty_before: 0,
          qty_after: payload.stock_qty,
          unit_cost: payload.buy_price,
          notes: 'Stok awal produk baru'
        } as any)
      }

      toast.add({
        title: 'Produk berhasil ditambahkan',
        description: `Produk "${payload.name}" telah terdaftar.`,
        color: 'success'
      })
    }

    isProductModalOpen.value = false
    resetProductForm()
    await fetchData()
  } catch (err: any) {
    toast.add({
      title: 'Gagal menyimpan produk',
      description: err.message,
      color: 'error'
    })
  } finally {
    submittings.value = false
  }
}

// Toggle active status in real-time
async function toggleProductActive(product: any) {
  if (isDemo.value) {
    const newStatus = !product.is_active
    const list = products.value.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p)
    localStorage.setItem('warungku_products', JSON.stringify(list))
    products.value = list
    product.is_active = newStatus
    toast.add({
      title: newStatus ? 'Produk Diaktifkan' : 'Produk Nonaktif',
      description: `Produk "${product.name}" sekarang ${newStatus ? 'aktif' : 'tidak aktif'} (Mode Demo).`,
      color: 'success'
    })
    return
  }

  try {
    const newStatus = !product.is_active
    const { error } = await (supabase.from('products') as any)
      .update({ is_active: newStatus })
      .eq('id', product.id)

    if (error) throw error
    product.is_active = newStatus

    toast.add({
      title: newStatus ? 'Produk Diaktifkan' : 'Produk Nonaktif',
      description: `Produk "${product.name}" sekarang ${newStatus ? 'aktif' : 'tidak aktif'}.`,
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'Gagal mengubah status',
      description: err.message,
      color: 'error'
    })
  }
}

// Delete product
async function deleteProduct(product: any) {
  if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}"? Operasi ini tidak dapat dibatalkan.`)) {
    return
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) throw error
    toast.add({
      title: 'Produk dihapus',
      description: `Produk "${product.name}" berhasil dihapus.`,
      color: 'success'
    })
    await fetchData()
  } catch (err: any) {
    toast.add({
      title: 'Gagal menghapus produk',
      description: 'Produk tidak dapat dihapus jika memiliki mutasi stok atau order terkait. Silakan nonaktifkan saja.',
      color: 'error'
    })
  }
}

// Format Rupiah helper
function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full font-sans pb-16">
    <!-- Top Hero Banner / Actions (Asymmetric Split Layout) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-between">
      <div class="lg:col-span-8 flex flex-col gap-3">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400 self-start border border-zinc-200/50 dark:border-zinc-700/50">
          <UIcon
            name="i-lucide-package-search"
            class="size-3.5 text-primary"
          />
          Sistem Manajemen Logistik
        </div>
        <h1 class="text-4xl md:text-5xl font-black text-zinc-950 dark:text-zinc-5 tracking-tighter leading-[1.05]">
          Manajemen Inventaris
        </h1>
        <p class="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[60ch]">
          Pantau stok produk secara real-time, audit mutasi logistik barang secara otomatis, dan kelola katalog kategori dengan sistem operasi warung modern.
        </p>
      </div>

      <div class="lg:col-span-4 flex items-center lg:justify-end gap-3 w-full">
        <UButton
          label="Kelola Kategori"
          icon="i-lucide-tag"
          color="neutral"
          variant="subtle"
          size="md"
          class="rounded-2xl font-bold border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 active:scale-95 transition-all duration-300"
          @click="isCategoriesModalOpen = true"
        />
        <UButton
          label="Tambah Produk Baru"
          icon="i-lucide-plus"
          size="md"
          class="rounded-2xl font-bold bg-primary text-white shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all duration-300"
          @click="openAddModal"
        />
      </div>
    </div>

    <!-- 1. Statistics Cards Bento Grid (DESIGN_VARIANCE: 8 / MOTION_INTENSITY: 6) -->
    <ClientOnly>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        <!-- Card 1: Valuation (col-span-5) -->
        <Motion
          class="md:col-span-5"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, type: 'spring', bounce: 0.15, delay: 0.1 }"
        >
          <div class="bg-zinc-950 dark:bg-zinc-900 border border-zinc-850 dark:border-zinc-800 p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] flex flex-col justify-between min-h-[180px] group transition-all duration-500 hover:-translate-y-1">
            <div class="flex items-start justify-between w-full">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-mono tracking-wider uppercase text-zinc-400">Nilai Aset Inventaris</span>
                <h3 class="text-3xl font-black text-white tracking-tight font-mono truncate mt-1">
                  {{ formatRupiah(stats.valuation) }}
                </h3>
              </div>
              <div class="size-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center border border-zinc-700/50">
                <UIcon
                  name="i-lucide-coins"
                  class="size-5"
                />
              </div>
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
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[180px] group transition-all duration-500 hover:-translate-y-1">
            <div class="flex items-start justify-between w-full">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400">Peringatan Restock</span>
                <h3
                  class="text-4xl font-black tracking-tight mt-1"
                  :class="[stats.lowStock > 0 ? 'text-rose-500' : 'text-zinc-950 dark:text-zinc-5 font-mono']"
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
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-8 rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[180px] group transition-all duration-500 hover:-translate-y-1">
            <div class="flex items-start justify-between w-full h-full">
              <div class="flex flex-col gap-4 w-full justify-center h-full">
                <div class="flex items-center justify-between w-full border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-mono tracking-wider uppercase text-zinc-400">Total Produk</span>
                    <span class="text-xl font-black text-zinc-950 dark:text-zinc-5 font-mono">{{ stats.totalProducts }}</span>
                  </div>
                  <UIcon
                    name="i-lucide-package"
                    class="size-4 text-zinc-400 animate-pulse"
                  />
                </div>
                <div class="flex items-center justify-between w-full">
                  <div class="flex flex-col">
                    <span class="text-[10px] font-mono tracking-wider uppercase text-zinc-400">Kategori Katalog</span>
                    <span class="text-xl font-black text-zinc-950 dark:text-zinc-5 font-mono">{{ stats.totalCategories }}</span>
                  </div>
                  <UIcon
                    name="i-lucide-tags"
                    class="size-4 text-zinc-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </Motion>
      </div>
    </ClientOnly>

    <!-- 2. Filters / Controls Toolbar -->
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

    <!-- 3. Premium Table Section -->
    <div class="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-[2rem] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.03)] overflow-hidden">
      <!-- Table Loader -->
      <div
        v-if="loading"
        class="flex items-center justify-center py-20"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-primary size-8"
        />
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
          @click="openAddModal"
        />
      </div>

      <!-- Data List Table -->
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th class="py-5 px-6">
                Detail Produk
              </th>
              <th class="py-5 px-4">
                Kategori
              </th>
              <th class="py-5 px-4 text-right">
                Harga Beli
              </th>
              <th class="py-5 px-4 text-right">
                Harga Jual
              </th>
              <th class="py-5 px-4 text-center">
                Stok
              </th>
              <th class="py-5 px-4 text-center">
                Status
              </th>
              <th class="py-5 px-6 text-center">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <tr
              v-for="p in filteredProducts"
              :key="p.id"
              class="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 transition-colors group"
            >
              <!-- Info Name / SKU -->
              <td class="py-4 px-6">
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
              <td class="py-4 px-4">
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
              <td class="py-4 px-4 text-right font-mono text-sm text-zinc-600 dark:text-zinc-300">
                {{ formatRupiah(p.buy_price) }}
              </td>

              <!-- Sell Price -->
              <td class="py-4 px-4 text-right font-black font-mono text-sm text-zinc-900 dark:text-zinc-50">
                {{ formatRupiah(p.sell_price) }}
              </td>

              <!-- Stock Quantity -->
              <td class="py-4 px-4 text-center">
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
              <td class="py-4 px-4 text-center">
                <USwitch
                  :model-value="p.is_active"
                  size="sm"
                  color="primary"
                  class="mx-auto active:scale-95 transition-transform"
                  @update:model-value="toggleProductActive(p)"
                />
              </td>

              <!-- Actions -->
              <td class="py-4 px-6 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    class="rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm active:scale-95 transition-transform"
                    @click="openEditModal(p)"
                  />
                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="subtle"
                    size="xs"
                    class="rounded-xl border border-rose-200/30 dark:border-rose-900/30 shadow-sm active:scale-95 transition-transform"
                    @click="deleteProduct(p)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals Section -->

    <!-- 1. Categories Management Modal -->
    <CategoriesModal
      v-model:open="isCategoriesModalOpen"
      @saved="fetchData"
    />

    <!-- 2. Product Add/Edit Dialog -->
    <UModal
      v-model:open="isProductModalOpen"
      :title="editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'"
      class="max-w-xl"
    >
      <template #body>
        <UForm
          :schema="productSchema"
          :state="productState"
          class="space-y-5"
          @submit="onSubmitProduct"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Product Name -->
            <UFormField
              name="name"
              label="Nama Produk"
              required
              class="sm:col-span-2"
            >
              <UInput
                v-model="productState.name"
                placeholder="Misal: Kopi Susu Creamy"
                class="w-full"
              />
            </UFormField>

            <!-- Category -->
            <UFormField
              name="category_id"
              label="Kategori Produk"
            >
              <USelect
                v-model="productState.category_id"
                placeholder="Pilih Kategori"
                class="w-full"
                :items="categories.map(c => ({ label: c.name, value: c.id }))"
              />
            </UFormField>

            <!-- Unit -->
            <UFormField
              name="unit"
              label="Satuan"
              required
            >
              <USelect
                v-model="productState.unit"
                class="w-full"
                :items="unitOptions.map(u => ({ label: u, value: u }))"
              />
            </UFormField>

            <!-- SKU -->
            <UFormField
              name="sku"
              label="Kode SKU (Stok Keeping Unit)"
            >
              <UInput
                v-model="productState.sku"
                placeholder="Misal: KOPI-CRM-01"
                class="w-full"
              />
            </UFormField>

            <!-- Barcode -->
            <UFormField
              name="barcode"
              label="Barcode (EAN/UPC)"
            >
              <UInput
                v-model="productState.barcode"
                placeholder="Misal: 89912345678"
                class="w-full"
              />
            </UFormField>

            <!-- Buy Price -->
            <UFormField
              name="buy_price"
              label="Harga Beli (Modal)"
              required
            >
              <UInput
                v-model.number="productState.buy_price"
                type="number"
                min="0"
                placeholder="Rp 0"
                class="w-full"
              >
                <template #leading>
                  <span class="text-xs text-muted px-1">Rp</span>
                </template>
              </UInput>
            </UFormField>

            <!-- Sell Price -->
            <UFormField
              name="sell_price"
              label="Harga Jual"
              required
            >
              <UInput
                v-model.number="productState.sell_price"
                type="number"
                min="0"
                placeholder="Rp 0"
                class="w-full"
              >
                <template #leading>
                  <span class="text-xs text-muted px-1">Rp</span>
                </template>
              </UInput>
            </UFormField>

            <!-- Stock Quantity -->
            <UFormField
              name="stock_qty"
              label="Jumlah Stok Saat Ini"
              required
            >
              <UInput
                v-model.number="productState.stock_qty"
                type="number"
                min="0"
                placeholder="0"
                class="w-full"
              />
            </UFormField>

            <!-- Min Stock (low stock alert threshold) -->
            <UFormField
              name="min_stock"
              label="Batas Stok Minimum"
              required
            >
              <UInput
                v-model.number="productState.min_stock"
                type="number"
                min="0"
                placeholder="5"
                class="w-full"
              />
            </UFormField>

            <!-- Image URL -->
            <UFormField
              name="image_url"
              label="Link URL Foto Produk"
              class="sm:col-span-2"
            >
              <UInput
                v-model="productState.image_url"
                placeholder="https://image-source.com/product.jpg"
                class="w-full"
              />
            </UFormField>

            <!-- Active Status Toggle -->
            <div class="sm:col-span-2 flex items-center justify-between py-3 px-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl mt-1">
              <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Produk Aktif
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                  Produk yang tidak aktif disembunyikan dari modul Kasir POS.
                </p>
              </div>
              <USwitch
                v-model="productState.is_active"
                class="active:scale-95 transition-transform"
              />
            </div>
          </div>

          <!-- Actions Panel -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <UButton
              label="Batal"
              color="neutral"
              variant="subtle"
              class="rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-all duration-300"
              @click="isProductModalOpen = false"
            />
            <UButton
              type="submit"
              :label="editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'"
              :loading="submittings"
              class="rounded-xl font-bold bg-primary text-white shadow-md active:scale-95 transition-all duration-300"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

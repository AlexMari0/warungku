<script setup lang="ts">
import type { Product } from '~/core/types'

definePageMeta({
  layout: 'default'
})

const user = useSupabaseUser()
const toast = useToast()

const { products, loading: productsLoading, fetchProducts, toggleProductActive: toggleActiveInDb, deleteProduct } = useProducts()
const { categories, fetchCategories } = useCategories()

// Dialog states
const isCategoriesModalOpen = ref(false)
const isProductModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const editingProduct = ref<Product | null>(null)
const productToDelete = ref<Product | null>(null)

// Fetch all initial data
async function fetchData() {
  if (!user.value) return
  try {
    const catResult = await fetchCategories()
    if (!catResult.success) {
      toast.add({ title: 'Gagal memuat kategori', description: catResult.error, color: 'error' })
    }
    const result = await fetchProducts()
    if (!result.success) {
      toast.add({
        title: 'Gagal memuat data produk',
        description: result.error || 'Terjadi kesalahan.',
        color: 'error'
      })
    }
  } catch (err: unknown) {
    toast.add({
      title: 'Gagal memuat data',
      description: (err as Error).message || 'Terjadi kesalahan.',
      color: 'error'
    })
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

// Modal Open Handlers
function openAddModal() {
  editingProduct.value = null
  isProductModalOpen.value = true
}

function openEditModal(product: Product) {
  editingProduct.value = product
  isProductModalOpen.value = true
}

function confirmDeleteProduct(product: Product) {
  productToDelete.value = product
  isDeleteModalOpen.value = true
}

// Toggle active status in real-time with Undo/Cancel action
async function handleToggleProductActive(product: Product) {
  const newStatus = !product.is_active

  async function performToggle(status: boolean, isUndo = false) {
    const result = await toggleActiveInDb(product.id, status)
    if (!result.success) {
      toast.add({
        title: 'Gagal mengubah status',
        description: result.error || 'Terjadi kesalahan',
        color: 'error'
      })
      return
    }

    if (!isUndo) {
      toast.add({
        title: status ? 'Produk Diaktifkan' : 'Produk Nonaktif',
        description: `Status "${product.name}" diubah menjadi ${status ? 'Aktif' : 'Nonaktif'}.`,
        color: 'success',
        actions: [
          {
            label: 'Cancel/Undo',
            color: 'neutral',
            variant: 'subtle',
            onClick: () => {
              performToggle(!status, true)
            }
          }
        ]
      })
    } else {
      toast.add({
        title: 'Perubahan Dibatalkan',
        description: `Status "${product.name}" berhasil dikembalikan ke ${status ? 'Aktif' : 'Nonaktif'}.`,
        color: 'success'
      })
    }
  }

  await performToggle(newStatus, false)
}

// Delete execution
async function executeDeleteProduct() {
  if (!productToDelete.value) return
  const product = productToDelete.value
  isDeleteModalOpen.value = false

  try {
    const result = await deleteProduct(product.id)
    if (result.success) {
      toast.add({
        title: 'Produk berhasil dihapus',
        color: 'success'
      })
      await fetchData()
    } else {
      toast.add({
        title: 'Gagal menghapus produk',
        description: result.error || 'Terjadi kesalahan',
        color: 'error'
      })
    }
  } finally {
    productToDelete.value = null
  }
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
        <h1 class="text-4xl md:text-5xl font-black text-zinc-950 dark:text-zinc-50 tracking-tighter leading-[1.05]">
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

    <!-- 1. Statistics Cards Bento Grid -->
    <StatsGrid :stats="stats" />

    <!-- 2. Product Table with Filtering and Pagination -->
    <ProductTable
      :products="products"
      :categories="categories"
      :loading="productsLoading"
      @edit="openEditModal"
      @delete="confirmDeleteProduct"
      @toggle-active="handleToggleProductActive"
      @create-product="openAddModal"
    />

    <!-- Modals Section -->

    <!-- 1. Categories Management Modal -->
    <CategoriesModal
      v-model:open="isCategoriesModalOpen"
      @saved="fetchData"
    />

    <!-- 2. Product Delete Confirmation Modal -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Konfirmasi Hapus Produk"
      class="max-w-md"
    >
      <template #body>
        <div class="space-y-4 font-sans">
          <div class="flex items-center gap-3 text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/50 p-4 rounded-2xl">
            <UIcon name="i-lucide-alert-triangle" class="size-6 shrink-0" />
            <div class="text-xs font-semibold leading-relaxed">
              Tindakan ini akan menghapus produk permanen dan dapat merusak riwayat transaksi/mutasi stok.
            </div>
          </div>
          
          <div class="text-sm text-zinc-600 dark:text-zinc-300">
            Apakah Anda yakin ingin menghapus produk <span class="font-bold text-zinc-900 dark:text-white">"{{ productToDelete?.name }}"</span>? Operasi ini tidak dapat dibatalkan.
          </div>
          
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <UButton
              label="Batal"
              color="neutral"
              variant="subtle"
              class="rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-all duration-300"
              @click="isDeleteModalOpen = false"
            />
            <UButton
              label="Hapus Permanen"
              color="error"
              class="rounded-xl font-bold active:scale-95 transition-all duration-300"
              @click="executeDeleteProduct"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- 3. Product Add/Edit Dialog -->
    <ProductFormModal
      v-model:open="isProductModalOpen"
      :editing-product="editingProduct"
      :categories="categories"
      @saved="fetchData"
    />
  </div>
</template>

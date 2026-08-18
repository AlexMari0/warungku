<script setup lang="ts">
import type { Product, Category } from '~/core/types'

const props = defineProps<{
  products: Product[]
  categories: Category[]
  loading: boolean
}>()

const emit = defineEmits<{
  'add-to-cart': [product: Product]
}>()

const searchQuery = ref('')
const selectedCategory = ref<string>('all')
const viewMode = ref<'grid' | 'list'>('grid')

// Filtered product listing inside catalog
const filteredProducts = computed(() => {
  return props.products.filter((p) => {
    const queryMatch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      || (p.sku && p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()))

    const catMatch = selectedCategory.value === 'all' || p.category_id === selectedCategory.value
    return queryMatch && catMatch
  })
})
</script>

<template>
  <div class="flex-grow flex flex-col bg-elevated rounded-3xl border border-default shadow-sm overflow-hidden p-6 gap-6">
    <!-- Catalog Header and Search -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
      <div>
        <h1 class="text-2xl font-black text-default tracking-tight flex items-center gap-2">
          <UIcon name="i-lucide-monitor" class="size-6 text-primary shrink-0" />
          <span>Kasir Digital POS</span>
        </h1>
        <p class="text-muted text-xs mt-0.5">
          Pilih produk, sesuaikan kuantitas, dan proses checkout instan.
        </p>
      </div>
      <div class="flex items-center gap-2 w-full sm:max-w-md justify-end">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Cari nama atau SKU produk..."
          size="md"
          class="flex-grow sm:max-w-xs"
        />
        <!-- View Toggle Segmented Control -->
        <div class="flex rounded-xl bg-muted/40 p-0.5 border border-default shrink-0">
          <UButton
            icon="i-lucide-grid"
            :color="viewMode === 'grid' ? 'primary' : 'neutral'"
            variant="ghost"
            size="sm"
            class="rounded-lg p-1.5 active:scale-[0.98]"
            :class="viewMode === 'grid' ? 'bg-elevated shadow-xs' : ''"
            @click="viewMode = 'grid'"
          />
          <UButton
            icon="i-lucide-list"
            :color="viewMode === 'list' ? 'primary' : 'neutral'"
            variant="ghost"
            size="sm"
            class="rounded-lg p-1.5 active:scale-[0.98]"
            :class="viewMode === 'list' ? 'bg-elevated shadow-xs' : ''"
            @click="viewMode = 'list'"
          />
        </div>
      </div>
    </div>

    <!-- Categories Navigation Carousel Tabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
      <UButton
        label="Semua Kategori"
        variant="subtle"
        :color="selectedCategory === 'all' ? 'primary' : 'neutral'"
        size="sm"
        class="rounded-xl font-bold shrink-0"
        @click="selectedCategory = 'all'"
      />
      <UButton
        v-for="c in categories"
        :key="c.id"
        :label="c.name"
        variant="subtle"
        :color="selectedCategory === c.id ? 'primary' : 'neutral'"
        size="sm"
        class="rounded-xl font-bold shrink-0"
        @click="selectedCategory = c.id"
      >
        <template #leading>
          <span
            class="size-1.5 rounded-full"
            :style="{ backgroundColor: c.color || '#9ca3af' }"
          />
        </template>
      </UButton>
    </div>

    <!-- Scrollable Product Catalog Grid -->
    <div class="flex-grow overflow-y-auto min-h-0 pr-1">
      <div
        v-if="loading"
        class="grid grid-cols-3 md:grid-cols-4 gap-3"
      >
        <div v-for="i in 8" :key="i" class="bg-muted/10 border border-default/40 rounded-2xl p-3 flex flex-col justify-between gap-3 h-[180px] sm:h-[200px]">
          <div class="flex flex-col gap-2">
            <USkeleton class="w-full h-20 sm:h-24 rounded-xl" />
            <USkeleton class="h-4 w-3/4 mt-1" />
            <USkeleton class="h-3 w-1/2" />
          </div>
          <div class="flex items-end justify-between mt-auto">
            <div class="flex flex-col gap-1.5 w-1/2">
              <USkeleton class="h-2 w-full" />
              <USkeleton class="h-4 w-3/4" />
            </div>
            <USkeleton class="size-10 rounded-xl" />
          </div>
        </div>
      </div>

      <div
        v-else-if="filteredProducts.length === 0"
        class="flex flex-col items-center justify-center h-full py-10 text-center px-4"
      >
        <UIcon
          name="i-lucide-package-open"
          class="size-14 text-muted mb-3"
        />
        <h4 class="text-sm font-bold text-default">
          Katalog Kosong
        </h4>
        <p class="text-xs text-muted max-w-xs mt-1">
          Tidak ada produk aktif ditemukan di kategori ini. Aktifkan produk di modul inventaris.
        </p>
      </div>

      <div
        v-else-if="viewMode === 'grid'"
        class="grid grid-cols-3 md:grid-cols-4 gap-3"
      >
        <div
          v-for="p in filteredProducts"
          :key="p.id"
          class="group bg-muted/20 hover:bg-muted/30 border border-default/60 hover:border-primary/40 rounded-2xl p-3 transition-all duration-300 flex flex-col justify-between relative overflow-hidden active:scale-[0.98]"
          :class="[p.stock_qty <= 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer']"
          @click="p.stock_qty > 0 ? emit('add-to-cart', p) : null"
        >
          <!-- Hover shadow effect -->
          <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div class="relative flex flex-col gap-2">
            <!-- Photo placeholder or URL -->
            <div class="relative w-full h-20 sm:h-24 rounded-xl bg-elevated border border-default flex items-center justify-center overflow-hidden shrink-0">
              <img
                v-if="p.image_url"
                :src="p.image_url"
                alt=""
                class="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              >
              <UIcon
                v-else
                name="i-lucide-image"
                class="size-6 text-muted"
              />

              <!-- Badges overlay -->
              <div
                v-if="p.stock_qty <= p.min_stock && p.stock_qty > 0"
                class="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-amber-500 text-white text-[9px] font-extrabold shadow-sm"
              >
                Menipis
              </div>
              <div
                v-if="p.stock_qty <= 0"
                class="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-lg bg-rose-500 text-white text-[9px] font-extrabold shadow-sm"
              >
                Habis
              </div>
            </div>

            <!-- Product Details -->
            <div class="overflow-hidden mt-0.5">
              <h4 class="font-bold text-xs sm:text-sm text-default truncate group-hover:text-primary transition-colors leading-tight">
                {{ p.name }}
              </h4>
              <p class="text-[9px] text-muted truncate mt-0.5 font-mono">
                {{ p.sku || 'No SKU' }}
              </p>
            </div>
          </div>

          <!-- Price and Add button -->
          <div class="relative flex items-end justify-between mt-2.5 pt-2 border-t border-default/40">
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-muted truncate">
                Stok: <strong class="font-mono">{{ p.stock_qty }}</strong> {{ p.unit }}
              </span>
              <span class="font-extrabold text-xs sm:text-sm text-default mt-0.5 font-mono truncate">
                {{ formatRupiah(p.sell_price) }}
              </span>
            </div>

            <!-- Quick Add Touch-Friendly Action Button -->
            <div
              class="w-10 h-10 rounded-xl bg-primary text-inverted flex items-center justify-center shadow-md shadow-primary/20 transition-all duration-200 group-hover:scale-110 active:scale-95 shrink-0"
              :class="[p.stock_qty <= 0 ? 'bg-muted text-toned shadow-none cursor-not-allowed' : '']"
            >
              <UIcon
                :name="p.stock_qty <= 0 ? 'i-lucide-x' : 'i-lucide-plus'"
                class="size-5 stroke-[3]"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="viewMode === 'list'"
        class="flex flex-col gap-2"
      >
        <div
          v-for="p in filteredProducts"
          :key="p.id"
          class="group bg-muted/20 hover:bg-muted/30 border border-default/60 hover:border-primary/40 rounded-2xl p-2.5 transition-all duration-300 flex items-center justify-between gap-3 relative overflow-hidden active:scale-[0.99]"
          :class="[p.stock_qty <= 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer']"
          @click="p.stock_qty > 0 ? emit('add-to-cart', p) : null"
        >
          <!-- Hover shadow effect -->
          <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <!-- Left: Product Image & Details -->
          <div class="flex items-center gap-3 overflow-hidden min-w-0 relative">
            <div class="relative w-12 h-12 rounded-xl bg-elevated border border-default flex items-center justify-center overflow-hidden shrink-0">
              <img
                v-if="p.image_url"
                :src="p.image_url"
                alt=""
                class="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              >
              <UIcon
                v-else
                name="i-lucide-image"
                class="size-5 text-muted"
              />
              
              <!-- Stock badges overlay -->
              <div
                v-if="p.stock_qty <= 0"
                class="absolute inset-0 bg-rose-950/70 text-white flex items-center justify-center text-[9px] font-extrabold"
              >
                Habis
              </div>
            </div>

            <!-- Product text details -->
            <div class="overflow-hidden">
              <h4 class="font-bold text-sm text-default truncate group-hover:text-primary transition-colors leading-tight">
                {{ p.name }}
              </h4>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] text-muted font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                  {{ p.sku || 'No SKU' }}
                </span>
                <span class="text-[10px] text-toned">
                  Stok: <strong class="font-mono">{{ p.stock_qty }}</strong> {{ p.unit }}
                </span>
                <span
                  v-if="p.stock_qty <= p.min_stock && p.stock_qty > 0"
                  class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-bold"
                >
                  Menipis
                </span>
              </div>
            </div>
          </div>

          <!-- Right: Price and Touch-Friendly Add button -->
          <div class="flex items-center gap-4 shrink-0">
            <span class="font-extrabold text-sm sm:text-base text-default font-mono">
              {{ formatRupiah(p.sell_price) }}
            </span>

            <div
              class="w-10 h-10 rounded-xl bg-primary text-inverted flex items-center justify-center shadow-md shadow-primary/20 transition-all duration-200 group-hover:scale-110 active:scale-95 shrink-0"
              :class="[p.stock_qty <= 0 ? 'bg-muted text-toned shadow-none cursor-not-allowed' : '']"
            >
              <UIcon
                :name="p.stock_qty <= 0 ? 'i-lucide-x' : 'i-lucide-plus'"
                class="size-5 stroke-[3]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

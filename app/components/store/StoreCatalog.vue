<script setup lang="ts">
import type { Category, StorefrontProduct } from '~/types'

const props = defineProps<{
  featuredProducts: (StorefrontProduct & { products?: any })[]
  filteredCatalog: (StorefrontProduct & { products?: any })[]
  categories: Category[]
  selectedCategoryId: string
  searchQuery: string
  activeThemeClasses: any
}>()

const emit = defineEmits<{
  'update:selectedCategoryId': [categoryId: string]
  'update:searchQuery': [query: string]
  'add-to-cart': [item: any]
}>()
</script>

<template>
  <main class="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-12">
    <!-- 1. FEATURED SECTION (PRODUK UNGGULAN) -->
    <section v-if="featuredProducts.length > 0" class="space-y-6">
      <div class="flex items-center gap-2 border-b border-default pb-3">
        <UIcon name="i-lucide-star" class="size-5 text-amber-500 animate-spin" style="animation-duration: 4s" />
        <h2 class="text-xl font-bold tracking-tight text-default">Produk Unggulan Hari Ini</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="sfp in featuredProducts"
          :key="sfp.id"
          class="group relative bg-elevated border-2 border-amber-500/25 p-5 rounded-[2rem] shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between text-left hover:-translate-y-1 transition-all duration-300"
        >
          <div class="size-24 rounded-2xl overflow-hidden bg-muted/20 border border-default shrink-0">
            <img v-if="sfp.products.image_url" :src="sfp.products.image_url" alt="" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-muted"><UIcon name="i-lucide-package" class="size-8" /></div>
          </div>
          
          <div class="flex-1 space-y-1.5 text-center md:text-left min-w-0">
            <div class="inline-block text-[9px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
              HOT DEALS
            </div>
            <h3 class="text-sm font-extrabold text-default truncate">{{ sfp.products.name }}</h3>
            <p class="text-[10px] text-toned font-light line-clamp-2 leading-relaxed">
              {{ sfp.custom_description || sfp.products.name }}
            </p>
            <div class="flex items-center justify-center md:justify-start gap-3">
              <span class="text-sm font-mono font-bold text-default">{{ formatRupiah(sfp.products.sell_price) }}</span>
              <span class="text-[9px] font-mono text-muted bg-muted px-2 py-0.5 rounded-full">Stok: {{ sfp.products.stock_qty }}</span>
            </div>
          </div>

          <button
            type="button"
            class="px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-transform self-stretch md:self-end text-center flex items-center justify-center gap-1.5"
            :class="[!activeThemeClasses.isCustom ? activeThemeClasses.buttonBg : '']"
            :style="activeThemeClasses.isCustom ? { backgroundColor: activeThemeClasses.customColor } : {}"
            @click="emit('add-to-cart', sfp)"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
            Tambah
          </button>
        </div>
      </div>
    </section>

    <!-- 2. MAIN CATALOG EXPOSURE -->
    <section class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-default pb-4 gap-4">
        <h2 class="text-xl font-bold tracking-tight text-default flex items-center gap-2">
          <UIcon name="i-lucide-grid" class="size-5 text-toned" />
          Semua Etalase Produk
        </h2>

        <!-- Filtering tools -->
        <div class="flex items-center gap-3 shrink-0 self-start md:self-auto w-full md:w-auto">
          <div class="relative flex-1 md:flex-initial md:w-56">
            <input
              :value="searchQuery"
              type="text"
              placeholder="Cari produk..."
              class="w-full pl-8 pr-3 py-2 rounded-xl border border-default bg-muted/10 text-xs text-default outline-none"
              @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
            />
            <UIcon name="i-lucide-search" class="absolute left-2.5 top-3 text-muted size-3.5" />
          </div>
        </div>
      </div>

      <!-- Category filter chips row -->
      <div v-if="categories.length > 0" class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          class="px-4 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer shrink-0 active:scale-95"
          :class="[
            !selectedCategoryId
              ? (!activeThemeClasses.isCustom
                  ? `${activeThemeClasses.primaryBg} ${activeThemeClasses.primaryText} ${activeThemeClasses.accentBorder} font-bold`
                  : 'font-bold')
              : 'bg-elevated border-default text-toned hover:text-default'
          ]"
          :style="[
            !selectedCategoryId && activeThemeClasses.isCustom
              ? {
                  backgroundColor: activeThemeClasses.customColor + '14',
                  color: activeThemeClasses.customColor,
                  borderColor: activeThemeClasses.customColor + '33'
                }
              : {}
          ]"
          @click="emit('update:selectedCategoryId', '')"
        >
          Semua
        </button>
        
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="px-4 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer shrink-0 active:scale-95"
          :class="[
            selectedCategoryId === cat.id
              ? (!activeThemeClasses.isCustom
                  ? `${activeThemeClasses.primaryBg} ${activeThemeClasses.primaryText} ${activeThemeClasses.accentBorder} font-bold`
                  : 'font-bold')
              : 'bg-elevated border-default text-toned hover:text-default'
          ]"
          :style="[
            selectedCategoryId === cat.id && activeThemeClasses.isCustom
              ? {
                  backgroundColor: activeThemeClasses.customColor + '14',
                  color: activeThemeClasses.customColor,
                  borderColor: activeThemeClasses.customColor + '33'
                }
              : {}
          ]"
          @click="emit('update:selectedCategoryId', cat.id)"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Catalog grids list -->
      <div v-if="filteredCatalog.length === 0" class="py-20 text-center border border-dashed border-default rounded-3xl space-y-3">
        <UIcon name="i-lucide-package-open" class="size-12 text-muted mx-auto" />
        <p class="text-sm text-toned">Maaf, saat ini produk belum tersedia.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-left">
        <div
          v-for="sfp in filteredCatalog"
          :key="sfp.id"
          class="group bg-elevated border border-default p-4 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 transition-all duration-300 hover:shadow-md"
        >
          <div class="space-y-3">
            <!-- Image view -->
            <div class="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted/20 border border-default relative shrink-0">
              <img v-if="sfp.products.image_url" :src="sfp.products.image_url" alt="" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-muted"><UIcon name="i-lucide-package" class="size-8" /></div>
              
              <span v-if="sfp.products.stock_qty <= sfp.products.min_stock" class="absolute top-2 right-2 text-[8px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                Stok Menipis
              </span>
            </div>

            <!-- Product details -->
            <div class="space-y-1">
              <span class="text-[9px] uppercase tracking-wider font-mono font-bold text-muted">
                {{ categories.find(c => c.id === sfp.products.category_id)?.name || 'Katalog' }}
              </span>
              <h4 class="text-xs font-extrabold text-default truncate">{{ sfp.products.name }}</h4>
              <p class="text-[10px] text-toned font-light line-clamp-2 leading-relaxed h-7">
                {{ sfp.custom_description || sfp.products.name }}
              </p>
            </div>
          </div>

          <!-- Price & Buy actions -->
          <div class="pt-2 border-t border-default/50 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-mono font-bold text-default">{{ formatRupiah(sfp.products.sell_price) }}</span>
              <span class="text-[9px] font-mono text-muted">Per {{ sfp.products.unit }}</span>
            </div>

            <button
              type="button"
              class="p-2 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-90 transition-transform flex items-center justify-center shrink-0"
              :class="[!activeThemeClasses.isCustom ? activeThemeClasses.buttonBg : '']"
              :style="activeThemeClasses.isCustom ? { backgroundColor: activeThemeClasses.customColor } : {}"
              @click="emit('add-to-cart', sfp)"
            >
              <UIcon name="i-lucide-plus" class="size-4" />
            </button>
          </div>

        </div>
      </div>
    </section>
  </main>
</template>

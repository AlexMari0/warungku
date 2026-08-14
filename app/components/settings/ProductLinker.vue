<script setup lang="ts">
import { Motion } from 'motion-v'
import type { Product, Category } from '~/types'

const props = defineProps<{
  products: Product[]
  categories: Category[]
  storefrontProductsMap: Record<string, { is_linked: boolean; is_featured: boolean; custom_description: string }>
  saving: boolean
}>()

const emit = defineEmits<{
  'toggle-link': [productId: string]
  'toggle-featured': [productId: string]
  'update-description': [productId: string, value: string]
  'save': []
}>()

const searchProductQuery = ref('')
const selectedCategoryId = ref('')

const filteredProductsForExhibition = computed(() => {
  return props.products.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(searchProductQuery.value.toLowerCase())
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(searchProductQuery.value.toLowerCase()) : false
    const matchesSearch = nameMatch || skuMatch

    const matchesCategory = !selectedCategoryId.value || p.category_id === selectedCategoryId.value
    return matchesSearch && matchesCategory
  })
})
</script>

<template>
  <Motion
    :initial="{ opacity: 0, y: 15 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, type: 'spring', bounce: 0.1, delay: 0.15 }"
  >
    <div class="bg-elevated border border-default p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
      
      <div class="flex flex-col md:flex-row md:items-center justify-between border-b border-default pb-4 gap-4">
        <h3 class="text-lg font-bold text-default flex items-center gap-2">
          <UIcon name="i-lucide-package-check" class="size-5 text-primary" />
          Kelola Pajangan Etalase
        </h3>
        
        <!-- Filter Inventory tools -->
        <div class="flex gap-2 shrink-0">
          <div class="relative w-44">
            <input
              v-model="searchProductQuery"
              type="text"
              placeholder="Cari nama/SKU..."
              class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-default bg-muted/10 text-xs text-default outline-none"
            />
            <UIcon name="i-lucide-search" class="absolute left-2.5 top-2.5 text-muted size-3.5" />
          </div>

          <select
            v-model="selectedCategoryId"
            class="px-2 py-1.5 rounded-xl border border-default bg-elevated text-xs text-toned outline-none"
          >
            <option value="">Semua Kategori</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Empty products catalog warnings -->
      <div v-if="filteredProductsForExhibition.length === 0" class="py-12 border border-dashed border-default rounded-2xl text-center space-y-3">
        <UIcon name="i-lucide-package-open" class="size-10 text-muted mx-auto animate-bounce" />
        <p class="text-sm text-toned">Tidak ditemukan produk dalam filter stok.</p>
      </div>

      <!-- Responsive Exhibited Product list table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr class="border-b border-default text-[10px] text-muted font-bold uppercase tracking-wider">
              <th class="py-3 px-3 w-16">Pajang?</th>
              <th class="py-3 px-3">Nama / Info Produk</th>
              <th class="py-3 px-3 w-28 text-center">Stok Fisik</th>
              <th class="py-3 px-3 w-28 text-center">Produk Unggulan</th>
              <th class="py-3 px-3">Deskripsi Promo Web</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default/50">
            <tr
              v-for="p in filteredProductsForExhibition"
              :key="p.id"
              class="group hover:bg-muted/10 transition-colors"
            >
              <!-- Link checkbox -->
              <td class="py-4 px-3 text-center">
                <input
                  type="checkbox"
                  :checked="storefrontProductsMap[p.id]?.is_linked"
                  class="size-4.5 rounded text-primary focus:ring-primary border-default cursor-pointer"
                  @change="emit('toggle-link', p.id)"
                />
              </td>

              <!-- Product detail identity -->
              <td class="py-4 px-3">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-lg overflow-hidden bg-muted/20 border border-default shrink-0">
                    <img v-if="p.image_url" :src="p.image_url" alt="" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-muted"><UIcon name="i-lucide-package" class="size-5" /></div>
                  </div>
                  <div class="flex flex-col text-left">
                    <span class="text-xs font-bold text-default group-hover:text-primary transition-colors">{{ p.name }}</span>
                    <span class="text-[9px] font-mono text-muted tracking-wide">SKU: {{ p.sku || '-' }} • {{ formatRupiah(p.sell_price) }}</span>
                  </div>
                </div>
              </td>

              <!-- Stock counts status -->
              <td class="py-4 px-3 text-center">
                <div class="flex flex-col items-center justify-center gap-0.5">
                  <span
                    class="text-xs font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
                    :class="[p.stock_qty <= p.min_stock ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-muted text-toned']"
                  >
                    {{ p.stock_qty }} {{ p.unit }}
                  </span>
                  
                  <UTooltip
                    v-if="p.stock_qty <= p.min_stock"
                    text="Produk dengan stok menipis tetap dipajang di toko online Anda, tetapi disarankan segera restock agar pembeli dapat memesan tanpa kendala."
                    side="top"
                    :ui="{ content: 'max-w-xs whitespace-normal text-center' }"
                  >
                    <span class="inline-flex items-center gap-0.5 text-[8px] text-rose-500 font-medium cursor-help underline decoration-dotted decoration-rose-400">
                      <UIcon name="i-lucide-alert-triangle" class="size-2.5 shrink-0" />
                      Segera Restock
                    </span>
                  </UTooltip>
                </div>
              </td>

              <!-- Featured status -->
              <td class="py-4 px-3 text-center">
                <UTooltip
                  v-if="storefrontProductsMap[p.id]?.is_linked"
                  text="Jadikan Produk Unggulan: Produk ini akan disematkan di bagian paling atas toko online Anda agar lebih menonjol."
                  side="top"
                  :ui="{ content: 'max-w-xs whitespace-normal text-center' }"
                >
                  <button
                    type="button"
                    class="p-1 px-2 text-[9px] font-bold rounded-lg border transition-all cursor-pointer active:scale-90"
                    :class="[
                      storefrontProductsMap[p.id]?.is_featured
                        ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900'
                        : 'bg-elevated border-default text-muted hover:text-default'
                    ]"
                    @click="emit('toggle-featured', p.id)"
                  >
                    <UIcon
                      :name="storefrontProductsMap[p.id]?.is_featured ? 'i-lucide-star' : 'i-lucide-star-off'"
                      class="size-3.5"
                    />
                  </button>
                </UTooltip>
                <span v-else class="text-[10px] text-muted font-light">-</span>
              </td>

              <!-- Custom descriptions -->
              <td class="py-4 px-3">
                <input
                  v-if="storefrontProductsMap[p.id]?.is_linked"
                  :value="storefrontProductsMap[p.id]?.custom_description || ''"
                  type="text"
                  placeholder="Misal: Indomie Goreng lezat pedas gurih..."
                  class="w-full px-3 py-1.5 rounded-lg border border-default bg-muted/5 text-[10px] text-default focus:ring-1 focus:ring-primary/20 outline-none"
                  @input="emit('update-description', p.id, ($event.target as HTMLInputElement).value)"
                />
                <span v-else class="text-[10px] text-muted italic">Centang pajang terlebih dahulu</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Save bottom sticky button -->
      <div class="flex items-center justify-between pt-4 border-t border-default">
        <div class="flex items-center gap-2 text-xs text-toned">
          <UIcon name="i-lucide-info" class="size-4 text-primary shrink-0" />
          <span>
            Ada <strong>{{ Object.values(storefrontProductsMap).filter(p => p.is_linked).length }}</strong> produk terpilih untuk dipajang.
          </span>
        </div>

        <UButton
          color="success"
          variant="solid"
          icon="i-lucide-save"
          class="px-6 py-2.5 rounded-xl font-bold cursor-pointer active:scale-[0.98]"
          :loading="saving"
          @click="emit('save')"
        >
          Simpan &amp; Terapkan
        </UButton>
      </div>

    </div>
  </Motion>
</template>

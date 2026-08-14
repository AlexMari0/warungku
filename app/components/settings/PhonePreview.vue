<script setup lang="ts">
import type { Storefront, Product } from '~/types'

const props = defineProps<{
  storefront: Storefront
  storefrontProductsMap: Record<string, { is_linked: boolean; is_featured: boolean; custom_description: string }>
  products: Product[]
  livePreviewUrl: string
}>()

const mockupDarkMode = ref(false)

const themeColorList = [
  { name: 'emerald', bgClass: 'bg-emerald-500', label: 'Emerald Green' },
  { name: 'sky', bgClass: 'bg-sky-500', label: 'Sky Blue' },
  { name: 'indigo', bgClass: 'bg-indigo-500', label: 'Indigo Purple' },
  { name: 'rose', bgClass: 'bg-rose-500', label: 'Rose Pink' },
  { name: 'amber', bgClass: 'bg-amber-500', label: 'Amber Orange' },
  { name: 'zinc', bgClass: 'bg-zinc-800', label: 'Zinc Minimal' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-smartphone" class="size-4 text-toned" />
        <span class="text-xs font-mono font-bold tracking-wider text-muted uppercase">Pratinjau Tampilan Web</span>
      </div>
      <UButton
        size="xs"
        color="neutral"
        variant="subtle"
        icon="i-lucide-external-link"
        class="cursor-pointer active:scale-95 text-[10px]"
        :to="livePreviewUrl"
        target="_blank"
      >
        Pratinjau Penuh
      </UButton>
    </div>

    <div class="relative mx-auto max-w-[380px] w-full rounded-[3rem] ring-12 ring-zinc-950 dark:ring-zinc-900 border-[6px] border-zinc-800 bg-elevated shadow-2xl overflow-hidden aspect-[9/19.5]">
      <!-- Phone Speaker / Camera Notch -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-900 rounded-b-2rem z-30 flex items-center justify-center">
        <div class="w-10 h-1 bg-zinc-700 rounded-full"></div>
      </div>

      <!-- Mockup Frame Content -->
      <div
        class="h-full overflow-y-auto no-scrollbar flex flex-col pt-5 transition-colors duration-300"
        :class="mockupDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'"
      >
        <!-- Mock Status Bar -->
        <div
          class="h-7 px-5 flex items-center justify-between text-[10px] font-mono shrink-0 select-none z-20 border-b transition-colors"
          :class="mockupDarkMode ? 'bg-zinc-950 text-zinc-400 border-zinc-900' : 'bg-white text-zinc-500 border-zinc-100'"
        >
          <span class="font-semibold">09:41</span>
          <div class="flex items-center gap-2">
            <!-- Theme Toggle Button -->
            <button
              type="button"
              class="p-1 rounded-md cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0"
              :class="mockupDarkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'"
              @click="mockupDarkMode = !mockupDarkMode"
              title="Toggle Mode Mockup"
            >
              <UIcon
                :name="mockupDarkMode ? 'i-lucide-sun' : 'i-lucide-moon'"
                class="size-3.5"
                :class="mockupDarkMode ? 'text-amber-400' : 'text-zinc-500'"
              />
            </button>
            <UIcon name="i-lucide-signal" class="size-3 text-toned" />
            <UIcon name="i-lucide-wifi" class="size-3 text-toned" />
            <UIcon name="i-lucide-battery" class="size-3.5 text-toned" />
          </div>
        </div>

        <!-- Mock Banner -->
        <div class="h-28 w-full bg-muted/30 relative overflow-hidden shrink-0">
          <img
            v-if="storefront.banner_url"
            :src="storefront.banner_url"
            alt="Banner mockup"
            class="w-full h-full object-cover opacity-80"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-xs transition-colors"
            :class="mockupDarkMode ? 'bg-zinc-900/50 text-zinc-500' : 'bg-zinc-200/50 text-zinc-400'"
          >
            <UIcon name="i-lucide-image" class="size-6 text-muted" />
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          <!-- Mock Status Tag -->
          <span
            class="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full z-10 shrink-0 text-white"
            :class="[storefront.is_published ? 'bg-emerald-500' : 'bg-rose-500']"
          >
            {{ storefront.is_published ? 'Publik' : 'Draft' }}
          </span>
        </div>

        <!-- Mock Header Info -->
        <div class="px-4 -mt-6 z-10 relative space-y-1 text-left">
          <div
            class="size-12 rounded-xl border flex items-center justify-center shadow-md transition-all"
            :class="mockupDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-zinc-950/50' : 'bg-white border-zinc-200 text-zinc-900 shadow-md'"
          >
            <UIcon name="i-lucide-store" class="size-6" />
          </div>
          <h4
            class="text-sm font-bold truncate mt-1 transition-colors"
            :class="mockupDarkMode ? 'text-zinc-100' : 'text-zinc-900'"
          >
            {{ storefront.display_name || 'Nama Toko Anda' }}
          </h4>
          <p
            class="text-[10px] font-light line-clamp-2 leading-relaxed transition-colors"
            :class="mockupDarkMode ? 'text-zinc-400' : 'text-zinc-500'"
          >
            {{ storefront.description || 'Deskripsi atau tagline toko online Anda akan ditampilkan di sini...' }}
          </p>
          
          <!-- Color theme accent label -->
          <div class="pt-1.5 flex items-center gap-1.5">
            <span
              class="text-[9px] uppercase tracking-wider font-bold transition-colors"
              :class="mockupDarkMode ? 'text-zinc-500' : 'text-zinc-400'"
            >Aksen Tema:</span>
            <span
              class="size-2 rounded-full border border-default/20"
              :class="[!storefront.theme_color.startsWith('#') ? (themeColorList.find(t => t.name === storefront.theme_color)?.bgClass || 'bg-emerald-500') : '']"
              :style="storefront.theme_color.startsWith('#') ? { backgroundColor: storefront.theme_color } : {}"
            ></span>
            <span
              class="text-[9px] font-mono uppercase transition-colors"
              :class="mockupDarkMode ? 'text-zinc-300 font-medium' : 'text-zinc-700 font-semibold'"
            >{{ storefront.theme_color }}</span>
          </div>
        </div>

        <!-- Mock Products Grid Preview -->
        <div class="flex-1 px-4 py-6 space-y-4">
          <div
            class="flex items-center justify-between border-b pb-1 transition-colors"
            :class="mockupDarkMode ? 'border-zinc-900' : 'border-zinc-200'"
          >
            <span
              class="text-[10px] font-extrabold tracking-wide transition-colors"
              :class="mockupDarkMode ? 'text-zinc-200' : 'text-zinc-800'"
            >Katalog Toko</span>
            <span
              class="text-[8px] font-mono uppercase transition-colors"
              :class="mockupDarkMode ? 'text-zinc-500' : 'text-zinc-400'"
            >Preview</span>
          </div>

          <!-- Empty state inside preview -->
          <div v-if="!Object.values(storefrontProductsMap).some(p => p.is_linked)" class="py-6 text-center space-y-2">
            <UIcon name="i-lucide-package-open" class="size-8 text-muted mx-auto" />
            <p class="text-[10px] text-muted">Belum ada produk yang dipajang. Pilih dari etalase di sebelah kanan.</p>
          </div>

          <!-- Product items grids mock -->
          <div v-else class="grid grid-cols-2 gap-2.5">
            <div
              v-for="p in products.filter(item => storefrontProductsMap[item.id]?.is_linked).slice(0, 4)"
              :key="p.id"
              class="rounded-xl border p-2 flex flex-col justify-between space-y-2 transition-all"
              :class="mockupDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'"
            >
              <div
                class="w-full aspect-square rounded-lg overflow-hidden relative shrink-0 transition-colors"
                :class="mockupDarkMode ? 'bg-zinc-950' : 'bg-zinc-100'"
              >
                <img v-if="p.image_url" :src="p.image_url" alt="" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center"><UIcon name="i-lucide-package" class="size-4 text-muted" /></div>
                
                <span v-if="storefrontProductsMap[p.id]?.is_featured" class="absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                  Unggulan
                </span>
              </div>
              <div class="space-y-0.5 text-left">
                <h5
                  class="text-[10px] font-extrabold truncate transition-colors"
                  :class="mockupDarkMode ? 'text-zinc-200' : 'text-zinc-800'"
                >{{ p.name }}</h5>
                <p
                  class="text-[9px] font-mono font-bold transition-colors"
                  :class="mockupDarkMode ? 'text-zinc-400' : 'text-zinc-600'"
                >{{ formatRupiah(p.sell_price) }}</p>
              </div>
              <button
                class="w-full py-1 rounded-lg text-[8px] font-bold text-white transition-all pointer-events-none"
                :class="[!storefront.theme_color.startsWith('#') ? (themeColorList.find(t => t.name === storefront.theme_color)?.bgClass || 'bg-emerald-500') : '']"
                :style="storefront.theme_color.startsWith('#') ? { backgroundColor: storefront.theme_color } : {}"
              >
                Beli
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Brand -->
        <div
          class="py-4 border-t text-center transition-colors"
          :class="mockupDarkMode ? 'border-zinc-900' : 'border-zinc-200'"
        >
          <span
            class="text-[8px] font-mono uppercase tracking-wider transition-colors"
            :class="mockupDarkMode ? 'text-zinc-600' : 'text-zinc-400'"
          >WarungKu Digital Hub</span>
        </div>
      </div>
    </div>
  </div>
</template>

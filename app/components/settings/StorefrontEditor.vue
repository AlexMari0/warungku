<script setup lang="ts">
import { Motion } from 'motion-v'
import type { Storefront } from '~/types'
import type { SlugStatus } from '~/composables/useStorefront'

const props = defineProps<{
  storefront: Storefront
  slugStatus: SlugStatus
  slugErrorMessage: string
  livePreviewUrl: string
}>()

const emit = defineEmits<{
  'slug-input': [event: Event]
}>()

const themeColorList = [
  { name: 'emerald', bgClass: 'bg-emerald-500', label: 'Emerald Green' },
  { name: 'sky', bgClass: 'bg-sky-500', label: 'Sky Blue' },
  { name: 'indigo', bgClass: 'bg-indigo-500', label: 'Indigo Purple' },
  { name: 'rose', bgClass: 'bg-rose-500', label: 'Rose Pink' },
  { name: 'amber', bgClass: 'bg-amber-500', label: 'Amber Orange' },
  { name: 'zinc', bgClass: 'bg-zinc-800', label: 'Zinc Minimal' }
]

const bannerPresets = [
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80'
]

const colorPickerRef = ref<HTMLInputElement | null>(null)

function triggerColorPicker() {
  if (colorPickerRef.value) {
    colorPickerRef.value.click()
  }
}

function onCustomColorChange(e: Event) {
  const target = e.target as HTMLInputElement
  props.storefront.theme_color = target.value
}
</script>

<template>
  <Motion
    :initial="{ opacity: 0, y: 15 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, type: 'spring', bounce: 0.1 }"
  >
    <div class="bg-elevated border border-default p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6">
      <div class="flex items-center justify-between border-b border-default pb-4">
        <h3 class="text-lg font-bold text-default flex items-center gap-2">
          <UIcon name="i-lucide-settings" class="size-5 text-primary" />
          Parameter Toko Online
        </h3>
        
        <!-- Publish Chip Toggle -->
        <div class="flex items-center gap-3">
          <span class="text-xs font-mono font-bold uppercase tracking-wider" :class="[storefront.is_published ? 'text-emerald-500' : 'text-muted']">
            {{ storefront.is_published ? 'Terbit (Publik)' : 'Draf (Sembunyi)' }}
          </span>
          <UToggle
            v-model="storefront.is_published"
            size="md"
            color="success"
            class="active:scale-95 transition-transform"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        <!-- Field: Slug -->
        <div class="space-y-2 md:col-span-2">
          <label class="text-xs font-bold text-default uppercase tracking-wider">Tautan Unik Toko (Slug)</label>
          <div class="flex flex-col md:flex-row gap-2">
            <div class="flex-grow flex rounded-xl border border-default overflow-hidden bg-muted/10 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <span class="bg-muted/30 px-3 py-2.5 text-xs text-toned font-mono border-r border-default flex items-center">
                https://warungku.com/store/
              </span>
              <input
                v-model="storefront.slug"
                type="text"
                placeholder="toko-budi"
                class="flex-1 px-4 py-2.5 text-xs font-mono text-default bg-transparent border-0 outline-none"
                @input="emit('slug-input', $event)"
              />
            </div>
            
            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-external-link"
              class="active:scale-[0.98] cursor-pointer shrink-0 rounded-xl"
              :to="livePreviewUrl"
              target="_blank"
            >
              Buka Toko
            </UButton>
          </div>
          
          <!-- Real-time Validation Feedback -->
          <div class="transition-all duration-300 ease-out pt-0.5">
            <div v-if="slugStatus === 'checking'" class="flex items-center gap-1.5 text-[11px] text-muted font-mono">
              <UIcon name="i-lucide-loader" class="size-3.5 animate-spin text-primary shrink-0" />
              Memeriksa ketersediaan alamat...
            </div>
            <div v-else-if="slugStatus === 'available'" class="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <UIcon name="i-lucide-check-circle" class="size-3.5 text-emerald-500 shrink-0" />
              Alamat tersedia! Pembeli dapat mengakses toko Anda melalui link ini.
            </div>
            <div v-else-if="slugStatus === 'taken'" class="flex items-center gap-1.5 text-[11px] text-rose-500 font-medium">
              <UIcon name="i-lucide-x-circle" class="size-3.5 text-rose-500 shrink-0" />
              {{ slugErrorMessage }}
            </div>
            <div v-else-if="slugStatus === 'invalid'" class="flex items-center gap-1.5 text-[11px] text-amber-500 font-medium">
              <UIcon name="i-lucide-alert-circle" class="size-3.5 text-amber-500 shrink-0" />
              {{ slugErrorMessage }}
            </div>
          </div>

          <p class="text-[10px] text-muted italic">
            *Gunakan huruf kecil, angka, dan tanda strip. Link ini adalah alamat web publik untuk para pembeli Anda.
          </p>
        </div>

        <!-- Field: Display Name -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-default uppercase tracking-wider">Nama Toko Online</label>
          <input
            v-model="storefront.display_name"
            type="text"
            placeholder="Masukkan nama resmi..."
            class="w-full px-4 py-3 rounded-xl border border-default bg-muted/10 text-xs text-default focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <!-- Field: Theme selection color -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-default uppercase tracking-wider">Warna Aksen Tema</label>
          <div class="flex items-center gap-3 pt-2">
            <UTooltip
              v-for="t in themeColorList"
              :key="t.name"
              :text="t.label"
              side="top"
              :ui="{ content: 'max-w-fit' }"
            >
              <button
                type="button"
                class="size-8 rounded-full border-2 cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center shrink-0"
                :class="[
                  t.bgClass,
                  storefront.theme_color === t.name ? 'border-default ring-2 ring-primary scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                ]"
                @click="storefront.theme_color = t.name"
              >
                <UIcon
                  v-if="storefront.theme_color === t.name"
                  name="i-lucide-check"
                  class="size-4 text-white"
                />
              </button>
            </UTooltip>

            <!-- Custom Color Picker Circle -->
            <UTooltip
              text="Warna Kustom"
              side="top"
              :ui="{ content: 'max-w-fit' }"
            >
              <div class="relative shrink-0 size-8">
                <button
                  type="button"
                  class="size-8 rounded-full border-2 cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center shrink-0 bg-gradient-to-tr from-rose-500 via-emerald-500 to-sky-500"
                  :class="[
                    storefront.theme_color.startsWith('#') ? 'border-default ring-2 ring-primary scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                  ]"
                  :style="storefront.theme_color.startsWith('#') ? { background: storefront.theme_color } : {}"
                  @click="triggerColorPicker"
                >
                  <UIcon
                    name="i-lucide-palette"
                    class="size-4 text-white"
                  />
                </button>
                <!-- Hidden input type="color" -->
                <input
                  ref="colorPickerRef"
                  type="color"
                  class="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
                  :value="storefront.theme_color.startsWith('#') ? storefront.theme_color : '#10B981'"
                  @input="onCustomColorChange"
                />
              </div>
            </UTooltip>
          </div>
        </div>

        <!-- Field: Tagline / Description -->
        <div class="space-y-2 md:col-span-2">
          <label class="text-xs font-bold text-default uppercase tracking-wider">Deskripsi &amp; Tagline Toko</label>
          <textarea
            v-model="storefront.description"
            rows="3"
            placeholder="Ceritakan tentang warung Anda..."
            class="w-full px-4 py-3 rounded-xl border border-default bg-muted/10 text-xs text-default focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          ></textarea>
        </div>

        <!-- Field: Banner URL Select & Input -->
        <div class="space-y-2 md:col-span-2">
          <label class="text-xs font-bold text-default uppercase tracking-wider">Tautan Gambar Banner Atas</label>
          <input
            v-model="storefront.banner_url"
            type="text"
            placeholder="Masukkan link gambar atau pilih preset..."
            class="w-full px-4 py-3 rounded-xl border border-default bg-muted/10 text-xs text-default focus:ring-2 focus:ring-primary/20 outline-none"
          />

          <div class="flex items-center gap-3 pt-2 overflow-x-auto no-scrollbar pb-1">
            <span class="text-[10px] text-muted font-bold shrink-0 uppercase tracking-widest">Preset:</span>
            <button
              v-for="banner in bannerPresets"
              :key="banner"
              type="button"
              class="h-10 w-20 rounded-lg overflow-hidden border cursor-pointer active:scale-95 shrink-0"
              :class="[storefront.banner_url === banner ? 'border-primary ring-2 ring-primary/30' : 'border-default opacity-70 hover:opacity-100']"
              @click="storefront.banner_url = banner"
            >
              <img :src="banner" alt="" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Motion>
</template>

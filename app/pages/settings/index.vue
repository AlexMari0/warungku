<script setup lang="ts">
import { Motion } from 'motion-v'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const activeTab = ref<'storefront' | 'profile'>('storefront')
const loading = ref(false)
const saving = ref(false)

const { isDemo } = useDemoMode()

// Storefront settings state
const storefront = ref({
  id: '',
  slug: '',
  display_name: '',
  description: '',
  banner_url: '',
  theme_color: 'emerald',
  is_published: false
})

// Categories and products from inventory
const categories = ref<any[]>([])
const products = ref<any[]>([])
const searchProductQuery = ref('')
const selectedCategoryId = ref('')

// Storefront product assignments state (product_id -> { is_featured, custom_description, is_linked })
const storefrontProductsMap = ref<Record<string, { is_linked: boolean; is_featured: boolean; custom_description: string }>>({})

// Formatted live link preview
const livePreviewUrl = computed(() => {
  const slugValue = storefront.value.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
  return `/store/${slugValue || 'demo-store'}`
})

// Format currency standard
const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

// Fetch all settings & storefront catalog configurations
async function fetchData() {
  loading.value = true
  try {
    if (isDemo.value) {
      // 1. Load storefront settings
      const rawSf = localStorage.getItem('warungku_storefront')
      if (rawSf) {
        storefront.value = JSON.parse(rawSf)
      } else {
        const defaultSf = {
          id: 'sf-demo-1',
          slug: 'warung-demo-kita',
          display_name: 'Warung Demo Kita',
          description: 'Penyedia bahan harian terlengkap, hemat biaya, dan terpercaya bagi masyarakat luas.',
          banner_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
          theme_color: 'emerald',
          is_published: true
        }
        localStorage.setItem('warungku_storefront', JSON.stringify(defaultSf))
        storefront.value = defaultSf
      }

      // 2. Load inventory categories and products
      const rawCats = localStorage.getItem('warungku_categories')
      categories.value = rawCats ? JSON.parse(rawCats) : []

      const rawProds = localStorage.getItem('warungku_products')
      products.value = rawProds ? JSON.parse(rawProds) : []

      // 3. Load storefront product linkages
      const rawSfp = localStorage.getItem('warungku_storefront_products')
      let linkedList: any[] = []
      if (rawSfp) {
        linkedList = JSON.parse(rawSfp)
      } else {
        linkedList = [
          { product_id: 'prod-1', is_featured: true, custom_description: 'Indomie Aceh pedas rempah mantap' },
          { product_id: 'prod-2', is_featured: false, custom_description: 'Kopi susu gula aren segar' }
        ]
        localStorage.setItem('warungku_storefront_products', JSON.stringify(linkedList))
      }

      // Initialize map
      const map: Record<string, any> = {}
      products.value.forEach(p => {
        const found = linkedList.find((link: any) => link.product_id === p.id)
        map[p.id] = {
          is_linked: !!found,
          is_featured: found ? found.is_featured : false,
          custom_description: found ? found.custom_description || '' : ''
        }
      })
      storefrontProductsMap.value = map

    } else {
      if (!user.value) return

      // 1. Fetch categories & products
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
      categories.value = catData || []

      const { data: prodData } = await supabase.from('products').select('*, categories(name, color)').order('name', { ascending: true })
      products.value = prodData || []

      // 2. Fetch storefront setting for merchant
      const { data: sfData, error: sfError } = await (supabase
        .from('storefronts') as any)
        .select('*')
        .eq('merchant_id', user.value.id)
        .maybeSingle()

      if (sfError) throw sfError

      let activeSf = sfData
      if (!activeSf) {
        // Create an initial default storefront configuration
        const namePart = user.value.email?.split('@')[0] || 'toko-saya'
        const initialSf = {
          merchant_id: user.value.id,
          slug: `${namePart.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(100 + Math.random() * 900)}`,
          display_name: 'Toko Baru Saya',
          description: 'Selamat datang di toko online resmi kami!',
          theme_color: 'emerald',
          banner_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
          is_published: false
        }

        const { data: newSf, error: createError } = await (supabase
          .from('storefronts') as any)
          .insert(initialSf)
          .select()
          .single()

        if (createError) throw createError
        activeSf = newSf
      }

      if (!activeSf) {
        throw new Error('Gagal memuat atau membuat etalase toko.')
      }

      storefront.value = activeSf

      // 3. Fetch linked storefront products
      const { data: sfpData, error: sfpError } = await (supabase
        .from('storefront_products') as any)
        .select('*')
        .eq('storefront_id', (activeSf as any).id)

      if (sfpError) throw sfpError

      const map: Record<string, any> = {}
      products.value.forEach(p => {
        const found = ((sfpData as any) || []).find((link: any) => link.product_id === p.id)
        map[p.id] = {
          is_linked: !!found,
          is_featured: found ? found.is_featured : false,
          custom_description: found ? found.custom_description || '' : ''
        }
      })
      storefrontProductsMap.value = map
    }
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

// Save storefront details & product exposures
async function saveSettings() {
  saving.value = true
  try {
    // Basic slug validation
    const cleanSlug = storefront.value.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (!cleanSlug) {
      throw new Error('Slug toko tidak boleh kosong dan hanya boleh berisi huruf, angka, strip (-), dan garis bawah (_).')
    }
    storefront.value.slug = cleanSlug

    if (isDemo.value) {
      // 1. Save storefront config
      localStorage.setItem('warungku_storefront', JSON.stringify(storefront.value))

      // 2. Compile and save linked products list
      const linkedList: any[] = []
      Object.keys(storefrontProductsMap.value).forEach(pId => {
        const item = storefrontProductsMap.value[pId]
        if (item && item.is_linked) {
          linkedList.push({
            id: `sfp-mock-${pId}`,
            storefront_id: storefront.value.id,
            product_id: pId,
            is_featured: item.is_featured,
            custom_description: item.custom_description,
            sort_order: 0
          })
        }
      })
      localStorage.setItem('warungku_storefront_products', JSON.stringify(linkedList))

      toast.add({
        title: 'Berhasil menyimpan (Demo)',
        description: 'Konfigurasi toko online telah disimpan ke browser.',
        color: 'success'
      })
    } else {
      if (!user.value) return

      // 1. Update storefront parameters
      const { error: sfError } = await (supabase
        .from('storefronts') as any)
        .update({
          slug: storefront.value.slug,
          display_name: storefront.value.display_name,
          description: storefront.value.description,
          banner_url: storefront.value.banner_url,
          theme_color: storefront.value.theme_color,
          is_published: storefront.value.is_published
        })
        .eq('id', storefront.value.id)

      if (sfError) throw sfError

      // 2. Synchronize storefront products catalog in Postgres
      // A. Delete existing links
      const { error: deleteError } = await (supabase
        .from('storefront_products') as any)
        .delete()
        .eq('storefront_id', storefront.value.id)

      if (deleteError) throw deleteError

      // B. Re-insert active links
      const toInsert: any[] = []
      Object.keys(storefrontProductsMap.value).forEach(pId => {
        const item = storefrontProductsMap.value[pId]
        if (item && item.is_linked) {
          toInsert.push({
            storefront_id: storefront.value.id,
            product_id: pId,
            is_featured: item.is_featured,
            custom_description: item.custom_description || null
          })
        }
      })

      if (toInsert.length > 0) {
        const { error: insertError } = await (supabase
          .from('storefront_products') as any)
          .insert(toInsert)

        if (insertError) throw insertError
      }

      toast.add({
        title: 'Berhasil menyimpan',
        description: 'Etalase online Anda telah berhasil dipublikasikan!',
        color: 'success'
      })
    }

    // Refresh storefront maps and items
    await fetchData()
  } catch (err: any) {
    toast.add({
      title: 'Gagal menyimpan',
      description: err.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

// Normalize and slugify on slug input change
function onSlugInput(event: Event) {
  const target = event.target as HTMLInputElement
  storefront.value.slug = target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}

// Compute filtered inventory products for the storefront linker
const filteredProductsForExhibition = computed(() => {
  return products.value.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(searchProductQuery.value.toLowerCase())
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(searchProductQuery.value.toLowerCase()) : false
    const matchesSearch = nameMatch || skuMatch

    const matchesCategory = !selectedCategoryId.value || p.category_id === selectedCategoryId.value
    return matchesSearch && matchesCategory
  })
})

// Toggle product storefront link
function toggleProductLink(pId: string) {
  if (!storefrontProductsMap.value[pId]) {
    storefrontProductsMap.value[pId] = { is_linked: false, is_featured: false, custom_description: '' }
  }
  const item = storefrontProductsMap.value[pId]
  if (item) {
    item.is_linked = !item.is_linked
  }
}

// Toggle featured product status
function toggleFeatured(pId: string) {
  const item = storefrontProductsMap.value[pId]
  if (item) {
    item.is_featured = !item.is_featured
  }
}

// Update custom description for a product link safely
function updateCustomDescription(pId: string, value: string) {
  const item = storefrontProductsMap.value[pId]
  if (item) {
    item.custom_description = value
  }
}

// Banner options presets helper
const bannerPresets = [
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80'
]

// Available theme colors mapping to classes
const themeColorList = [
  { name: 'emerald', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-600', label: 'Emerald' },
  { name: 'sky', bgClass: 'bg-sky-500', borderClass: 'border-sky-600', label: 'Sky Blue' },
  { name: 'amber', bgClass: 'bg-amber-500', borderClass: 'border-amber-600', label: 'Amber' },
  { name: 'rose', bgClass: 'bg-rose-500', borderClass: 'border-rose-600', label: 'Rose Pink' },
  { name: 'slate', bgClass: 'bg-slate-500', borderClass: 'border-slate-600', label: 'Zinc Slate' }
]

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-10 py-4 max-w-7xl mx-auto">
    <!-- Asymmetric Header Layout (DESIGN_VARIANCE: 8 / VISUAL_DENSITY: 4) -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-default pb-8">
      <div class="space-y-2 text-left">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase">
          <UIcon name="i-lucide-globe" class="size-4 animate-pulse" />
          Eksposur Web Resmi
        </div>
        <h1 class="text-4xl font-extrabold text-default tracking-tight">
          Pengaturan Toko &amp; Etalase
        </h1>
        <p class="text-sm text-toned font-light max-w-xl">
          Atur branding, URL slug, status penerbitan, dan pilih produk-produk unggulan dari stok warung Anda untuk dipajang langsung di web online.
        </p>
      </div>

      <!-- Tab Switchers (Tactile spring clicks active:scale-[0.98]) -->
      <div class="flex gap-1.5 bg-muted/20 p-1.5 rounded-xl border border-default self-start">
        <button
          class="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-[0.98]"
          :class="[activeTab === 'storefront' ? 'bg-elevated text-default shadow-sm border border-default font-bold' : 'text-toned hover:text-default hover:bg-muted/30']"
          @click="activeTab = 'storefront'"
        >
          <UIcon name="i-lucide-store" class="size-4" />
          Toko Online (Etalase)
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-[0.98]"
          :class="[activeTab === 'profile' ? 'bg-elevated text-default shadow-sm border border-default font-bold' : 'text-toned hover:text-default hover:bg-muted/30']"
          @click="activeTab = 'profile'"
        >
          <UIcon name="i-lucide-user" class="size-4" />
          Profil Merchant
        </button>
      </div>
    </div>

    <!-- MAIN LOADING PANE -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
      <UIcon name="i-lucide-loader" class="size-8 text-primary animate-spin" />
      <span class="text-xs text-muted font-mono uppercase tracking-widest">Memuat Pengaturan...</span>
    </div>

    <!-- TAB CONTAINER 1: STOREFRONT & ONLINE CATALOG -->
    <div v-else-if="activeTab === 'storefront'" class="grid grid-cols-1 lg:grid-cols-3 gap-10">
      
      <!-- LEFT ASYMMETRIC COLUMN: LIVE PREVIEW PHONE MOCKUP -->
      <div class="lg:col-span-1 space-y-6">
        <div class="flex items-center gap-2 px-1">
          <UIcon name="i-lucide-smartphone" class="size-4 text-toned" />
          <span class="text-xs font-mono font-bold tracking-wider text-muted uppercase">Pratinjau Tampilan Web</span>
        </div>

        <div class="relative mx-auto max-w-[340px] rounded-[3rem] ring-12 ring-zinc-950 dark:ring-zinc-900 border-[6px] border-zinc-800 bg-elevated shadow-2xl overflow-hidden aspect-[9/19.5]">
          <!-- Phone Speaker / Camera Notch -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-900 rounded-b-2rem z-30 flex items-center justify-center">
            <div class="w-10 h-1 bg-zinc-700 rounded-full"></div>
          </div>

          <!-- Mockup Frame Content -->
          <div class="h-full overflow-y-auto no-scrollbar flex flex-col pt-5">
            <!-- Mock Banner -->
            <div class="h-28 w-full bg-muted/30 relative overflow-hidden shrink-0">
              <img
                v-if="storefront.banner_url"
                :src="storefront.banner_url"
                alt="Banner mockup"
                class="w-full h-full object-cover opacity-80"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-xs text-toned bg-muted/20">
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
            <div class="px-4 -mt-6 z-10 relative space-y-1">
              <div class="size-12 rounded-xl bg-elevated border border-default flex items-center justify-center shadow-md">
                <UIcon name="i-lucide-store" class="size-6 text-default" />
              </div>
              <h4 class="text-sm font-bold text-default truncate mt-1">
                {{ storefront.display_name || 'Nama Toko Anda' }}
              </h4>
              <p class="text-[10px] text-toned font-light line-clamp-2 leading-relaxed">
                {{ storefront.description || 'Deskripsi atau tagline toko online Anda akan ditampilkan di sini...' }}
              </p>
              
              <!-- Color theme accent label -->
              <div class="pt-1.5 flex items-center gap-1.5">
                <span class="text-[9px] uppercase tracking-wider text-muted font-bold">Aksen Tema:</span>
                <span class="size-2 rounded-full" :class="[themeColorList.find(t => t.name === storefront.theme_color)?.bgClass || 'bg-emerald-500']"></span>
                <span class="text-[9px] font-mono text-default capitalize">{{ storefront.theme_color }}</span>
              </div>
            </div>

            <!-- Mock Products Grid Preview -->
            <div class="flex-1 px-4 py-6 space-y-4">
              <div class="flex items-center justify-between border-b border-default pb-1">
                <span class="text-[10px] font-extrabold text-default tracking-wide">Katalog Toko</span>
                <span class="text-[8px] text-muted font-mono uppercase">Preview</span>
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
                  class="rounded-xl border border-default p-2 bg-elevated/50 flex flex-col justify-between space-y-2"
                >
                  <div class="w-full aspect-square bg-muted/30 rounded-lg overflow-hidden relative shrink-0">
                    <img v-if="p.image_url" :src="p.image_url" alt="" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center"><UIcon name="i-lucide-package" class="size-4 text-muted" /></div>
                    
                    <span v-if="storefrontProductsMap[p.id]?.is_featured" class="absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
                      Unggulan
                    </span>
                  </div>
                  <div class="space-y-0.5 text-left">
                    <h5 class="text-[10px] font-extrabold text-default truncate">{{ p.name }}</h5>
                    <p class="text-[9px] font-mono font-bold text-toned">{{ formatRupiah(p.sell_price) }}</p>
                  </div>
                  <button class="w-full py-1 rounded-lg text-[8px] font-bold text-white transition-all pointer-events-none" :class="[themeColorList.find(t => t.name === storefront.theme_color)?.bgClass || 'bg-emerald-500']">
                    Beli
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer Brand -->
            <div class="py-4 border-t border-default text-center">
              <span class="text-[8px] text-muted font-mono uppercase tracking-wider">WarungKu Digital Hub</span>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: CORE CONFIGURATION SETTINGS PANEL (col-span-2) -->
      <div class="lg:col-span-2 space-y-8">
        
        <!-- BENTO CARD 1: GLOBAL BRANDING AND PUB CONFIG -->
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
              
              <!-- PUBLISH CHIP TOGGLE WITH SPRING ANIM -->
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
                      @input="onSlugInput"
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
                    v-for="(banner, idx) in bannerPresets"
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

        <!-- BENTO CARD 2: PRODUCT EXPOSURE LINKING MANAGER -->
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
                        @change="toggleProductLink(p.id)"
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
                      <span
                        class="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
                        :class="[p.stock_qty <= p.min_stock ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-muted text-toned']"
                      >
                        {{ p.stock_qty }} {{ p.unit }}
                      </span>
                    </td>

                    <!-- Featured status -->
                    <td class="py-4 px-3 text-center">
                      <button
                        v-if="storefrontProductsMap[p.id]?.is_linked"
                        type="button"
                        class="p-1 px-2 text-[9px] font-bold rounded-lg border transition-all cursor-pointer active:scale-90"
                        :class="[
                          storefrontProductsMap[p.id]?.is_featured
                            ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900'
                            : 'bg-elevated border-default text-muted hover:text-default'
                        ]"
                        @click="toggleFeatured(p.id)"
                      >
                        <UIcon
                          :name="storefrontProductsMap[p.id]?.is_featured ? 'i-lucide-star' : 'i-lucide-star-off'"
                          class="size-3.5"
                        />
                      </button>
                      <span v-else class="text-[10px] text-muted font-light">-</span>
                    </td>

                    <!-- Custom descriptions -->
                    <td class="py-4 px-3">
                      <input
                        v-if="storefrontProductsMap[p.id]?.is_linked"
                        :value="storefrontProductsMap[p.id]?.custom_description || ''"
                        @input="updateCustomDescription(p.id, ($event.target as HTMLInputElement).value)"
                        type="text"
                        placeholder="Misal: Indomie Goreng lezat pedas gurih..."
                        class="w-full px-3 py-1.5 rounded-lg border border-default bg-muted/5 text-[10px] text-default focus:ring-1 focus:ring-primary/20 outline-none"
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
                @click="saveSettings"
              >
                Simpan &amp; Terapkan
              </UButton>
            </div>

          </div>
        </Motion>

      </div>

    </div>

    <!-- TAB CONTAINER 2: PROFILE SUMMARY -->
    <div v-else-if="activeTab === 'profile'" class="max-w-2xl mx-auto">
      <Motion
        :initial="{ opacity: 0, y: 15 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, type: 'spring', bounce: 0.1 }"
      >
        <div class="bg-elevated border border-default p-8 rounded-[2rem] shadow-sm space-y-6 text-left">
          <div class="flex items-center gap-4 pb-6 border-b border-default">
            <UAvatar
              src="https://i.pravatar.cc/150?u=warungkuadmin2026"
              alt="Profile"
              size="lg"
              class="ring-4 ring-primary/20 shrink-0"
            />
            <div class="space-y-1">
              <h3 class="text-xl font-bold text-default">
                {{ user?.user_metadata?.name || 'Demo Merchant' }}
              </h3>
              <p class="text-xs text-muted font-mono tracking-wider uppercase">
                Status: {{ isDemo ? 'Demo Merchant Mode' : 'Premium Active Tenant' }}
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">Email Akun</span>
              <span class="text-xs text-default col-span-2 font-mono truncate">{{ user?.email || 'demo@warungku.com' }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">Metrik Hak</span>
              <span class="text-xs text-default col-span-2">Merchant Owner</span>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">ID Tenant</span>
              <span class="text-xs text-default col-span-2 font-mono truncate">{{ user?.id || 'demo-merchant-uuid-2026' }}</span>
            </div>
            
            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">Database Link</span>
              <span class="text-xs text-emerald-500 font-bold col-span-2 flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-emerald-500 animate-ping"></span>
                Connected &amp; Secure
              </span>
            </div>
          </div>

          <div class="pt-4 text-center">
            <p class="text-[10px] text-muted italic">
              *Informasi identitas Anda di atas diproteksi dengan supabase Postgres Row-Level Security.
            </p>
          </div>
        </div>
      </Motion>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Motion } from 'motion-v'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const activeTab = ref<'storefront' | 'profile' | 'developer'>('storefront')

const { products, fetchProducts } = useProducts()
const { categories, fetchCategories } = useCategories()
const {
  storefront,
  storefrontProductsMap,
  slugStatus,
  saving,
  loading,
  fetchStorefrontSettings,
  saveSettings,
  toggleProductLink,
  toggleFeatured
} = useStorefront()

// Formatted live link preview
const livePreviewUrl = computed(() => {
  const slugValue = (storefront.value.slug || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
  return `/store/${slugValue || 'demo-store'}`
})

const slugErrorMessage = ref('')
let slugCheckTimeout: ReturnType<typeof setTimeout> | null = null

function validateSlug(slugVal: string) {
  const clean = slugVal.trim().toLowerCase()
  if (!clean) {
    slugStatus.value = 'invalid'
    slugErrorMessage.value = 'Slug tidak boleh kosong'
    return false
  }
  if (clean.length < 3) {
    slugStatus.value = 'invalid'
    slugErrorMessage.value = 'Slug minimal 3 karakter'
    return false
  }
  if (!/^[a-z0-9-_]+$/.test(clean)) {
    slugStatus.value = 'invalid'
    slugErrorMessage.value = 'Hanya boleh berisi huruf kecil, angka, strip (-), dan garis bawah (_)'
    return false
  }
  return true
}

// Watch slug to trigger real-time validation
watch(() => storefront.value.slug, (newSlug) => {
  if (slugCheckTimeout) {
    clearTimeout(slugCheckTimeout)
  }
  
  if (!newSlug) {
    slugStatus.value = 'idle'
    slugErrorMessage.value = ''
    return
  }

  const isValid = validateSlug(newSlug)
  if (!isValid) return

  slugStatus.value = 'checking'
  
  slugCheckTimeout = setTimeout(async () => {
    try {
      const checkSlug = newSlug.trim().toLowerCase()
      if (!user.value) return
      
      const { data, error } = await supabase
        .from('storefronts')
        .select('id')
        .eq('slug', checkSlug)
        .neq('merchant_id', user.value.id)
        .maybeSingle()
        
      if (error) throw error
      
      if (data) {
        slugStatus.value = 'taken'
        slugErrorMessage.value = `Alamat /store/${checkSlug} sudah digunakan oleh warung lain.`
      } else {
        slugStatus.value = 'available'
        slugErrorMessage.value = ''
      }
    } catch (_err: unknown) {
      slugStatus.value = 'invalid'
      slugErrorMessage.value = 'Gagal memeriksa ketersediaan alamat.'
    }
  }, 400)
})

onUnmounted(() => {
  if (slugCheckTimeout) {
    clearTimeout(slugCheckTimeout)
  }
})

// Fetch all settings & storefront catalog configurations
async function fetchData() {
  const catResult = await fetchCategories()
  if (!catResult.success) {
    toast.add({ title: 'Gagal memuat kategori', description: catResult.error, color: 'error' })
  }
  const result = await fetchProducts({ orderBy: 'name', orderAscending: true })
  if (!result.success) {
    toast.add({ title: 'Gagal memuat produk', description: result.error || 'Terjadi kesalahan.', color: 'error' })
  }
  const storeResult = await fetchStorefrontSettings(products.value)
  if (!storeResult.success) {
    toast.add({ title: 'Gagal memuat pengaturan toko', description: storeResult.error, color: 'error' })
  }
}

function onSlugInput(event: Event) {
  const target = event.target as HTMLInputElement
  storefront.value.slug = target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
}

function updateCustomDescription(pId: string, value: string) {
  const item = storefrontProductsMap.value[pId]
  if (item) {
    item.custom_description = value
  }
}

async function handleSaveSettings() {
  const result = await saveSettings()
  if (result.success) {
    toast.add({
      title: 'Pengaturan Etalase Tersimpan',
      description: 'Perubahan pada toko online Anda berhasil diperbarui.',
      color: 'success'
    })
    await fetchData()
  } else {
    toast.add({
      title: 'Gagal menyimpan pengaturan toko',
      description: result.error || 'Terjadi kesalahan.',
      color: 'error'
    })
  }
}

async function copyCommand() {
  try {
    await navigator.clipboard.writeText('node scripts/seed.mjs')
    toast.add({
      title: 'Perintah disalin',
      description: 'Perintah seeder telah disalin ke papan klip.',
      color: 'success'
    })
  } catch (_err: unknown) {
    toast.add({
      title: 'Gagal menyalin',
      description: 'Silakan salin perintah secara manual.',
      color: 'error'
    })
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="flex flex-col gap-10 max-w-7xl mx-auto w-full p-4 md:p-8 font-sans pb-24">
    <!-- Top Hero and Tab Selection -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-default pb-6">
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

      <!-- Tab Switchers -->
      <div class="flex gap-1.5 bg-muted/20 p-1.5 rounded-xl border border-default self-start flex-wrap">
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
        <button
          class="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-[0.98]"
          :class="[activeTab === 'developer' ? 'bg-elevated text-default shadow-sm border border-default font-bold' : 'text-toned hover:text-default hover:bg-muted/30']"
          @click="activeTab = 'developer'"
        >
          <UIcon name="i-lucide-database-backup" class="size-4" />
          Demo Seeder
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
      <div class="lg:col-span-1">
        <PhonePreview
          :storefront="storefront"
          :storefront-products-map="storefrontProductsMap"
          :products="products"
          :live-preview-url="livePreviewUrl"
        />
      </div>

      <!-- RIGHT COLUMN: CONFIGURATION AND PRODUCT LINKER (col-span-2) -->
      <div class="lg:col-span-2 space-y-8">
        <StorefrontEditor
          :storefront="storefront"
          :slug-status="slugStatus"
          :slug-error-message="slugErrorMessage"
          :live-preview-url="livePreviewUrl"
          @slug-input="onSlugInput"
        />

        <ProductLinker
          :products="products"
          :categories="categories"
          :storefront-products-map="storefrontProductsMap"
          :saving="saving"
          @toggle-link="toggleProductLink"
          @toggle-featured="toggleFeatured"
          @update-description="updateCustomDescription"
          @save="handleSaveSettings"
        />
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
                {{ user?.user_metadata?.name || 'Admin Toko' }}
              </h3>
              <p class="text-xs text-muted font-mono tracking-wider uppercase">
                Status: Premium Active Tenant
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">Email Akun</span>
              <span class="text-xs text-default col-span-2 font-mono truncate">{{ user?.email || '-' }}</span>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">Metrik Hak</span>
              <span class="text-xs text-default col-span-2">Merchant Owner</span>
            </div>

            <div class="grid grid-cols-3 gap-2 py-2.5 border-b border-default/40">
              <span class="text-xs text-toned font-bold uppercase tracking-wider">ID Tenant</span>
              <span class="text-xs text-default col-span-2 font-mono truncate">{{ user?.id || '-' }}</span>
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

    <!-- TAB CONTAINER 3: DEVELOPER DEMO SEEDER -->
    <div v-else-if="activeTab === 'developer'" class="max-w-2xl mx-auto">
      <Motion
        :initial="{ opacity: 0, y: 15 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, type: 'spring', bounce: 0.1 }"
      >
        <div class="bg-elevated border border-default p-8 rounded-[2rem] shadow-sm space-y-6 text-left">
          <div class="flex items-center gap-4 pb-6 border-b border-default">
            <div class="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-database-zap" class="size-6 text-primary" />
            </div>
            <div class="space-y-1">
              <h3 class="text-xl font-bold text-default">
                Dataset Demo &amp; Developer Seeder
              </h3>
              <p class="text-xs text-muted font-mono tracking-wider uppercase">
                Pengelolaan Mock Data &amp; E2E Testing Seeder
              </p>
            </div>
          </div>

          <!-- Section: Live Database Seeder -->
          <div class="space-y-4">
            <div class="space-y-1">
              <h4 class="text-sm font-bold text-default">
                Live Database Seeder (Supabase SQL)
              </h4>
              <p class="text-xs text-toned leading-relaxed font-light">
                Untuk mempopulasikan database relasional live Anda di Supabase dengan schema seeder, jalankan script Node CLI berikut di terminal repositori lokal Anda:
              </p>
            </div>

            <!-- Shell command snippet -->
            <div class="bg-zinc-950 dark:bg-zinc-900 border border-default/50 rounded-xl p-3 font-mono text-[10px] text-zinc-300 flex items-center justify-between">
              <span>node scripts/seed.mjs</span>
              <UButton
                size="xs"
                color="neutral"
                variant="subtle"
                icon="i-lucide-copy"
                class="active:scale-95 cursor-pointer text-[9px]"
                @click="copyCommand"
              >
                Salin
              </UButton>
            </div>

            <!-- Danger Alert Banner -->
            <div class="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 text-left">
              <div class="flex gap-2">
                <UIcon name="i-lucide-alert-triangle" class="size-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div class="space-y-1">
                  <h5 class="text-xs font-bold text-rose-800 dark:text-rose-300 font-sans">
                    Peringatan Cascade Purge Database
                  </h5>
                  <p class="text-[10px] text-rose-700 dark:text-rose-400 leading-relaxed font-light font-sans">
                    Menjalankan seeder live di database Supabase akan menghapus seluruh data transaksi sebelumnya (Topological Cascade Purge) yang terkait dengan merchant Anda sebelum mempopulasikan data uji baru. Pastikan Anda tidak menghapus data penting!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Motion>
    </div>

  </div>
</template>

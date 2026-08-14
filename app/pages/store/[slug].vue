<script setup lang="ts">
import { Motion } from 'motion-v'
import type { Storefront, Category, StorefrontProduct, OnlineOrder, Product } from '~/types'
import { getStoreThemeClasses } from '~/utils/storeThemes'

definePageMeta({
  layout: false
})

const route = useRoute()
const toast = useToast()
const colorMode = useColorMode()

const slug = computed(() => (route.params.slug as string) || '')

// Loading & View states
const loading = ref(true)
const checkingOut = ref(false)
const storeNotFound = ref(false)

// Store and Catalog state
const storeInfo = ref<Storefront | null>(null)
const categories = ref<Category[]>([])
const storefrontProducts = ref<(StorefrontProduct & { products?: Product })[]>([])

// Shopping cart state via composable
const { cart, cartTotalCount, cartSubtotal, addToCart, removeFromCart, resetCart } = usePublicCart()
const showCartDrawer = ref(false)

// Filter & Search states
const searchQuery = ref('')
const selectedCategoryId = ref('')

// Checkout Customer Form state
const customerName = ref('')
const customerPhone = ref('')
const customerNotes = ref('')
const orderSuccess = ref(false)
const lastCreatedOrder = ref<OnlineOrder | null>(null)

const { fetchPublicStorefront, createOnlineOrder, trackStorefrontEvent, generateWhatsAppOrderLink } = useStorefront()

// Fetch all public storefront details
async function fetchStorefront() {
  loading.value = true
  storeNotFound.value = false
  try {
    const data = await fetchPublicStorefront(slug.value)
    if (!data) {
      storeNotFound.value = true
      return
    }

    storeInfo.value = data.storefront
    storefrontProducts.value = data.products
    categories.value = data.categories
  } catch (err: unknown) {
    toast.add({
      title: 'Gagal memuat toko',
      description: (err as Error).message || 'Terjadi kesalahan.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Filtering storefront products
const filteredCatalog = computed(() => {
  return storefrontProducts.value.filter(sfp => {
    const product = sfp.products
    if (!product || !product.is_active) return false

    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = !selectedCategoryId.value || product.category_id === selectedCategoryId.value
    return matchesSearch && matchesCategory
  }) as (StorefrontProduct & { products: Product })[]
})

const featuredProducts = computed(() => {
  return storefrontProducts.value.filter(sfp => sfp.is_featured && sfp.products && sfp.products.is_active) as (StorefrontProduct & { products: Product })[]
})

// Generate formatted WhatsApp link
const generatedWhatsAppLink = computed(() => {
  if (!storeInfo.value) return '#'
  return generateWhatsAppOrderLink({
    storeName: storeInfo.value.display_name,
    cart: cart.value,
    totalAmount: cartSubtotal.value,
    customerName: customerName.value,
    customerPhone: customerPhone.value,
    customerNotes: customerNotes.value
  })
})

// Place storefront orders
async function handleCheckout() {
  if (cart.value.length === 0) return
  if (!customerName.value.trim() || !customerPhone.value.trim()) {
    toast.add({
      title: 'Formulir tidak lengkap',
      description: 'Mohon isi nama dan nomor telepon aktif Anda.',
      color: 'warning'
    })
    return
  }

  checkingOut.value = true
  try {
    const order = await createOnlineOrder({
      storefront_id: storeInfo.value!.id,
      customer_name: customerName.value,
      customer_phone: customerPhone.value,
      total_amount: cartSubtotal.value,
      notes: customerNotes.value
    })

    if (order) {
      lastCreatedOrder.value = order
      orderSuccess.value = true

      toast.add({
        title: 'Pesanan berhasil dibuat!',
        description: 'Langkah terakhir: Kirim detail pesanan Anda ke WhatsApp Merchant.',
        color: 'success'
      })

      await trackStorefrontEvent(slug.value, 'whatsapp_click')
      window.open(generatedWhatsAppLink.value, '_blank')
    }
  } finally {
    checkingOut.value = false
  }
}

function resetOrderProcess() {
  resetCart()
  customerName.value = ''
  customerPhone.value = ''
  customerNotes.value = ''
  orderSuccess.value = false
  showCartDrawer.value = false
}

// Color Theme helper classes mapping
const activeThemeClasses = computed(() => {
  return getStoreThemeClasses(storeInfo.value?.theme_color)
})

onMounted(async () => {
  await fetchStorefront()
  if (storeInfo.value) {
    await trackStorefrontEvent(slug.value, 'page_view')
  }
})
</script>

<template>
  <div class="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 text-default transition-colors overflow-x-hidden font-sans">
    <!-- PREMIUM AMBIENT RADIAL GLOW BACKDROP -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none z-0 transition-all duration-500 opacity-0 dark:opacity-100"
      :style="[
        !activeThemeClasses.isCustom
          ? { background: `radial-gradient(circle at 50% 0%, ${activeThemeClasses.glowGlow} 0%, transparent 70%)` }
          : { background: `radial-gradient(circle at 50% 0%, ${activeThemeClasses.customColor}14 0%, transparent 70%)` }
      ]"
    ></div>
    
    <!-- LOADING SCREEN -->
    <div v-if="loading" class="min-h-screen flex flex-col items-center justify-center gap-3">
      <UIcon
        name="i-lucide-loader"
        class="size-8 animate-spin"
        :class="[!activeThemeClasses.isCustom ? activeThemeClasses.textColor : '']"
        :style="activeThemeClasses.isCustom ? { color: activeThemeClasses.customColor } : {}"
      />
      <span class="text-xs font-mono text-muted tracking-widest uppercase">Memuat Toko Online...</span>
    </div>

    <!-- 404 / NOT FOUND STATE -->
    <div v-else-if="storeNotFound || !storeInfo" class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div class="size-20 rounded-3xl bg-error/10 text-error flex items-center justify-center mb-6">
        <UIcon name="i-lucide-store" class="size-10" />
      </div>
      <h1 class="text-3xl font-extrabold text-default tracking-tight mb-2">Toko Tidak Ditemukan</h1>
      <p class="text-sm text-toned max-w-md mb-8">
        Halaman etalase online dengan alamat <code class="font-mono bg-muted/30 px-2 py-0.5 rounded text-default">/store/{{ slug }}</code> tidak terdaftar atau belum dipublikasikan oleh pemilik warung.
      </p>
      <UButton
        to="/"
        label="Kembali ke Beranda"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="subtle"
        class="rounded-xl font-bold"
      />
    </div>

    <!-- MAIN STOREFRONT VIEWPORT -->
    <div v-else class="relative z-10 flex flex-col min-h-screen">
      <!-- 1. TOP HEADER / APP BAR -->
      <header class="sticky top-0 z-30 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-default transition-colors">
        <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm"
              :class="[!activeThemeClasses.isCustom ? `${activeThemeClasses.primaryBg} ${activeThemeClasses.textColor}` : '']"
              :style="activeThemeClasses.isCustom ? { backgroundColor: `${activeThemeClasses.customColor}20`, color: activeThemeClasses.customColor } : {}"
            >
              {{ storeInfo.display_name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <h2 class="font-extrabold text-sm text-default truncate tracking-tight">{{ storeInfo.display_name }}</h2>
              <span class="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Buka &amp; Melayani Pesanan
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Theme Mode Toggle -->
            <button
              class="size-9 rounded-xl flex items-center justify-center text-toned hover:text-default hover:bg-muted/30 transition-all cursor-pointer"
              @click="colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'"
            >
              <UIcon :name="colorMode.preference === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'" class="size-4" />
            </button>

            <!-- Floating Cart Trigger Button -->
            <button
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all duration-300 shadow-md active:scale-95 cursor-pointer relative"
              :class="[!activeThemeClasses.isCustom ? activeThemeClasses.buttonBg : '']"
              :style="activeThemeClasses.isCustom ? { backgroundColor: activeThemeClasses.customColor } : {}"
              @click="showCartDrawer = true"
            >
              <UIcon name="i-lucide-shopping-bag" class="size-4" />
              <span>Keranjang</span>
              <span
                v-if="cartTotalCount > 0"
                class="px-1.5 py-0.2 bg-white text-zinc-950 text-[10px] font-black rounded-full font-mono ml-0.5"
              >
                {{ cartTotalCount }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- 2. STORE HERO BANNER -->
      <section class="relative w-full max-w-6xl mx-auto px-4 pt-6 pb-4">
        <ClientOnly>
          <Motion
            :initial="{ opacity: 0, y: 15 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: 'easeOut' }"
          >
            <div class="relative w-full rounded-3xl overflow-hidden border border-default shadow-sm min-h-[180px] md:min-h-[220px] flex flex-col justify-end p-6 md:p-8 bg-zinc-900 text-white">
              <!-- Banner Image with Dimmed Vignette -->
              <img
                :src="storeInfo.banner_url || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80'"
                alt="Banner"
                class="absolute inset-0 w-full h-full object-cover opacity-35"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

              <!-- Banner Typography Island -->
              <div class="relative z-10 space-y-2 max-w-2xl">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold text-white tracking-widest uppercase">
                  <UIcon name="i-lucide-check-circle" class="size-3 text-emerald-400" />
                  Katalog Resmi Terverifikasi
                </div>
                <h1 class="text-2xl md:text-4xl font-extrabold tracking-tight">{{ storeInfo.display_name }}</h1>
                <p class="text-xs md:text-sm text-zinc-300 font-light line-clamp-2 leading-relaxed">
                  {{ storeInfo.description || 'Pesan belanjaan dan kebutuhan sehari-hari secara cepat langsung via WhatsApp resmi warung kami.' }}
                </p>
              </div>
            </div>
          </Motion>
        </ClientOnly>
      </section>

      <!-- 3. MAIN CATALOG WITH ASYMMETRIC GRID -->
      <StoreCatalog
        v-model:search-query="searchQuery"
        v-model:selected-category-id="selectedCategoryId"
        :categories="categories"
        :featured-products="featuredProducts"
        :filtered-catalog="filteredCatalog"
        :active-theme-classes="activeThemeClasses"
        :cart="cart"
        @add-to-cart="addToCart"
      />

      <!-- 4. BOTTOM FOOTER -->
      <footer class="mt-auto border-t border-default py-8 text-center text-xs text-muted font-light">
        <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {{ storeInfo.display_name }}. Didukung oleh <span class="font-bold text-default">WarungKu OS</span>.</p>
          <div class="flex items-center gap-1 text-[11px]">
            <UIcon name="i-lucide-shield-check" class="size-3.5 text-emerald-500" />
            <span>Pemesanan aman langsung ke WhatsApp</span>
          </div>
        </div>
      </footer>
    </div>

    <!-- 5. SHOPPING CART DRAWER / OVERLAY -->
    <StoreCart
      v-model:is-open="showCartDrawer"
      v-model:customer-name="customerName"
      v-model:customer-phone="customerPhone"
      v-model:customer-notes="customerNotes"
      :cart="cart"
      :cart-total-count="cartTotalCount"
      :cart-subtotal="cartSubtotal"
      :active-theme-classes="activeThemeClasses"
      :checking-out="checkingOut"
      @add-to-cart="addToCart"
      @remove-from-cart="removeFromCart"
      @checkout="handleCheckout"
    />

    <!-- 6. ORDER SUCCESS MODAL -->
    <WhatsAppCheckout
      :is-open="orderSuccess"
      :customer-name="customerName"
      :order-id="lastCreatedOrder?.id"
      :whats-app-link="generatedWhatsAppLink"
      :active-theme-classes="activeThemeClasses"
      @reset="resetOrderProcess"
    />
  </div>
</template>

<script setup lang="ts">
import { Motion } from 'motion-v'
import type { Storefront, Category, StorefrontProduct, OnlineOrder } from '~/types'

definePageMeta({
  layout: false
})

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const colorMode = useColorMode()

const slug = computed(() => (route.params.slug as string) || '')

// Loading states
const loading = ref(true)
const checkingOut = ref(false)
const storeNotFound = ref(false)

// Store and Catalog state
const storeInfo = ref<Storefront | any>(null)
const categories = ref<Category[]>([])
const storefrontProducts = ref<(StorefrontProduct & { products?: any })[]>([])

// Shopping cart state
const cart = ref<{ product: any; quantity: number; custom_description: string | null }[]>([])
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

const { fetchPublicStorefront } = useStorefront()

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
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat toko',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Add item to cart with stock validation
function addToCart(sfp: any) {
  const product = sfp.products
  if (!product) return

  const currentInCart = cart.value.find(item => item.product.id === product.id)
  const qtyInCart = currentInCart ? currentInCart.quantity : 0

  if (qtyInCart >= product.stock_qty) {
    toast.add({
      title: 'Stok tidak mencukupi',
      description: `Batas maksimum stok yang tersedia adalah ${product.stock_qty} ${product.unit}.`,
      color: 'warning'
    })
    return
  }

  if (currentInCart) {
    currentInCart.quantity++
  } else {
    cart.value.push({
      product,
      quantity: 1,
      custom_description: sfp.custom_description
    })
  }

  toast.add({
    title: 'Ditambahkan ke keranjang',
    description: `${product.name} telah masuk ke dalam keranjang belanja.`,
    color: 'success'
  })
}

// Decrement/Remove item from cart
function removeFromCart(productId: string) {
  const foundIdx = cart.value.findIndex(item => item.product.id === productId)
  if (foundIdx === -1) return

  const item = cart.value[foundIdx]
  if (item) {
    if (item.quantity > 1) {
      item.quantity--
    } else {
      cart.value.splice(foundIdx, 1)
    }
  }
}

// Compute total amounts
const cartTotalCount = computed(() => cart.value.reduce((acc, item) => acc + item.quantity, 0))
const cartSubtotal = computed(() => cart.value.reduce((acc, item) => acc + (item.quantity * item.product.sell_price), 0))

// Filtering storefront products
const filteredCatalog = computed(() => {
  return storefrontProducts.value.filter(sfp => {
    const product = sfp.products
    if (!product || !product.is_active) return false

    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = !selectedCategoryId.value || product.category_id === selectedCategoryId.value
    return matchesSearch && matchesCategory
  })
})

const featuredProducts = computed(() => {
  return storefrontProducts.value.filter(sfp => sfp.is_featured && sfp.products?.is_active)
})

// Generate formatted WhatsApp message for merchant fulfillment
const generatedWhatsAppLink = computed(() => {
  if (!storeInfo.value) return '#'
  
  let itemsStr = ''
  cart.value.forEach((item, idx) => {
    itemsStr += `${idx + 1}. *${item.product.name}* (${item.quantity} ${item.product.unit}) x ${formatRupiah(item.product.sell_price)}\n`
  })

  const rawMessage = 
`*PESANAN WEB OFFICIAL - ${storeInfo.value.display_name.toUpperCase()}*\n
Halo Kak! Saya ingin memesan produk dari katalog online Anda:

*Daftar Belanja:*
${itemsStr}
*Total Pembayaran:* *${formatRupiah(cartSubtotal.value)}*

*Detail Penerima:*
• Nama: ${customerName.value}
• Telepon: ${customerPhone.value}
• Catatan / Alamat: ${customerNotes.value || '-'}

Mohon konfirmasi pesanan dan instruksi pengiriman. Terima kasih!`

  const encoded = encodeURIComponent(rawMessage)
  const waPhone = '6285123456789'
  return `https://wa.me/${waPhone}?text=${encoded}`
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
    const orderPayload = {
      storefront_id: storeInfo.value!.id,
      customer_name: customerName.value,
      customer_phone: customerPhone.value,
      total_amount: cartSubtotal.value,
      notes: customerNotes.value,
      status: 'pending'
    }

    const { data, error } = await (supabase.from('online_orders') as any)
      .insert(orderPayload)
      .select()
      .single()

    if (error) throw error
    lastCreatedOrder.value = data
    orderSuccess.value = true

    toast.add({
      title: 'Pesanan berhasil dibuat!',
      description: 'Langkah terakhir: Kirim detail pesanan Anda ke WhatsApp Merchant.',
      color: 'success'
    })

    try {
      await (supabase as any).rpc('track_storefront_event', {
        p_slug: slug.value,
        p_event_type: 'whatsapp_click'
      })
    } catch (e) {
      // Silently fail analytics tracking
    }

    window.open(generatedWhatsAppLink.value, '_blank')
  } catch (err: any) {
    toast.add({
      title: 'Checkout gagal',
      description: err.message,
      color: 'error'
    })
  } finally {
    checkingOut.value = false
  }
}

// Reset cart and checkout states
function resetOrderProcess() {
  cart.value = []
  customerName.value = ''
  customerPhone.value = ''
  customerNotes.value = ''
  orderSuccess.value = false
  showCartDrawer.value = false
}

// Color Theme helper classes mapping
const activeThemeClasses = computed(() => {
  const theme = storeInfo.value?.theme_color || 'emerald'
  const maps: Record<string, any> = {
    emerald: {
      primaryText: 'text-emerald-600 dark:text-emerald-400',
      primaryBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      ringColor: 'focus:ring-emerald-500/30',
      accentBorder: 'border-emerald-500/20 dark:border-emerald-400/20',
      glowGlow: 'rgba(16,185,129,0.12)',
      textColor: 'text-emerald-500',
      bgLight: 'bg-emerald-500/10'
    },
    sky: {
      primaryText: 'text-sky-600 dark:text-sky-400',
      primaryBg: 'bg-sky-50 dark:bg-sky-950/30',
      buttonBg: 'bg-sky-600 hover:bg-sky-700',
      ringColor: 'focus:ring-sky-500/30',
      accentBorder: 'border-sky-500/20 dark:border-sky-400/20',
      glowGlow: 'rgba(14,165,233,0.12)',
      textColor: 'text-sky-500',
      bgLight: 'bg-sky-500/10'
    },
    amber: {
      primaryText: 'text-amber-600 dark:text-amber-400',
      primaryBg: 'bg-amber-50 dark:bg-amber-950/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      ringColor: 'focus:ring-amber-500/30',
      accentBorder: 'border-amber-500/20 dark:border-amber-400/20',
      glowGlow: 'rgba(245,158,11,0.12)',
      textColor: 'text-amber-500',
      bgLight: 'bg-amber-500/10'
    },
    rose: {
      primaryText: 'text-rose-600 dark:text-rose-400',
      primaryBg: 'bg-rose-50 dark:bg-rose-950/30',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      ringColor: 'focus:ring-rose-500/30',
      accentBorder: 'border-rose-500/20 dark:border-rose-400/20',
      glowGlow: 'rgba(244,63,94,0.12)',
      textColor: 'text-rose-500',
      bgLight: 'bg-rose-500/10'
    },
    slate: {
      primaryText: 'text-slate-600 dark:text-slate-400',
      primaryBg: 'bg-slate-50 dark:bg-slate-950/30',
      buttonBg: 'bg-slate-600 hover:bg-slate-700',
      ringColor: 'focus:ring-slate-500/30',
      accentBorder: 'border-slate-500/20 dark:border-slate-400/20',
      glowGlow: 'rgba(100,116,139,0.12)',
      textColor: 'text-slate-500',
      bgLight: 'bg-slate-500/10'
    }
  }

  if (theme.startsWith('#')) {
    return {
      glowGlow: theme + '1F',
      isCustom: true,
      customColor: theme
    }
  }

  const result = maps[theme] || maps.emerald
  return {
    ...result,
    isCustom: false,
    customColor: ''
  }
})

onMounted(async () => {
  await fetchStorefront()
  
  if (storeInfo.value) {
    try {
      await (supabase as any).rpc('track_storefront_event', {
        p_slug: slug.value,
        p_event_type: 'page_view'
      })
    } catch (e) {
      // Silently fail analytics tracking
    }
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
      <span class="text-xs text-muted font-mono uppercase tracking-widest">Menghubungkan ke toko online...</span>
    </div>

    <!-- ERROR STAGE: STOREFRONT NOT FOUND -->
    <div v-else-if="storeNotFound" class="min-h-screen flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-elevated border border-default p-8 rounded-[2rem] shadow-xl text-center space-y-6">
        <div class="size-16 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center mx-auto text-rose-500">
          <UIcon name="i-lucide-store" class="size-8" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-black text-default tracking-tight">Toko Tidak Ditemukan</h2>
          <p class="text-xs text-toned font-light">
            Alamat web store yang Anda tuju tidak aktif atau belum dipublikasikan oleh pemiliknya.
          </p>
        </div>
        <UButton
          to="/"
          color="neutral"
          variant="solid"
          class="w-full justify-center rounded-xl cursor-pointer"
        >
          Kembali Ke Beranda
        </UButton>
      </div>
    </div>

    <!-- ACTIVE PUBLIC WEB CATALOG -->
    <div v-else class="relative pb-24">
      <!-- STICKY GLASSMORPHIC TOP NAVBAR -->
      <nav class="sticky top-0 z-30 border-b border-default backdrop-blur-md bg-white/75 dark:bg-zinc-950/75 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div
            class="size-8 rounded-lg flex items-center justify-center"
            :class="[!activeThemeClasses.isCustom ? activeThemeClasses.bgLight : '']"
            :style="activeThemeClasses.isCustom ? { backgroundColor: activeThemeClasses.customColor + '1A' } : {}"
          >
            <UIcon
              name="i-lucide-store"
              class="size-4"
              :class="[!activeThemeClasses.isCustom ? activeThemeClasses.textColor : '']"
              :style="activeThemeClasses.isCustom ? { color: activeThemeClasses.customColor } : {}"
            />
          </div>
          <span class="font-bold text-sm text-default tracking-tight">{{ storeInfo.display_name }}</span>
        </div>

        <div class="flex items-center gap-3">
          <button
            class="relative size-10 rounded-xl border border-default bg-elevated text-default flex items-center justify-center cursor-pointer active:scale-95 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all overflow-hidden"
            aria-label="Toggle Color Mode"
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
          >
            <ClientOnly>
              <Motion
                :key="colorMode.value"
                :initial="{ scale: 0.5, rotate: -45, opacity: 0 }"
                :animate="{ scale: 1, rotate: 0, opacity: 1 }"
                :transition="{ type: 'spring', stiffness: 300, damping: 15 }"
                class="flex items-center justify-center"
              >
                <UIcon
                  v-if="colorMode.value === 'dark'"
                  name="i-lucide-sun"
                  class="size-5 text-amber-400"
                />
                <UIcon
                  v-else
                  name="i-lucide-moon"
                  class="size-5 text-zinc-700 dark:text-zinc-300"
                />
              </Motion>
            </ClientOnly>
          </button>

          <!-- FLOATING CART BUTTON -->
          <button
            type="button"
            class="relative px-3.5 py-1.5 rounded-xl border border-default bg-elevated flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
            @click="showCartDrawer = true"
          >
            <UIcon name="i-lucide-shopping-cart" class="size-4 text-default" />
            <span class="text-xs font-mono font-bold text-default">{{ cartTotalCount }}</span>
            <span
              v-if="cartTotalCount > 0"
              class="absolute -top-1.5 -right-1.5 size-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white font-mono animate-bounce"
            >
              {{ cartTotalCount }}
            </span>
          </button>
        </div>
      </nav>

      <!-- BRAND HERO SPLIT SECTION -->
      <header class="w-full relative h-[240px] md:h-[300px] overflow-hidden bg-zinc-950 flex items-end">
        <img
          v-if="storeInfo.banner_url"
          :src="storeInfo.banner_url"
          alt="Store banner background"
          class="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

        <div class="max-w-7xl mx-auto w-full px-4 md:px-8 pb-8 relative z-10 text-left">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="space-y-3">
              <div
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                :class="[
                  !activeThemeClasses.isCustom
                    ? `${activeThemeClasses.primaryBg} ${activeThemeClasses.primaryText} ${activeThemeClasses.accentBorder}`
                    : ''
                ]"
                :style="[
                  activeThemeClasses.isCustom
                    ? {
                        backgroundColor: activeThemeClasses.customColor + '1A',
                        color: activeThemeClasses.customColor,
                        borderColor: activeThemeClasses.customColor + '33'
                      }
                    : {}
                ]"
              >
                <UIcon name="i-lucide-check-circle" class="size-3" />
                Toko Terverifikasi
              </div>
              <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight">
                {{ storeInfo.display_name }}
              </h1>
              <p class="text-xs md:text-sm text-zinc-300 font-light max-w-2xl leading-relaxed">
                {{ storeInfo.description }}
              </p>
            </div>
            
            <div class="text-[10px] text-zinc-400 font-mono tracking-wider uppercase bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl self-start md:self-end">
              Slug: @{{ storeInfo.slug }}
            </div>
          </div>
        </div>
      </header>

      <!-- PUBLIC CATALOG -->
      <StoreCatalog
        :featured-products="featuredProducts"
        :filtered-catalog="filteredCatalog"
        :categories="categories"
        v-model:selected-category-id="selectedCategoryId"
        v-model:search-query="searchQuery"
        :active-theme-classes="activeThemeClasses"
        @add-to-cart="addToCart"
      />

      <!-- SLIDING DRAWER CART -->
      <StoreCart
        v-model:is-open="showCartDrawer"
        :cart="cart"
        :cart-total-count="cartTotalCount"
        :cart-subtotal="cartSubtotal"
        v-model:customer-name="customerName"
        v-model:customer-phone="customerPhone"
        v-model:customer-notes="customerNotes"
        :checking-out="checkingOut"
        :active-theme-classes="activeThemeClasses"
        @add-to-cart="addToCart"
        @remove-from-cart="removeFromCart"
        @checkout="handleCheckout"
      />

      <!-- ORDER SUCCESS & WHATSAPP CHECKOUT MODAL -->
      <StoreWhatsAppCheckout
        :is-open="orderSuccess"
        :customer-name="customerName"
        :order-id="lastCreatedOrder?.id"
        :whats-app-link="generatedWhatsAppLink"
        :active-theme-classes="activeThemeClasses"
        @reset="resetOrderProcess"
      />
    </div>
  </div>
</template>

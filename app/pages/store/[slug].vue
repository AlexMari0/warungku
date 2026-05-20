<script setup lang="ts">
import { Motion } from 'motion-v'

definePageMeta({
  layout: false
})

const route = useRoute()
const supabase = useSupabaseClient()
const toast = useToast()
const colorMode = useColorMode()

const slug = computed(() => (route.params.slug as string) || 'demo-store')
const isDemoStore = computed(() => slug.value === 'demo-store' || slug.value === 'warung-demo-kita')

// Loading states
const loading = ref(true)
const checkingOut = ref(false)
const storeNotFound = ref(false)

// Store and Catalog state
const storeInfo = ref<any>(null)
const categories = ref<any[]>([])
const storefrontProducts = ref<any[]>([])

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
const lastCreatedOrder = ref<any>(null)

// Format currency standard
const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}

// Fetch all public storefront details
async function fetchStorefront() {
  loading.value = true
  storeNotFound.value = false
  try {
    if (isDemoStore.value) {
      // Load from demo local storage
      const rawSf = localStorage.getItem('warungku_storefront')
      if (rawSf) {
        storeInfo.value = JSON.parse(rawSf)
      } else {
        storeInfo.value = {
          id: 'sf-demo-1',
          slug: 'warung-demo-kita',
          display_name: 'Warung Demo Kita',
          description: 'Penyedia bahan harian terlengkap, hemat biaya, dan terpercaya bagi masyarakat luas.',
          banner_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
          theme_color: 'emerald',
          is_published: true
        }
      }

      // Load mock categories & products
      const rawCats = localStorage.getItem('warungku_categories')
      categories.value = rawCats ? JSON.parse(rawCats) : []

      const rawProds = localStorage.getItem('warungku_products')
      const rawSfp = localStorage.getItem('warungku_storefront_products')
      
      const prodsList = rawProds ? JSON.parse(rawProds) : []
      const sfpList = rawSfp ? JSON.parse(rawSfp) : []

      const linkedProds: any[] = []
      sfpList.forEach((sfp: any) => {
        const matchingProd = prodsList.find((p: any) => p.id === sfp.product_id)
        if (matchingProd) {
          linkedProds.push({
            id: sfp.id,
            product_id: sfp.product_id,
            is_featured: sfp.is_featured,
            custom_description: sfp.custom_description,
            products: matchingProd
          })
        }
      })
      storefrontProducts.value = linkedProds

    } else {
      // Load live from Supabase
      const { data: sfData, error: sfError } = await (supabase
        .from('storefronts') as any)
        .select('*')
        .eq('slug', slug.value)
        .eq('is_published', true)
        .maybeSingle()

      if (sfError) throw sfError
      if (!sfData) {
        storeNotFound.value = true
        return
      }

      storeInfo.value = sfData

      // Fetch products & categories exposed via storefront
      const { data: sfpData, error: sfpError } = await (supabase
        .from('storefront_products') as any)
        .select('*, products(*)')
        .eq('storefront_id', (sfData as any).id)

      if (sfpError) throw sfpError

      storefrontProducts.value = sfpData || []

      // Fetch categories referenced by active products
      const categoryIds = storefrontProducts.value
        .map(sfp => sfp.products?.category_id)
        .filter(Boolean)

      if (categoryIds.length > 0) {
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .in('id', categoryIds)
          .order('sort_order', { ascending: true })
        categories.value = catData || []
      } else {
        categories.value = []
      }
    }
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

  // Check current stock limit
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
  
  // Create itemized receipt string
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
  // Clean fallback phone
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
      storefront_id: storeInfo.value.id,
      customer_name: customerName.value,
      customer_phone: customerPhone.value,
      total_amount: cartSubtotal.value,
      notes: customerNotes.value,
      status: 'pending'
    }

    if (isDemoStore.value) {
      // Save test order to local storage ledger
      const rawOrders = localStorage.getItem('warungku_online_orders')
      const ordersList = rawOrders ? JSON.parse(rawOrders) : []
      
      const newOrder = {
        id: `online-mock-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        ...orderPayload
      }
      
      ordersList.unshift(newOrder)
      localStorage.setItem('warungku_online_orders', JSON.stringify(ordersList))
      
      lastCreatedOrder.value = newOrder
      orderSuccess.value = true
    } else {
      // Insert to remote database
      const { data, error } = await (supabase.from('online_orders') as any)
        .insert(orderPayload)
        .select()
        .single()

      if (error) throw error
      lastCreatedOrder.value = data
      orderSuccess.value = true
    }

    toast.add({
      title: 'Pesanan berhasil dibuat!',
      description: 'Langkah terakhir: Kirim detail pesanan Anda ke WhatsApp Merchant.',
      color: 'success'
    })

    // Track whatsapp click
    if (!isDemoStore.value) {
      try {
        await (supabase as any).rpc('track_storefront_event', {
          p_slug: slug.value,
          p_event_type: 'whatsapp_click'
        })
      } catch (e) {
        // Silently fail analytics tracking
      }
    }

    // Auto-open WhatsApp link after checkout commit
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
  const maps: Record<string, {
    primaryText: string
    primaryBg: string
    buttonBg: string
    buttonBgHover: string
    ringColor: string
    accentBorder: string
    hoverBorder: string
    glowShadow: string
    glowGlow: string
    textColor: string
    bgLight: string
  }> = {
    emerald: {
      primaryText: 'text-emerald-600 dark:text-emerald-400',
      primaryBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      buttonBgHover: 'hover:bg-emerald-700',
      ringColor: 'focus:ring-emerald-500/30',
      accentBorder: 'border-emerald-500/20 dark:border-emerald-400/20',
      hoverBorder: 'hover:border-emerald-500/40 dark:hover:border-emerald-400/40',
      glowShadow: 'shadow-emerald-500/5 dark:shadow-emerald-400/5',
      glowGlow: 'rgba(16,185,129,0.12)',
      textColor: 'text-emerald-500',
      bgLight: 'bg-emerald-500/10'
    },
    sky: {
      primaryText: 'text-sky-600 dark:text-sky-400',
      primaryBg: 'bg-sky-50 dark:bg-sky-950/30',
      buttonBg: 'bg-sky-600 hover:bg-sky-700',
      buttonBgHover: 'hover:bg-sky-700',
      ringColor: 'focus:ring-sky-500/30',
      accentBorder: 'border-sky-500/20 dark:border-sky-400/20',
      hoverBorder: 'hover:border-sky-500/40 dark:hover:border-sky-400/40',
      glowShadow: 'shadow-sky-500/5 dark:shadow-sky-400/5',
      glowGlow: 'rgba(14,165,233,0.12)',
      textColor: 'text-sky-500',
      bgLight: 'bg-sky-500/10'
    },
    amber: {
      primaryText: 'text-amber-600 dark:text-amber-400',
      primaryBg: 'bg-amber-50 dark:bg-amber-950/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      buttonBgHover: 'hover:bg-amber-700',
      ringColor: 'focus:ring-amber-500/30',
      accentBorder: 'border-amber-500/20 dark:border-amber-400/20',
      hoverBorder: 'hover:border-amber-500/40 dark:hover:border-amber-400/40',
      glowShadow: 'shadow-amber-500/5 dark:shadow-amber-400/5',
      glowGlow: 'rgba(245,158,11,0.12)',
      textColor: 'text-amber-500',
      bgLight: 'bg-amber-500/10'
    },
    rose: {
      primaryText: 'text-rose-600 dark:text-rose-400',
      primaryBg: 'bg-rose-50 dark:bg-rose-950/30',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      buttonBgHover: 'hover:bg-rose-700',
      ringColor: 'focus:ring-rose-500/30',
      accentBorder: 'border-rose-500/20 dark:border-rose-400/20',
      hoverBorder: 'hover:border-rose-500/40 dark:hover:border-rose-400/40',
      glowShadow: 'shadow-rose-500/5 dark:shadow-rose-400/5',
      glowGlow: 'rgba(244,63,94,0.12)',
      textColor: 'text-rose-500',
      bgLight: 'bg-rose-500/10'
    },
    slate: {
      primaryText: 'text-slate-600 dark:text-slate-400',
      primaryBg: 'bg-slate-50 dark:bg-slate-950/30',
      buttonBg: 'bg-slate-600 hover:bg-slate-700',
      buttonBgHover: 'hover:bg-slate-700',
      ringColor: 'focus:ring-slate-500/30',
      accentBorder: 'border-slate-500/20 dark:border-slate-400/20',
      hoverBorder: 'hover:border-slate-500/40 dark:hover:border-slate-400/40',
      glowShadow: 'shadow-slate-500/5 dark:shadow-slate-400/5',
      glowGlow: 'rgba(100,116,139,0.12)',
      textColor: 'text-slate-500',
      bgLight: 'bg-slate-500/10'
    }
  }
  if (theme.startsWith('#')) {
    return {
      primaryText: '',
      primaryBg: '',
      buttonBg: '',
      buttonBgHover: '',
      ringColor: '',
      accentBorder: '',
      hoverBorder: '',
      glowShadow: '',
      glowGlow: theme + '1F', // ~12% opacity hex
      textColor: '',
      bgLight: '',
      isCustom: true,
      customColor: theme
    }
  }

  const result = maps[theme] || maps.emerald
  return {
    ...result,
    isCustom: false,
    customColor: ''
  } as {
    primaryText: string
    primaryBg: string
    buttonBg: string
    buttonBgHover: string
    ringColor: string
    accentBorder: string
    hoverBorder: string
    glowShadow: string
    glowGlow: string
    textColor: string
    bgLight: string
    isCustom: boolean
    customColor: string
  }
})

onMounted(async () => {
  await fetchStorefront()
  
  // Track page view for non-demo storefronts
  if (!isDemoStore.value && storeInfo.value) {
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
          <!-- Highly polished custom color mode toggle with smooth spring-physics scale effects -->
          <button
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            class="relative size-10 rounded-xl border border-default bg-elevated text-default flex items-center justify-center cursor-pointer active:scale-95 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all overflow-hidden"
            aria-label="Toggle Color Mode"
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

          <!-- FLOATING CART BATCH BUTTON (Tactile Active scale spring) -->
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

      <!-- BRAND HERO SPLIT SECTION (DESIGN_VARIANCE: 8) -->
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
            
            <!-- Live mode marker -->
            <div class="text-[10px] text-zinc-400 font-mono tracking-wider uppercase bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl self-start md:self-end">
              Slug: @{{ storeInfo.slug }}
            </div>
          </div>
        </div>
      </header>

      <!-- CORE CONTENTS: BENTO SECTIONS & CATALOG -->
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
                @click="addToCart(sfp)"
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
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari produk..."
                  class="w-full pl-8 pr-3 py-2 rounded-xl border border-default bg-muted/10 text-xs text-default outline-none"
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
              @click="selectedCategoryId = ''"
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
              @click="selectedCategoryId = cat.id"
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
                  @click="addToCart(sfp)"
                >
                  <UIcon name="i-lucide-plus" class="size-4" />
                </button>
              </div>

            </div>
          </div>
        </section>

      </main>

      <!-- 3. SLIDING DRAWER CART & CHECKOUT DIALOG (MODAL-LIKE LAYOUT) -->
      <Transition
        enter-active-class="transition-opacity duration-300"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCartDrawer" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          
          <!-- Close click backdrop -->
          <div class="absolute inset-0" @click="showCartDrawer = false"></div>

          <!-- Drawer pane sheet -->
          <div class="relative w-full max-w-md bg-elevated h-full shadow-2xl flex flex-col justify-between border-l border-default pt-6 z-10">
            
            <!-- Drawer header -->
            <div class="px-6 pb-4 border-b border-default flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-shopping-cart" class="size-5 text-primary" />
                <h3 class="text-base font-bold text-default">Keranjang Belanja</h3>
                <span class="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-full text-toned">{{ cartTotalCount }}</span>
              </div>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                class="rounded-full shrink-0 cursor-pointer"
                @click="showCartDrawer = false"
              />
            </div>

            <!-- Drawer body: items list -->
            <div class="flex-grow overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
              
              <!-- Empty state in cart -->
              <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center gap-3 text-center opacity-60">
                <UIcon name="i-lucide-shopping-bag" class="size-12 text-muted" />
                <p class="text-xs text-toned">Keranjang Anda masih kosong.</p>
              </div>

              <div v-else class="space-y-3.5">
                <div
                  v-for="item in cart"
                  :key="item.product.id"
                  class="flex items-center gap-3 p-3 rounded-2xl border border-default bg-muted/5 justify-between"
                >
                  <!-- Image -->
                  <div class="size-11 rounded-lg overflow-hidden bg-muted/20 border border-default shrink-0">
                    <img v-if="item.product.image_url" :src="item.product.image_url" alt="" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-muted"><UIcon name="i-lucide-package" class="size-4" /></div>
                  </div>

                  <!-- Name and subtotal -->
                  <div class="flex-grow text-left space-y-0.5">
                    <h5 class="text-xs font-bold text-default truncate">{{ item.product.name }}</h5>
                    <p class="text-[10px] font-mono text-muted">{{ formatRupiah(item.product.sell_price) }}</p>
                  </div>

                  <!-- Qty Adjustment counts -->
                  <div class="flex items-center border border-default rounded-xl overflow-hidden bg-elevated shrink-0">
                    <button
                      type="button"
                      class="size-6 text-xs text-toned hover:text-default hover:bg-muted/30 cursor-pointer flex items-center justify-center"
                      @click="removeFromCart(item.product.id)"
                    >
                      -
                    </button>
                    <span class="px-2 text-xs font-mono font-bold text-default">{{ item.quantity }}</span>
                    <button
                      type="button"
                      class="size-6 text-xs text-toned hover:text-default hover:bg-muted/30 cursor-pointer flex items-center justify-center"
                      @click="addToCart({ products: item.product, custom_description: item.custom_description })"
                    >
                      +
                    </button>
                  </div>
                </div>

                <!-- ORDER PLACEMENT USER METADATA FORM -->
                <div class="pt-6 border-t border-default space-y-4">
                  <div class="flex items-center gap-1">
                    <UIcon name="i-lucide-user" class="size-4 text-toned" />
                    <span class="text-[10px] font-mono font-bold tracking-wider text-muted uppercase">Formulir Pemesanan</span>
                  </div>

                  <div class="space-y-3 text-left">
                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-default uppercase tracking-wider">Nama Lengkap Anda</label>
                      <input
                        v-model="customerName"
                        type="text"
                        placeholder="Contoh: Budi Santoso"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-default placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-1 outline-none transition-all"
                        :class="[!activeThemeClasses.isCustom ? activeThemeClasses.ringColor : 'focus:ring-[var(--accent-ring)]']"
                        :style="activeThemeClasses.isCustom ? { '--accent-ring': activeThemeClasses.customColor + '4D' } : {}"
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-default uppercase tracking-wider">No. Telepon / WhatsApp</label>
                      <input
                        v-model="customerPhone"
                        type="text"
                        placeholder="Contoh: 08123456789"
                        class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-default placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-1 outline-none transition-all"
                        :class="[!activeThemeClasses.isCustom ? activeThemeClasses.ringColor : 'focus:ring-[var(--accent-ring)]']"
                        :style="activeThemeClasses.isCustom ? { '--accent-ring': activeThemeClasses.customColor + '4D' } : {}"
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-[10px] font-bold text-default uppercase tracking-wider">Alamat &amp; Catatan Tambahan</label>
                      <textarea
                        v-model="customerNotes"
                        rows="2"
                        placeholder="Tulis alamat kirim atau catatan..."
                        class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-default placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-1 outline-none resize-none transition-all"
                        :class="[!activeThemeClasses.isCustom ? activeThemeClasses.ringColor : 'focus:ring-[var(--accent-ring)]']"
                        :style="activeThemeClasses.isCustom ? { '--accent-ring': activeThemeClasses.customColor + '4D' } : {}"
                      ></textarea>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <!-- Drawer footer payments summary -->
            <div class="p-6 border-t border-default space-y-4 bg-muted/5 shrink-0">
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs text-toned">
                  <span>Subtotal Belanja</span>
                  <span class="font-mono font-medium">{{ formatRupiah(cartSubtotal) }}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-toned">
                  <span>Biaya Pengiriman</span>
                  <span
                    class="font-mono font-medium"
                    :class="[!activeThemeClasses.isCustom ? activeThemeClasses.textColor : '']"
                    :style="activeThemeClasses.isCustom ? { color: activeThemeClasses.customColor } : {}"
                  >
                    Gratis (COD)
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm font-extrabold text-default border-t border-default/40 pt-2">
                  <span>Total Pembayaran</span>
                  <span class="font-mono">{{ formatRupiah(cartSubtotal) }}</span>
                </div>
              </div>

              <button
                type="button"
                class="w-full py-3 rounded-2xl text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                :class="[cart.length === 0 || !customerName || !customerPhone ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 pointer-events-none' : (!activeThemeClasses.isCustom ? activeThemeClasses.buttonBg : '')]"
                :style="activeThemeClasses.isCustom && cart.length > 0 && customerName && customerPhone ? { backgroundColor: activeThemeClasses.customColor } : {}"
                :disabled="cart.length === 0 || !customerName || !customerPhone"
                @click="handleCheckout"
              >
                <UIcon v-if="checkingOut" name="i-lucide-loader" class="size-4 animate-spin" />
                <UIcon v-else name="i-lucide-shopping-cart" class="size-4" />
                {{ checkingOut ? 'Memproses Pesanan...' : 'Pesan Sekarang &amp; Kirim WhatsApp' }}
              </button>
            </div>

          </div>

        </div>
      </Transition>

      <!-- 4. DIALOG MODAL ON SUCCESS ORDER COMPLETED -->
      <Transition
        enter-active-class="transition-opacity duration-300"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="orderSuccess" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-6">
          <div class="max-w-md w-full bg-elevated border border-default p-8 rounded-[2rem] shadow-2xl text-center space-y-6 relative">
            
            <div
              class="size-16 rounded-full flex items-center justify-center mx-auto"
              :class="[!activeThemeClasses.isCustom ? `${activeThemeClasses.primaryBg} ${activeThemeClasses.textColor}` : '']"
              :style="activeThemeClasses.isCustom ? { backgroundColor: activeThemeClasses.customColor + '1F', color: activeThemeClasses.customColor } : {}"
            >
              <UIcon name="i-lucide-badge-check" class="size-10" />
            </div>

            <div class="space-y-2 text-center">
              <h3 class="text-xl font-black text-default tracking-tight">Pesanan Berhasil Dicatat!</h3>
              <p class="text-xs text-toned font-light">
                Terima kasih <strong>{{ customerName }}</strong>, pesanan Anda telah tersimpan dengan nomor transaksi:
              </p>
              <div class="bg-muted/30 p-2.5 rounded-xl border border-default text-xs font-mono font-bold text-default inline-block mt-2">
                ID: {{ lastCreatedOrder?.id }}
              </div>
            </div>

            <div class="space-y-3.5 text-left border border-default p-4 rounded-2xl bg-muted/5">
              <span class="text-[9px] font-mono font-bold text-muted uppercase tracking-widest block mb-2">Pemberitahuan</span>
              <p class="text-[11px] text-toned leading-relaxed">
                Untuk mempercepat proses pengemasan dan manual payment, mohon klik tombol **Kirim via WhatsApp** di bawah untuk mengirim data belanja langsung ke penjual.
              </p>
            </div>

            <div class="flex flex-col gap-2 pt-2">
              <UButton
                color="success"
                variant="solid"
                icon="i-lucide-message-square"
                class="w-full justify-center py-2.5 rounded-xl font-bold cursor-pointer"
                :to="generatedWhatsAppLink"
                target="_blank"
              >
                Kirim via WhatsApp
              </UButton>

              <UButton
                color="neutral"
                variant="soft"
                class="w-full justify-center py-2 rounded-xl cursor-pointer"
                @click="resetOrderProcess"
              >
                Kembali Belanja
              </UButton>
            </div>

          </div>
        </div>
      </Transition>

    </div>

  </div>
</template>

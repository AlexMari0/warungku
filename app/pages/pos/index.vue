<script setup lang="ts">
import * as z from 'zod'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const { isDemo } = useDemoMode()

// POS states
const products = ref<any[]>([])
const categories = ref<any[]>([])
const customers = ref<any[]>([])
const loading = ref(false)

// Search & Catalog Filter states
const searchQuery = ref('')
const selectedCategory = ref<string>('all')

// Cart state
interface CartItem {
  id: string
  product_id: string
  name: string
  sku: string | null
  buy_price: number
  unit_price: number
  quantity: number
  unit: string
  discount: number
  subtotal: number
  max_stock: number
}
const cart = ref<CartItem[]>([])

// Customer & Transaction details
const selectedCustomerId = ref<string>('general')
const orderNotes = ref('')
const discountAmount = ref<number>(0)
type PaymentMethod = 'cash' | 'qris' | 'gopay' | 'ovo' | 'dana' | 'transfer'
const paymentMethod = ref<PaymentMethod>('cash')
const amountPaid = ref<number | null>(null)

// Modal states
const isAddCustomerOpen = ref(false)
const isReceiptOpen = ref(false)
const processingCheckout = ref(false)

// Completed transaction reference to show in receipt
const completedOrder = ref<any | null>(null)

// Pre-seeded Demo customers if local storage is empty
const defaultDemoCustomers = [
  { id: 'cust-1', merchant_id: 'demo-merchant-id', name: 'Rian Anggara', phone: '8123456789', total_debt: 0, loyalty_points: 120, created_at: new Date().toISOString() },
  { id: 'cust-2', merchant_id: 'demo-merchant-id', name: 'Siti Rahma', phone: '8778888999', total_debt: 15000, loyalty_points: 45, created_at: new Date().toISOString() },
  { id: 'cust-3', merchant_id: 'demo-merchant-id', name: 'Pelanggan Umum', phone: '', total_debt: 0, loyalty_points: 0, created_at: new Date().toISOString() }
]

const defaultDemoCategories = [
  { id: 'cat-1', name: 'Makanan', color: '#10b981', sort_order: 1, created_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Minuman', color: '#0284c7', sort_order: 2, created_at: new Date().toISOString() },
  { id: 'cat-3', name: 'Rokok & Tembakau', color: '#f43f5e', sort_order: 3, created_at: new Date().toISOString() }
]

const defaultDemoProducts = [
  {
    id: 'prod-1',
    merchant_id: 'demo-merchant-id',
    category_id: 'cat-1',
    name: 'Indomie Goreng Aceh',
    sku: 'IND-GOR-ACH',
    barcode: '8998888111222',
    buy_price: 2500,
    sell_price: 3500,
    stock_qty: 40,
    min_stock: 10,
    unit: 'pcs',
    image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop',
    is_active: true,
    created_at: new Date().toISOString(),
    categories: { name: 'Makanan', color: '#10b981' }
  },
  {
    id: 'prod-2',
    merchant_id: 'demo-merchant-id',
    category_id: 'cat-2',
    name: 'Kopi Susu Gula Aren',
    sku: 'KOPI-AREN-01',
    barcode: '8997777111333',
    buy_price: 8000,
    sell_price: 12000,
    stock_qty: 5,
    min_stock: 10,
    unit: 'porsi',
    image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop',
    is_active: true,
    created_at: new Date().toISOString(),
    categories: { name: 'Minuman', color: '#0284c7' }
  }
]

function readDemoList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as T[]
    }
  } catch {}
  return JSON.parse(JSON.stringify(fallback))
}

function writeDemoList<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// Payment Method visual metadata
const paymentMeta = {
  cash: { label: 'Tunai', icon: 'i-lucide-banknote', color: 'success' },
  qris: { label: 'QRIS', icon: 'i-lucide-qr-code', color: 'primary' },
  gopay: { label: 'GoPay', icon: 'i-lucide-wallet', color: 'info' },
  ovo: { label: 'OVO', icon: 'i-lucide-wallet-2', color: 'neutral' },
  dana: { label: 'Dana', icon: 'i-lucide-credit-card', color: 'info' },
  transfer: { label: 'Transfer', icon: 'i-lucide-send', color: 'warning' }
}

// 1. Fetch initial POS context
async function fetchPOSContext() {
  loading.value = true
  if (isDemo.value) {
    categories.value = readDemoList('warungku_categories', defaultDemoCategories)
    products.value = readDemoList('warungku_products', defaultDemoProducts)
    customers.value = readDemoList('warungku_customers', defaultDemoCustomers)

    writeDemoList('warungku_categories', categories.value)
    writeDemoList('warungku_products', products.value)
    writeDemoList('warungku_customers', customers.value)

    loading.value = false
    return
  }

  // Live Supabase Mode
  if (!user.value) {
    loading.value = false
    return
  }
  try {
    const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
    const { data: prodData } = await supabase.from('products').select('*, categories(name, color)').eq('is_active', true).order('created_at', { ascending: false })
    const { data: custData } = await supabase.from('customers').select('*').order('name', { ascending: true })

    categories.value = catData || []
    products.value = prodData || []
    customers.value = custData || []
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat POS',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// 2. Add product to shopping cart
function addToCart(product: any) {
  if (!product.is_active || product.stock_qty <= 0) {
    toast.add({
      title: 'Barang tidak tersedia',
      description: `Stok "${product.name}" habis. Silakan lakukan restock terlebih dahulu.`,
      color: 'warning'
    })
    return
  }

  const existing = cart.value.find(item => item.product_id === product.id)

  if (existing) {
    if (existing.quantity >= product.stock_qty) {
      toast.add({
        title: 'Batas stok tercapai',
        description: `Tidak dapat menambah quantity melebihi sisa stok (${product.stock_qty} ${product.unit}).`,
        color: 'warning'
      })
      return
    }
    existing.quantity++
    existing.subtotal = existing.quantity * existing.unit_price - existing.discount
  } else {
    cart.value.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: product.id,
      name: product.name,
      sku: product.sku || null,
      buy_price: Number(product.buy_price) || 0,
      unit_price: Number(product.sell_price) || 0,
      quantity: 1,
      unit: product.unit || 'pcs',
      discount: 0,
      subtotal: Number(product.sell_price) || 0,
      max_stock: product.stock_qty
    })
  }

  toast.add({
    title: 'Ditambahkan ke keranjang',
    description: `"${product.name}" berhasil dimasukkan.`,
    color: 'success',
    duration: 1000
  })
}

// 3. Cart Adjustments
function increaseQty(item: CartItem) {
  if (item.quantity >= item.max_stock) {
    toast.add({
      title: 'Batas stok tercapai',
      description: `Stok barang terbatas pada ${item.max_stock} ${item.unit}.`,
      color: 'warning'
    })
    return
  }
  item.quantity++
  item.subtotal = item.quantity * item.unit_price - item.discount
}

function decreaseQty(item: CartItem) {
  if (item.quantity <= 1) {
    removeFromCart(item)
    return
  }
  item.quantity--
  item.subtotal = item.quantity * item.unit_price - item.discount
}

function removeFromCart(item: CartItem) {
  cart.value = cart.value.filter(i => i.id !== item.id)
}

// 4. Cart calculations
const cartSubtotal = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.subtotal, 0)
})

const cartTotal = computed(() => {
  const sum = cartSubtotal.value - discountAmount.value
  return sum < 0 ? 0 : sum
})

const changeAmount = computed(() => {
  if (amountPaid.value === null || amountPaid.value < cartTotal.value) return 0
  return amountPaid.value - cartTotal.value
})

const totalCartItemsCount = computed(() => {
  return cart.value.reduce((acc, item) => acc + item.quantity, 0)
})

// 5. Predefined quick cash payment options
const quickCashAmounts = computed(() => {
  const total = cartTotal.value
  if (total <= 0) return [10000, 20000, 50000, 100000]

  const presets = new Set<number>()
  presets.add(total)

  const bills = [1000, 2000, 5000, 10000, 20000, 50000, 100000]
  for (const b of bills) {
    if (b > total) {
      presets.add(b)
      break
    }
  }

  const roundedUp = Math.ceil(total / 10000) * 10000
  presets.add(roundedUp)

  const roundedUp50 = Math.ceil(total / 50000) * 50000
  presets.add(roundedUp50)

  return Array.from(presets).sort((a, b) => a - b)
})

// 6. Handle New Customer registered from the Modal
function onCustomerAdded(newCust: any) {
  customers.value.unshift(newCust)
  selectedCustomerId.value = newCust.id
}

// 7. Atomic transaction checkout process
async function handleCheckout() {
  if (cart.value.length === 0) {
    toast.add({
      title: 'Keranjang kosong',
      description: 'Silakan pilih produk terlebih dahulu.',
      color: 'warning'
    })
    return
  }

  const finalTotal = cartTotal.value
  const payAmount = amountPaid.value !== null ? amountPaid.value : finalTotal

  if (paymentMethod.value === 'cash' && payAmount < finalTotal) {
    toast.add({
      title: 'Pembayaran kurang',
      description: 'Nominal uang tunai dibayarkan harus lebih besar atau sama dengan total belanja.',
      color: 'error'
    })
    return
  }

  processingCheckout.value = true

  if (isDemo.value) {
    // A. DEMO LURING CHECKOUT IN LOCAL STORAGE
    try {
      const orderId = `order-${Date.now()}`
      const orderNumber = `WK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`

      const activeCustomer = selectedCustomerId.value !== 'general'
        ? customers.value.find(c => c.id === selectedCustomerId.value) || null
        : null

      const orderPayload = {
        id: orderId,
        merchant_id: 'demo-merchant-id',
        customer_id: selectedCustomerId.value !== 'general' ? selectedCustomerId.value : null,
        order_number: orderNumber,
        status: 'paid',
        subtotal: cartSubtotal.value,
        discount_amount: discountAmount.value,
        total_amount: finalTotal,
        notes: orderNotes.value || null,
        created_at: new Date().toISOString()
      }

      // Decrement product stocks reactively
      let localProducts = readDemoList('warungku_products', products.value.length ? products.value : defaultDemoProducts)
      const localMovements = readDemoList<any>('warungku_movements', [])

      const orderItemsList = cart.value.map((item) => {
        // Find and decrease stock
        localProducts = localProducts.map((p: any) => {
          if (p.id === item.product_id) {
            const newStock = Math.max(0, p.stock_qty - item.quantity)

            // Log stock movement audit entry
            localMovements.unshift({
              id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              merchant_id: 'demo-merchant-id',
              product_id: p.id,
              type: 'sale',
              quantity: -item.quantity,
              qty_before: p.stock_qty,
              qty_after: newStock,
              unit_cost: p.buy_price,
              notes: `Penjualan Kasir POS #${orderNumber}`,
              created_at: new Date().toISOString(),
              products: { name: p.name, sku: p.sku, unit: p.unit }
            })

            return { ...p, stock_qty: newStock }
          }
          return p
        })

        return {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          subtotal: item.subtotal,
          product: { name: item.name, unit: item.unit }
        }
      })

      // Update customer loyalty points (1 point per Rp 10.000 spent)
      if (selectedCustomerId.value !== 'general') {
        let localCusts = readDemoList('warungku_customers', customers.value)
        const pointsEarned = Math.floor(finalTotal / 10000)

        localCusts = localCusts.map((c: any) => {
          if (c.id === selectedCustomerId.value) {
            return { ...c, loyalty_points: c.loyalty_points + pointsEarned }
          }
          return c
        })

        writeDemoList('warungku_customers', localCusts)
        customers.value = localCusts
      }

      // Save transactions
      const ordersList = readDemoList<any>('warungku_orders', [])
      ordersList.unshift(orderPayload)
      writeDemoList('warungku_orders', ordersList)
      writeDemoList('warungku_products', localProducts)
      writeDemoList('warungku_movements', localMovements)

      const demoPayment = {
        id: `pay-${Date.now()}`,
        order_id: orderId,
        method: paymentMethod.value,
        amount: payAmount,
        change_amount: paymentMethod.value === 'cash' ? changeAmount.value : 0,
        status: 'completed',
        paid_at: new Date().toISOString()
      }

      // Set completed order object to pass to the receipt
      completedOrder.value = {
        ...orderPayload,
        items: orderItemsList,
        payment: demoPayment,
        customer: activeCustomer
      }

      toast.add({
        title: 'Checkout Berhasil',
        description: 'Transaksi tercatat dan stok disesuaikan (Mode Demo).',
        color: 'success'
      })

      // Sync local list
      products.value = localProducts
      isReceiptOpen.value = true
    } catch (err: any) {
      toast.add({
        title: 'Checkout Gagal',
        description: err.message,
        color: 'error'
      })
    } finally {
      processingCheckout.value = false
    }
    return
  }

  // B. SUPABASE ATOMIC TRANSACTION CHECKOUT
  if (!user.value) return
  try {
    const itemsPayload = cart.value.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      discount: item.discount
    }))

    const { data: checkoutResult, error: checkoutErr } = await (supabase as any)
      .rpc('pos_checkout_atomic', {
        p_items: itemsPayload,
        p_payment_method: paymentMethod.value,
        p_paid_amount: payAmount,
        p_customer_id: selectedCustomerId.value !== 'general' ? selectedCustomerId.value : null,
        p_discount_amount: discountAmount.value,
        p_notes: orderNotes.value || null
      }) as any

    if (checkoutErr) throw checkoutErr
    if (!checkoutResult?.order) {
      throw new Error('Checkout gagal: respons transaksi tidak lengkap.')
    }

    const orderFromDb = checkoutResult.order
    const itemsFromDb = checkoutResult.items || []
    const paymentFromDb = checkoutResult.payment || null
    const customerFromDb = checkoutResult.customer || null

    completedOrder.value = {
      ...orderFromDb,
      items: itemsFromDb,
      payment: paymentFromDb,
      customer: customerFromDb
    }

    toast.add({
      title: 'Checkout Berhasil',
      description: `Transaksi #${orderFromDb.order_number} berhasil dicatat.`,
      color: 'success'
    })

    isReceiptOpen.value = true
    await fetchPOSContext() // Refresh product list
  } catch (err: any) {
    toast.add({
      title: 'Checkout Gagal',
      description: err.message,
      color: 'error'
    })
  } finally {
    processingCheckout.value = false
  }
}

// 8. Reset checkout register basket
function resetPOSRegister() {
  cart.value = []
  selectedCustomerId.value = 'general'
  orderNotes.value = ''
  discountAmount.value = 0
  amountPaid.value = null
  paymentMethod.value = 'cash'
  completedOrder.value = null
}

// Filtered product listing inside catalog
const filteredProducts = computed(() => {
  return products.value.filter((p) => {
    const queryMatch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      || (p.sku && p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()))

    const catMatch = selectedCategory.value === 'all' || p.category_id === selectedCategory.value
    return queryMatch && catMatch
  })
})

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

onMounted(() => {
  fetchPOSContext()
})
</script>

<template>
  <div class="flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-130px)] min-h-[500px]">
    <!-- LEFT PANEL: Product Grid & Catalog Navigation (65%) -->
    <div class="flex-grow flex flex-col bg-elevated rounded-3xl border border-default shadow-sm overflow-hidden p-6 gap-6">
      <!-- Catalog Header and Search -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 class="text-2xl font-black text-default tracking-tight flex items-center gap-2">
            🖥️ Kasir Digital POS
          </h1>
          <p class="text-muted text-xs mt-0.5">
            Pilih produk, sesuaikan kuantitas, dan proses checkout instan.
          </p>
        </div>

        <div class="w-full sm:max-w-xs">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Cari nama atau SKU produk..."
            size="md"
            class="w-full"
          />
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
          class="flex items-center justify-center h-full"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="animate-spin text-primary size-10"
          />
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
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <div
            v-for="p in filteredProducts"
            :key="p.id"
            class="group bg-muted/20 hover:bg-muted/30 border border-default/60 hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
            :class="[p.stock_qty <= 0 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer']"
            @click="p.stock_qty > 0 ? addToCart(p) : null"
          >
            <!-- Hover shadow effect -->
            <div class="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div class="relative flex flex-col gap-2">
              <!-- Photo placeholder or URL -->
              <div class="aspect-square w-full rounded-xl bg-elevated border border-default flex items-center justify-center overflow-hidden shrink-0">
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
              </div>

              <!-- Product Details -->
              <div class="overflow-hidden mt-1">
                <h4 class="font-bold text-sm text-default truncate group-hover:text-primary transition-colors leading-tight">
                  {{ p.name }}
                </h4>
                <p class="text-[10px] text-muted truncate mt-0.5 font-mono">
                  SKU: {{ p.sku || 'No SKU' }}
                </p>
              </div>
            </div>

            <!-- Price and Add button -->
            <div class="relative flex items-end justify-between mt-3 pt-2 border-t border-default/40">
              <div class="flex flex-col">
                <span class="text-xs text-muted">Stok: {{ p.stock_qty }} {{ p.unit }}</span>
                <span class="font-extrabold text-sm text-default mt-0.5">{{ formatRupiah(p.sell_price) }}</span>
              </div>

              <!-- Quick Add Action -->
              <div
                class="size-8 rounded-xl bg-primary text-inverted flex items-center justify-center shadow-md shadow-primary/20 transition-all duration-200 group-hover:scale-105"
                :class="[p.stock_qty <= 0 ? 'bg-muted text-toned shadow-none cursor-not-allowed' : '']"
              >
                <UIcon
                  :name="p.stock_qty <= 0 ? 'i-lucide-x' : 'i-lucide-plus'"
                  class="size-4 stroke-[3]"
                />
              </div>
            </div>

            <!-- Badges overlay -->
            <div
              v-if="p.stock_qty <= p.min_stock && p.stock_qty > 0"
              class="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-warning/10 border border-warning/30 text-[9px] font-bold text-warning backdrop-blur-sm"
            >
              Menipis
            </div>
            <div
              v-if="p.stock_qty <= 0"
              class="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-error/10 border border-error/30 text-[9px] font-bold text-error backdrop-blur-sm"
            >
              Habis
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL: Shopping Cart Register & Checkout (35%) -->
    <div class="w-full xl:w-[460px] shrink-0 bg-elevated rounded-3xl border border-default shadow-sm overflow-hidden flex flex-col p-6 gap-5 h-full">
      <!-- Checkout Basket Title -->
      <div class="flex items-center justify-between shrink-0">
        <h2 class="text-lg font-black text-default tracking-tight flex items-center gap-2">
          🛒 Keranjang Belanja
        </h2>
        <UButton
          v-if="cart.length > 0"
          label="Kosongkan"
          color="error"
          variant="ghost"
          size="xs"
          class="font-semibold"
          @click="resetPOSRegister"
        />
      </div>

      <!-- Dynamic Cart Items Pane -->
      <div class="flex-grow overflow-y-auto min-h-0 pr-1 flex flex-col gap-3">
        <!-- Empty Basket layout -->
        <div
          v-if="cart.length === 0"
          class="flex-grow flex flex-col items-center justify-center py-12 text-center"
        >
          <div class="size-16 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-3">
            <UIcon
              name="i-lucide-shopping-cart"
              class="size-8"
            />
          </div>
          <h4 class="font-bold text-sm text-default">
            Keranjang Belanja Kosong
          </h4>
          <p class="text-xs text-muted max-w-xs mt-1">
            Pilih produk di panel sebelah kiri untuk memulai pencatatan kasir.
          </p>
        </div>

        <!-- Populated cart list -->
        <div
          v-else
          class="flex flex-col gap-3"
        >
          <div
            v-for="item in cart"
            :key="item.id"
            class="bg-muted/20 border border-default/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-primary/20 transition-all"
          >
            <div class="overflow-hidden flex-grow flex flex-col">
              <h4 class="font-bold text-xs text-default truncate">
                {{ item.name }}
              </h4>
              <p class="text-[10px] text-muted font-mono mt-0.5">
                {{ formatRupiah(item.unit_price) }} / {{ item.unit }}
              </p>
              <span class="text-xs font-black text-default mt-1">{{ formatRupiah(item.subtotal) }}</span>
            </div>

            <!-- Quantity adjusters -->
            <div class="flex items-center gap-2 shrink-0">
              <UButton
                icon="i-lucide-minus"
                color="neutral"
                variant="subtle"
                size="xs"
                class="rounded-lg"
                @click="decreaseQty(item)"
              />
              <span class="font-extrabold text-sm text-default w-6 text-center">{{ item.quantity }}</span>
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="subtle"
                size="xs"
                class="rounded-lg"
                @click="increaseQty(item)"
              />
            </div>

            <!-- Remove item -->
            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              size="xs"
              class="rounded-lg shrink-0 text-muted hover:text-error"
              @click="removeFromCart(item)"
            />
          </div>
        </div>
      </div>

      <!-- Checkout Options & Totals Footer -->
      <div class="shrink-0 border-t border-default/60 pt-4 flex flex-col gap-3.5">
        <!-- Customer SelectDropdown -->
        <div class="flex items-center gap-2">
          <div class="flex-grow">
            <USelect
              v-model="selectedCustomerId"
              placeholder="Pilih Pelanggan"
              class="w-full"
              size="md"
              :items="[
                { label: 'Pelanggan Umum (Luring)', value: 'general' },
                ...customers.map(c => ({ label: `${c.name} (${c.phone || 'No WhatsApp'})`, value: c.id }))
              ]"
            />
          </div>
          <UButton
            icon="i-lucide-user-plus"
            color="neutral"
            variant="subtle"
            size="md"
            class="rounded-xl shrink-0"
            @click="isAddCustomerOpen = true"
          />
        </div>

        <!-- Global Discount -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-toned shrink-0 font-medium">Potongan/Diskon (Rp):</span>
          <div class="flex-grow">
            <UInput
              v-model.number="discountAmount"
              type="number"
              min="0"
              placeholder="0"
              size="xs"
              class="w-full"
            >
              <template #leading>
                <span class="text-[10px] text-muted px-1">Rp</span>
              </template>
            </UInput>
          </div>
        </div>

        <!-- Payment Method Grid -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-bold text-muted uppercase tracking-wider">Metode Pembayaran</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="([val, meta]) in Object.entries(paymentMeta)"
              :key="val"
              class="flex flex-col items-center justify-center p-2 rounded-xl border border-default text-xs font-semibold gap-1.5 transition-all duration-200"
              :class="[
                paymentMethod === val
                  ? 'bg-primary/10 text-primary border-primary shadow-sm ring-1 ring-primary'
                  : 'bg-muted/10 text-toned hover:bg-muted/40 hover:text-default'
              ]"
              @click="paymentMethod = val as any"
            >
              <UIcon
                :name="meta.icon"
                class="size-4"
              />
              <span>{{ meta.label }}</span>
            </button>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="bg-muted/10 border border-default/40 p-4 rounded-2xl flex flex-col gap-2">
          <div class="flex justify-between text-xs text-toned">
            <span>Subtotal Keranjang</span>
            <span>{{ formatRupiah(cartSubtotal) }}</span>
          </div>
          <div
            v-if="discountAmount > 0"
            class="flex justify-between text-xs text-error font-medium"
          >
            <span>Diskon Belanja</span>
            <span>-{{ formatRupiah(discountAmount) }}</span>
          </div>

          <div class="h-px bg-default/40 my-1" />

          <div class="flex justify-between text-sm font-extrabold text-default">
            <span>TOTAL TAGIHAN</span>
            <span class="text-base font-black text-primary">{{ formatRupiah(cartTotal) }}</span>
          </div>
        </div>

        <!-- Cash input fields (Only displayed for Cash Payment Method) -->
        <div
          v-if="paymentMethod === 'cash' && cart.length > 0"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center gap-3">
            <span class="text-xs text-toned shrink-0 font-medium">Uang Diterima:</span>
            <div class="flex-grow">
              <UInput
                v-model.number="amountPaid"
                type="number"
                placeholder="Jumlah cash dibayarkan"
                size="md"
                class="w-full font-bold"
              >
                <template #leading>
                  <span class="text-xs text-muted px-1">Rp</span>
                </template>
              </UInput>
            </div>
          </div>

          <!-- Quick Cash options -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
            <UButton
              v-for="amt in quickCashAmounts"
              :key="amt"
              :label="formatRupiah(amt)"
              size="xs"
              variant="subtle"
              color="neutral"
              class="rounded-lg font-mono shrink-0"
              @click="amountPaid = amt"
            />
          </div>

          <div
            v-if="amountPaid !== null && amountPaid >= cartTotal"
            class="flex justify-between items-center text-xs font-bold text-success bg-success/5 border border-success/20 p-2.5 rounded-xl"
          >
            <span>UANG KEMBALIAN:</span>
            <span class="font-mono text-sm font-extrabold">{{ formatRupiah(changeAmount) }}</span>
          </div>
        </div>

        <!-- Major CTA Button -->
        <UButton
          label="PROSES PEMBAYARAN"
          icon="i-lucide-arrow-right-circle"
          color="primary"
          size="lg"
          block
          :disabled="cart.length === 0"
          :loading="processingCheckout"
          class="rounded-2xl font-black shadow-lg shadow-primary/20 py-3.5 transition-all active:scale-[0.98]"
          @click="handleCheckout"
        />
      </div>
    </div>

    <!-- Modals Auxiliary Section -->
    <AddCustomerModal
      v-model:open="isAddCustomerOpen"
      @saved="onCustomerAdded"
    />

    <ReceiptModal
      v-model:open="isReceiptOpen"
      :order="completedOrder"
      @new-transaction="resetPOSRegister"
    />
  </div>
</template>

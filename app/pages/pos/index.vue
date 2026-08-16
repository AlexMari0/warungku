<script setup lang="ts">
import type { Customer, PaymentMethod, Order, Product, CartItem } from '~/core/types'

definePageMeta({
  layout: 'default'
})

const user = useSupabaseUser()
const toast = useToast()

const { products, fetchProducts, fetchSalesFrequency } = useProducts()
const { categories, fetchCategories } = useCategories()
const { cart, addToCart, increaseQty, decreaseQty, removeFromCart, clearCart, cartSubtotal, totalCartItemsCount } = useCart()
const { processingCheckout, processCheckout } = useCheckout()
const { customers, fetchCustomers } = useCustomers()

// POS UI State
const isReceiptOpen = ref(false)
const completedOrder = ref<Order | null>(null)
// POS State
const loading = ref(true)
const salesFrequency = ref<Record<string, number>>({})

const selectedCustomerId = ref<string | undefined>('general')
const orderNotes = ref('')
const discountType = ref<'rp' | 'percent'>('rp')
const discountValue = ref<number>(0)
const paymentMethod = ref<PaymentMethod>('cash')
const amountPaid = ref<number | null>(null)
const isAddCustomerOpen = ref(false)

const bestSellers = computed(() => {
  return [...products.value]
    .sort((a, b) => (salesFrequency.value[b.id] || 0) - (salesFrequency.value[a.id] || 0))
    .slice(0, 4)
})

const discountAmount = computed(() => {
  if (discountType.value === 'percent') {
    return Math.round((cartSubtotal.value * (discountValue.value || 0)) / 100)
  }
  return discountValue.value || 0
})

const cartTotal = computed(() => {
  const sum = cartSubtotal.value - discountAmount.value
  return sum < 0 ? 0 : sum
})

const changeAmount = computed(() => {
  if (amountPaid.value === null || amountPaid.value < cartTotal.value) return 0
  return amountPaid.value - cartTotal.value
})

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

async function fetchPOSContext() {
  if (!user.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const catResult = await fetchCategories()
    if (!catResult.success) throw new Error(catResult.error || 'Gagal mengambil kategori')
    const custResult = await fetchCustomers()
    if (!custResult.success) throw new Error(custResult.error || 'Gagal mengambil pelanggan')
    const productResult = await fetchProducts({ activeOnly: true, orderBy: 'created_at', orderAscending: false })
    if (!productResult.success) throw new Error(productResult.error || 'Gagal mengambil data produk')
    salesFrequency.value = await fetchSalesFrequency()
  } catch (err: unknown) {
    toast.add({
      title: 'Gagal memuat POS',
      description: (err as Error).message || 'Terjadi kesalahan.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function onCustomerAdded(newCust: Customer) {
  customers.value.unshift(newCust)
  selectedCustomerId.value = newCust.id
}

function handleAddToCart(product: Product) {
  const result = addToCart(product)
  if (!result.success) {
    toast.add({ title: 'Perhatian', description: result.error, color: 'warning' })
  } else {
    toast.add({ title: 'Ditambahkan ke keranjang', description: `"${product.name}" berhasil dimasukkan.`, color: 'success', duration: 1000 })
  }
}

function handleIncreaseQty(item: CartItem) {
  const result = increaseQty(item)
  if (!result.success) {
    toast.add({ title: 'Perhatian', description: result.error, color: 'warning' })
  }
}

async function handleCheckout() {
  const result = await processCheckout({
    cart: cart.value,
    paymentMethod: paymentMethod.value,
    amountPaid: amountPaid.value,
    cartTotal: cartTotal.value,
    selectedCustomerId: selectedCustomerId.value ?? null,
    discountAmount: discountAmount.value,
    orderNotes: orderNotes.value
  })

  if (result.success && result.data) {
    completedOrder.value = result.data
    isReceiptOpen.value = true
    toast.add({ title: 'Checkout Berhasil', description: `Transaksi #${result.data.order_number} berhasil dicatat.`, color: 'success' })
    await fetchPOSContext()
  } else {
    toast.add({ title: 'Checkout Gagal', description: result.error || 'Terjadi kesalahan.', color: 'error' })
  }
}

function resetPOSRegister() {
  clearCart()
  selectedCustomerId.value = 'general'
  orderNotes.value = ''
  discountValue.value = 0
  discountType.value = 'rp'
  amountPaid.value = null
  paymentMethod.value = 'cash'
  completedOrder.value = null
  isReceiptOpen.value = false
}

onMounted(() => {
  fetchPOSContext()
})
</script>

<template>
  <div class="flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-130px)] min-h-[500px]">
    <!-- LEFT PANEL: Product Grid & Catalog Navigation -->
    <ProductCatalog
      :products="products"
      :categories="categories"
      :loading="loading"
      @add-to-cart="handleAddToCart"
    />

    <!-- RIGHT PANEL: Shopping Cart Register & Checkout -->
    <div class="w-full xl:w-[460px] shrink-0 bg-elevated rounded-3xl border border-default shadow-sm overflow-hidden flex flex-col p-6 gap-5 h-full">
      <CartPanel
        :cart="cart"
        :total-count="totalCartItemsCount"
        :best-sellers="bestSellers"
        @increase-qty="handleIncreaseQty"
        @decrease-qty="decreaseQty"
        @remove-from-cart="removeFromCart"
        @reset-cart="resetPOSRegister"
        @add-to-cart="handleAddToCart"
      />

      <CheckoutSummary
        v-model:discount-type="discountType"
        v-model:discount-value="discountValue"
        v-model:payment-method="paymentMethod"
        v-model:amount-paid="amountPaid"
        v-model:selected-customer-id="selectedCustomerId"
        :cart-total="cartTotal"
        :cart-subtotal="cartSubtotal"
        :discount-amount="discountAmount"
        :change-amount="changeAmount"
        :quick-cash-amounts="quickCashAmounts"
        :customers="customers"
        :has-cart-items="cart.length > 0"
        :processing="processingCheckout"
        @open-add-customer="isAddCustomerOpen = true"
        @cancel-transaction="resetPOSRegister"
        @checkout="handleCheckout"
      />
    </div>

    <!-- Modals Auxiliary Section -->
    <AddCustomerModal
      v-model:open="isAddCustomerOpen"
      @saved="onCustomerAdded"
    />

    <ReceiptModal
      v-model:open="isReceiptOpen"
      :order="(completedOrder as unknown as any) || null"
      @new-transaction="resetPOSRegister"
    />
  </div>
</template>

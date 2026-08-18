<script setup lang="ts">
import type { Customer, PaymentMethod, Order, Product, CartItem } from '~/core/types'

definePageMeta({
  layout: 'default'
})

const user = useSupabaseUser()
const toast = useToast()

const { products, fetchProducts, fetchSalesFrequency } = useProducts()
const { categories, fetchCategories } = useCategories()
const posStore = usePOSStore()
const {
  cart,
  selectedCustomerId,
  orderNotes,
  discountType,
  discountValue,
  paymentMethod,
  amountPaid,
  processingCheckout,
  cartSubtotal,
  totalCartItemsCount,
  discountAmount,
  cartTotal,
  changeAmount,
  quickCashAmounts
} = storeToRefs(posStore)
const { customers, fetchCustomers } = useCustomers()

// POS UI State
const isReceiptOpen = ref(false)
const completedOrder = ref<Order | null>(null)
// POS State
const loading = ref(true)
const salesFrequency = ref<Record<string, number>>({})
const isAddCustomerOpen = ref(false)
const hasAddCustomerOpened = ref(false)
watch(isAddCustomerOpen, (val) => {
  if (val) hasAddCustomerOpened.value = true
})

const hasReceiptOpened = ref(false)
watch(isReceiptOpen, (val) => {
  if (val) hasReceiptOpened.value = true
})

const bestSellers = computed(() => {
  return [...products.value]
    .sort((a, b) => (salesFrequency.value[b.id] || 0) - (salesFrequency.value[a.id] || 0))
    .slice(0, 4)
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
  const result = posStore.addToCart(product)
  if (!result.success) {
    toast.add({ title: 'Perhatian', description: result.error, color: 'warning' })
  } else {
    toast.add({ title: 'Ditambahkan ke keranjang', description: `"${product.name}" berhasil dimasukkan.`, color: 'success', duration: 1000 })
  }
}

function handleIncreaseQty(item: CartItem) {
  const result = posStore.increaseQty(item)
  if (!result.success) {
    toast.add({ title: 'Perhatian', description: result.error, color: 'warning' })
  }
}

async function handleCheckout() {
  const result = await posStore.processCheckout()

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
  posStore.resetSession()
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
        @decrease-qty="posStore.decreaseQty"
        @remove-from-cart="posStore.removeFromCart"
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
    <LazyAddCustomerModal
      v-if="hasAddCustomerOpened"
      v-model:open="isAddCustomerOpen"
      @saved="onCustomerAdded"
    />

    <LazyReceiptModal
      v-if="hasReceiptOpened"
      v-model:open="isReceiptOpen"
      :order="(completedOrder as unknown as any) || null"
      @new-transaction="resetPOSRegister"
    />
  </div>
</template>

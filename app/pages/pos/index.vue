<script setup lang="ts">
import type { Customer } from '~/types'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const { products, fetchProducts } = useProducts()
const { categories, fetchCategories } = useCategories()
const { cart, addToCart, increaseQty, decreaseQty, removeFromCart, clearCart, cartSubtotal, totalCartItemsCount } = useCart()
const { processingCheckout, isReceiptOpen, completedOrder, processCheckout, resetCheckoutState } = useCheckout()
const { customers, fetchCustomers } = useCustomers()

// POS State
const loading = ref(true)
const salesFrequency = ref<Record<string, number>>({})

const selectedCustomerId = ref<any>('general')
const orderNotes = ref('')
const discountType = ref<'rp' | 'percent'>('rp')
const discountValue = ref<number>(0)
const paymentMethod = ref<'cash' | 'qris' | 'gopay' | 'ovo' | 'dana' | 'transfer'>('cash')
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
    await fetchCategories()
    await fetchCustomers()
    await fetchProducts({ activeOnly: true, orderBy: 'created_at', orderAscending: false })

    const { data: itemsData } = await (supabase.from('order_items') as any).select('product_id, quantity')
    const freq: Record<string, number> = {}
    if (itemsData) {
      for (const item of (itemsData as any[])) {
        freq[item.product_id] = (freq[item.product_id] || 0) + (item.quantity || 0)
      }
    }
    salesFrequency.value = freq
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

function onCustomerAdded(newCust: Customer) {
  customers.value.unshift(newCust)
  selectedCustomerId.value = newCust.id
}

async function handleCheckout() {
  const result = await processCheckout({
    cart: cart.value,
    paymentMethod: paymentMethod.value,
    amountPaid: amountPaid.value,
    cartTotal: cartTotal.value,
    selectedCustomerId: selectedCustomerId.value,
    discountAmount: discountAmount.value,
    orderNotes: orderNotes.value
  })

  if (result) {
    await fetchPOSContext()
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
  resetCheckoutState()
}

onMounted(() => {
  fetchPOSContext()
})
</script>

<template>
  <div class="flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-130px)] min-h-[500px]">
    <!-- LEFT PANEL: Product Grid & Catalog Navigation -->
    <PosProductCatalog
      :products="products"
      :categories="categories"
      :loading="loading"
      @add-to-cart="addToCart"
    />

    <!-- RIGHT PANEL: Shopping Cart Register & Checkout -->
    <div class="w-full xl:w-[460px] shrink-0 bg-elevated rounded-3xl border border-default shadow-sm overflow-hidden flex flex-col p-6 gap-5 h-full">
      <PosCartPanel
        :cart="cart"
        :total-count="totalCartItemsCount"
        :best-sellers="bestSellers"
        @increase-qty="increaseQty"
        @decrease-qty="decreaseQty"
        @remove-from-cart="removeFromCart"
        @reset-cart="resetPOSRegister"
        @add-to-cart="addToCart"
      />

      <PosCheckoutSummary
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
      :order="completedOrder || {}"
      @new-transaction="resetPOSRegister"
    />
  </div>
</template>

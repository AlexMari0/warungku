import { defineStore } from 'pinia'
import type { CartItem, Product, Order, PaymentMethod } from '~/core/types'

export const usePOSStore = defineStore('pos', () => {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  // -- State --
  const cart = ref<CartItem[]>([])
  const selectedCustomerId = ref<string | undefined>('general')
  const orderNotes = ref('')
  const discountType = ref<'rp' | 'percent'>('rp')
  const discountValue = ref<number>(0)
  const paymentMethod = ref<PaymentMethod>('cash')
  const amountPaid = ref<number | null>(null)
  const processingCheckout = ref(false)

  // -- Computed --
  const cartSubtotal = computed(() => {
    return cart.value.reduce((acc, item) => acc + item.subtotal, 0)
  })

  const totalCartItemsCount = computed(() => {
    return cart.value.reduce((acc, item) => acc + item.quantity, 0)
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

  // -- Actions: Cart --
  function addToCart(product: Product): { success: boolean, error?: string } {
    if (!product.is_active || product.stock_qty <= 0) {
      return { success: false, error: `Stok "${product.name}" habis. Silakan lakukan restock terlebih dahulu.` }
    }

    const existing = cart.value.find(item => item.product_id === product.id)

    if (existing) {
      if (existing.quantity >= product.stock_qty) {
        return { success: false, error: `Tidak dapat menambah quantity melebihi sisa stok (${product.stock_qty} ${product.unit}).` }
      }
      existing.quantity++
      existing.subtotal = existing.quantity * existing.unit_price - existing.discount
    } else {
      cart.value.push({
        id: product.id,
        product_id: product.id,
        name: product.name,
        sku: product.sku || '',
        price: Number(product.sell_price) || 0,
        cost_price: Number(product.buy_price) || 0,
        buy_price: Number(product.buy_price) || 0,
        unit_price: Number(product.sell_price) || 0,
        quantity: 1,
        unit: product.unit || 'pcs',
        discount: 0,
        subtotal: Number(product.sell_price) || 0,
        max_stock: product.stock_qty
      })
    }

    return { success: true }
  }

  function increaseQty(item: CartItem): { success: boolean, error?: string } {
    if (item.quantity >= item.max_stock) {
      return { success: false, error: `Stok barang terbatas pada ${item.max_stock} ${item.unit}.` }
    }
    item.quantity++
    item.subtotal = item.quantity * item.unit_price - item.discount
    return { success: true }
  }

  function decreaseQty(item: CartItem): void {
    if (item.quantity <= 1) {
      removeFromCart(item)
      return
    }
    item.quantity--
    item.subtotal = item.quantity * item.unit_price - item.discount
  }

  function removeFromCart(item: CartItem): void {
    cart.value = cart.value.filter(i => (i.id ? i.id !== item.id : i.product_id !== item.product_id))
  }

  function clearCart(): void {
    cart.value = []
  }

  // -- Actions: Checkout --
  async function processCheckout(): Promise<{ success: boolean, data?: Order, error?: string }> {
    if (cart.value.length === 0) {
      return { success: false, error: 'Silakan pilih produk terlebih dahulu.' }
    }

    const payAmount = amountPaid.value !== null ? amountPaid.value : cartTotal.value

    if (paymentMethod.value === 'cash' && payAmount < cartTotal.value) {
      return { success: false, error: 'Nominal uang tunai dibayarkan harus lebih besar atau sama dengan total belanja.' }
    }

    if (!user.value) return { success: false, error: 'User not authenticated' }
    processingCheckout.value = true

    const itemsPayload = cart.value.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      discount: item.discount
    }))

    const res = await apiFetch<{
      order: Order
      items: any[]
      payment: any
      receipt: any
      customer: any
      points_earned: number
    }>('/api/checkout', {
      method: 'POST',
      body: {
        items: itemsPayload,
        payment_method: paymentMethod.value,
        paid_amount: payAmount,
        customer_id: selectedCustomerId.value && selectedCustomerId.value !== 'general' ? selectedCustomerId.value : null,
        discount_amount: discountAmount.value,
        notes: orderNotes.value || null
      }
    })

    processingCheckout.value = false

    if (res.success) {
      const checkoutResult = res.data
      const orderFromDb = checkoutResult.order
      const itemsFromDb = checkoutResult.items || []
      const paymentFromDb = checkoutResult.payment || null
      const customerFromDb = checkoutResult.customer || null

      const fullOrder: Order = {
        ...orderFromDb,
        order_items: itemsFromDb,
        payments: paymentFromDb ? [paymentFromDb] : [],
        customer: customerFromDb
      }

      return { success: true, data: fullOrder }
    } else {
      return { success: false, error: res.error }
    }
  }

  // -- Actions: Reset Session --
  function resetSession() {
    clearCart()
    selectedCustomerId.value = 'general'
    orderNotes.value = ''
    discountValue.value = 0
    discountType.value = 'rp'
    paymentMethod.value = 'cash'
    amountPaid.value = null
  }

  return {
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
    quickCashAmounts,
    
    addToCart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
    processCheckout,
    resetSession
  }
})

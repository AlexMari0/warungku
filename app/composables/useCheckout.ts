import type { CartItem, Order, PaymentMethod } from '~/types'

export interface ProcessCheckoutParams {
  cart: CartItem[]
  paymentMethod: PaymentMethod
  amountPaid: number | null
  cartTotal: number
  selectedCustomerId: string | null
  discountAmount: number
  orderNotes?: string
}

export function useCheckout() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const processingCheckout = ref(false)
  const isReceiptOpen = ref(false)
  const completedOrder = ref<Order | null>(null)

  /**
   * Execute atomic transaction checkout via database RPC
   */
  async function processCheckout(params: ProcessCheckoutParams): Promise<Order | null> {
    const { cart, paymentMethod, amountPaid, cartTotal, selectedCustomerId, discountAmount, orderNotes } = params

    if (cart.length === 0) {
      toast.add({
        title: 'Keranjang kosong',
        description: 'Silakan pilih produk terlebih dahulu.',
        color: 'warning'
      })
      return null
    }

    const payAmount = amountPaid !== null ? amountPaid : cartTotal

    if (paymentMethod === 'cash' && payAmount < cartTotal) {
      toast.add({
        title: 'Pembayaran kurang',
        description: 'Nominal uang tunai dibayarkan harus lebih besar atau sama dengan total belanja.',
        color: 'error'
      })
      return null
    }

    if (!user.value) return null
    processingCheckout.value = true

    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount: item.discount
      }))

      const { data: checkoutResult, error: checkoutErr } = await (supabase as any)
        .rpc('pos_checkout_atomic', {
          p_items: itemsPayload,
          p_payment_method: paymentMethod,
          p_paid_amount: payAmount,
          p_customer_id: selectedCustomerId && selectedCustomerId !== 'general' ? selectedCustomerId : null,
          p_discount_amount: discountAmount,
          p_notes: orderNotes || null
        }) as any

      if (checkoutErr) throw checkoutErr

      const orderFromDb = checkoutResult.order
      const itemsFromDb = checkoutResult.items || []
      const paymentFromDb = checkoutResult.payment || null
      const customerFromDb = checkoutResult.customer || null

      const fullOrder: Order = {
        ...orderFromDb,
        items: itemsFromDb,
        payment: paymentFromDb,
        customer: customerFromDb
      }

      completedOrder.value = fullOrder

      toast.add({
        title: 'Checkout Berhasil',
        description: `Transaksi #${orderFromDb.order_number} berhasil dicatat.`,
        color: 'success'
      })

      isReceiptOpen.value = true
      return fullOrder
    } catch (err: any) {
      toast.add({
        title: 'Checkout Gagal',
        description: err.message,
        color: 'error'
      })
      return null
    } finally {
      processingCheckout.value = false
    }
  }

  function resetCheckoutState() {
    completedOrder.value = null
    isReceiptOpen.value = false
  }

  return {
    processingCheckout,
    isReceiptOpen,
    completedOrder,
    processCheckout,
    resetCheckoutState
  }
}

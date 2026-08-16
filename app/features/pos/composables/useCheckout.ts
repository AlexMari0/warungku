import type { CartItem, Order, PaymentMethod } from '~/core/types'

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
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const processingCheckout = ref(false)

  /**
   * Execute atomic transaction checkout via Go backend API
   */
  async function processCheckout(params: ProcessCheckoutParams): Promise<{ success: boolean, data?: Order, error?: string }> {
    const { cart, paymentMethod, amountPaid, cartTotal, selectedCustomerId, discountAmount, orderNotes } = params

    if (cart.length === 0) {
      return { success: false, error: 'Silakan pilih produk terlebih dahulu.' }
    }

    const payAmount = amountPaid !== null ? amountPaid : cartTotal

    if (paymentMethod === 'cash' && payAmount < cartTotal) {
      return { success: false, error: 'Nominal uang tunai dibayarkan harus lebih besar atau sama dengan total belanja.' }
    }

    if (!user.value) return { success: false, error: 'User not authenticated' }
    processingCheckout.value = true

    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount: item.discount
      }))

      const checkoutResult = await apiFetch<{
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
          payment_method: paymentMethod,
          paid_amount: payAmount,
          customer_id: selectedCustomerId && selectedCustomerId !== 'general' ? selectedCustomerId : null,
          discount_amount: discountAmount,
          notes: orderNotes || null
        }
      })

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
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    } finally {
      processingCheckout.value = false
    }
  }

  return {
    processingCheckout,
    processCheckout
  }
}

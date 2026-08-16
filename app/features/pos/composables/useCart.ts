import type { CartItem, Product } from '~/core/types'

export function useCart() {
  const cart = ref<CartItem[]>([])

  /**
   * Add a product to the cart state with stock boundary validation
   */
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

  /**
   * Increase quantity of a cart item
   */
  function increaseQty(item: CartItem): { success: boolean, error?: string } {
    if (item.quantity >= item.max_stock) {
      return { success: false, error: `Stok barang terbatas pada ${item.max_stock} ${item.unit}.` }
    }
    item.quantity++
    item.subtotal = item.quantity * item.unit_price - item.discount
    return { success: true }
  }

  /**
   * Decrease quantity of a cart item or remove if 1
   */
  function decreaseQty(item: CartItem): void {
    if (item.quantity <= 1) {
      removeFromCart(item)
      return
    }
    item.quantity--
    item.subtotal = item.quantity * item.unit_price - item.discount
  }

  /**
   * Remove item from cart
   */
  function removeFromCart(item: CartItem): void {
    cart.value = cart.value.filter(i => (i.id ? i.id !== item.id : i.product_id !== item.product_id))
  }

  /**
   * Empty the cart basket
   */
  function clearCart(): void {
    cart.value = []
  }

  // Computed cart metrics
  const cartSubtotal = computed(() => {
    return cart.value.reduce((acc, item) => acc + item.subtotal, 0)
  })

  const totalCartItemsCount = computed(() => {
    return cart.value.reduce((acc, item) => acc + item.quantity, 0)
  })

  return {
    cart,
    addToCart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
    cartSubtotal,
    totalCartItemsCount
  }
}

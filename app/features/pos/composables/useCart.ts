import type { CartItem, Product } from '~/core/types'

export function useCart() {
  const toast = useToast()
  const cart = ref<CartItem[]>([])

  /**
   * Add a product to the cart state with stock boundary validation
   */
  function addToCart(product: Product): boolean {
    if (!product.is_active || product.stock_qty <= 0) {
      toast.add({
        title: 'Barang tidak tersedia',
        description: `Stok "${product.name}" habis. Silakan lakukan restock terlebih dahulu.`,
        color: 'warning'
      })
      return false
    }

    const existing = cart.value.find(item => item.product_id === product.id)

    if (existing) {
      if (existing.quantity >= product.stock_qty) {
        toast.add({
          title: 'Batas stok tercapai',
          description: `Tidak dapat menambah quantity melebihi sisa stok (${product.stock_qty} ${product.unit}).`,
          color: 'warning'
        })
        return false
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

    toast.add({
      title: 'Ditambahkan ke keranjang',
      description: `"${product.name}" berhasil dimasukkan.`,
      color: 'success',
      duration: 1000
    })

    return true
  }

  /**
   * Increase quantity of a cart item
   */
  function increaseQty(item: CartItem): boolean {
    if (item.quantity >= item.max_stock) {
      toast.add({
        title: 'Batas stok tercapai',
        description: `Stok barang terbatas pada ${item.max_stock} ${item.unit}.`,
        color: 'warning'
      })
      return false
    }
    item.quantity++
    item.subtotal = item.quantity * item.unit_price - item.discount
    return true
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

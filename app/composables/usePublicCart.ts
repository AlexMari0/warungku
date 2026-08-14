import type { Product, StorefrontProduct } from '~/types'

export interface PublicCartItem {
  product: Product
  quantity: number
  custom_description: string | null
}

export function usePublicCart() {
  const toast = useToast()
  const cart = ref<PublicCartItem[]>([])

  const cartTotalCount = computed(() =>
    cart.value.reduce((acc, item) => acc + item.quantity, 0)
  )

  const cartSubtotal = computed(() =>
    cart.value.reduce((acc, item) => acc + (item.quantity * item.product.sell_price), 0)
  )

  function addToCart(sfp: { products?: Product; custom_description?: string | null } & Partial<StorefrontProduct>) {
    const product = sfp.products
    if (!product) return

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
        custom_description: sfp.custom_description ?? null
      })
    }

    toast.add({
      title: 'Ditambahkan ke keranjang',
      description: `${product.name} telah masuk ke dalam keranjang belanja.`,
      color: 'success'
    })
  }

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

  function resetCart() {
    cart.value = []
  }

  return {
    cart,
    cartTotalCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    resetCart
  }
}

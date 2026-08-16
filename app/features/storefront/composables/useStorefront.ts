import type { Storefront, StorefrontProduct, Category, Product, OnlineOrder } from '~/core/types'
import type { PublicCartItem } from '~/features/storefront/composables/usePublicCart'
import { formatRupiah } from '~/utils/format'

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export interface StorefrontProductLinkState {
  is_linked: boolean
  is_featured: boolean
  custom_description: string
}

export function useStorefront() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const storefront = ref<Storefront>({
    id: '',
    merchant_id: '',
    slug: '',
    display_name: 'Toko Saya',
    description: '',
    banner_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    theme_color: 'emerald',
    is_published: false,
    created_at: ''
  })

  const storefrontProductsMap = ref<Record<string, StorefrontProductLinkState>>({})
  const slugStatus = ref<SlugStatus>('idle')
  const saving = ref(false)
  const loading = ref(false)

  /**
   * Fetch or auto-initialize merchant storefront settings & product exposures
   */
  async function fetchStorefrontSettings(_allProducts: Product[] = []): Promise<{ success: boolean, data?: Storefront, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }
    loading.value = true

    const res = await apiFetch<{
      storefront: Storefront
      storefront_products_map: Record<string, StorefrontProductLinkState>
    }>('/api/storefront/settings')

    loading.value = false

    if (res.success) {
      const data = res.data
      if (data) {
        storefront.value = data.storefront
        storefrontProductsMap.value = data.storefront_products_map || {}
      }
      return { success: true, data: storefront.value }
    } else {
      return { success: false, error: res.error }
    }
  }

  /**
   * Save merchant storefront configuration and sync product exposure links
   */
  async function saveSettings(): Promise<{ success: boolean, error?: string }> {
    if (!user.value || !storefront.value.id) return { success: false, error: 'User not authenticated or storefront not loaded' }
    saving.value = true

    const cleanSlug = (storefront.value.slug || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (!cleanSlug) {
      saving.value = false
      return { success: false, error: 'Slug toko tidak boleh kosong dan hanya boleh berisi huruf, angka, strip (-), dan garis bawah (_).' }
    }
    storefront.value.slug = cleanSlug

    const res = await apiFetch<{
      storefront: Storefront
      storefront_products_map: Record<string, StorefrontProductLinkState>
    }>('/api/storefront/settings', {
      method: 'PATCH',
      body: {
        slug: storefront.value.slug,
        display_name: storefront.value.display_name,
        description: storefront.value.description,
        banner_url: storefront.value.banner_url,
        theme_color: storefront.value.theme_color,
        is_published: storefront.value.is_published,
        storefront_products_map: storefrontProductsMap.value
      }
    })

    saving.value = false

    if (res.success) {
      const data = res.data
      if (data) {
        storefront.value = data.storefront
        if (data.storefront_products_map) {
          storefrontProductsMap.value = data.storefront_products_map
        }
      }
      return { success: true }
    } else {
      return { success: false, error: res.error }
    }
  }

  /**
   * Check real-time slug uniqueness availability
   */
  async function checkSlugAvailability(slugQuery: string) {
    const cleanSlug = (slugQuery || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (!cleanSlug || cleanSlug.length < 3) {
      slugStatus.value = 'invalid'
      return
    }

    slugStatus.value = 'checking'
    const res = await apiFetch<{ available: boolean; slug: string }>('/api/storefront/check-slug', {
      query: { slug: cleanSlug }
    })

    if (res.success) {
      if (res.data && res.data.available) {
        slugStatus.value = 'available'
      } else {
        slugStatus.value = 'taken'
      }
    } else {
      slugStatus.value = 'idle'
    }
  }

  /**
   * Fetch public storefront details by slug for customer digital catalog page
   */
  async function fetchPublicStorefront(slug: string): Promise<{ success: boolean, data?: { storefront: Storefront, products: (StorefrontProduct & { products?: Product })[], categories: Category[] }, error?: string }> {
    loading.value = true
    const res = await apiFetch<{
      storefront: Storefront
      categories: Category[]
      featured_products: StorefrontProduct[]
      catalog: StorefrontProduct[]
    }>(`/api/public/store/${slug}`)

    loading.value = false

    if (res.success) {
      const data = res.data
      if (!data) return { success: false, error: 'Data tidak ditemukan' }

      return {
        success: true,
        data: {
          storefront: data.storefront,
          products: data.catalog as (StorefrontProduct & { products?: Product })[],
          categories: data.categories || []
        }
      }
    } else {
      return { success: false, error: res.error }
    }
  }

  /**
   * Create an online storefront order
   */
  async function createOnlineOrder(payload: {
    storefront_id?: string
    customer_name: string
    customer_phone: string
    total_amount: number
    notes?: string
    status?: string
    slug?: string
  }): Promise<{ success: boolean, data?: OnlineOrder, error?: string }> {
    const slug = payload.slug || storefront.value.slug
    const res = await apiFetch<OnlineOrder>(`/api/public/store/${slug}/order`, {
      method: 'POST',
      body: {
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        total_amount: payload.total_amount,
        notes: payload.notes
      }
    })
    
    if (res.success) {
      return { success: true, data: res.data }
    }
    return { success: false, error: res.error }
  }

  /**
   * Track anonymous storefront analytics events
   */
  async function trackStorefrontEvent(slugStr: string, eventType: 'page_view' | 'whatsapp_click') {
    await apiFetch(`/api/public/store/${slugStr}/track`, {
      method: 'POST',
      body: { event_type: eventType }
    })
  }

  /**
   * Generate formatted WhatsApp order message URL
   */
  function generateWhatsAppOrderLink(params: {
    storeName: string
    cart: PublicCartItem[]
    totalAmount: number
    customerName: string
    customerPhone: string
    customerNotes?: string
    merchantPhone?: string
  }): string {
    const { storeName, cart: cartItems, totalAmount, customerName, customerPhone, customerNotes, merchantPhone } = params

    let itemsStr = ''
    cartItems.forEach((item, idx) => {
      itemsStr += `${idx + 1}. *${item.product.name}* (${item.quantity} ${item.product.unit}) x ${formatRupiah(item.product.sell_price)}\n`
    })

    const rawMessage = `*PESANAN WEB OFFICIAL - ${storeName.toUpperCase()}*\n
Halo Kak! Saya ingin memesan produk dari katalog online Anda:

*Daftar Belanja:*
${itemsStr}
*Total Pembayaran:* *${formatRupiah(totalAmount)}*

*Detail Penerima:*
• Nama: ${customerName}
• Telepon: ${customerPhone}
• Catatan / Alamat: ${customerNotes || '-'}

Mohon konfirmasi pesanan dan instruksi pengiriman. Terima kasih!`

    const encoded = encodeURIComponent(rawMessage)
    const phone = merchantPhone || '6285123456789'
    return `https://wa.me/${phone}?text=${encoded}`
  }

  function toggleProductLink(productId: string) {
    if (!storefrontProductsMap.value[productId]) {
      storefrontProductsMap.value[productId] = { is_linked: true, is_featured: false, custom_description: '' }
    } else {
      storefrontProductsMap.value[productId].is_linked = !storefrontProductsMap.value[productId].is_linked
    }
  }

  function toggleFeatured(productId: string) {
    if (storefrontProductsMap.value[productId]) {
      storefrontProductsMap.value[productId].is_featured = !storefrontProductsMap.value[productId].is_featured
    }
  }

  return {
    storefront,
    storefrontProductsMap,
    slugStatus,
    saving,
    loading,
    fetchStorefrontSettings,
    saveSettings,
    checkSlugAvailability,
    fetchPublicStorefront,
    createOnlineOrder,
    trackStorefrontEvent,
    generateWhatsAppOrderLink,
    toggleProductLink,
    toggleFeatured
  }
}

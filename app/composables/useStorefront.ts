import type { Storefront, StorefrontProduct, Category, Product } from '~/types'

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export interface StorefrontProductLinkState {
  is_linked: boolean
  is_featured: boolean
  custom_description: string
}

export function useStorefront() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

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
  async function fetchStorefrontSettings(productsingsingsings: Product[] = []) {
    if (!user.value) return null
    loading.value = true

    try {
      const { data: sfData, error: sfError } = await (supabase
        .from('storefronts') as any)
        .select('*')
        .eq('merchant_id', user.value.id)
        .maybeSingle()

      if (sfError) throw sfError

      let activeSf = sfData
      if (!activeSf) {
        // Create initial default storefront
        const namePart = user.value.email?.split('@')[0] || 'toko-saya'
        const initialSf = {
          merchant_id: user.value.id,
          slug: `${namePart.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.floor(100 + Math.random() * 900)}`,
          display_name: 'Toko Baru Saya',
          description: 'Selamat datang di toko online resmi kami!',
          theme_color: 'emerald',
          banner_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
          is_published: false
        }

        const { data: newSf, error: createError } = await (supabase
          .from('storefronts') as any)
          .insert(initialSf)
          .select()
          .single()

        if (createError) throw createError
        activeSf = newSf
      }

      storefront.value = activeSf

      // Fetch linked storefront products
      const { data: sfpData, error: sfpError } = await (supabase
        .from('storefront_products') as any)
        .select('*')
        .eq('storefront_id', (activeSf as any).id)

      if (sfpError) throw sfpError

      const map: Record<string, StorefrontProductLinkState> = {}
      productsingsingsings.forEach(p => {
        const found = ((sfpData as any) || []).find((link: any) => link.product_id === p.id)
        map[p.id] = {
          is_linked: !!found,
          is_featured: found ? !!found.is_featured : false,
          custom_description: found ? found.custom_description || '' : ''
        }
      })
      storefrontProductsMap.value = map

      return activeSf as Storefront
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat pengaturan toko',
        description: err.message,
        color: 'error'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Save merchant storefront configuration and sync product exposure links
   */
  async function saveSettings(): Promise<boolean> {
    if (!user.value || !storefront.value.id) return false
    saving.value = true

    try {
      const cleanSlug = (storefront.value.slug || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '')
      if (!cleanSlug) {
        throw new Error('Slug toko tidak boleh kosong dan hanya boleh berisi huruf, angka, strip (-), dan garis bawah (_).')
      }
      storefront.value.slug = cleanSlug

      // 1. Update storefront parameters
      const { error: sfError } = await (supabase
        .from('storefronts') as any)
        .update({
          slug: storefront.value.slug,
          display_name: storefront.value.display_name,
          description: storefront.value.description,
          banner_url: storefront.value.banner_url,
          theme_color: storefront.value.theme_color,
          is_published: storefront.value.is_published
        })
        .eq('id', storefront.value.id)

      if (sfError) throw sfError

      // 2. Synchronize product link exposure in storefront_products
      const { error: deleteError } = await (supabase
        .from('storefront_products') as any)
        .delete()
        .eq('storefront_id', storefront.value.id)

      if (deleteError) throw deleteError

      const toInsert: any[] = []
      Object.keys(storefrontProductsMap.value).forEach(pId => {
        const item = storefrontProductsMap.value[pId]
        if (item && item.is_linked) {
          toInsert.push({
            storefront_id: storefront.value.id,
            product_id: pId,
            is_featured: item.is_featured,
            custom_description: item.custom_description || null
          })
        }
      })

      if (toInsert.length > 0) {
        const { error: insertError } = await (supabase
          .from('storefront_products') as any)
          .insert(toInsert)

        if (insertError) throw insertError
      }

      toast.add({
        title: 'Pengaturan Etalase Tersimpan',
        description: 'Perubahan pada toko online Anda berhasil diperbarui.',
        color: 'success'
      })

      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal menyimpan pengaturan toko',
        description: err.message,
        color: 'error'
      })
      return false
    } finally {
      saving.value = false
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
    try {
      const { data, error } = await (supabase
        .from('storefronts') as any)
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle()

      if (error) throw error

      if (!data || data.id === storefront.value.id) {
        slugStatus.value = 'available'
      } else {
        slugStatus.value = 'taken'
      }
    } catch (e) {
      slugStatus.value = 'idle'
    }
  }

  /**
   * Fetch public storefront details by slug for customer digital catalog page
   */
  async function fetchPublicStorefront(slug: string) {
    loading.value = true
    try {
      const { data: sfData, error: sfError } = await (supabase
        .from('storefronts') as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle()

      if (sfError) throw sfError
      if (!sfData) return null

      // Fetch linked products
      const { data: sfpData, error: sfpError } = await (supabase
        .from('storefront_products') as any)
        .select('*, products(*)')
        .eq('storefront_id', (sfData as any).id)

      if (sfpError) throw sfpError

      const productsList = sfpData || []
      const categoryIds = productsList
        .map((sfp: any) => sfp.products?.category_id)
        .filter(Boolean)

      let categoriesList: Category[] = []
      if (categoryIds.length > 0) {
        const { data: catData } = await (supabase
          .from('categories') as any)
          .select('*')
          .in('id', categoryIds)
          .order('sort_order', { ascending: true })

        categoriesList = catData || []
      }

      return {
        storefront: sfData as Storefront,
        products: productsList as (StorefrontProduct & { products?: Product })[],
        categories: categoriesList
      }
    } catch (err: any) {
      return null
    } finally {
      loading.value = false
    }
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
    toggleProductLink,
    toggleFeatured
  }
}

import type { Product } from '~/types'

export interface FetchProductsOptions {
  activeOnly?: boolean
  orderBy?: 'created_at' | 'name'
  orderAscending?: boolean
}

export function useProducts() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const products = ref<Product[]>([])
  const loading = ref(false)

  /**
   * Fetch all merchant products with category metadata
   */
  async function fetchProducts(options?: FetchProductsOptions): Promise<Product[]> {
    if (!user.value) {
      products.value = []
      return []
    }

    loading.value = true
    try {
      let query = (supabase.from('products') as any)
        .select('*, categories(*)')

      if (options?.activeOnly) {
        query = query.eq('is_active', true)
      }

      const orderBy = options?.orderBy || 'created_at'
      const ascending = options?.orderAscending ?? false
      query = query.order(orderBy, { ascending })

      const { data, error } = await query
      if (error) throw error

      products.value = (data || []) as Product[]
      return products.value
    } catch (err: any) {
      toast.add({
        title: 'Gagal mengambil data produk',
        description: err.message || 'Terjadi kesalahan pada server database.',
        color: 'error'
      })
      products.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new product record
   */
  async function createProduct(payload: Partial<Product>): Promise<Product | null> {
    if (!user.value) return null

    try {
      const { data, error } = await (supabase.from('products') as any)
        .insert({
          ...payload,
          merchant_id: user.value.id
        })
        .select('*, categories(*)')
        .single()

      if (error) throw error

      toast.add({
        title: 'Produk berhasil ditambahkan',
        description: `Produk "${payload.name}" siap dijual.`,
        color: 'success'
      })

      return data as Product
    } catch (err: any) {
      toast.add({
        title: 'Gagal menambah produk',
        description: err.message || 'Periksa data input Anda.',
        color: 'error'
      })
      return null
    }
  }

  /**
   * Update an existing product
   */
  async function updateProduct(id: string, payload: Partial<Product>): Promise<boolean> {
    try {
      const { error } = await (supabase.from('products') as any)
        .update(payload)
        .eq('id', id)

      if (error) throw error

      toast.add({
        title: 'Produk berhasil diperbarui',
        color: 'success'
      })

      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal memperbarui produk',
        description: err.message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Soft delete or hard delete product
   */
  async function deleteProduct(id: string): Promise<boolean> {
    try {
      const { error } = await (supabase.from('products') as any)
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      products.value = products.value.filter(p => p.id !== id)
      toast.add({
        title: 'Produk berhasil dihapus',
        color: 'success'
      })

      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal menghapus produk',
        description: err.message,
        color: 'error'
      })
      return false
    }
  }

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  }
}

import type { Product } from '~/core/types'

export interface FetchProductsOptions {
  activeOnly?: boolean
  orderBy?: 'created_at' | 'name'
  orderAscending?: boolean
}

export function useProducts() {
  const { apiFetch } = useApiClient()
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
      const data = await apiFetch<Product[]>('/api/products', {
        query: {
          active_only: options?.activeOnly ? 'true' : 'false',
          order_by: options?.orderBy || 'created_at',
          order_asc: options?.orderAscending ? 'true' : 'false'
        }
      })

      products.value = data || []
      return products.value
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal mengambil data produk',
        description: (err as Error).message || 'Terjadi kesalahan pada server database.',
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
      const data = await apiFetch<Product>('/api/products', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: 'Produk berhasil ditambahkan',
        description: `Produk "${payload.name}" siap dijual.`,
        color: 'success'
      })

      return data
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal menambah produk',
        description: (err as Error).message || 'Periksa data input Anda.',
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
      await apiFetch<Product>(`/api/products/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: 'Produk berhasil diperbarui',
        color: 'success'
      })

      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memperbarui produk',
        description: (err as Error).message,
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
      await apiFetch(`/api/products/${id}`, {
        method: 'DELETE'
      })

      products.value = products.value.filter(p => p.id !== id)
      toast.add({
        title: 'Produk berhasil dihapus',
        color: 'success'
      })

      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal menghapus produk',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Toggle product active status
   */
  async function toggleProductActive(id: string, status: boolean): Promise<boolean> {
    try {
      await apiFetch(`/api/products/${id}/toggle`, {
        method: 'PATCH',
        body: { is_active: status }
      })

      const found = products.value.find(p => p.id === id)
      if (found) {
        found.is_active = status
      }

      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal mengubah status',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Fetch item sales frequency for ranking best sellers
   */
  async function fetchSalesFrequency(): Promise<Record<string, number>> {
    if (!user.value) return {}
    try {
      const data = await apiFetch<Record<string, number>>('/api/products/sales-frequency')
      return data || {}
    } catch (_err: unknown) {
      return {}
    }
  }

  return {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductActive,
    fetchSalesFrequency
  }
}

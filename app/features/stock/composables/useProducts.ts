import type { Product } from '~/core/types'

export interface FetchProductsOptions {
  activeOnly?: boolean
  orderBy?: 'created_at' | 'name'
  orderAscending?: boolean
}

export function useProducts() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const products = ref<Product[]>([])
  const loading = ref(false)

  /**
   * Fetch all merchant products with category metadata
   */
  async function fetchProducts(options?: FetchProductsOptions): Promise<{ success: boolean, data?: Product[], error?: string }> {
    if (!user.value) {
      products.value = []
      return { success: true, data: [] }
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
      return { success: true, data: products.value }
    } catch (err: unknown) {
      products.value = []
      return { success: false, error: (err as Error).message || 'Terjadi kesalahan pada server database.' }
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new product record
   */
  async function createProduct(payload: Partial<Product>): Promise<{ success: boolean, data?: Product, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    try {
      const data = await apiFetch<Product>('/api/products', {
        method: 'POST',
        body: payload
      })

      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Periksa data input Anda.' }
    }
  }

  /**
   * Update an existing product
   */
  async function updateProduct(id: string, payload: Partial<Product>): Promise<{ success: boolean, error?: string }> {
    try {
      await apiFetch<Product>(`/api/products/${id}`, {
        method: 'PATCH',
        body: payload
      })

      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Soft delete or hard delete product
   */
  async function deleteProduct(id: string): Promise<{ success: boolean, error?: string }> {
    try {
      await apiFetch(`/api/products/${id}`, {
        method: 'DELETE'
      })

      products.value = products.value.filter(p => p.id !== id)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Toggle product active status
   */
  async function toggleProductActive(id: string, status: boolean): Promise<{ success: boolean, error?: string }> {
    try {
      await apiFetch(`/api/products/${id}/toggle`, {
        method: 'PATCH',
        body: { is_active: status }
      })

      const found = products.value.find(p => p.id === id)
      if (found) {
        found.is_active = status
      }

      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
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

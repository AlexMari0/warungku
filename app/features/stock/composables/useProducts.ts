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
    const res = await apiFetch<Product[]>('/api/products', {
      query: {
        active_only: options?.activeOnly ? 'true' : 'false',
        order_by: options?.orderBy || 'created_at',
        order_asc: options?.orderAscending ? 'true' : 'false'
      }
    })

    loading.value = false
    if (res.success) {
      products.value = res.data || []
      return { success: true, data: products.value }
    } else {
      products.value = []
      return { success: false, error: res.error }
    }
  }

  /**
   * Create a new product record
   */
  async function createProduct(payload: Partial<Product>): Promise<{ success: boolean, data?: Product, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    return await apiFetch<Product>('/api/products', {
      method: 'POST',
      body: payload
    })
  }

  /**
   * Update an existing product
   */
  async function updateProduct(id: string, payload: Partial<Product>): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch<Product>(`/api/products/${id}`, {
      method: 'PATCH',
      body: payload
    })
    
    if (res.success) {
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  /**
   * Soft delete or hard delete product
   */
  async function deleteProduct(id: string): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch(`/api/products/${id}`, {
      method: 'DELETE'
    })

    if (res.success) {
      products.value = products.value.filter(p => p.id !== id)
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  /**
   * Toggle product active status
   */
  async function toggleProductActive(id: string, status: boolean): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch(`/api/products/${id}/toggle`, {
      method: 'PATCH',
      body: { is_active: status }
    })

    if (res.success) {
      const found = products.value.find(p => p.id === id)
      if (found) {
        found.is_active = status
      }
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  /**
   * Fetch item sales frequency for ranking best sellers
   */
  async function fetchSalesFrequency(): Promise<Record<string, number>> {
    if (!user.value) return {}
    const res = await apiFetch<Record<string, number>>('/api/products/sales-frequency')
    if (res.success) {
      return res.data || {}
    }
    return {}
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

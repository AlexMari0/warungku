import type { Category } from '~/core/types'

export function useCategories() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const categories = ref<Category[]>([])
  const loading = ref(false)

  /**
   * Fetch categories ordered by sort_order
   */
  async function fetchCategories(): Promise<{ success: boolean, data?: Category[], error?: string }> {
    if (!user.value) {
      categories.value = []
      return { success: true, data: [] }
    }

    loading.value = true
    const res = await apiFetch<Category[]>('/api/categories')
    loading.value = false

    if (res.success) {
      categories.value = res.data || []
      return { success: true, data: categories.value }
    } else {
      categories.value = []
      return { success: false, error: res.error }
    }
  }

  /**
   * Create a new category
   */
  async function createCategory(payload: Pick<Category, 'name' | 'color'>): Promise<{ success: boolean, data?: Category, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    const nextSortOrder = categories.value.length + 1
    return await apiFetch<Category>('/api/categories', {
      method: 'POST',
      body: {
        ...payload,
        sort_order: nextSortOrder
      }
    })
  }

  /**
   * Update an existing category
   */
  async function updateCategory(id: string, payload: Partial<Category>): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch<Category>(`/api/categories/${id}`, {
      method: 'PATCH',
      body: payload
    })

    if (res.success) {
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  /**
   * Delete a category
   */
  async function deleteCategory(id: string): Promise<{ success: boolean, error?: string }> {
    const res = await apiFetch(`/api/categories/${id}`, {
      method: 'DELETE'
    })

    if (res.success) {
      categories.value = categories.value.filter(c => c.id !== id)
      return { success: true }
    }
    // Custom error overriding default apiFetch message if needed, but apiFetch has it
    return { success: false, error: res.error || 'Kategori ini mungkin sedang digunakan oleh produk.' }
  }

  /**
   * Reorder category sort orders
   */
  async function reorderCategories(orderedIds: string[]): Promise<{ success: boolean, error?: string }> {
    const updates = orderedIds.map((id, index) =>
      apiFetch(`/api/categories/${id}`, {
        method: 'PATCH',
        body: { sort_order: index + 1 }
      })
    )

    const results = await Promise.all(updates)
    const failed = results.find(r => !r.success)
    if (failed) {
      return { success: false, error: failed.error }
    }
    
    await fetchCategories()
    return { success: true }
  }

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
  }
}

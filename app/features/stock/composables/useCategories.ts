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
    try {
      const data = await apiFetch<Category[]>('/api/categories')
      categories.value = data || []
      return { success: true, data: categories.value }
    } catch (err: unknown) {
      categories.value = []
      return { success: false, error: (err as Error).message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new category
   */
  async function createCategory(payload: Pick<Category, 'name' | 'color'>): Promise<{ success: boolean, data?: Category, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    try {
      const nextSortOrder = categories.value.length + 1
      const data = await apiFetch<Category>('/api/categories', {
        method: 'POST',
        body: {
          ...payload,
          sort_order: nextSortOrder
        }
      })

      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Update an existing category
   */
  async function updateCategory(id: string, payload: Partial<Category>): Promise<{ success: boolean, error?: string }> {
    try {
      await apiFetch<Category>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: payload
      })

      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  /**
   * Delete a category
   */
  async function deleteCategory(id: string): Promise<{ success: boolean, error?: string }> {
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })

      categories.value = categories.value.filter(c => c.id !== id)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Kategori ini mungkin sedang digunakan oleh produk.' }
    }
  }

  /**
   * Reorder category sort orders
   */
  async function reorderCategories(orderedIds: string[]): Promise<{ success: boolean, error?: string }> {
    try {
      const updates = orderedIds.map((id, index) =>
        apiFetch(`/api/categories/${id}`, {
          method: 'PATCH',
          body: { sort_order: index + 1 }
        })
      )

      await Promise.all(updates)
      await fetchCategories()
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
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

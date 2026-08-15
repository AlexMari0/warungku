import type { Category } from '~/core/types'

export function useCategories() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const categories = ref<Category[]>([])
  const loading = ref(false)

  /**
   * Fetch categories ordered by sort_order
   */
  async function fetchCategories(): Promise<Category[]> {
    if (!user.value) {
      categories.value = []
      return []
    }

    loading.value = true
    try {
      const data = await apiFetch<Category[]>('/api/categories')
      categories.value = data || []
      return categories.value
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat kategori',
        description: (err as Error).message,
        color: 'error'
      })
      categories.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new category
   */
  async function createCategory(payload: Pick<Category, 'name' | 'color'>): Promise<Category | null> {
    if (!user.value) return null

    try {
      const nextSortOrder = categories.value.length + 1
      const data = await apiFetch<Category>('/api/categories', {
        method: 'POST',
        body: {
          ...payload,
          sort_order: nextSortOrder
        }
      })

      toast.add({
        title: 'Kategori berhasil ditambahkan',
        description: `Kategori "${payload.name}" siap digunakan.`,
        color: 'success'
      })

      return data
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal membuat kategori',
        description: (err as Error).message,
        color: 'error'
      })
      return null
    }
  }

  /**
   * Update an existing category
   */
  async function updateCategory(id: string, payload: Partial<Category>): Promise<boolean> {
    try {
      await apiFetch<Category>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: payload
      })

      toast.add({
        title: 'Kategori berhasil diperbarui',
        color: 'success'
      })

      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memperbarui kategori',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Delete a category
   */
  async function deleteCategory(id: string): Promise<boolean> {
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: 'DELETE'
      })

      categories.value = categories.value.filter(c => c.id !== id)
      toast.add({
        title: 'Kategori dihapus',
        color: 'success'
      })

      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal menghapus kategori',
        description: (err as Error).message || 'Kategori ini mungkin sedang digunakan oleh produk.',
        color: 'error'
      })
      return false
    }
  }

  /**
   * Reorder category sort orders
   */
  async function reorderCategories(orderedIds: string[]): Promise<boolean> {
    try {
      const updates = orderedIds.map((id, index) =>
        apiFetch(`/api/categories/${id}`, {
          method: 'PATCH',
          body: { sort_order: index + 1 }
        })
      )

      await Promise.all(updates)
      await fetchCategories()
      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal mengurutkan kategori',
        description: (err as Error).message,
        color: 'error'
      })
      return false
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

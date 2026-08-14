import type { Category } from '~/types'

export function useCategories() {
  const supabase = useSupabaseClient()
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
      const { data, error } = await (supabase.from('categories') as any)
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      categories.value = (data || []) as Category[]
      return categories.value
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat kategori',
        description: err.message,
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
      const { data, error } = await (supabase.from('categories') as any)
        .insert({
          ...payload,
          merchant_id: user.value.id,
          sort_order: nextSortOrder
        })
        .select()
        .single()

      if (error) throw error

      toast.add({
        title: 'Kategori berhasil ditambahkan',
        description: `Kategori "${payload.name}" siap digunakan.`,
        color: 'success'
      })

      return data as Category
    } catch (err: any) {
      toast.add({
        title: 'Gagal membuat kategori',
        description: err.message,
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
      const { error } = await (supabase.from('categories') as any)
        .update(payload)
        .eq('id', id)

      if (error) throw error

      toast.add({
        title: 'Kategori berhasil diperbarui',
        color: 'success'
      })

      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal memperbarui kategori',
        description: err.message,
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
      const { error } = await (supabase.from('categories') as any)
        .delete()
        .eq('id', id)

      if (error) throw error

      categories.value = categories.value.filter(c => c.id !== id)
      toast.add({
        title: 'Kategori dihapus',
        color: 'success'
      })

      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal menghapus kategori',
        description: err.message || 'Kategori ini mungkin sedang digunakan oleh produk.',
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
        (supabase.from('categories') as any)
          .update({ sort_order: index + 1 })
          .eq('id', id)
      )

      await Promise.all(updates)
      await fetchCategories()
      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal mengurutkan kategori',
        description: err.message,
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

import type { Customer } from '~/types'

export function useCustomers() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const customers = ref<Customer[]>([])
  const loading = ref(false)

  /**
   * Fetch all customers for the authenticated merchant
   */
  async function fetchCustomers(): Promise<Customer[]> {
    if (!user.value) {
      customers.value = []
      return []
    }

    loading.value = true
    try {
      const data = await apiFetch<Customer[]>('/api/customers')
      customers.value = data || []
      return customers.value
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat daftar pelanggan',
        description: (err as Error).message,
        color: 'error'
      })
      customers.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new customer record
   */
  async function createCustomer(payload: { name: string; phone?: string; email?: string }): Promise<Customer | null> {
    if (!user.value) return null

    try {
      const data = await apiFetch<Customer>('/api/customers', {
        method: 'POST',
        body: payload
      })

      toast.add({
        title: 'Pelanggan ditambahkan',
        description: `Pelanggan "${payload.name}" berhasil terdaftar.`,
        color: 'success'
      })

      customers.value.unshift(data)
      return data
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal menambah pelanggan',
        description: (err as Error).message,
        color: 'error'
      })
      return null
    }
  }

  return {
    customers,
    loading,
    fetchCustomers,
    createCustomer
  }
}

import type { Customer } from '~/core/types'

export function useCustomers() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const customers = ref<Customer[]>([])
  const loading = ref(false)

  /**
   * Fetch all customers for the authenticated merchant
   */
  async function fetchCustomers(): Promise<{ success: boolean, data?: Customer[], error?: string }> {
    if (!user.value) {
      customers.value = []
      return { success: true, data: [] }
    }

    loading.value = true
    try {
      const data = await apiFetch<Customer[]>('/api/customers')
      customers.value = data || []
      return { success: true, data: customers.value }
    } catch (err: unknown) {
      customers.value = []
      return { success: false, error: (err as Error).message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new customer record
   */
  async function createCustomer(payload: { name: string; phone?: string; email?: string }): Promise<{ success: boolean, data?: Customer, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    try {
      const data = await apiFetch<Customer>('/api/customers', {
        method: 'POST',
        body: payload
      })

      customers.value.unshift(data)
      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  }

  return {
    customers,
    loading,
    fetchCustomers,
    createCustomer
  }
}

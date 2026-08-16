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
    const res = await apiFetch<Customer[]>('/api/customers')
    loading.value = false

    if (res.success) {
      customers.value = res.data || []
      return { success: true, data: customers.value }
    } else {
      customers.value = []
      return { success: false, error: res.error }
    }
  }

  /**
   * Create a new customer record
   */
  async function createCustomer(payload: { name: string; phone?: string; email?: string }): Promise<{ success: boolean, data?: Customer, error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    const res = await apiFetch<Customer>('/api/customers', {
      method: 'POST',
      body: payload
    })

    if (res.success) {
      if (res.data) customers.value.unshift(res.data)
      return { success: true, data: res.data }
    }
    return { success: false, error: res.error }
  }

  return {
    customers,
    loading,
    fetchCustomers,
    createCustomer
  }
}

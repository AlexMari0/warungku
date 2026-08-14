import type { Customer } from '~/types'

export function useCustomers() {
  const supabase = useSupabaseClient()
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
      const { data, error } = await (supabase.from('customers') as any)
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      customers.value = (data || []) as Customer[]
      return customers.value
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat daftar pelanggan',
        description: err.message,
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
      const { data, error } = await (supabase.from('customers') as any)
        .insert({
          ...payload,
          merchant_id: user.value.id
        })
        .select()
        .single()

      if (error) throw error

      toast.add({
        title: 'Pelanggan ditambahkan',
        description: `Pelanggan "${payload.name}" berhasil terdaftar.`,
        color: 'success'
      })

      const newCustomer = data as Customer
      customers.value.unshift(newCustomer)
      return newCustomer
    } catch (err: any) {
      toast.add({
        title: 'Gagal menambah pelanggan',
        description: err.message,
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

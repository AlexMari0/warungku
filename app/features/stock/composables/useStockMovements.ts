import { defineStore, storeToRefs } from 'pinia'
import type { StockMovement } from '~/core/types'

export interface StockMovementStats {
  itemsIn: number
  itemsOut: number
  totalLogs: number
}

export const STOCK_MOVEMENT_TYPE_META = {
  purchase: { label: 'Pembelian', icon: 'i-lucide-arrow-down-left', color: 'success' },
  sale: { label: 'Penjualan', icon: 'i-lucide-arrow-up-right', color: 'error' },
  adjustment: { label: 'Penyesuaian', icon: 'i-lucide-sliders', color: 'warning' },
  return: { label: 'Retur', icon: 'i-lucide-rotate-ccw', color: 'info' },
  waste: { label: 'Terbuang/Rusak', icon: 'i-lucide-trash-2', color: 'neutral' }
} as const

export const useStockMovementsStore = defineStore('stock-movements', () => {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()

  const movements = ref<StockMovement[]>([])
  const loading = ref(false)
  const filterType = ref<string>('all')
  const searchProduct = ref<string>('')

  // Date range filters
  const startDate = ref<string>('')
  const endDate = ref<string>('')

  // Pagination state
  const currentPage = ref(1)
  const itemsPerPage = ref(10)

  // Infinite Scroll / Server-Side Filtering Variables
  const totalLiveCount = ref(0)
  const hasMore = ref(true)
  const serverLoading = ref(false)

  const isInfiniteScrollActive = computed(() => {
    return totalLiveCount.value > 10000
  })

  async function fetchMovements(reset = false): Promise<{ success: boolean, data?: StockMovement[], error?: string }> {
    if (!user.value) return { success: false, error: 'User not authenticated' }

    if (reset) {
      currentPage.value = 1
      movements.value = []
      hasMore.value = true
    }

    loading.value = movements.value.length === 0
    serverLoading.value = movements.value.length > 0

    const res = await apiFetch<StockMovement[]>('/api/stock-movements', {
      query: {
        type: filterType.value && filterType.value !== 'all' ? filterType.value : undefined,
        limit: 100
      }
    })

    loading.value = false
    serverLoading.value = false

    if (res.success) {
      movements.value = res.data || []
      totalLiveCount.value = movements.value.length
      return { success: true, data: movements.value }
    } else {
      return { success: false, error: res.error }
    }
  }

  // Stats metrics for stock movements
  const stats = computed<StockMovementStats>(() => {
    let itemsIn = 0
    let itemsOut = 0
    const totalLogs = isInfiniteScrollActive.value ? totalLiveCount.value : movements.value.length

    movements.value.forEach((m) => {
      if (m.quantity > 0) itemsIn += m.quantity
      else itemsOut += Math.abs(m.quantity)
    })

    return {
      itemsIn,
      itemsOut,
      totalLogs
    }
  })

  // Filtered movements list
  const filteredMovements = computed(() => {
    if (isInfiniteScrollActive.value) {
      return movements.value
    }
    return movements.value.filter((m) => {
      const prodName = m.products?.name || ''
      const prodSku = m.products?.sku || ''
      const matchSearch = prodName.toLowerCase().includes(searchProduct.value.toLowerCase())
        || prodSku.toLowerCase().includes(searchProduct.value.toLowerCase())

      const matchType = !filterType.value || filterType.value === 'all' || m.type === filterType.value

      let matchDate = true
      if (startDate.value) {
        const start = new Date(startDate.value)
        start.setHours(0, 0, 0, 0)
        const itemDate = new Date(m.created_at)
        matchDate = matchDate && (itemDate >= start)
      }
      if (endDate.value) {
        const end = new Date(endDate.value)
        end.setHours(23, 59, 59, 999)
        const itemDate = new Date(m.created_at)
        matchDate = matchDate && (itemDate <= end)
      }

      return matchSearch && matchType && matchDate
    })
  })

  const totalItems = computed(() => isInfiniteScrollActive.value ? totalLiveCount.value : filteredMovements.value.length)
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1)
  const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
  const endIndex = computed(() => startIndex.value + itemsPerPage.value)

  const paginatedMovements = computed(() => {
    if (isInfiniteScrollActive.value) {
      return movements.value
    }
    const start = startIndex.value
    const end = start + itemsPerPage.value
    return filteredMovements.value.slice(start, end)
  })

  // Reset to page 1 on active filters change
  watch([searchProduct, filterType, startDate, endDate], () => {
    if (isInfiniteScrollActive.value) {
      fetchMovements(true).then((res) => {
        // If it was infinite scroll, the component should ideally handle errors instead of the composable.
        // We'll leave the error handling up to the components that call fetchMovements manually if possible,
        // but for watched data we might not be able to easily pipe this without a callback.
        // For now, this is internal refetching logic.
      })
    } else {
      currentPage.value = 1
    }
  })

  async function loadMore(): Promise<{ success: boolean, error?: string }> {
    if (serverLoading.value || !hasMore.value) return { success: true }
    currentPage.value++
    return await fetchMovements(false)
  }

  function clearDates() {
    startDate.value = ''
    endDate.value = ''
  }

  return {
    movements,
    loading,
    filterType,
    searchProduct,
    startDate,
    endDate,
    currentPage,
    itemsPerPage,
    totalLiveCount,
    hasMore,
    serverLoading,
    typeMeta: STOCK_MOVEMENT_TYPE_META,
    isInfiniteScrollActive,
    stats,
    filteredMovements,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedMovements,
    fetchMovements,
    loadMore,
    clearDates
  }
})

export function useStockMovements() {
  const store = useStockMovementsStore()
  const {
    movements,
    loading,
    filterType,
    searchProduct,
    startDate,
    endDate,
    currentPage,
    itemsPerPage,
    totalLiveCount,
    hasMore,
    serverLoading,
    isInfiniteScrollActive,
    stats,
    filteredMovements,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedMovements
  } = storeToRefs(store)

  return {
    movements,
    loading,
    filterType,
    searchProduct,
    startDate,
    endDate,
    currentPage,
    itemsPerPage,
    totalLiveCount,
    hasMore,
    serverLoading,
    typeMeta: store.typeMeta,
    isInfiniteScrollActive,
    stats,
    filteredMovements,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedMovements,
    fetchMovements: store.fetchMovements,
    loadMore: store.loadMore,
    clearDates: store.clearDates
  }
}

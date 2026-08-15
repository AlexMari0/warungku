import type { StockMovement } from '~/types'

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

export function useStockMovements() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()
  const toast = useToast()

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

  async function fetchMovements(reset = false) {
    if (!user.value) return

    if (reset) {
      currentPage.value = 1
      movements.value = []
      hasMore.value = true
    }

    loading.value = movements.value.length === 0
    serverLoading.value = movements.value.length > 0

    try {
      const data = await apiFetch<StockMovement[]>('/api/stock-movements', {
        query: {
          type: filterType.value && filterType.value !== 'all' ? filterType.value : undefined,
          limit: 100
        }
      })

      movements.value = data || []
      totalLiveCount.value = movements.value.length
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat mutasi',
        description: (err as Error).message,
        color: 'error'
      })
    } finally {
      loading.value = false
      serverLoading.value = false
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
      fetchMovements(true)
    } else {
      currentPage.value = 1
    }
  })

  function loadMore() {
    if (serverLoading.value || !hasMore.value) return
    currentPage.value++
    fetchMovements(false)
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
}

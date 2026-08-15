import type { DailySummary, HourlyTraffic, ProductSalesSummary, PaymentMethodSummary, SummaryComparison, TopProductItem } from '~/types'

export function useReports() {
  const { apiFetch } = useApiClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const summary = ref<Partial<DailySummary> & { avg_transaction?: number } | null>(null)
  const summaryComparison = ref<SummaryComparison>({
    total_revenue: 0,
    gross_profit: 0,
    total_orders: 0,
    avg_transaction: 0,
    storefront_page_views: 0,
    storefront_whatsapp_clicks: 0,
    storefront_conversions: 0
  })
  const hourlyTraffic = ref<HourlyTraffic[]>([])
  const productSales = ref<ProductSalesSummary[]>([])
  const paymentSummaries = ref<PaymentMethodSummary[]>([])
  const loading = ref(false)

  /**
   * Helper to calculate start, end, and prior comparison date strings (YYYY-MM-DD)
   */
  function calculateDateRange(
    period: 'today' | 'week' | 'month' | 'custom',
    customStart?: string,
    customEnd?: string
  ) {
    const todayStr = new Date().toISOString().split('T')[0] || ''
    let startDate = ''
    let endDate = ''

    if (period === 'today') {
      startDate = todayStr
      endDate = todayStr
    } else if (period === 'week') {
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const startOfWeek = new Date(now.setDate(diff))
      startDate = startOfWeek.toISOString().split('T')[0] || ''
      endDate = todayStr
    } else if (period === 'month') {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      startDate = startOfMonth.toISOString().split('T')[0] || ''
      endDate = todayStr
    } else {
      startDate = customStart || todayStr
      endDate = customEnd || todayStr
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const durationMs = end.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - durationMs - 1000 * 60 * 60 * 24)
    const prevEnd = new Date(start.getTime() - 1000 * 60 * 60 * 24)

    const prevStartDate = prevStart.toISOString().split('T')[0] || ''
    const prevEndDate = prevEnd.toISOString().split('T')[0] || ''

    return { startDate, endDate, prevStartDate, prevEndDate }
  }

  /**
   * Fetch main dashboard report aggregations & hourly traffic
   */
  async function fetchDashboardReports(
    period: 'today' | 'week' | 'month' | 'custom',
    customStart?: string,
    customEnd?: string
  ) {
    if (!user.value) return

    loading.value = true
    try {
      const data = await apiFetch<{
        summary: Partial<DailySummary> & { avg_transaction?: number }
        summary_comparison: SummaryComparison
        hourly_traffic: HourlyTraffic[]
        product_sales: ProductSalesSummary[]
        payment_summaries: PaymentMethodSummary[]
      }>('/api/reports/dashboard', {
        query: {
          period,
          start_date: customStart,
          end_date: customEnd
        }
      })

      if (data) {
        summary.value = data.summary
        summaryComparison.value = data.summary_comparison || {
          total_revenue: 0,
          gross_profit: 0,
          total_orders: 0,
          avg_transaction: 0,
          storefront_page_views: 0,
          storefront_whatsapp_clicks: 0,
          storefront_conversions: 0
        }
        hourlyTraffic.value = data.hourly_traffic || []
        productSales.value = data.product_sales || []
        paymentSummaries.value = data.payment_summaries || []
      }
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat laporan',
        description: (err as Error).message,
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch product sales breakdown
   */
  async function fetchProductSales(periodStr: string): Promise<ProductSalesSummary[]> {
    if (!user.value) return []
    loading.value = true

    try {
      const data = await apiFetch<{
        product_sales: ProductSalesSummary[]
      }>('/api/reports/dashboard', {
        query: { period: periodStr }
      })
      productSales.value = data?.product_sales || []
      return productSales.value
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat data penjualan produk',
        description: (err as Error).message,
        color: 'error'
      })
      productSales.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch payment method summaries
   */
  async function fetchPaymentSummaries(periodStr: string): Promise<PaymentMethodSummary[]> {
    if (!user.value) return []
    loading.value = true

    try {
      const data = await apiFetch<{
        payment_summaries: PaymentMethodSummary[]
      }>('/api/reports/dashboard', {
        query: { period: periodStr }
      })
      paymentSummaries.value = data?.payment_summaries || []
      return paymentSummaries.value
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal memuat data pembayaran',
        description: (err as Error).message,
        color: 'error'
      })
      paymentSummaries.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Trigger offline/manual analytics aggregation RPC for a date
   */
  async function refreshAnalytics(dateStr?: string): Promise<boolean> {
    if (!user.value) return false
    const targetDate = dateStr || new Date().toISOString().split('T')[0]

    try {
      await apiFetch('/api/reports/refresh', {
        method: 'POST',
        body: { date: targetDate }
      })

      toast.add({
        title: 'Laporan Diperbarui',
        description: 'Data analitik berhasil disinkronkan.',
        color: 'success'
      })
      return true
    } catch (err: unknown) {
      toast.add({
        title: 'Gagal menyegarkan laporan',
        description: (err as Error).message,
        color: 'error'
      })
      return false
    }
  }

  /**
   * Fetch and aggregate top products for a date range
   */
  async function fetchTopProducts(startDate: string, endDate: string): Promise<TopProductItem[]> {
    if (!user.value) return []

    try {
      const data = await apiFetch<{
        product_sales?: ProductSalesSummary[]
      }>('/api/reports/dashboard', {
        query: { start_date: startDate, end_date: endDate }
      })

      const prodSalesData = data?.product_sales || []
      const prodMap: Record<string, TopProductItem> = {}

      for (const row of prodSalesData) {
        const pid = row.product_id
        if (!prodMap[pid]) {
          prodMap[pid] = {
            name: row.name || 'Unknown Product',
            sku: row.sku || '-',
            category: row.category || 'Umum',
            color: row.color || '#9ca3af',
            qty: 0,
            revenue: 0,
            profit: 0
          }
        }
        prodMap[pid].qty += (row.quantity_sold || 0)
        prodMap[pid].revenue += (Number(row.revenue) || 0)
        prodMap[pid].profit += (Number(row.gross_profit) || 0)
      }

      return Object.values(prodMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
    } catch (_err: unknown) {
      return []
    }
  }

  return {
    summary,
    summaryComparison,
    hourlyTraffic,
    productSales,
    paymentSummaries,
    loading,
    calculateDateRange,
    fetchDashboardReports,
    fetchProductSales,
    fetchPaymentSummaries,
    fetchTopProducts,
    refreshAnalytics
  }
}

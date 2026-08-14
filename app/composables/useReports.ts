import type { DailySummary, HourlyTraffic, ProductSalesSummary, PaymentMethodSummary, SummaryComparison, TopProductItem } from '~/types'

export function useReports() {
  const supabase = useSupabaseClient()
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
    const { startDate, endDate, prevStartDate, prevEndDate } = calculateDateRange(period, customStart, customEnd)

    try {
      // 1. Fetch daily summaries between prevStartDate and endDate
      const { data: summariesData, error: summariesErr } = await (supabase.from('daily_summaries') as any)
        .select('*')
        .gte('summary_date', prevStartDate)
        .lte('summary_date', endDate)

      if (summariesErr) throw summariesErr

      const currentList = (summariesData || []).filter((d: any) => d.summary_date >= startDate && d.summary_date <= endDate)
      const prevList = (summariesData || []).filter((d: any) => d.summary_date >= prevStartDate && d.summary_date <= prevEndDate)

      const aggregate = (list: any[]) => {
        const rev = list.reduce((acc, d) => acc + (Number(d.total_revenue) || 0), 0)
        const prof = list.reduce((acc, d) => acc + (Number(d.gross_profit) || 0), 0)
        const ords = list.reduce((acc, d) => acc + (Number(d.total_orders) || 0), 0)
        const items = list.reduce((acc, d) => acc + (Number(d.total_items_sold) || 0), 0)
        const views = list.reduce((acc, d) => acc + (Number(d.storefront_page_views) || 0), 0)
        const clicks = list.reduce((acc, d) => acc + (Number(d.storefront_whatsapp_clicks) || 0), 0)
        const convs = list.reduce((acc, d) => acc + (Number(d.storefront_conversions) || 0), 0)
        const avg = ords > 0 ? rev / ords : 0
        return {
          total_revenue: rev,
          gross_profit: prof,
          total_orders: ords,
          total_items_sold: items,
          storefront_page_views: views,
          storefront_whatsapp_clicks: clicks,
          storefront_conversions: convs,
          avg_transaction: avg
        }
      }

      const currentSum = aggregate(currentList)
      const prevSum = aggregate(prevList)

      summary.value = currentSum

      const pctChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0
        return Number((((curr - prev) / prev) * 100).toFixed(1))
      }

      summaryComparison.value = {
        total_revenue: pctChange(currentSum.total_revenue, prevSum.total_revenue),
        gross_profit: pctChange(currentSum.gross_profit, prevSum.gross_profit),
        total_orders: pctChange(currentSum.total_orders, prevSum.total_orders),
        avg_transaction: pctChange(currentSum.avg_transaction, prevSum.avg_transaction),
        storefront_page_views: pctChange(currentSum.storefront_page_views, prevSum.storefront_page_views),
        storefront_whatsapp_clicks: pctChange(currentSum.storefront_whatsapp_clicks, prevSum.storefront_whatsapp_clicks),
        storefront_conversions: pctChange(currentSum.storefront_conversions, prevSum.storefront_conversions)
      }

      // 2. Fetch hourly traffic
      const { data: trafficData, error: trafficErr } = await (supabase.from('hourly_traffic') as any)
        .select('*')
        .gte('summary_date', startDate)
        .lte('summary_date', endDate)

      if (trafficErr) throw trafficErr

      const hourlyMap: Record<number, { order_count: number; total_revenue: number }> = {}
      for (let h = 0; h < 24; h++) {
        hourlyMap[h] = { order_count: 0, total_revenue: 0 }
      }

      if (trafficData) {
        for (const row of trafficData) {
          const hour = Number(row.hour_of_day)
          if (hourlyMap[hour]) {
            hourlyMap[hour].order_count += Number(row.order_count) || 0
            hourlyMap[hour].total_revenue += Number(row.total_revenue) || 0
          }
        }
      }

      hourlyTraffic.value = Object.keys(hourlyMap).map(hStr => {
        const h = Number(hStr)
        return {
          id: `h-${h}`,
          merchant_id: user.value?.id || '',
          summary_date: startDate,
          hour_of_day: h,
          hour_bucket: h,
          order_count: hourlyMap[h]!.order_count,
          total_revenue: hourlyMap[h]!.total_revenue,
          revenue: hourlyMap[h]!.total_revenue
        } as any
      })
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat laporan',
        description: err.message,
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
      const { data, error } = await (supabase.from('product_sales_summary') as any)
        .select('*, products(name, image_url, sku, categories(name, color))')
        .eq('period_type', periodStr)
        .order('quantity_sold', { ascending: false })
        .limit(50)

      if (error) throw error
      productSales.value = (data || []) as ProductSalesSummary[]
      return productSales.value
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat data penjualan produk',
        description: err.message,
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
      const { data, error } = await (supabase.from('payment_method_summary') as any)
        .select('*')
        .eq('period_type', periodStr)
        .order('total_amount', { ascending: false })

      if (error) throw error
      paymentSummaries.value = (data || []) as PaymentMethodSummary[]
      return paymentSummaries.value
    } catch (err: any) {
      toast.add({
        title: 'Gagal memuat data pembayaran',
        description: err.message,
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
      const { error } = await (supabase as any).rpc('refresh_merchant_analytics', {
        p_merchant_id: user.value.id,
        p_date: targetDate
      })

      if (error) throw error
      toast.add({
        title: 'Laporan Diperbarui',
        description: 'Data analitik berhasil disinkronkan.',
        color: 'success'
      })
      return true
    } catch (err: any) {
      toast.add({
        title: 'Gagal menyegarkan laporan',
        description: err.message,
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
      const { data: prodSalesData, error } = await (supabase.from('product_sales_summary') as any)
        .select('*, products(name, image_url, sku, categories(name, color))')
        .gte('summary_date', startDate)
        .lte('summary_date', endDate)

      if (error) throw error

      const prodMap: Record<string, TopProductItem> = {}
      if (prodSalesData) {
        for (const row of prodSalesData) {
          const pid = row.product_id
          if (!prodMap[pid]) {
            prodMap[pid] = {
              name: row.products?.name || 'Unknown Product',
              sku: row.products?.sku || '-',
              category: row.products?.categories?.name || 'Umum',
              color: row.products?.categories?.color || '#9ca3af',
              qty: 0,
              revenue: 0,
              profit: 0
            }
          }
          prodMap[pid].qty += (row.quantity_sold || 0)
          prodMap[pid].revenue += (Number(row.revenue) || 0)
          prodMap[pid].profit += (Number(row.gross_profit) || 0)
        }
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

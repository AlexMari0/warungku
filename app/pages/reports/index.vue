<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const { isDemo } = useDemoMode()

const loading = ref(false)
const summary = ref<any>(null)
const summaryComparison = ref<any>(null)
const hourlyTraffic = ref<any[]>([])
const topProducts = ref<any[]>([])

const selectedPeriod = ref<'today' | 'week' | 'month' | 'custom'>('today')
const customStartDate = ref(new Date().toISOString().split('T')[0] || '')
const customEndDate = ref(new Date().toISOString().split('T')[0] || '')
const chartType = ref<'bar' | 'line'>('bar')

// Fetch active reporting data
async function fetchDashboardData() {
  loading.value = true
  
  let startDate = ''
  let endDate = ''
  
  const todayStr = new Date().toISOString().split('T')[0] || ''
  if (selectedPeriod.value === 'today') {
    startDate = todayStr
    endDate = todayStr
  } else if (selectedPeriod.value === 'week') {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const startOfWeek = new Date(now.setDate(diff))
    startDate = startOfWeek.toISOString().split('T')[0] || ''
    endDate = todayStr
  } else if (selectedPeriod.value === 'month') {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    startDate = startOfMonth.toISOString().split('T')[0] || ''
    endDate = todayStr
  } else {
    startDate = customStartDate.value || ''
    endDate = customEndDate.value || ''
  }

  // Calculate previous period for comparison
  const start = new Date(startDate)
  const end = new Date(endDate)
  const durationMs = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - durationMs - (1000 * 60 * 60 * 24))
  const prevEnd = new Date(start.getTime() - (1000 * 60 * 60 * 24))
  
  const prevStartDate = prevStart.toISOString().split('T')[0] || ''
  const prevEndDate = prevEnd.toISOString().split('T')[0] || ''

  if (isDemo.value) {
    setTimeout(() => {
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

      summary.value = {
        total_revenue: days * 1250000,
        gross_profit: days * 450000,
        total_orders: days * 42,
        avg_transaction: 29761,
        total_items_sold: days * 125,
        storefront_page_views: days * 312,
        storefront_whatsapp_clicks: days * 86,
        storefront_conversions: days * 18
      }

      // Predefined baseline comparison for percentage indicators
      summaryComparison.value = {
        total_revenue: 12.4,
        gross_profit: 9.8,
        total_orders: 14.3,
        avg_transaction: -1.2,
        storefront_page_views: 8.5,
        storefront_whatsapp_clicks: 10.2,
        storefront_conversions: 5.6
      }

      // Generate dummy hourly traffic
      const dummyTraffic = []
      for (let i = 10; i <= 22; i++) {
        const weight = 1 - Math.abs(15 - i) / 7
        dummyTraffic.push({
          hour_of_day: i,
          transaction_count: Math.max(1, Math.floor(weight * 12 * (days > 7 ? 4 : Math.sqrt(days)) + Math.random() * 2)),
          revenue: Math.max(15000, Math.floor(weight * 200000 * (days > 7 ? 4 : Math.sqrt(days)) + Math.random() * 20000))
        })
      }
      hourlyTraffic.value = dummyTraffic

      // Generate best selling products mock
      topProducts.value = [
        { name: 'Indomie Goreng Aceh', sku: 'IND-GOR-ACH', category: 'Makanan', color: '#10b981', qty: days * 18, revenue: days * 63000, profit: days * 18000 },
        { name: 'Kopi Susu Gula Aren', sku: 'KOPI-AREN-01', category: 'Minuman', color: '#0284c7', qty: days * 12, revenue: days * 144000, profit: days * 48000 },
        { name: 'Roti Bakar Cokelat', sku: 'ROT-BAK-COK', category: 'Makanan', color: '#10b981', qty: days * 8, revenue: days * 96000, profit: days * 32000 },
        { name: 'Teh Manis Dingin', sku: 'TEH-MANIS-01', category: 'Minuman', color: '#0284c7', qty: days * 7, revenue: days * 35000, profit: days * 14000 },
        { name: 'Rokok Sampoerna Mild', sku: 'ROK-SAM-MLD', category: 'Rokok & Tembakau', color: '#f43f5e', qty: days * 3, revenue: days * 90000, profit: days * 9000 }
      ]

      loading.value = false
    }, 300)
    return
  }

  if (!user.value) {
    loading.value = false
    return
  }

  try {
    // Fetch all summaries from prevStartDate to endDate
    const { data: summariesData, error: summariesErr } = await supabase
      .from('daily_summaries')
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

    // Fetch hourly traffic and aggregate
    const { data: trafficData, error: trafficErr } = await (supabase.from('hourly_traffic') as any)
      .select('*')
      .gte('traffic_date', startDate)
      .lte('traffic_date', endDate)

    if (trafficErr) throw trafficErr

    const hourMap: Record<number, { hour_of_day: number, transaction_count: number, revenue: number }> = {}
    for (let h = 0; h < 24; h++) {
      hourMap[h] = { hour_of_day: h, transaction_count: 0, revenue: 0 }
    }

    if (trafficData) {
      for (const t of trafficData) {
        const mapEntry = hourMap[t.hour_of_day]
        if (mapEntry) {
          mapEntry.transaction_count += (t.transaction_count || 0)
          mapEntry.revenue += (Number(t.revenue) || 0)
        }
      }
    }

    hourlyTraffic.value = Object.values(hourMap).filter(t => t.hour_of_day >= 10 && t.hour_of_day <= 22)

    // Fetch product sales summaries and aggregate
    const { data: prodSalesData, error: prodSalesErr } = await (supabase.from('product_sales_summary') as any)
      .select('*, products(name, sku, unit, categories(name, color))')
      .eq('period_type', 'daily')
      .gte('period_start', startDate)
      .lte('period_start', endDate)

    if (prodSalesErr) throw prodSalesErr

    const prodMap: Record<string, any> = {}
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

    topProducts.value = Object.values(prodMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat data analitik',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function setPeriod(p: 'today' | 'week' | 'month' | 'custom') {
  selectedPeriod.value = p
  fetchDashboardData()
}

// Format helpers
function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('id-ID').format(num)
}

function formatHour(hour: number) {
  return `${hour.toString().padStart(2, '0')}:00`
}

// Computed max values for chart scaling
const maxTrafficRevenue = computed(() => {
  if (!hourlyTraffic.value.length) return 1
  return Math.max(...hourlyTraffic.value.map(t => t.revenue)) || 1
})

const conversionRate = computed(() => {
  const views = summary.value?.storefront_page_views || 0
  const conversions = summary.value?.storefront_conversions || 0
  if (views === 0) return 0
  return Number(((conversions / views) * 100).toFixed(1))
})

// Line Chart SVG computations
const linePoints = computed(() => {
  if (!hourlyTraffic.value.length) return ''
  const N = hourlyTraffic.value.length
  const max = maxTrafficRevenue.value || 1
  return hourlyTraffic.value.map((item, idx) => {
    const x = (idx / (N - 1)) * 100
    const y = 90 - (item.revenue / max) * 80 // pad top and bottom
    return `${x},${y}`
  }).join(' ')
})

const areaPoints = computed(() => {
  if (!hourlyTraffic.value.length) return ''
  const N = hourlyTraffic.value.length
  const max = maxTrafficRevenue.value || 1
  const points = hourlyTraffic.value.map((item, idx) => {
    const x = (idx / (N - 1)) * 100
    const y = 90 - (item.revenue / max) * 80
    return `${x},${y}`
  }).join(' ')
  return `0,100 ${points} 100,100`
})

// (Reverted premium table additions to keep the summary page clean. The advanced bento table and automated insights live on products.vue)

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full p-4 md:p-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-default/40 pb-6">
      <div>
        <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
          <UIcon
            name="i-lucide-pie-chart"
            class="size-8 text-primary"
          />
          Ringkasan Bisnis
        </h1>
        <p class="text-muted text-sm mt-1.5">
          Pantau performa penjualan, laba, dan tren transaksi warung Anda.
        </p>
      </div>

      <!-- Date Period Picker and Custom Selectors -->
      <div class="flex flex-col sm:items-end gap-3 shrink-0">
        <div class="flex rounded-xl bg-muted/40 p-0.5 border border-default shrink-0 text-xs font-bold self-start sm:self-auto">
          <button
            v-for="p in ['today', 'week', 'month', 'custom']"
            :key="p"
            type="button"
            class="px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] uppercase tracking-wider font-extrabold text-[10px] cursor-pointer"
            :class="[selectedPeriod === p ? 'bg-elevated text-primary shadow-xs' : 'text-muted hover:text-default']"
            @click="setPeriod(p as any)"
          >
            {{ p === 'today' ? 'Hari Ini' : p === 'week' ? 'Minggu Ini' : p === 'month' ? 'Bulan Ini' : 'Kustom' }}
          </button>
        </div>

        <!-- Custom Date range sliders panel -->
        <div 
          v-if="selectedPeriod === 'custom'"
          class="flex items-center gap-3 bg-muted/20 border border-default p-3 rounded-2xl shrink-0 self-start sm:self-auto"
        >
          <div class="flex flex-col gap-1">
            <span class="text-[9px] font-extrabold text-muted uppercase">Mulai tanggal</span>
            <UInput
              v-model="customStartDate"
              type="date"
              size="sm"
              class="w-36 font-mono font-bold"
              @change="fetchDashboardData"
            />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-[9px] font-extrabold text-muted uppercase">Sampai tanggal</span>
            <UInput
              v-model="customEndDate"
              type="date"
              size="sm"
              class="w-36 font-mono font-bold"
              @change="fetchDashboardData"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loader -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-32"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin text-primary size-12"
      />
    </div>

    <div
      v-else
      class="flex flex-col gap-8"
    >
      <!-- KPI Cards with Harmonious Accent Colors -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Revenue (Emerald Accent) -->
        <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-emerald-500 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                Total Pendapatan
              </p>
              <div class="text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg shrink-0">
                <UIcon name="i-lucide-trending-up" class="size-4 block" />
              </div>
            </div>
            <h3 class="text-2xl font-black text-default tracking-tight truncate mt-3 font-mono">
              {{ formatRupiah(summary?.total_revenue || 0) }}
            </h3>
          </div>
          
          <!-- Context Percentage change indicator -->
          <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
            <span class="text-muted font-medium">vs periode lalu</span>
            <div 
              class="flex items-center gap-1 font-mono font-bold"
              :class="[summaryComparison?.total_revenue >= 0 ? 'text-emerald-500' : 'text-rose-500']"
            >
              <UIcon
                :name="summaryComparison?.total_revenue >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                class="size-3.5"
              />
              <span>{{ summaryComparison?.total_revenue >= 0 ? '+' : '' }}{{ summaryComparison?.total_revenue }}%</span>
            </div>
          </div>
        </div>

        <!-- Gross Profit (Blue Accent) -->
        <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-blue-500 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                Laba Kotor
              </p>
              <div class="text-blue-500 bg-blue-500/10 p-1.5 rounded-lg shrink-0">
                <UIcon name="i-lucide-badge-dollar-sign" class="size-4 block" />
              </div>
            </div>
            <h3 class="text-2xl font-black text-default tracking-tight truncate mt-3 font-mono">
              {{ formatRupiah(summary?.gross_profit || 0) }}
            </h3>
          </div>

          <!-- Context Percentage change indicator -->
          <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
            <span class="text-muted font-medium">vs periode lalu</span>
            <div 
              class="flex items-center gap-1 font-mono font-bold"
              :class="[summaryComparison?.gross_profit >= 0 ? 'text-emerald-500' : 'text-rose-500']"
            >
              <UIcon
                :name="summaryComparison?.gross_profit >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                class="size-3.5"
              />
              <span>{{ summaryComparison?.gross_profit >= 0 ? '+' : '' }}{{ summaryComparison?.gross_profit }}%</span>
            </div>
          </div>
        </div>

        <!-- Orders (Rose Accent) -->
        <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-rose-500 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                Total Transaksi
              </p>
              <div class="text-rose-500 bg-rose-500/10 p-1.5 rounded-lg shrink-0">
                <UIcon name="i-lucide-receipt" class="size-4 block" />
              </div>
            </div>
            <h3 class="text-2xl font-black text-default tracking-tight mt-3 font-mono">
              {{ formatNumber(summary?.total_orders || 0) }}
            </h3>
          </div>

          <!-- Context Percentage change indicator -->
          <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
            <span class="text-muted font-medium">vs periode lalu</span>
            <div 
              class="flex items-center gap-1 font-mono font-bold"
              :class="[summaryComparison?.total_orders >= 0 ? 'text-emerald-500' : 'text-rose-500']"
            >
              <UIcon
                :name="summaryComparison?.total_orders >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                class="size-3.5"
              />
              <span>{{ summaryComparison?.total_orders >= 0 ? '+' : '' }}{{ summaryComparison?.total_orders }}%</span>
            </div>
          </div>
        </div>

        <!-- Avg Transaction (Amber Accent) -->
        <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-amber-500 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                Rata-rata Transaksi
              </p>
              <div class="text-amber-500 bg-amber-500/10 p-1.5 rounded-lg shrink-0">
                <UIcon name="i-lucide-users" class="size-4 block" />
              </div>
            </div>
            <h3 class="text-2xl font-black text-default tracking-tight truncate mt-3 font-mono">
              {{ formatRupiah(summary?.avg_transaction || 0) }}
            </h3>
          </div>

          <!-- Context Percentage change indicator -->
          <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
            <span class="text-muted font-medium">vs periode lalu</span>
            <div 
              class="flex items-center gap-1 font-mono font-bold"
              :class="[summaryComparison?.avg_transaction >= 0 ? 'text-emerald-500' : 'text-rose-500']"
            >
              <UIcon
                :name="summaryComparison?.avg_transaction >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                class="size-3.5"
              />
              <span>{{ summaryComparison?.avg_transaction >= 0 ? '+' : '' }}{{ summaryComparison?.avg_transaction }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Storefront Analytics Cards -->
      <div class="pt-2">
        <h3 class="text-lg font-bold text-default mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-store" class="size-5 text-muted" />
          Performa Toko Online
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <!-- Page Views (Slate Accent) -->
          <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-slate-400 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                  Pengunjung Web
                </p>
                <div class="text-slate-500 bg-slate-500/10 p-1.5 rounded-lg shrink-0">
                  <UIcon name="i-lucide-mouse-pointer-click" class="size-4 block" />
                </div>
              </div>
              <h3 class="text-2xl font-black text-default tracking-tight mt-3 font-mono">
                {{ formatNumber(summary?.storefront_page_views || 0) }}
              </h3>
            </div>

            <!-- Context Percentage change indicator -->
            <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
              <span class="text-muted font-medium">vs periode lalu</span>
              <div 
                class="flex items-center gap-1 font-mono font-bold"
                :class="[summaryComparison?.storefront_page_views >= 0 ? 'text-emerald-500' : 'text-rose-500']"
              >
                <UIcon
                  :name="summaryComparison?.storefront_page_views >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                  class="size-3.5"
                />
                <span>{{ summaryComparison?.storefront_page_views >= 0 ? '+' : '' }}{{ summaryComparison?.storefront_page_views }}%</span>
              </div>
            </div>
          </div>
          
          <!-- WhatsApp Clicks (Emerald Accent) -->
          <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-emerald-400 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                  Klik WhatsApp
                </p>
                <div class="text-emerald-500 bg-emerald-500/10 p-1.5 rounded-lg shrink-0">
                  <UIcon name="i-lucide-message-circle" class="size-4 block" />
                </div>
              </div>
              <h3 class="text-2xl font-black text-default tracking-tight mt-3 font-mono">
                {{ formatNumber(summary?.storefront_whatsapp_clicks || 0) }}
              </h3>
            </div>

            <!-- Context Percentage change indicator -->
            <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
              <span class="text-muted font-medium">vs periode lalu</span>
              <div 
                class="flex items-center gap-1 font-mono font-bold"
                :class="[summaryComparison?.storefront_whatsapp_clicks >= 0 ? 'text-emerald-500' : 'text-rose-500']"
              >
                <UIcon
                  :name="summaryComparison?.storefront_whatsapp_clicks >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                  class="size-3.5"
                />
                <span>{{ summaryComparison?.storefront_whatsapp_clicks >= 0 ? '+' : '' }}{{ summaryComparison?.storefront_whatsapp_clicks }}%</span>
              </div>
            </div>
          </div>

          <!-- Conversions (Indigo Accent) -->
          <div class="bg-elevated p-6 rounded-2xl border border-default border-t-2 border-t-indigo-400 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold text-muted tracking-wider uppercase">
                  Pesanan Masuk
                </p>
                <div class="text-indigo-500 bg-indigo-500/10 p-1.5 rounded-lg shrink-0">
                  <UIcon name="i-lucide-shopping-cart" class="size-4 block" />
                </div>
              </div>
              <h3 class="text-2xl font-black text-default tracking-tight mt-3 font-mono">
                {{ formatNumber(summary?.storefront_conversions || 0) }}
              </h3>
            </div>

            <!-- Context Percentage change indicator -->
            <div class="mt-5 pt-3 border-t border-default/40 flex items-center justify-between text-xs font-bold">
              <span class="text-muted font-medium">Tingkat Konversi</span>
              <span class="font-mono font-bold text-default text-sm">{{ formatNumber(conversionRate) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hourly Traffic Chart (Dynamic SVG Line vs CSS Bar Toggle) -->
      <div class="bg-elevated border border-default rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-default">
              Trafik Transaksi per Jam
            </h3>
            <p class="text-xs text-muted mt-1">
              Distribusi pendapatan sepanjang hari dalam periode terpilih
            </p>
          </div>

          <!-- Toggle Chart Type Segmented Control -->
          <div class="flex rounded-xl bg-muted/40 p-0.5 border border-default shrink-0">
            <UButton
              icon="i-lucide-bar-chart-3"
              :color="chartType === 'bar' ? 'primary' : 'neutral'"
              variant="ghost"
              size="xs"
              class="rounded-lg p-1.5 active:scale-[0.98]"
              :class="chartType === 'bar' ? 'bg-elevated shadow-xs' : ''"
              @click="chartType = 'bar'"
            />
            <UButton
              icon="i-lucide-trending-up"
              :color="chartType === 'line' ? 'primary' : 'neutral'"
              variant="ghost"
              size="xs"
              class="rounded-lg p-1.5 active:scale-[0.98]"
              :class="chartType === 'line' ? 'bg-elevated shadow-xs' : ''"
              @click="chartType = 'line'"
            />
          </div>
        </div>

        <div
          v-if="hourlyTraffic.length === 0"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <UIcon
            name="i-lucide-activity"
            class="size-12 text-muted mb-3 opacity-50"
          />
          <p class="text-sm font-medium text-default">
            Belum ada data transaksi pada periode ini.
          </p>
        </div>

        <!-- Render area -->
        <div
          v-else
          class="relative h-64 w-full pt-10"
        >
          <!-- SVG Line & Area Fill layout -->
          <div v-if="chartType === 'line'" class="absolute inset-x-0 bottom-6 top-10 px-4">
            <svg viewBox="0 0 100 100" class="size-full overflow-visible" preserveAspectRatio="none">
              <!-- Gradient for Area Fill -->
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgb(var(--ui-primary-500))" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="rgb(var(--ui-primary-500))" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              <polygon :points="areaPoints" fill="url(#chart-area-grad)" />
              <polyline :points="linePoints" fill="none" stroke="rgb(var(--ui-primary-500))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <!-- Interactive Bars & Tooltips Column overlay -->
          <div class="absolute inset-0 flex items-end justify-between gap-1 sm:gap-2 px-4">
            <div
              v-for="item in hourlyTraffic"
              :key="item.hour_of_day"
              class="relative flex flex-col items-center flex-1 group h-full justify-end"
            >
              <!-- Tooltip / Label on hover -->
              <div class="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-inverted text-inverted text-xs py-1 px-2 rounded whitespace-nowrap pointer-events-none flex flex-col items-center shadow-lg">
                <span class="font-bold">{{ formatRupiah(item.revenue) }}</span>
                <span>{{ formatNumber(item.transaction_count) }} trx</span>
              </div>

              <!-- Bar view -->
              <div
                v-if="chartType === 'bar'"
                class="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all duration-300 relative overflow-hidden"
                :style="{ height: `${Math.max(4, (item.revenue / maxTrafficRevenue) * 100)}%` }"
              >
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              <!-- Line view hover target -->
              <div
                v-else
                class="w-full h-full cursor-pointer flex items-center justify-center relative"
              >
                <!-- Highlighted coordinate dot marker appearing on hover -->
                <div 
                  class="absolute size-2.5 rounded-full bg-primary border-2 border-elevated shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
                  :style="{ bottom: `calc(${(item.revenue / maxTrafficRevenue) * 80}% + 20px)` }"
                />
              </div>

              <!-- X-Axis Label -->
              <span class="text-[10px] sm:text-xs text-muted mt-2 font-medium">
                {{ formatHour(item.hour_of_day) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Best Selling Products Bento Table Section -->
      <div class="bg-elevated border border-default rounded-2xl shadow-sm p-6 overflow-hidden flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-default">
              Daftar Produk Terlaris
            </h3>
            <p class="text-xs text-muted mt-1">
              Top 5 produk dengan performa volume penjualan tertinggi dalam periode terpilih
            </p>
          </div>
          <div class="text-amber-500 bg-amber-500/10 p-2 rounded-xl shrink-0">
            <UIcon
              name="i-lucide-award"
              class="size-6 block"
            />
          </div>
        </div>

        <div
          v-if="topProducts.length === 0"
          class="flex flex-col items-center justify-center py-12 text-center"
        >
          <UIcon
            name="i-lucide-package"
            class="size-12 text-muted mb-3 opacity-50"
          />
          <p class="text-sm font-medium text-default">
            Belum ada data penjualan produk pada periode ini.
          </p>
        </div>

        <div v-else class="overflow-x-auto border border-default rounded-2xl bg-elevated shadow-xs">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-muted/15 border-b border-default text-[10px] font-extrabold text-muted uppercase tracking-wider">
                <th class="py-3.5 px-6 w-20 text-center">Rank</th>
                <th class="py-3.5 px-6">Nama Produk</th>
                <th class="py-3.5 px-6 text-center">Kuantitas Terjual</th>
                <th class="py-3.5 px-6 text-right">Pendapatan Kotor</th>
                <th class="py-3.5 px-6 text-right">Laba Bersih</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default/40 text-xs sm:text-sm">
              <tr 
                v-for="(p, idx) in topProducts" 
                :key="'top-' + idx"
                class="hover:bg-muted/10 transition-colors"
              >
                <!-- Rank Medal or Badge -->
                <td class="py-4 px-6 text-center font-black">
                  <span 
                    class="inline-flex items-center justify-center size-6 rounded-lg text-xs font-black font-mono shadow-xs"
                    :class="[
                      idx === 0 ? 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20' :
                      idx === 1 ? 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20' :
                      idx === 2 ? 'bg-amber-700/10 text-amber-800 ring-1 ring-amber-700/20' :
                      'bg-muted/40 text-toned'
                    ]"
                  >
                    #{{ idx + 1 }}
                  </span>
                </td>
                
                <!-- Product Details -->
                <td class="py-4 px-6">
                  <div class="flex flex-col min-w-[150px]">
                    <span class="font-extrabold text-default leading-snug">{{ p.name }}</span>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[9px] font-mono text-muted uppercase tracking-tight">
                        {{ p.sku || '-' }}
                      </span>
                      <span class="inline-flex items-center gap-1 text-[9px] font-bold text-toned">
                        <span class="size-1.5 rounded-full" :style="{ backgroundColor: p.color || '#9ca3af' }" />
                        {{ p.category }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Quantity -->
                <td class="py-4 px-6 text-center font-extrabold font-mono text-default">
                  {{ formatNumber(p.qty) }} pcs
                </td>

                <!-- Revenue -->
                <td class="py-4 px-6 text-right font-extrabold font-mono text-default">
                  {{ formatRupiah(p.revenue) }}
                </td>

                <!-- Profit -->
                <td class="py-4 px-6 text-right font-black font-mono text-emerald-500">
                  {{ formatRupiah(p.profit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

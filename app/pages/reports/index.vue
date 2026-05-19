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
const hourlyTraffic = ref<any[]>([])

async function fetchDashboardData() {
  if (isDemo.value) {
    loading.value = true
    setTimeout(() => {
      summary.value = {
        total_revenue: 1250000,
        gross_profit: 450000,
        total_orders: 42,
        avg_transaction: 29761,
        total_items_sold: 125,
        summary_date: new Date().toISOString().split('T')[0]
      }

      // Generate some dummy hourly traffic data for a typical day (10am to 10pm)
      const dummyTraffic = []
      for (let i = 10; i <= 22; i++) {
        // Bell curve-ish distribution
        const weight = 1 - Math.abs(15 - i) / 7
        dummyTraffic.push({
          hour_of_day: i,
          transaction_count: Math.max(1, Math.floor(weight * 12 + Math.random() * 5)),
          revenue: Math.max(15000, Math.floor(weight * 200000 + Math.random() * 50000))
        })
      }
      hourlyTraffic.value = dummyTraffic
      loading.value = false
    }, 500)
    return
  }

  if (!user.value) return
  loading.value = true

  try {
    const today = new Date().toISOString().split('T')[0]

    // Fetch daily summary
    const { data: sumData, error: sumErr } = await supabase
      .from('daily_summaries')
      .select('*')
      .order('summary_date', { ascending: false })
      .limit(1)
      .single()

    // If no row exists yet for today (or ever), it will throw "Row not found", we catch it below

    if (sumData) {
      summary.value = sumData
    }

    // Fetch hourly traffic for the latest summary date (or today)
    const targetDate = sumData ? (sumData as any).summary_date : today
    const { data: trafficData, error: trafficErr } = await supabase
      .from('hourly_traffic')
      .select('*')
      .eq('traffic_date', targetDate)
      .order('hour_of_day', { ascending: true })

    if (trafficData) {
      hourlyTraffic.value = trafficData
    }
  } catch (err: any) {
    // 406 means no rows found, which is fine for a brand new account
    if (err.code !== 'PGRST116') {
      toast.add({
        title: 'Gagal memuat data analitik',
        description: err.message,
        color: 'error'
      })
    }
  } finally {
    loading.value = false
  }
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
  return Math.max(...hourlyTraffic.value.map(t => t.revenue))
})

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full p-4 md:p-8">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
        <UIcon
          name="i-lucide-pie-chart"
          class="size-8 text-primary"
        />
        Ringkasan Bisnis
      </h1>
      <p class="text-muted text-sm mt-1.5">
        Pantau performa penjualan, laba, dan tren transaksi warung Anda hari ini.
      </p>
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
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Revenue -->
        <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300">
          <div class="flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-muted tracking-wider uppercase">
              Total Pendapatan
            </p>
            <h3 class="text-2xl font-black text-default tracking-tight truncate">
              {{ formatRupiah(summary?.total_revenue || 0) }}
            </h3>
          </div>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium text-success">
            <UIcon
              name="i-lucide-trending-up"
              class="size-4"
            />
            <span>Pendapatan kotor hari ini</span>
          </div>
        </div>

        <!-- Gross Profit -->
        <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300">
          <div class="flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-muted tracking-wider uppercase">
              Laba Kotor
            </p>
            <h3 class="text-2xl font-black text-default tracking-tight truncate">
              {{ formatRupiah(summary?.gross_profit || 0) }}
            </h3>
          </div>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium text-success">
            <UIcon
              name="i-lucide-badge-dollar-sign"
              class="size-4"
            />
            <span>Setelah dikurangi modal</span>
          </div>
        </div>

        <!-- Orders -->
        <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300">
          <div class="flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-muted tracking-wider uppercase">
              Total Transaksi
            </p>
            <h3 class="text-2xl font-black text-default tracking-tight">
              {{ formatNumber(summary?.total_orders || 0) }}
            </h3>
          </div>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium text-info">
            <UIcon
              name="i-lucide-receipt"
              class="size-4"
            />
            <span>Nota tercetak hari ini</span>
          </div>
        </div>

        <!-- Avg Transaction -->
        <div class="bg-elevated p-6 rounded-2xl border border-default shadow-sm hover:shadow-md transition-all duration-300">
          <div class="flex flex-col gap-1.5">
            <p class="text-xs font-semibold text-muted tracking-wider uppercase">
              Rata-rata Transaksi
            </p>
            <h3 class="text-2xl font-black text-default tracking-tight truncate">
              {{ formatRupiah(summary?.avg_transaction || 0) }}
            </h3>
          </div>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium text-toned">
            <UIcon
              name="i-lucide-users"
              class="size-4"
            />
            <span>Pengeluaran rata-rata per pelanggan</span>
          </div>
        </div>
      </div>

      <!-- Hourly Traffic Chart (CSS Based) -->
      <div class="bg-elevated border border-default rounded-2xl shadow-sm p-6 overflow-hidden">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h3 class="text-lg font-bold text-default">
              Trafik Transaksi per Jam
            </h3>
            <p class="text-xs text-muted mt-1">
              Distribusi pendapatan sepanjang hari ini
            </p>
          </div>
          <UIcon
            name="i-lucide-bar-chart-2"
            class="size-6 text-muted"
          />
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
            Belum ada data transaksi hari ini.
          </p>
        </div>

        <!-- CSS Bar Chart -->
        <div
          v-else
          class="relative h-64 w-full flex items-end justify-between gap-1 sm:gap-2 pt-10"
        >
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

            <!-- Bar -->
            <div
              class="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all duration-300 relative overflow-hidden"
              :style="{ height: `${Math.max(4, (item.revenue / maxTrafficRevenue) * 100)}%` }"
            >
              <!-- Optional inner gradient -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <!-- X-Axis Label -->
            <span class="text-[10px] sm:text-xs text-muted mt-2 font-medium">
              {{ formatHour(item.hour_of_day) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

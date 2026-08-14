<script setup lang="ts">
import type { TopProductItem } from '~/types'

definePageMeta({
  layout: 'default'
})

const { summary, summaryComparison, hourlyTraffic, loading, fetchDashboardReports, fetchTopProducts, calculateDateRange } = useReports()
const topProducts = ref<TopProductItem[]>([])

const selectedPeriod = ref<'today' | 'week' | 'month' | 'custom'>('today')
const customStartDate = ref(new Date().toISOString().split('T')[0] || '')
const customEndDate = ref(new Date().toISOString().split('T')[0] || '')

// Fetch active reporting data
async function fetchDashboardData() {
  await fetchDashboardReports(selectedPeriod.value, customStartDate.value, customEndDate.value)

  // Fetch top products for period
  const { startDate, endDate } = calculateDateRange(selectedPeriod.value, customStartDate.value, customEndDate.value)
  topProducts.value = await fetchTopProducts(startDate, endDate)
}

function setPeriod(p: 'today' | 'week' | 'month' | 'custom') {
  selectedPeriod.value = p
  fetchDashboardData()
}

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
      <!-- KPI & Storefront Cards -->
      <ReportsRevenueCards
        :summary="summary"
        :summary-comparison="summaryComparison"
      />

      <!-- Hourly Traffic Chart -->
      <ReportsTrafficChart
        :hourly-traffic="hourlyTraffic"
      />

      <!-- Top Products Bento Table -->
      <ReportsTopProductsList
        :top-products="topProducts"
      />
    </div>
  </div>
</template>

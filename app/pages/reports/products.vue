<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { productSales: salesData, loading, fetchProductSales } = useReports()
const period = ref<'daily' | 'weekly' | 'monthly'>('monthly')

function loadData() {
  fetchProductSales(period.value)
}

watch(period, () => {
  loadData()
})

onMounted(() => {
  loadData()
})

// Sorting and analysis variables
const sortBy = ref<'quantity_sold' | 'revenue' | 'gross_profit'>('quantity_sold')
const sortOrder = ref<'asc' | 'desc'>('desc')

function toggleSort(field: 'quantity_sold' | 'revenue' | 'gross_profit') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

const sortedSalesData = computed(() => {
  const list = [...salesData.value]
  const field = sortBy.value
  const isAsc = sortOrder.value === 'asc'
  return list.sort((a, b) => {
    const valA = Number(a[field]) || 0
    const valB = Number(b[field]) || 0
    return isAsc ? valA - valB : valB - valA
  })
})

const topFiveProducts = computed(() => {
  return sortedSalesData.value.slice(0, 5)
})

const maxProductQty = computed(() => {
  if (!salesData.value.length) return 1
  return Math.max(...salesData.value.map(p => p.quantity_sold)) || 1
})

const maxProductRevenue = computed(() => {
  if (!salesData.value.length) return 1
  return Math.max(...salesData.value.map(p => p.revenue)) || 1
})

const maxProductProfit = computed(() => {
  if (!salesData.value.length) return 1
  return Math.max(...salesData.value.map(p => p.gross_profit)) || 1
})

const maxVal = computed(() => {
  if (sortBy.value === 'quantity_sold') return maxProductQty.value
  if (sortBy.value === 'revenue') return maxProductRevenue.value
  return maxProductProfit.value
})

const totalProfit = computed(() => {
  if (!salesData.value.length) return 1
  return salesData.value.reduce((acc, p) => acc + (p.gross_profit || 0), 0) || 1
})

const automatedInsights = computed(() => {
  if (!salesData.value.length) return []
  
  const insights = []
  
  // Find highest quantity product
  const highestQtyProd = [...salesData.value].sort((a, b) => (b.quantity_sold || 0) - (a.quantity_sold || 0))[0]
  if (highestQtyProd) {
    insights.push({
      icon: 'i-lucide-zap',
      text: `Produk terlaris berdasarkan volume penjualan adalah <span class="font-extrabold text-default">${highestQtyProd.products?.name || 'Unknown'}</span> dengan total <span class="font-bold font-mono text-default">${formatNumber(highestQtyProd.quantity_sold || 0)}</span> pcs terjual.`
    })
  }

  // Find highest profit product
  const highestProfitProd = [...salesData.value].sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0))[0]
  if (highestProfitProd) {
    const totalProfitSum = salesData.value.reduce((acc, p) => acc + (p.gross_profit || 0), 0) || 1
    const pct = ((highestProfitProd.gross_profit || 0) / totalProfitSum * 100).toFixed(1)
    
    let periodText = 'periode ini'
    if (period.value === 'daily') periodText = 'hari ini'
    else if (period.value === 'weekly') periodText = 'minggu ini'
    else if (period.value === 'monthly') periodText = 'bulan ini'
    
    insights.push({
      icon: 'i-lucide-trending-up',
      text: `Kontribusi laba tertinggi dihasilkan oleh <span class="font-extrabold text-default">${highestProfitProd.products?.name || 'Unknown'}</span> yang menyumbang <span class="font-bold font-mono text-emerald-500">${formatRupiah(highestProfitProd.gross_profit || 0)}</span> (${pct}% dari total laba produk) selama ${periodText}.`
    })
  }

  // General margin warning or success insight
  const avgMargin = salesData.value.reduce((acc, p) => acc + (((p.gross_profit || 0) / (p.revenue || 1)) * 100), 0) / (salesData.value.length || 1)
  insights.push({
    icon: 'i-lucide-pie-chart',
    text: `Rata-rata profit margin dari produk Anda mencapai <span class="font-bold font-mono text-emerald-500">${avgMargin.toFixed(0)}%</span>, menunjukkan efisiensi penetapan harga yang sangat sehat.`
  })
  
  return insights
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full p-4 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
          <UIcon
            name="i-lucide-package-check"
            class="size-8 text-primary"
          />
          Penjualan Produk
        </h1>
        <p class="text-muted text-sm mt-1.5">
          Analisis produk terlaris dan kontribusinya terhadap laba warung Anda.
        </p>
      </div>

      <div class="w-full sm:w-auto">
        <USelect
          v-model="period"
          :items="[
            { label: 'Hari Ini', value: 'daily' },
            { label: 'Minggu Ini', value: 'weekly' },
            { label: 'Bulan Ini', value: 'monthly' }
          ]"
          size="md"
          class="w-full sm:w-48"
        />
      </div>
    </div>

    <!-- Data Area -->
    <div v-if="loading" class="bg-elevated rounded-2xl border border-default shadow-sm py-32 flex items-center justify-center">
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin text-primary size-12"
      />
    </div>

    <div v-else-if="salesData.length === 0" class="bg-elevated rounded-2xl border border-default shadow-sm py-20 flex flex-col items-center justify-center text-center px-4">
      <UIcon
        name="i-lucide-package-x"
        class="size-16 text-muted mb-4"
      />
      <h3 class="text-lg font-bold text-default">
        Belum ada penjualan
      </h3>
      <p class="text-sm text-muted max-w-sm mt-1">
        Data penjualan produk untuk periode ini belum tersedia.
      </p>
    </div>

    <!-- Split Grid Layout (DESIGN_VARIANCE: 8) -->
    <div v-else class="flex flex-col gap-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left: Horizontal Bar Chart comparison (lg:col-span-4) -->
        <div class="lg:col-span-4 bg-muted/10 border border-default/60 rounded-2xl p-6 flex flex-col gap-5">
          <div>
            <h4 class="text-sm font-bold text-default flex items-center gap-1.5">
              <UIcon name="i-lucide-bar-chart-horizontal-3" class="size-4 text-primary" />
              Perbandingan {{ sortBy === 'quantity_sold' ? 'Volume' : sortBy === 'revenue' ? 'Pendapatan' : 'Laba' }}
            </h4>
            <p class="text-[10px] text-muted mt-0.5">Visualisasi 5 produk teratas berdasarkan metrik aktif</p>
          </div>
          
          <div class="flex flex-col gap-4">
            <div 
              v-for="(p, idx) in topFiveProducts" 
              :key="'bar-' + idx" 
              class="flex flex-col gap-1.5"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-default truncate max-w-[160px]">{{ p.products?.name }}</span>
                <span class="font-mono font-bold text-toned">
                  {{ sortBy === 'quantity_sold' ? `${formatNumber(p.quantity_sold)} pcs` : formatRupiah(sortBy === 'revenue' ? p.revenue : p.gross_profit) }}
                </span>
              </div>
              <div class="h-2 w-full bg-muted/40 rounded-full overflow-hidden relative">
                <div 
                  class="h-full rounded-full transition-all duration-500 relative" 
                  :style="{ 
                    width: `${((sortBy === 'quantity_sold' ? p.quantity_sold : sortBy === 'revenue' ? p.revenue : p.gross_profit) / maxVal) * 100}%`,
                    backgroundColor: p.products?.categories?.color || 'rgb(var(--ui-primary-500))'
                  }" 
                >
                  <div class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Best Selling Table (lg:col-span-8) -->
        <div class="lg:col-span-8 overflow-x-auto border border-default/60 rounded-2xl bg-elevated shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-muted/10 border-b border-default/60 text-[10px] font-extrabold text-muted uppercase tracking-wider">
                <th class="py-3.5 px-4 w-16 text-center">Rank</th>
                <th class="py-3.5 px-4">Produk</th>
                <th class="py-3.5 px-4 text-center cursor-pointer select-none hover:text-default transition-colors" @click="toggleSort('quantity_sold')">
                  <div class="flex items-center justify-center gap-1">
                    Terjual
                    <UIcon 
                      v-if="sortBy === 'quantity_sold'" 
                      :name="sortOrder === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" 
                      class="size-3.5 text-primary"
                    />
                  </div>
                </th>
                <th class="py-3.5 px-4 text-right cursor-pointer select-none hover:text-default transition-colors" @click="toggleSort('revenue')">
                  <div class="flex items-center justify-end gap-1">
                    Pendapatan
                    <UIcon 
                      v-if="sortBy === 'revenue'" 
                      :name="sortOrder === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" 
                      class="size-3.5 text-primary"
                    />
                  </div>
                </th>
                <th class="py-3.5 px-4 text-right cursor-pointer select-none hover:text-default transition-colors" @click="toggleSort('gross_profit')">
                  <div class="flex items-center justify-end gap-1">
                    Laba Kotor
                    <UIcon 
                      v-if="sortBy === 'gross_profit'" 
                      :name="sortOrder === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" 
                      class="size-3.5 text-primary"
                    />
                  </div>
                </th>
                <th class="py-3.5 px-4 text-center">Margin</th>
                <th class="py-3.5 px-4 text-center">Kontribusi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default/40 text-xs sm:text-sm">
              <tr 
                v-for="(item, idx) in sortedSalesData" 
                :key="item.id"
                class="hover:bg-muted/10 transition-colors"
              >
                <!-- Rank Medal or Badge -->
                <td class="py-3 px-4 text-center font-black">
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

                <!-- Product Detail Row -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="size-10 rounded-xl bg-muted/40 border border-default shrink-0 overflow-hidden flex items-center justify-center">
                      <img
                        v-if="item.products?.image_url"
                        :src="item.products.image_url"
                        alt=""
                        class="size-full object-cover"
                      >
                      <UIcon
                        v-else
                        name="i-lucide-image"
                        class="size-5 text-muted"
                      />
                    </div>
                    <div class="flex flex-col min-w-[150px]">
                      <span class="font-extrabold text-default leading-snug">{{ item.products?.name || 'Produk Dihapus' }}</span>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-[9px] font-mono text-muted uppercase tracking-tight">
                          {{ item.products?.sku || '-' }}
                        </span>
                        <span 
                          v-if="item.products?.categories"
                          class="inline-flex items-center gap-1 text-[9px] font-bold text-toned"
                        >
                          <span class="size-1.5 rounded-full" :style="{ backgroundColor: item.products.categories.color || '#9ca3af' }" />
                          {{ item.products.categories.name }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Quantity Sold -->
                <td class="py-3 px-4 text-center font-extrabold font-mono text-default">
                  {{ formatNumber(item.quantity_sold || 0) }}
                </td>

                <!-- Revenue -->
                <td class="py-3 px-4 text-right font-extrabold font-mono text-default">
                  {{ formatRupiah(item.revenue || 0) }}
                </td>

                <!-- Gross Profit -->
                <td class="py-3 px-4 text-right font-black font-mono text-emerald-500">
                  {{ formatRupiah(item.gross_profit || 0) }}
                </td>

                <!-- Profit Margin -->
                <td class="py-3 px-4 text-center font-mono">
                  <span 
                    class="px-2.5 py-0.5 rounded-full font-extrabold text-[10px]"
                    :class="[
                      (((item.gross_profit || 0) / (item.revenue || 1)) * 100) >= 30 ? 'bg-emerald-500/10 text-emerald-600' :
                      (((item.gross_profit || 0) / (item.revenue || 1)) * 100) >= 15 ? 'bg-blue-500/10 text-blue-600' :
                      'bg-amber-500/10 text-amber-600'
                    ]"
                  >
                    {{ (item.revenue || 0) > 0 ? (((item.gross_profit || 0) / (item.revenue || 1)) * 100).toFixed(0) : 0 }}%
                  </span>
                </td>

                <!-- Profit Contribution -->
                <td class="py-3 px-4 text-center font-mono font-bold text-default">
                  {{ ((((item.gross_profit || 0) / totalProfit)) * 100).toFixed(1) }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Dynamic Insights Block (utilizing large whitespace) -->
      <div 
        v-if="salesData.length > 0 && automatedInsights.length > 0" 
        class="border-t border-default/40 pt-6 mt-2"
      >
        <div class="bg-muted/10 border border-default/40 rounded-2xl p-5 flex flex-col gap-3">
          <h4 class="text-xs font-extrabold text-default uppercase tracking-wider flex items-center gap-1.5 text-primary">
            <UIcon name="i-lucide-lightbulb" class="size-4" />
            Insight Analisis Otomatis
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              v-for="(insight, idx) in automatedInsights" 
              :key="'insight-' + idx"
              class="flex gap-2.5 items-start bg-elevated/40 border border-default/40 p-3.5 rounded-xl text-xs text-toned animate-fade-in"
            >
              <div class="text-primary bg-primary/10 p-1.5 rounded-lg shrink-0 mt-0.5">
                <UIcon :name="insight.icon" class="size-4" />
              </div>
              <p class="leading-relaxed" v-html="insight.text" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

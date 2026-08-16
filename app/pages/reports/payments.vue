<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const { paymentSummaries: paymentsData, loading, fetchPaymentSummaries } = useReports()
const period = ref<'daily' | 'weekly' | 'monthly'>('monthly')
const hoveredMethod = ref<string | null>(null)
const toast = useToast()

// Map methods to beautiful desaturated brand colors and display names
const methodDisplay = {
  cash: { label: 'Tunai', color: 'bg-emerald-500', textColor: 'text-emerald-500', icon: 'i-lucide-banknote' },
  qris: { label: 'QRIS', color: 'bg-teal-500', textColor: 'text-teal-500', icon: 'i-lucide-qr-code' },
  gopay: { label: 'GoPay', color: 'bg-sky-500', textColor: 'text-sky-500', icon: 'i-lucide-smartphone' },
  ovo: { label: 'OVO', color: 'bg-indigo-500', textColor: 'text-indigo-500', icon: 'i-lucide-smartphone' },
  dana: { label: 'DANA', color: 'bg-blue-500', textColor: 'text-blue-500', icon: 'i-lucide-smartphone' },
  transfer: { label: 'Transfer', color: 'bg-orange-500', textColor: 'text-orange-500', icon: 'i-lucide-building-2' }
}

// Statically mapped momentum trends for payment methods (e.g. current vs past period)
const paymentTrends: Record<string, number> = {
  qris: 8.4,
  transfer: 4.7,
  gopay: 2.1,
  dana: 1.5,
  ovo: -0.8,
  cash: -1.2
}

async function loadData() {
  const result = await fetchPaymentSummaries(period.value)
  if (!result.success) {
    toast.add({ title: 'Gagal memuat data pembayaran', description: result.error || 'Terjadi kesalahan.', color: 'error' })
  }
}

watch(period, () => {
  loadData()
})

onMounted(() => {
  loadData()
})

const grandTotalAmount = computed(() => paymentsData.value.reduce((acc, curr) => acc + Number(curr.total_amount), 0))

// Format helpers
function getPercentage(amount: number | string) {
  if (grandTotalAmount.value === 0) return '0.0'
  return ((Number(amount) / grandTotalAmount.value) * 100).toFixed(1)
}

// Compute segments for the native SVG Donut Chart
const donutSegments = computed(() => {
  let accumulatedPercent = 0
  const C = 2 * Math.PI * 36 // Radius is 36, Circumference ~226.195
  
  return paymentsData.value.map((item) => {
    const percent = Number(getPercentage(item.total_amount))
    const strokeLength = (percent / 100) * C
    const strokeOffset = C - (accumulatedPercent / 100) * C
    
    const segment = {
      method: item.method,
      percent,
      strokeLength,
      strokeOffset,
      strokeDashArray: `${strokeLength} ${C - strokeLength}`,
      strokeDashOffset: strokeOffset,
      colorClass: methodDisplay[item.method as keyof typeof methodDisplay]?.textColor || 'text-primary'
    }
    
    accumulatedPercent += percent
    return segment
  })
})

// Dynamic info for center label of donut
const activeDonutInfo = computed(() => {
  if (hoveredMethod.value) {
    const found = paymentsData.value.find(item => item.method === hoveredMethod.value)
    if (found) {
      const display = methodDisplay[found.method as keyof typeof methodDisplay]
      return {
        label: display?.label || found.method,
        value: formatRupiah(found.total_amount),
        percentage: `${getPercentage(found.total_amount)}%`,
        subtext: `${formatNumber(found.transaction_count)} transaksi`
      }
    }
  }
  
  const totalTransactions = paymentsData.value.reduce((acc, curr) => acc + Number(curr.transaction_count), 0)
  return {
    label: 'Semua Metode',
    value: formatRupiah(grandTotalAmount.value),
    percentage: '100%',
    subtext: `${formatNumber(totalTransactions)} transaksi`
  }
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full p-4 md:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
          <UIcon
            name="i-lucide-wallet"
            class="size-8 text-primary"
          />
          Metode Pembayaran
        </h1>
        <p class="text-muted text-sm mt-1.5">
          Lihat distribusi penggunaan metode pembayaran dari pelanggan Anda.
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

    <!-- Data Section -->
    <div class="bg-elevated rounded-2xl border border-default shadow-sm p-6 sm:p-8">
      <div
        v-if="loading"
        class="flex items-center justify-center py-20"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-primary size-10"
        />
      </div>

      <div
        v-else-if="paymentsData.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center px-4"
      >
        <UIcon
          name="i-lucide-credit-card"
          class="size-16 text-muted mb-4 opacity-50"
        />
        <h3 class="text-lg font-bold text-default">
          Belum ada transaksi
        </h3>
        <p class="text-sm text-muted max-w-sm mt-1">
          Data metode pembayaran belum tersedia untuk periode ini.
        </p>
      </div>

      <div
        v-else
        class="flex flex-col gap-8"
      >
        <div class="flex items-center justify-between border-b border-default pb-4">
          <h3 class="font-bold text-lg text-default">
            Total Volume Transaksi
          </h3>
          <span class="text-2xl font-black text-primary font-mono">{{ formatRupiah(grandTotalAmount) }}</span>
        </div>

        <!-- Two-column asymmetric bento layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left Column: Payment Methods List -->
          <div class="lg:col-span-7 flex flex-col gap-5">
            <div
              v-for="item in paymentsData"
              :key="item.method"
              class="flex flex-col gap-3 p-4 rounded-xl border border-transparent hover:border-default hover:bg-muted/15 transition-all duration-300 ease-out cursor-pointer"
              :class="{ 'bg-muted/10 border-default scale-[1.01] shadow-sm': hoveredMethod === item.method }"
              @mouseenter="hoveredMethod = item.method"
              @mouseleave="hoveredMethod = null"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <!-- Custom SVG Logo -->
                  <div class="size-10 rounded-xl bg-muted/30 flex items-center justify-center border border-default shadow-sm overflow-hidden shrink-0">
                    <template v-if="item.method === 'cash'">
                      <svg viewBox="0 0 24 24" fill="none" class="size-6 text-emerald-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
                        <path d="M6 9h.01M18 15h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      </svg>
                    </template>
                    <template v-else-if="item.method === 'qris'">
                      <svg viewBox="0 0 24 24" fill="none" class="size-6 text-teal-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" fill-opacity="0.1" />
                        <path d="M6 6h4v4H6V6zm1 1v2h2V7H7z" fill="currentColor" />
                        <path d="M14 6h4v4h-4V6zm1 1v2h2V7h-2z" fill="currentColor" />
                        <path d="M6 14h4v4H6v-4zm1 1v2h2v-2H7z" fill="currentColor" />
                        <path d="M14 14h2v2h-2v-2zm2 2h2v2h-2v-2zm0-2h2v2h-2v-2zm-2 2h2v2h-2v-2z" fill="currentColor" />
                      </svg>
                    </template>
                    <template v-else-if="item.method === 'gopay'">
                      <svg viewBox="0 0 24 24" fill="none" class="size-6 text-sky-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" fill-opacity="0.1" />
                        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2.5" />
                        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
                      </svg>
                    </template>
                    <template v-else-if="item.method === 'ovo'">
                      <svg viewBox="0 0 24 24" fill="none" class="size-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" fill-opacity="0.1" />
                        <text x="12" y="15" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9.5" text-anchor="middle" fill="currentColor" letter-spacing="-0.8">ovo</text>
                      </svg>
                    </template>
                    <template v-else-if="item.method === 'dana'">
                      <svg viewBox="0 0 24 24" fill="none" class="size-6 text-blue-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" fill-opacity="0.1" />
                        <path d="M7 6h6a5 5 0 0 1 0 10H7V6z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" />
                        <path d="M10 6v10" stroke="currentColor" stroke-width="2" />
                      </svg>
                    </template>
                    <template v-else-if="item.method === 'transfer'">
                      <svg viewBox="0 0 24 24" fill="none" class="size-6 text-orange-500" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" fill-opacity="0.1" />
                        <path d="M3 21h18M5 21V10m14 11V10M9 21V10m6 11V10M2 10l10-7 10 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </template>
                    <template v-else>
                      <UIcon
                        name="i-lucide-credit-card"
                        class="size-5 text-default"
                      />
                    </template>
                  </div>
                  <div>
                    <h4 class="font-bold text-default text-base transition-colors duration-200">
                      {{ methodDisplay[item.method as keyof typeof methodDisplay]?.label || item.method }}
                    </h4>
                    <p class="text-xs text-muted font-mono">
                      {{ formatNumber(item.transaction_count) }} transaksi
                    </p>
                  </div>
                </div>
                <div class="text-right flex flex-col items-end">
                  <p class="font-bold text-default font-mono text-base">
                    {{ formatRupiah(item.total_amount) }}
                  </p>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <p class="text-xs font-semibold text-default font-mono">
                      {{ getPercentage(item.total_amount) }}%
                    </p>
                    <!-- Trend momentum indicator -->
                    <span
                      v-if="paymentTrends[item.method] !== undefined"
                      class="inline-flex items-center gap-0.5 text-xs font-semibold font-mono"
                      :class="(paymentTrends[item.method] ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                    >
                      <UIcon
                        :name="(paymentTrends[item.method] ?? 0) >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                        class="size-3 shrink-0"
                      />
                      {{ Math.abs(paymentTrends[item.method] ?? 0).toFixed(1) }}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full h-2.5 bg-muted/30 rounded-full overflow-hidden flex">
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :class="methodDisplay[item.method as keyof typeof methodDisplay]?.color || 'bg-primary'"
                  :style="{ width: `${getPercentage(item.total_amount)}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Right Column: Interactive Donut Chart -->
          <div class="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-muted/5 border border-default rounded-2xl relative overflow-hidden min-h-[360px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md">
            <h4 class="text-sm font-bold text-muted uppercase tracking-wider mb-6 absolute top-6 left-6">
              Distribusi Visual
            </h4>
            
            <div class="relative size-64 flex items-center justify-center">
              <!-- SVG Donut Chart -->
              <svg viewBox="0 0 100 100" class="size-full -rotate-90">
                <g class="origin-center">
                  <!-- Background thin ring -->
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="transparent"
                    stroke="currentColor"
                    stroke-width="5"
                    class="text-default/5"
                  />
                  <!-- Colored segments -->
                  <circle
                    v-for="seg in donutSegments"
                    :key="seg.method"
                    cx="50"
                    cy="50"
                    r="36"
                    fill="transparent"
                    stroke="currentColor"
                    stroke-width="6"
                    :class="[seg.colorClass, hoveredMethod === seg.method ? 'stroke-[8px] opacity-100' : 'stroke-[6px] opacity-80']"
                    :stroke-dasharray="seg.strokeDashArray"
                    :stroke-dashoffset="seg.strokeDashOffset"
                    stroke-linecap="round"
                    class="transition-all duration-300 cursor-pointer ease-out origin-center animate-dash"
                    @mouseenter="hoveredMethod = seg.method"
                    @mouseleave="hoveredMethod = null"
                  />
                </g>
              </svg>

              <!-- Central Information Island -->
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none select-none">
                <span class="text-xs font-bold text-muted uppercase tracking-widest transition-all duration-200">
                  {{ activeDonutInfo.label }}
                </span>
                <span class="text-xl font-extrabold text-default font-mono tracking-tight mt-1.5 transition-all duration-200">
                  {{ activeDonutInfo.value }}
                </span>
                <span class="text-xs text-primary font-semibold font-mono mt-1 transition-all duration-200">
                  {{ activeDonutInfo.percentage }}
                </span>
                <span class="text-[10px] text-muted mt-0.5 transition-all duration-200">
                  {{ activeDonutInfo.subtext }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

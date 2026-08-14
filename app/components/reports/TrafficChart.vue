<script setup lang="ts">
import type { HourlyTraffic } from '~/types'

const props = defineProps<{
  hourlyTraffic: HourlyTraffic[]
}>()

const chartType = ref<'bar' | 'line'>('bar')

function formatHour(hour: number) {
  return `${hour.toString().padStart(2, '0')}:00`
}

const maxTrafficRevenue = computed(() => {
  if (!props.hourlyTraffic.length) return 1
  return Math.max(...props.hourlyTraffic.map(t => t.revenue)) || 1
})

const linePoints = computed(() => {
  if (!props.hourlyTraffic.length) return ''
  const N = props.hourlyTraffic.length
  const max = maxTrafficRevenue.value || 1
  return props.hourlyTraffic.map((item, idx) => {
    const x = (idx / (N - 1)) * 100
    const y = 90 - (item.revenue / max) * 80
    return `${x},${y}`
  }).join(' ')
})

const areaPoints = computed(() => {
  if (!props.hourlyTraffic.length) return ''
  const N = props.hourlyTraffic.length
  const max = maxTrafficRevenue.value || 1
  const points = props.hourlyTraffic.map((item, idx) => {
    const x = (idx / (N - 1)) * 100
    const y = 90 - (item.revenue / max) * 80
    return `${x},${y}`
  }).join(' ')
  return `0,100 ${points} 100,100`
})
</script>

<template>
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
            <span class="font-bold">{{ formatRupiah(item.revenue || 0) }}</span>
            <span>{{ formatNumber(item.transaction_count || 0) }} trx</span>
          </div>

          <!-- Bar view -->
          <div
            v-if="chartType === 'bar'"
            class="w-full bg-primary/70 hover:bg-primary rounded-t-sm transition-all duration-300 relative overflow-hidden"
            :style="{ height: `${Math.max(4, ((item.revenue || 0) / maxTrafficRevenue) * 100)}%` }"
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
              :style="{ bottom: `calc(${((item.revenue || 0) / maxTrafficRevenue) * 80}% + 20px)` }"
            />
          </div>

          <!-- X-Axis Label -->
          <span class="text-[10px] sm:text-xs text-muted mt-2 font-medium">
            {{ formatHour(item.hour_of_day || 0) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

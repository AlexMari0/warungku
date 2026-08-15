<script setup lang="ts">
import type { DailySummary, SummaryComparison } from '~/core/types'

const props = defineProps<{
  summary: DailySummary | null
  summaryComparison: SummaryComparison
}>()

const conversionRate = computed(() => {
  const views = props.summary?.storefront_page_views || 0
  const conversions = props.summary?.storefront_conversions || 0
  if (views === 0) return 0
  return Number(((conversions / views) * 100).toFixed(1))
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Main Business KPI Cards -->
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
  </div>
</template>

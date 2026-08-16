<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const {
  loading,
  filterType,
  searchProduct,
  startDate,
  endDate,
  currentPage,
  totalLiveCount,
  hasMore,
  serverLoading,
  typeMeta,
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
} = useStockMovements()

onMounted(() => {
  fetchMovements()
})
</script>

<template>
  <div class="flex flex-col gap-8 max-w-7xl mx-auto w-full font-sans pb-16">
    <!-- Header banner -->
    <div>
      <h1 class="text-3xl font-extrabold text-default tracking-tight flex items-center gap-2">
        <UIcon name="i-lucide-history" class="size-8 text-primary" />
        Riwayat Mutasi Stok
      </h1>
      <p class="text-muted text-sm mt-1.5">
        Audit log dan pembukuan komprehensif atas seluruh barang masuk, keluar, penjualan, dan penyesuaian manual.
      </p>
    </div>

    <!-- 1. Stats Cards Row -->
    <MovementStats :stats="stats" />

    <!-- 2. Controls Toolbar -->
    <MovementFilters
      v-model:search-product="searchProduct"
      v-model:filter-type="filterType"
      v-model:start-date="startDate"
      v-model:end-date="endDate"
      :type-meta="typeMeta"
      @clear-dates="clearDates"
    />

    <!-- 3. Table Ledger -->
    <MovementTable
      v-model:current-page="currentPage"
      :movements="paginatedMovements"
      :loading="loading"
      :has-active-filters-or-data="filteredMovements.length > 0"
      :type-meta="typeMeta"
      :total-pages="totalPages"
      :total-items="totalItems"
      :start-index="startIndex"
      :end-index="endIndex"
      :is-infinite-scroll-active="isInfiniteScrollActive"
      :total-live-count="totalLiveCount"
      :has-more="hasMore"
      :server-loading="serverLoading"
      @load-more="loadMore"
    />
  </div>
</template>

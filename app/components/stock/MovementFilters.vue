<script setup lang="ts">
const searchProduct = defineModel<string>('searchProduct', { default: '' })
const filterType = defineModel<string>('filterType', { default: 'all' })
const startDate = defineModel<string>('startDate', { default: '' })
const endDate = defineModel<string>('endDate', { default: '' })

defineProps<{
  typeMeta: Record<string, { label: string; icon: string; color: string }>
}>()

const emit = defineEmits<{
  'clear-dates': []
}>()

function triggerDatePicker(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const input = target.querySelector('input[type="date"]') as HTMLInputElement | null
  if (input) {
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.focus()
        input.click()
      }
    } catch (_e: unknown) {
      try {
        input.focus()
        input.click()
      } catch (_err: unknown) {}
    }
  }
}
</script>

<template>
  <div class="bg-elevated p-4 rounded-2xl border border-default shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
    <!-- Search & Date Filter Group -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
      <!-- Search Input -->
      <div class="w-full sm:max-w-xs">
        <UInput
          v-model="searchProduct"
          icon="i-lucide-search"
          placeholder="Cari nama produk / SKU..."
          class="w-full"
          size="md"
        />
      </div>

      <!-- Date Range Filter -->
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <UInput
          v-model="startDate"
          type="date"
          icon="i-lucide-calendar"
          placeholder="Select Start Date"
          class="w-full sm:w-[160px]"
          size="md"
          @click="triggerDatePicker"
        />
        <span class="text-xs text-muted font-bold shrink-0">s/d</span>
        <UInput
          v-model="endDate"
          type="date"
          icon="i-lucide-calendar"
          placeholder="Select End Date"
          class="w-full sm:w-[160px]"
          size="md"
          @click="triggerDatePicker"
        />
        <!-- Clear Dates Button -->
        <UButton
          v-if="startDate || endDate"
          icon="i-lucide-x"
          color="neutral"
          variant="subtle"
          size="xs"
          class="rounded-xl shrink-0 active:scale-95 transition-transform"
          @click="emit('clear-dates')"
        />
      </div>
    </div>

    <!-- Type Filter -->
    <div class="w-full lg:w-[200px] shrink-0">
      <USelect
        v-model="filterType"
        placeholder="Filter Jenis Mutasi"
        class="w-full"
        size="md"
        :items="[
          { label: 'Semua Mutasi', value: 'all' },
          ...Object.entries(typeMeta).map(([val, meta]) => ({ label: meta.label, value: val }))
        ]"
      />
    </div>
  </div>
</template>

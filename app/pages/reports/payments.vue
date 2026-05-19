<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const { isDemo } = useDemoMode()

const loading = ref(false)
const paymentsData = ref<any[]>([])
const period = ref<'daily' | 'weekly' | 'monthly'>('monthly')

// Map methods to brand colors and display names
const methodDisplay = {
  cash: { label: 'Tunai', color: 'bg-emerald-500', icon: 'i-lucide-banknote' },
  qris: { label: 'QRIS', color: 'bg-red-500', icon: 'i-lucide-qr-code' },
  gopay: { label: 'GoPay', color: 'bg-blue-500', icon: 'i-lucide-smartphone' },
  ovo: { label: 'OVO', color: 'bg-purple-500', icon: 'i-lucide-smartphone' },
  dana: { label: 'DANA', color: 'bg-sky-500', icon: 'i-lucide-smartphone' },
  transfer: { label: 'Transfer Bank', color: 'bg-orange-500', icon: 'i-lucide-building-2' }
}

async function fetchPayments() {
  if (isDemo.value) {
    loading.value = true
    setTimeout(() => {
      paymentsData.value = [
        { method: 'cash', transaction_count: 142, total_amount: 3500000 },
        { method: 'qris', transaction_count: 85, total_amount: 2800000 },
        { method: 'gopay', transaction_count: 45, total_amount: 1500000 },
        { method: 'ovo', transaction_count: 30, total_amount: 850000 },
        { method: 'dana', transaction_count: 12, total_amount: 400000 }
      ].sort((a, b) => b.total_amount - a.total_amount)
      loading.value = false
    }, 500)
    return
  }

  if (!user.value) return
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('payment_method_summary')
      .select('*')
      .eq('period_type', period.value)
      .order('total_amount', { ascending: false })

    if (error) throw error
    paymentsData.value = data || []
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat data pembayaran',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(period, () => {
  fetchPayments()
})

onMounted(() => {
  fetchPayments()
})

const grandTotalAmount = computed(() => paymentsData.value.reduce((acc, curr) => acc + Number(curr.total_amount), 0))

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

function getPercentage(amount: number) {
  if (grandTotalAmount.value === 0) return 0
  return ((Number(amount) / grandTotalAmount.value) * 100).toFixed(1)
}
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
          <span class="text-2xl font-black text-primary">{{ formatRupiah(grandTotalAmount) }}</span>
        </div>

        <div class="flex flex-col gap-6">
          <div
            v-for="item in paymentsData"
            :key="item.method"
            class="flex flex-col gap-3"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-xl bg-muted/30 flex items-center justify-center border border-default shadow-sm">
                  <UIcon
                    :name="methodDisplay[item.method as keyof typeof methodDisplay]?.icon || 'i-lucide-credit-card'"
                    class="size-5 text-default"
                  />
                </div>
                <div>
                  <h4 class="font-bold text-default">
                    {{ methodDisplay[item.method as keyof typeof methodDisplay]?.label || item.method }}
                  </h4>
                  <p class="text-xs text-muted">
                    {{ formatNumber(item.transaction_count) }} transaksi
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-default">
                  {{ formatRupiah(item.total_amount) }}
                </p>
                <p class="text-xs font-medium text-muted mt-0.5">
                  {{ getPercentage(item.total_amount) }}%
                </p>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="w-full h-3 bg-muted/30 rounded-full overflow-hidden flex">
              <div
                class="h-full rounded-full transition-all duration-700 ease-out"
                :class="methodDisplay[item.method as keyof typeof methodDisplay]?.color || 'bg-primary'"
                :style="{ width: `${getPercentage(item.total_amount)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

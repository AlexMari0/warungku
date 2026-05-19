<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const { isDemo } = useDemoMode()

const loading = ref(false)
const salesData = ref<any[]>([])
const period = ref<'daily' | 'weekly' | 'monthly'>('monthly')

async function fetchProductSales() {
  if (isDemo.value) {
    loading.value = true
    setTimeout(() => {
      salesData.value = [
        {
          id: 's-1',
          products: { name: 'Indomie Goreng Aceh', image_url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop' },
          quantity_sold: 45,
          revenue: 157500,
          gross_profit: 45000
        },
        {
          id: 's-2',
          products: { name: 'Kopi Susu Gula Aren', image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop' },
          quantity_sold: 28,
          revenue: 336000,
          gross_profit: 112000
        },
        {
          id: 's-3',
          products: { name: 'Rokok Surya 12', image_url: null },
          quantity_sold: 15,
          revenue: 330000,
          gross_profit: 30000
        }
      ].sort((a, b) => b.quantity_sold - a.quantity_sold)
      loading.value = false
    }, 500)
    return
  }

  if (!user.value) return
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('product_sales_summary')
      .select('*, products(name, image_url)')
      .eq('period_type', period.value)
      .order('quantity_sold', { ascending: false })
      .limit(50)

    if (error) throw error
    salesData.value = data || []
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat data penjualan produk',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(period, () => {
  fetchProductSales()
})

onMounted(() => {
  fetchProductSales()
})

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

    <!-- Data Table -->
    <div class="bg-elevated rounded-2xl border border-default shadow-sm overflow-hidden">
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
        v-else-if="salesData.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center px-4"
      >
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

      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full border-collapse text-left">
          <thead>
            <tr class="border-b border-default bg-muted/20 text-xs font-bold text-muted uppercase tracking-wider">
              <th class="py-4 px-6">
                Produk
              </th>
              <th class="py-4 px-4 text-center">
                Terjual
              </th>
              <th class="py-4 px-4 text-right">
                Pendapatan
              </th>
              <th class="py-4 px-4 text-right">
                Laba Kotor
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="item in salesData"
              :key="item.id"
              class="hover:bg-muted/10 transition-colors"
            >
              <td class="py-4 px-6">
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
                  <h4 class="font-bold text-sm text-default">
                    {{ item.products?.name || 'Produk Dihapus' }}
                  </h4>
                </div>
              </td>
              <td class="py-4 px-4 text-center">
                <span class="inline-flex items-center justify-center bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
                  {{ formatNumber(item.quantity_sold) }}
                </span>
              </td>
              <td class="py-4 px-4 text-right font-medium text-sm text-default">
                {{ formatRupiah(item.revenue) }}
              </td>
              <td class="py-4 px-4 text-right font-bold text-sm text-success">
                {{ formatRupiah(item.gross_profit) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

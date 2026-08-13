<script setup lang="ts">
const props = defineProps<{
  open: boolean
  order: any // contains id, order_number, subtotal, discount_amount, total_amount, items, payment, customer, created_at
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'new-transaction': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const toast = useToast()

function formatRupiah(amount: number) {
  if (!amount && amount !== 0) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateStr))
}

function handlePrint() {
  toast.add({
    title: 'Mencetak struk...',
    description: 'Menghubungkan ke printer thermal POS Bluetooth...',
    color: 'success',
    icon: 'i-lucide-printer'
  })
}

function handleWhatsApp() {
  const phone = props.order?.customer?.phone || ''
  if (!phone) {
    toast.add({
      title: 'No. WhatsApp tidak terdaftar',
      description: 'Pelanggan tidak memiliki nomor telepon terdaftar.',
      color: 'warning'
    })
    return
  }

  toast.add({
    title: 'Mengirim struk digital...',
    description: `Struk WhatsApp berhasil dikirim ke +62${phone}!`,
    color: 'success',
    icon: 'i-lucide-message-square'
  })
}

function startNew() {
  emit('new-transaction')
  isOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :close-on-outside-click="false"
    class="max-w-md"
  >
    <template #body>
      <div class="flex flex-col items-center py-4">
        <!-- Animated Success Checkmark Ring -->
        <div class="size-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center text-success mb-4 scale-up-animation">
          <UIcon
            name="i-lucide-check"
            class="size-8 stroke-[3]"
          />
        </div>

        <h3 class="text-xl font-black text-default tracking-tight">
          Transaksi Sukses!
        </h3>
        <p class="text-xs text-muted mt-1 text-center max-w-xs">
          Pembayaran berhasil diproses dan inventaris stok telah disesuaikan secara otomatis.
        </p>

        <!-- Premium Thermal Style Receipt Wrapper -->
        <div class="w-full bg-elevated border border-default p-6 rounded-2xl shadow-sm font-mono text-xs text-toned mt-6 relative overflow-hidden">
          <!-- Dotted Top/Bottom Edge Decors for realistic paper receipt look -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_bottom,_var(--ui-border-muted)_1px,_transparent_1.5px)] bg-[size:8px_8px] bg-repeat-x opacity-40" />

          <!-- Receipt Header -->
          <div class="text-center pb-4 border-b border-dashed border-default">
            <h4 class="text-sm font-bold text-default tracking-wider">
              🏪 WARUNGKU DIGITAL
            </h4>
            <p class="text-[10px] text-muted mt-0.5">
              SME Management Platform
            </p>
            <p class="text-[10px] text-muted font-mono mt-2">
              Order: {{ order?.order_number || 'WK-2026-XXXX' }}
            </p>
            <p class="text-[9px] text-dimmed mt-0.5">
              {{ formatDate(order?.created_at) }}
            </p>
          </div>

          <!-- Customer Info -->
          <div
            v-if="order?.customer"
            class="py-2.5 border-b border-dashed border-default text-[10px]"
          >
            <div class="flex justify-between">
              <span>Pelanggan:</span>
              <span class="font-bold text-default">{{ order.customer.name }}</span>
            </div>
            <div
              v-if="order.customer.phone"
              class="flex justify-between mt-0.5"
            >
              <span>WhatsApp:</span>
              <span class="font-mono text-toned">+62{{ order.customer.phone }}</span>
            </div>
          </div>

          <!-- Items Ledger Table -->
          <div class="py-3 border-b border-dashed border-default flex flex-col gap-2">
            <div
              v-for="item in order?.items"
              :key="item.id"
              class="flex flex-col"
            >
              <div class="flex justify-between text-default font-semibold">
                <span class="truncate pr-4">{{ item.name || item.product?.name }}</span>
                <span>{{ formatRupiah(item.subtotal) }}</span>
              </div>
              <div class="flex justify-between text-[10px] text-muted">
                <span>{{ item.quantity }} {{ item.unit || item.product?.unit || 'pcs' }} x {{ formatRupiah(item.unit_price) }}</span>
                <span v-if="item.discount > 0">Potongan: {{ formatRupiah(item.discount) }}</span>
              </div>
            </div>
          </div>

          <!-- Payment Ledger Summary -->
          <div class="py-3 border-b border-dashed border-default flex flex-col gap-1.5 text-xs">
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span>{{ formatRupiah(order?.subtotal) }}</span>
            </div>
            <div
              v-if="order?.discount_amount > 0"
              class="flex justify-between text-error font-medium"
            >
              <span>Diskon Global:</span>
              <span>-{{ formatRupiah(order.discount_amount) }}</span>
            </div>
            <div class="flex justify-between text-sm font-black text-default pt-1 border-t border-dashed border-default/40">
              <span>TOTAL BELANJA:</span>
              <span>{{ formatRupiah(order?.total_amount) }}</span>
            </div>
          </div>

          <!-- Payment Method & Details -->
          <div class="pt-3 flex flex-col gap-1 text-[10px]">
            <div class="flex justify-between">
              <span>Metode Pembayaran:</span>
              <span class="font-bold uppercase text-default">{{ order?.payment?.method || 'CASH' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Uang Dibayar:</span>
              <span>{{ formatRupiah(order?.payment?.amount) }}</span>
            </div>
            <div class="flex justify-between text-default font-bold text-xs pt-1 border-t border-dashed border-default/40">
              <span>KEMBALIAN:</span>
              <span>{{ formatRupiah(order?.payment?.change_amount) }}</span>
            </div>
          </div>

          <!-- Barcode Mockup for visual realism -->
          <div class="flex flex-col items-center pt-5 pb-2">
            <div class="h-8 w-44 bg-[repeating-linear-gradient(90deg,_var(--ui-text-muted)_0px,_var(--ui-text-muted)_2px,_transparent_2px,_transparent_6px,_var(--ui-text-muted)_6px,_var(--ui-text-muted)_10px)] opacity-50" />
            <p class="text-[8px] text-dimmed mt-1 tracking-[4px] font-mono">
              *{{ order?.order_number }}*
            </p>
          </div>

          <!-- Receipt Footer Thank You message -->
          <div class="text-center pt-3 border-t border-dashed border-default text-[9px] text-dimmed">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p class="mt-0.5">
              Powered by WarungKu Platform
            </p>
          </div>

          <div class="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_top,_var(--ui-border-muted)_1px,_transparent_1.5px)] bg-[size:8px_8px] bg-repeat-x opacity-40" />
        </div>

        <!-- Receipt Actions Panel -->
        <div class="w-full grid grid-cols-2 gap-3 mt-6">
          <UButton
            icon="i-lucide-printer"
            label="Cetak Struk"
            color="neutral"
            variant="subtle"
            size="md"
            block
            class="rounded-xl font-bold shadow-sm"
            @click="handlePrint"
          />
          <UButton
            icon="i-lucide-message-square"
            label="WhatsApp"
            color="success"
            variant="subtle"
            size="md"
            block
            class="rounded-xl font-bold shadow-sm"
            :disabled="!order?.customer?.phone"
            @click="handleWhatsApp"
          />

          <UButton
            label="Transaksi Baru"
            icon="i-lucide-arrow-right"
            color="primary"
            size="md"
            block
            class="col-span-2 rounded-xl font-extrabold shadow-md mt-1"
            @click="startNew"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.scale-up-animation {
  animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleUp {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

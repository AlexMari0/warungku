<script setup lang="ts">
import type { Customer, PaymentMethod } from '~/core/types'

const paymentMeta = {
  cash: { label: 'Tunai', icon: 'i-lucide-banknote', color: 'success' },
  qris: { label: 'QRIS', icon: 'i-lucide-qr-code', color: 'primary' },
  gopay: { label: 'GoPay', icon: 'i-lucide-wallet', color: 'info' },
  ovo: { label: 'OVO', icon: 'i-lucide-wallet-2', color: 'neutral' },
  dana: { label: 'Dana', icon: 'i-lucide-credit-card', color: 'info' },
  transfer: { label: 'Transfer', icon: 'i-lucide-send', color: 'warning' }
}

defineProps<{
  cartTotal: number
  cartSubtotal: number
  discountAmount: number
  discountType: 'rp' | 'percent'
  discountValue: number
  paymentMethod: PaymentMethod
  amountPaid: number | null
  changeAmount: number
  quickCashAmounts: number[]
  selectedCustomerId: string | undefined
  customers: Customer[]
  hasCartItems: boolean
  processing: boolean
}>()

const emit = defineEmits<{
  'update:discountType': [value: 'rp' | 'percent']
  'update:discountValue': [value: number]
  'update:paymentMethod': [value: PaymentMethod]
  'update:amountPaid': [value: number | null]
  'update:selectedCustomerId': [value: string | undefined]
  'open-add-customer': []
  'cancel-transaction': []
  'checkout': []
}>()
</script>

<template>
  <div class="shrink-0 border-t border-default/60 pt-4 flex flex-col gap-3.5">
    <!-- Customer Select Dropdown -->
    <div class="flex items-center gap-2">
      <div class="flex-grow">
        <USelect
          :model-value="selectedCustomerId ?? undefined"
          placeholder="Pilih Pelanggan"
          class="w-full"
          size="md"
          :items="[
            { label: 'Pelanggan Umum (Luring)', value: 'general' },
            ...customers.map(c => ({ label: `${c.name} (${c.phone || 'No WhatsApp'})`, value: c.id }))
          ]"
          @update:model-value="emit('update:selectedCustomerId', $event as string | undefined)"
        />
      </div>
      <UButton
        icon="i-lucide-user-plus"
        color="neutral"
        variant="subtle"
        size="md"
        class="rounded-xl shrink-0"
        @click="emit('open-add-customer')"
      />
    </div>

    <!-- Global Discount Toggle and Input -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs text-toned font-semibold">Potongan / Diskon</span>
        <!-- Segmented Selector -->
        <div class="flex rounded-lg bg-muted/40 p-0.5 border border-default text-[10px]">
          <button
            type="button"
            class="px-2 py-0.5 rounded-md transition-all font-extrabold cursor-pointer"
            :class="[discountType === 'rp' ? 'bg-elevated text-primary shadow-xs' : 'text-muted hover:text-default']"
            @click="emit('update:discountType', 'rp')"
          >
            Rupiah (Rp)
          </button>
          <button
            type="button"
            class="px-2 py-0.5 rounded-md transition-all font-extrabold cursor-pointer"
            :class="[discountType === 'percent' ? 'bg-elevated text-primary shadow-xs' : 'text-muted hover:text-default']"
            @click="emit('update:discountType', 'percent')"
          >
            Persen (%)
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex-grow">
          <UInput
            :model-value="discountValue"
            type="number"
            min="0"
            :max="discountType === 'percent' ? 100 : undefined"
            :placeholder="discountType === 'percent' ? 'Contoh: 10' : '0'"
            size="sm"
            class="w-full font-mono font-bold"
            @update:model-value="emit('update:discountValue', Number($event) || 0)"
          >
            <template #leading>
              <span class="text-xs text-muted font-bold px-1">
                {{ discountType === 'percent' ? '%' : 'Rp' }}
              </span>
            </template>
          </UInput>
        </div>
      </div>
      <!-- Show calculated absolute discount when percent is selected -->
      <span v-if="discountType === 'percent' && discountValue > 0" class="text-[10px] font-mono text-muted text-right block">
        Setara dengan: <strong class="text-default font-bold">{{ formatRupiah(discountAmount) }}</strong>
      </span>
    </div>

    <!-- Payment Method Grid -->
    <div class="flex flex-col gap-1.5">
      <span class="text-[10px] font-bold text-muted uppercase tracking-wider">Metode Pembayaran</span>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="([val, meta]) in Object.entries(paymentMeta)"
          :key="val"
          class="flex flex-col items-center justify-center p-2 rounded-xl border border-default text-xs font-semibold gap-1.5 transition-all duration-200"
          :class="[
            paymentMethod === val
              ? 'bg-primary/10 text-primary border-primary shadow-sm ring-1 ring-primary'
              : 'bg-muted/10 text-toned hover:bg-muted/40 hover:text-default'
          ]"
          @click="emit('update:paymentMethod', val as any)"
        >
          <UIcon
            :name="meta.icon"
            class="size-4"
          />
          <span>{{ meta.label }}</span>
        </button>
      </div>
    </div>

    <!-- Financial Summary -->
    <div class="bg-muted/10 border border-default/40 p-4 rounded-2xl flex flex-col gap-2">
      <div class="flex justify-between text-xs text-toned">
        <span>Subtotal Keranjang</span>
        <span>{{ formatRupiah(cartSubtotal) }}</span>
      </div>
      <div
        v-if="discountAmount > 0"
        class="flex justify-between text-xs text-error font-medium"
      >
        <span>Diskon Belanja</span>
        <span>-{{ formatRupiah(discountAmount) }}</span>
      </div>

      <div class="h-px bg-default/40 my-1" />

      <div class="flex justify-between text-sm font-extrabold text-default">
        <span>TOTAL TAGIHAN</span>
        <span class="text-base font-black text-primary">{{ formatRupiah(cartTotal) }}</span>
      </div>
    </div>

    <!-- Cash input fields (Only displayed for Cash Payment Method) -->
    <div
      v-if="paymentMethod === 'cash' && hasCartItems"
      class="flex flex-col gap-2"
    >
      <div class="flex items-center gap-3">
        <span class="text-xs text-toned shrink-0 font-medium">Uang Diterima:</span>
        <div class="flex-grow">
          <UInput
            :model-value="amountPaid"
            type="number"
            placeholder="Jumlah cash dibayarkan"
            size="md"
            class="w-full font-bold"
            @update:model-value="emit('update:amountPaid', $event ? Number($event) : null)"
          >
            <template #leading>
              <span class="text-xs text-muted px-1">Rp</span>
            </template>
          </UInput>
        </div>
      </div>

      <!-- Quick Cash options -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
        <UButton
          v-for="amt in quickCashAmounts"
          :key="amt"
          :label="formatRupiah(amt)"
          size="xs"
          variant="subtle"
          color="neutral"
          class="rounded-lg font-mono shrink-0"
          @click="emit('update:amountPaid', amt)"
        />
      </div>

      <div
        v-if="amountPaid !== null && amountPaid >= cartTotal"
        class="flex justify-between items-center text-xs font-bold text-success bg-success/5 border border-success/20 p-2.5 rounded-xl"
      >
        <span>UANG KEMBALIAN:</span>
        <span class="font-mono text-sm font-extrabold">{{ formatRupiah(changeAmount) }}</span>
      </div>
    </div>

    <!-- Major CTA Button & Cancel Buttons -->
    <div class="flex items-center gap-3">
      <UButton
        v-if="hasCartItems"
        label="BATAL"
        icon="i-lucide-trash-2"
        color="error"
        variant="subtle"
        size="lg"
        class="rounded-2xl font-extrabold px-5 py-3.5 transition-all active:scale-[0.98] shrink-0"
        @click="emit('cancel-transaction')"
      />
      <UButton
        label="PROSES PEMBAYARAN"
        icon="i-lucide-arrow-right-circle"
        color="primary"
        size="lg"
        :class="[hasCartItems ? 'flex-grow' : 'w-full']"
        :disabled="!hasCartItems"
        :loading="processing"
        class="rounded-2xl font-black shadow-lg shadow-primary/20 py-3.5 transition-all active:scale-[0.98]"
        @click="emit('checkout')"
      />
    </div>
  </div>
</template>

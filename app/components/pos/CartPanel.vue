<script setup lang="ts">
import type { Product, CartItem } from '~/types'

defineProps<{
  cart: CartItem[]
  totalCount: number
  bestSellers: Product[]
}>()

const emit = defineEmits<{
  'increase-qty': [item: CartItem]
  'decrease-qty': [item: CartItem]
  'remove-from-cart': [item: CartItem]
  'reset-cart': []
  'add-to-cart': [product: Product]
}>()
</script>

<template>
  <div class="flex flex-col gap-5 h-full overflow-hidden">
    <!-- Checkout Basket Title -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon name="i-lucide-shopping-bag" class="size-5 text-primary shrink-0" />
        <h2 class="text-lg font-black text-default tracking-tight truncate">
          Keranjang Belanja
        </h2>
        <span class="px-2 py-0.5 rounded-full bg-muted/60 text-toned text-[10px] font-extrabold font-mono shrink-0">
          {{ totalCount }} Item
        </span>
      </div>
      <UButton
        v-if="cart.length > 0"
        label="Batal Transaksi"
        icon="i-lucide-rotate-ccw"
        color="error"
        variant="subtle"
        size="xs"
        class="font-bold rounded-xl active:scale-[0.98] shrink-0"
        @click="emit('reset-cart')"
      />
    </div>

    <!-- Dynamic Cart Items Pane -->
    <div class="flex-grow overflow-y-auto min-h-0 pr-1 flex flex-col gap-3">
      <!-- Empty Basket layout -->
      <div
        v-if="cart.length === 0"
        class="flex-grow flex flex-col items-center justify-center py-8 text-center"
      >
        <div class="size-14 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-2.5">
          <UIcon
            name="i-lucide-shopping-cart"
            class="size-7"
          />
        </div>
        <h4 class="font-bold text-sm text-default">
          Keranjang Belanja Kosong
        </h4>
        <p class="text-xs text-muted max-w-xs mt-1">
          Pilih produk di panel sebelah kiri untuk memulai pencatatan kasir.
        </p>

        <!-- Best Selling Products Shortcuts (Quick Add) -->
        <div v-if="bestSellers.length > 0" class="mt-8 w-full border-t border-default/40 pt-6">
          <span class="text-[10px] font-extrabold text-muted uppercase tracking-wider flex items-center gap-1.5 text-left mb-3">
            <UIcon name="i-lucide-zap" class="size-3.5 text-amber-500 shrink-0" />
            <span>Produk Terlaris (Quick Add)</span>
          </span>
          <div class="flex flex-col gap-2">
            <button
              v-for="p in bestSellers"
              :key="'best-' + p.id"
              type="button"
              class="flex items-center justify-between p-3 rounded-2xl bg-muted/20 hover:bg-primary/5 border border-default hover:border-primary/30 transition-all text-left active:scale-[0.98] w-full cursor-pointer"
              @click="emit('add-to-cart', p)"
            >
              <div class="flex items-center gap-2.5 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-elevated border border-default overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    v-if="p.image_url"
                    :src="p.image_url"
                    alt=""
                    class="size-full object-cover"
                  >
                  <UIcon
                    v-else
                    name="i-lucide-image"
                    class="size-4 text-muted"
                  />
                </div>
                <div class="overflow-hidden">
                  <div class="font-bold text-xs text-default truncate leading-tight">{{ p.name }}</div>
                  <span class="text-[10px] text-muted font-mono leading-none">
                    Stok: <strong class="font-mono font-bold">{{ p.stock_qty }}</strong> {{ p.unit }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="font-extrabold text-xs text-default font-mono">{{ formatRupiah(p.sell_price) }}</span>
                <div class="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <UIcon name="i-lucide-plus" class="size-3.5 stroke-[3]" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Populated cart list -->
      <div
        v-else
        class="flex flex-col gap-3"
      >
        <div
          v-for="item in cart"
          :key="item.id || item.product_id"
          class="bg-muted/20 border border-default/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:border-primary/20 transition-all"
        >
          <div class="overflow-hidden flex-grow flex flex-col">
            <h4 class="font-bold text-xs text-default truncate">
              {{ item.name }}
            </h4>
            <p class="text-[10px] text-muted font-mono mt-0.5">
              {{ formatRupiah(item.unit_price) }} / {{ item.unit }}
            </p>
            <span class="text-xs font-black text-default mt-1">{{ formatRupiah(item.subtotal) }}</span>
          </div>

          <!-- Quantity adjusters -->
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              icon="i-lucide-minus"
              color="neutral"
              variant="subtle"
              size="xs"
              class="rounded-lg"
              @click="emit('decrease-qty', item)"
            />
            <span class="font-extrabold text-sm text-default w-6 text-center">{{ item.quantity }}</span>
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="subtle"
              size="xs"
              class="rounded-lg"
              @click="emit('increase-qty', item)"
            />
          </div>

          <!-- Remove item -->
          <UButton
            icon="i-lucide-trash"
            color="error"
            variant="ghost"
            size="xs"
            class="rounded-lg shrink-0 text-muted hover:text-error"
            @click="emit('remove-from-cart', item)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

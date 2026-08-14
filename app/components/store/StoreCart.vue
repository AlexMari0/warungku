<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  cart: { product: any; quantity: number; custom_description: string | null }[]
  cartTotalCount: number
  cartSubtotal: number
  customerName: string
  customerPhone: string
  customerNotes: string
  checkingOut: boolean
  activeThemeClasses: any
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:customerName': [value: string]
  'update:customerPhone': [value: string]
  'update:customerNotes': [value: string]
  'add-to-cart': [item: any]
  'remove-from-cart': [productId: string]
  'checkout': []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
      
      <!-- Close click backdrop -->
      <div class="absolute inset-0" @click="emit('update:isOpen', false)"></div>

      <!-- Drawer pane sheet -->
      <div class="relative w-full max-w-md bg-elevated h-full shadow-2xl flex flex-col justify-between border-l border-default pt-6 z-10">
        
        <!-- Drawer header -->
        <div class="px-6 pb-4 border-b border-default flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-shopping-cart" class="size-5 text-primary" />
            <h3 class="text-base font-bold text-default">Keranjang Belanja</h3>
            <span class="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-full text-toned">{{ cartTotalCount }}</span>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            class="rounded-full shrink-0 cursor-pointer"
            @click="emit('update:isOpen', false)"
          />
        </div>

        <!-- Drawer body: items list -->
        <div class="flex-grow overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          
          <!-- Empty state in cart -->
          <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center gap-3 text-center opacity-60">
            <UIcon name="i-lucide-shopping-bag" class="size-12 text-muted" />
            <p class="text-xs text-toned">Keranjang Anda masih kosong.</p>
          </div>

          <div v-else class="space-y-3.5">
            <div
              v-for="item in cart"
              :key="item.product.id"
              class="flex items-center gap-3 p-3 rounded-2xl border border-default bg-muted/5 justify-between"
            >
              <!-- Image -->
              <div class="size-11 rounded-lg overflow-hidden bg-muted/20 border border-default shrink-0">
                <img v-if="item.product.image_url" :src="item.product.image_url" alt="" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center text-muted"><UIcon name="i-lucide-package" class="size-4" /></div>
              </div>

              <!-- Name and subtotal -->
              <div class="flex-grow text-left space-y-0.5">
                <h5 class="text-xs font-bold text-default truncate">{{ item.product.name }}</h5>
                <p class="text-[10px] font-mono text-muted">{{ formatRupiah(item.product.sell_price) }}</p>
              </div>

              <!-- Qty Adjustment counts -->
              <div class="flex items-center border border-default rounded-xl overflow-hidden bg-elevated shrink-0">
                <button
                  type="button"
                  class="size-6 text-xs text-toned hover:text-default hover:bg-muted/30 cursor-pointer flex items-center justify-center"
                  @click="emit('remove-from-cart', item.product.id)"
                >
                  -
                </button>
                <span class="px-2 text-xs font-mono font-bold text-default">{{ item.quantity }}</span>
                <button
                  type="button"
                  class="size-6 text-xs text-toned hover:text-default hover:bg-muted/30 cursor-pointer flex items-center justify-center"
                  @click="emit('add-to-cart', { products: item.product, custom_description: item.custom_description })"
                >
                  +
                </button>
              </div>
            </div>

            <!-- ORDER PLACEMENT USER METADATA FORM -->
            <div class="pt-6 border-t border-default space-y-4">
              <div class="flex items-center gap-1">
                <UIcon name="i-lucide-user" class="size-4 text-toned" />
                <span class="text-[10px] font-mono font-bold tracking-wider text-muted uppercase">Formulir Pemesanan</span>
              </div>

              <div class="space-y-3 text-left">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-default uppercase tracking-wider">Nama Lengkap Anda</label>
                  <input
                    :value="customerName"
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-default placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-1 outline-none transition-all"
                    :class="[!activeThemeClasses.isCustom ? activeThemeClasses.ringColor : 'focus:ring-[var(--accent-ring)]']"
                    :style="activeThemeClasses.isCustom ? { '--accent-ring': activeThemeClasses.customColor + '4D' } : {}"
                    @input="emit('update:customerName', ($event.target as HTMLInputElement).value)"
                  />
                </div>

                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-default uppercase tracking-wider">No. Telepon / WhatsApp</label>
                  <input
                    :value="customerPhone"
                    type="text"
                    placeholder="Contoh: 08123456789"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-default placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-1 outline-none transition-all"
                    :class="[!activeThemeClasses.isCustom ? activeThemeClasses.ringColor : 'focus:ring-[var(--accent-ring)]']"
                    :style="activeThemeClasses.isCustom ? { '--accent-ring': activeThemeClasses.customColor + '4D' } : {}"
                    @input="emit('update:customerPhone', ($event.target as HTMLInputElement).value)"
                  />
                </div>

                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-default uppercase tracking-wider">Alamat &amp; Catatan Tambahan</label>
                  <textarea
                    :value="customerNotes"
                    rows="2"
                    placeholder="Tulis alamat kirim atau catatan..."
                    class="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-default placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-1 outline-none resize-none transition-all"
                    :class="[!activeThemeClasses.isCustom ? activeThemeClasses.ringColor : 'focus:ring-[var(--accent-ring)]']"
                    :style="activeThemeClasses.isCustom ? { '--accent-ring': activeThemeClasses.customColor + '4D' } : {}"
                    @input="emit('update:customerNotes', ($event.target as HTMLTextAreaElement).value)"
                  ></textarea>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- Drawer footer payments summary -->
        <div class="p-6 border-t border-default space-y-4 bg-muted/5 shrink-0">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-toned">
              <span>Subtotal Belanja</span>
              <span class="font-mono font-medium">{{ formatRupiah(cartSubtotal) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-toned">
              <span>Biaya Pengiriman</span>
              <span
                class="font-mono font-medium"
                :class="[!activeThemeClasses.isCustom ? activeThemeClasses.textColor : '']"
                :style="activeThemeClasses.isCustom ? { color: activeThemeClasses.customColor } : {}"
              >
                Gratis (COD)
              </span>
            </div>
            <div class="flex items-center justify-between text-sm font-extrabold text-default border-t border-default/40 pt-2">
              <span>Total Pembayaran</span>
              <span class="font-mono">{{ formatRupiah(cartSubtotal) }}</span>
            </div>
          </div>

          <button
            type="button"
            class="w-full py-3 rounded-2xl text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
            :class="[cart.length === 0 || !customerName || !customerPhone ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 pointer-events-none' : (!activeThemeClasses.isCustom ? activeThemeClasses.buttonBg : '')]"
            :style="activeThemeClasses.isCustom && cart.length > 0 && customerName && customerPhone ? { backgroundColor: activeThemeClasses.customColor } : {}"
            :disabled="cart.length === 0 || !customerName || !customerPhone"
            @click="emit('checkout')"
          >
            <UIcon v-if="checkingOut" name="i-lucide-loader" class="size-4 animate-spin" />
            <UIcon v-else name="i-lucide-shopping-cart" class="size-4" />
            {{ checkingOut ? 'Memproses Pesanan...' : 'Pesan Sekarang &amp; Kirim WhatsApp' }}
          </button>
        </div>

      </div>

    </div>
  </Transition>
</template>

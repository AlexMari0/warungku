<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const route = useRoute()
const colorMode = useColorMode()

const isSidebarExpanded = ref(true)
const isOnline = ref(true)

onMounted(() => {
  if (import.meta.client) {
    isOnline.value = navigator.onLine
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
  }
})

const displayUser = computed(() => {
  return user.value
})

const userItems = computed(() => [
  [{
    label: displayUser.value?.email || 'Pengguna',
    slot: 'account',
    disabled: true
  }],
  [{
    label: 'Profil Toko',
    icon: 'i-lucide-store',
    to: '/settings/profile'
  }, {
    label: 'Pengaturan',
    icon: 'i-lucide-settings',
    to: '/settings'
  }],
  [{
    label: 'Keluar',
    icon: 'i-lucide-log-out',
    color: 'error' as const,
    onClick: async () => {
      await supabase.auth.signOut()
      toast.add({
        title: 'Berhasil keluar',
        description: 'Sampai jumpa lagi di WarungKu!',
        color: 'success'
      })
      await navigateTo('/login')
    }
  }]
])

// Helper to get friendly name
const friendlyName = computed(() => {
  if (!displayUser.value) return 'Pengguna'
  const meta = displayUser.value.user_metadata
  if (meta?.name) return meta.name
  if (meta?.full_name) return meta.full_name
  // If email looks like a UUID or timestamp test, fallback to default
  const emailName = displayUser.value.email?.split('@')[0] || ''
  if (emailName.includes('_') && /\d{5,}/.test(emailName)) {
    return 'Admin Toko'
  }
  return emailName || 'Admin Toko'
})
</script>

<template>
  <div class="h-dvh flex bg-muted/10 text-default overflow-hidden font-sans">
    <!-- Unified Collapsible Sidebar -->
    <aside
      :class="[isSidebarExpanded ? 'w-64' : 'w-[84px]']"
      class="flex flex-col justify-between shrink-0 bg-elevated border-r border-default transition-all duration-300 ease-in-out z-20 relative"
    >
      <!-- Expand/Collapse Toggle Button -->
      <UButton
        :icon="isSidebarExpanded ? 'i-lucide-chevron-left' : 'i-lucide-chevron-right'"
        color="neutral"
        variant="soft"
        size="sm"
        class="absolute -right-4 top-7 rounded-full shadow-md border border-default z-30 transition-all hover:scale-110 active:scale-95 bg-elevated hover:bg-muted dark:hover:bg-zinc-800 text-default hover:text-primary"
        @click="isSidebarExpanded = !isSidebarExpanded"
      />

      <div class="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-2 no-scrollbar">
        <!-- Top Section: Brand Emblem -->
        <div
          class="flex items-center px-4 gap-3 mb-8"
          :class="isSidebarExpanded ? 'justify-start' : 'justify-center'"
        >
          <NuxtLink
            to="/"
            class="group flex items-center justify-center p-2 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors shrink-0"
          >
            <AppLogoIcon class="size-7 text-primary transition-transform duration-300 group-hover:scale-110" />
          </NuxtLink>
          <transition
            enter-active-class="transition-[opacity,transform] duration-300 delay-100"
            leave-active-class="transition-[opacity,transform] duration-200"
            enter-from-class="opacity-0 translate-x-2"
            enter-to-class="opacity-100 translate-x-0"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 translate-x-2"
          >
            <div v-if="isSidebarExpanded" class="flex flex-col">
              <span class="font-bold text-lg text-default tracking-tight whitespace-nowrap leading-none">WarungKu</span>
              <transition
                enter-active-class="transition-[opacity,transform] duration-300"
                leave-active-class="transition-[opacity,transform] duration-200"
                enter-from-class="opacity-0 -translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <span v-if="!isOnline" class="text-[10px] text-error font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                  <UIcon name="i-lucide-wifi-off" class="size-3" /> Offline
                </span>
              </transition>
            </div>
          </transition>
        </div>

        <!-- Navigation Groups -->
        <nav class="flex flex-col gap-6 px-3">
          <!-- GROUP: MARKETING / DASHBOARD -->
          <div class="flex flex-col gap-1">
            <transition name="fade">
              <p
                v-if="isSidebarExpanded"
                class="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-3 mb-1 whitespace-nowrap"
              >
                Utama
              </p>
            </transition>
            <SidebarItem
              to="/"
              icon="i-lucide-layout-dashboard"
              label="Beranda"
              :active="route.path === '/'"
              :collapsed="!isSidebarExpanded"
            />
            <SidebarItem
              to="/ai"
              icon="i-lucide-sparkles"
              label="Asisten AI"
              :active="route.path.startsWith('/ai')"
              :collapsed="!isSidebarExpanded"
            />
          </div>

          <!-- GROUP: INVENTORY -->
          <div class="flex flex-col gap-1">
            <transition name="fade">
              <p
                v-if="isSidebarExpanded"
                class="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-3 mb-1 whitespace-nowrap"
              >
                Produk
              </p>
            </transition>
            <SidebarItem
              to="/stock"
              icon="i-lucide-package"
              label="Semua Produk"
              :active="route.path === '/stock'"
              :collapsed="!isSidebarExpanded"
            />
            <SidebarItem
              to="/stock/movements"
              icon="i-lucide-history"
              label="Riwayat Mutasi"
              :active="route.path === '/stock/movements'"
              :collapsed="!isSidebarExpanded"
            />
          </div>

          <!-- GROUP: TRANSACTIONS -->
          <div class="flex flex-col gap-1">
            <transition name="fade">
              <p
                v-if="isSidebarExpanded"
                class="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-3 mb-1 whitespace-nowrap"
              >
                Transaksi
              </p>
            </transition>
            <SidebarItem
              to="/pos"
              icon="i-lucide-calculator"
              label="Kasir Digital"
              :active="route.path === '/pos'"
              :collapsed="!isSidebarExpanded"
            />
            <SidebarItem
              to="/reports"
              icon="i-lucide-pie-chart"
              label="Ringkasan Penjualan"
              :active="route.path === '/reports'"
              :collapsed="!isSidebarExpanded"
            />
            <SidebarItem
              v-if="isSidebarExpanded"
              to="/reports/products"
              icon="i-lucide-package-check"
              label="Penjualan Produk"
              :active="route.path === '/reports/products'"
              :collapsed="!isSidebarExpanded"
              class="ml-4"
            />
            <SidebarItem
              v-if="isSidebarExpanded"
              to="/reports/payments"
              icon="i-lucide-wallet"
              label="Metode Pembayaran"
              :active="route.path === '/reports/payments'"
              :collapsed="!isSidebarExpanded"
              class="ml-4"
            />
          </div>

          <!-- GROUP: SYSTEM -->
          <div class="flex flex-col gap-1">
            <transition name="fade">
              <p
                v-if="isSidebarExpanded"
                class="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-3 mb-1 whitespace-nowrap"
              >
                Sistem
              </p>
            </transition>
            <SidebarItem
              to="/settings"
              icon="i-lucide-settings"
              label="Pengaturan"
              :active="route.path === '/settings'"
              :collapsed="!isSidebarExpanded"
            />

            <!-- Dark Mode Toggle Row -->
            <UTooltip
              text="Mode Gelap"
              :disabled="isSidebarExpanded"
              side="right"
              :ui="{ content: 'max-w-fit' }"
            >
              <div
                class="flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group cursor-pointer text-toned hover:bg-muted/50 hover:text-default"
                :class="[!isSidebarExpanded ? 'justify-center px-0 mx-2' : 'px-3']"
                @click="colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'"
              >
                <UIcon
                  :name="colorMode.preference === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
                  class="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105 group-hover:text-default"
                />
                <transition
                  enter-active-class="transition-[width,opacity] duration-300 overflow-hidden"
                  leave-active-class="transition-[width,opacity] duration-300 overflow-hidden"
                  enter-from-class="opacity-0 w-0"
                  enter-to-class="opacity-100 w-auto"
                  leave-from-class="opacity-100 w-auto"
                  leave-to-class="opacity-0 w-0"
                >
                  <span
                    v-if="isSidebarExpanded"
                    class="truncate flex-1 whitespace-nowrap"
                  >Mode Gelap</span>
                </transition>
                <USwitch
                  v-if="isSidebarExpanded"
                  :model-value="colorMode.preference === 'dark'"
                  size="sm"
                  class="shrink-0"
                />
              </div>
            </UTooltip>
          </div>
        </nav>
      </div>

      <!-- Bottom Section: User & Logout -->
      <div class="flex flex-col gap-2 p-4 mt-auto border-t border-default/50 bg-elevated/50">
        <!-- User Profile Row -->
        <div
          class="flex items-center gap-3"
          :class="!isSidebarExpanded ? 'justify-center' : ''"
        >
          <div class="relative shrink-0 select-none">
            <UAvatar
              src="https://i.pravatar.cc/150?u=warungkuadmin2026"
              alt="Profile"
              size="sm"
              class="ring-2 ring-primary/20"
            />
            <!-- Pulsing Connection Status Badge -->
            <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900" :class="isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-error'" />
          </div>
          <transition
            enter-active-class="transition-[width,opacity] duration-300 overflow-hidden"
            leave-active-class="transition-[width,opacity] duration-300 overflow-hidden"
            enter-from-class="opacity-0 w-0"
            enter-to-class="opacity-100 w-auto"
            leave-from-class="opacity-100 w-auto"
            leave-to-class="opacity-0 w-0"
          >
            <div
              v-if="isSidebarExpanded"
              class="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span class="text-sm font-bold text-default truncate">{{ friendlyName }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-muted font-medium truncate uppercase tracking-wider">Admin Manager</span>
                <span class="text-[9px] font-semibold tracking-wider flex items-center gap-0.5" :class="isOnline ? 'text-emerald-500' : 'text-error'">
                  <span class="w-1 h-1 rounded-full shrink-0" :class="isOnline ? 'bg-emerald-500' : 'bg-error'" />
                  {{ isOnline ? 'Online' : 'Offline' }}
                </span>
              </div>
            </div>
          </transition>
        </div>

        <!-- Logout Link -->
        <UTooltip
          text="Keluar"
          :disabled="isSidebarExpanded"
          side="right"
          :ui="{ content: 'max-w-fit' }"
        >
          <button
            class="flex items-center gap-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 group cursor-pointer text-error/80 hover:bg-error/10 hover:text-error w-full mt-1"
            :class="[!isSidebarExpanded ? 'justify-center px-0' : 'px-3']"
            @click="async () => {
              await supabase.auth.signOut()
              toast.add({
                title: 'Berhasil keluar',
                description: 'Sampai jumpa lagi!',
                color: 'success'
              })
              await navigateTo('/login')
            }"
          >
            <UIcon
              name="i-lucide-log-out"
              class="size-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            <transition
              enter-active-class="transition-[width,opacity] duration-300 overflow-hidden"
              leave-active-class="transition-[width,opacity] duration-300 overflow-hidden"
              enter-from-class="opacity-0 w-0"
              enter-to-class="opacity-100 w-auto"
              leave-from-class="opacity-100 w-auto"
              leave-to-class="opacity-0 w-0"
            >
              <span
                v-if="isSidebarExpanded"
                class="truncate flex-1 text-left whitespace-nowrap"
              >Keluar Akun</span>
            </transition>
          </button>
        </UTooltip>
      </div>
    </aside>

    <!-- 3. Main Area -->
    <main class="flex-grow flex flex-col min-w-0 relative">
      <!-- Top Mobile Navigation Bar -->
      <header class="md:hidden flex items-center justify-between px-6 py-4 bg-elevated border-b border-default z-20">
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <AppLogoIcon class="size-7" />
          <span class="font-bold text-lg text-default tracking-tight">WarungKu</span>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <UColorModeButton
            variant="ghost"
            color="neutral"
          />

          <UDropdownMenu
            v-if="user"
            :items="userItems"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-menu"
            />
          </UDropdownMenu>
        </div>
      </header>

      <!-- Scrollable Content Pane -->
      <div class="flex-grow overflow-y-auto px-4 md:px-8 py-6 z-0">
        <slot />
      </div>
    </main>
  </div>
</template>

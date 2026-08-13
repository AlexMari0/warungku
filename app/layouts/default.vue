<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const route = useRoute()
const colorMode = useColorMode()

const isSidebarExpanded = ref(true)

const displayUser = computed<any>(() => {
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

// Identify the active main module
const activeModule = computed(() => {
  if (route.path.startsWith('/stock')) return 'stock'
  if (route.path.startsWith('/pos')) return 'pos'
  if (route.path.startsWith('/reports')) return 'reports'
  if (route.path.startsWith('/settings')) return 'settings'
  if (route.path.startsWith('/ai')) return 'ai'
  return 'dashboard'
})

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

// Sub-sidebar items for Stock module
const stockMenuItems = [
  { label: 'Semua Produk', icon: 'i-lucide-package', to: '/stock' },
  { label: 'Mutasi Stok', icon: 'i-lucide-history', to: '/stock/movements' }
]

// Sub-sidebar items for Reports module
const reportsMenuItems = [
  { label: 'Ringkasan', icon: 'i-lucide-pie-chart', to: '/reports' },
  { label: 'Penjualan Produk', icon: 'i-lucide-package-check', to: '/reports/products' },
  { label: 'Metode Pembayaran', icon: 'i-lucide-wallet', to: '/reports/payments' }
]
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
            <span
              v-if="isSidebarExpanded"
              class="font-bold text-lg text-default tracking-tight whitespace-nowrap"
            >WarungKu</span>
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
                <UToggle
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
            <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
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
                <span class="text-[9px] text-emerald-500 font-semibold tracking-wider flex items-center gap-0.5">
                  <span class="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                  Online
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

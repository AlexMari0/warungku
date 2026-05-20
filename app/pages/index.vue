<script setup lang="ts">
import { Motion } from 'motion-v'

const user = useSupabaseUser()

const bentoItems = [
  {
    id: 'pos',
    label: 'Kasir Digital',
    description: 'Proses transaksi real-time dengan cepat.',
    icon: 'i-lucide-calculator',
    to: '/pos',
    colSpan: 'md:col-span-2',
    rowSpan: 'md:row-span-2',
    bg: 'bg-primary/5',
    color: 'text-primary',
    delay: 0.1
  },
  {
    id: 'stock',
    label: 'Manajemen Stok',
    description: 'Pantau inventaris dan mutasi barang.',
    icon: 'i-lucide-package',
    to: '/stock',
    colSpan: 'md:col-span-1',
    rowSpan: 'md:row-span-1',
    bg: 'bg-elevated',
    color: 'text-default',
    delay: 0.2
  },
  {
    id: 'reports',
    label: 'Laporan Bisnis',
    description: 'Analitik dan ringkasan penjualan otomatis.',
    icon: 'i-lucide-bar-chart-3',
    to: '/reports',
    colSpan: 'md:col-span-1',
    rowSpan: 'md:row-span-1',
    bg: 'bg-elevated',
    color: 'text-default',
    delay: 0.3
  },
  {
    id: 'settings',
    label: 'Pengaturan Sistem',
    description: 'Konfigurasi profil dan preferensi.',
    icon: 'i-lucide-settings',
    to: '/settings',
    colSpan: 'md:col-span-2',
    rowSpan: 'md:row-span-1',
    bg: 'bg-muted/10',
    color: 'text-muted',
    delay: 0.4
  }
]
</script>

<template>
  <div class="min-h-[100dvh] w-full bg-gradient-to-br from-white via-zinc-50/40 to-primary/5 dark:from-zinc-950 dark:via-zinc-900/30 dark:to-primary/5 font-sans selection:bg-primary/30 selection:text-primary overflow-x-hidden">
    <!-- Asymmetric Hero Section -->
    <section class="max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-16 lg:pt-32 lg:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
      <!-- Left Typography (Span 7) -->
      <div class="lg:col-span-7 flex flex-col gap-8 items-start relative z-10">
        <ClientOnly>
          <Motion
            :initial="{ opacity: 0, y: 30 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.8, type: 'spring', bounce: 0.2 }"
          >
            <UBadge
              variant="subtle"
              color="primary"
              class="rounded-full px-3 py-1 font-mono text-xs mb-2 tracking-widest uppercase"
            >
              WarungKu OS v2.0
            </UBadge>
          </Motion>

          <Motion
            :initial="{ opacity: 0, y: 30 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.8, type: 'spring', bounce: 0.2, delay: 0.1 }"
          >
            <h1 class="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] text-zinc-950 dark:text-zinc-50 max-w-[15ch]">
              Kendali penuh atas <span class="text-primary italic pr-2">warung</span> anda.
            </h1>
          </Motion>

          <Motion
            :initial="{ opacity: 0, y: 30 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.8, type: 'spring', bounce: 0.2, delay: 0.2 }"
          >
            <p class="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-[45ch]">
              Sistem operasi bisnis generasi baru yang menggabungkan point-of-sale ultra-cepat dengan pelacakan inventaris otonom. Tidak ada lagi pencatatan manual.
            </p>
          </Motion>

          <Motion
            :initial="{ opacity: 0, y: 30 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.8, type: 'spring', bounce: 0.2, delay: 0.3 }"
            class="mt-4"
          >
            <UButton
              to="/pos"
              size="xl"
              color="primary"
              icon="i-lucide-arrow-right"
              class="rounded-2xl px-8 shadow-xl shadow-primary/20 transition-transform hover:-translate-y-1"
            >
              Buka Kasir Sekarang
            </UButton>
          </Motion>
        </ClientOnly>
      </div>

      <!-- Right Visual/Abstract (Span 5) -->
      <div class="lg:col-span-5 relative w-full aspect-square md:aspect-auto md:h-[500px] flex items-center justify-center">
        <!-- Ambient Green Glowing Spotlight Orb -->
        <div class="absolute -right-12 top-12 w-[400px] h-[400px] rounded-full bg-primary/20 blur-3xl opacity-70 pointer-events-none select-none z-0" />
        
        <!-- Decorative grid watermark in background -->
        <div class="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-60 rounded-[3rem] pointer-events-none z-0" />

        <ClientOnly>
          <!-- Abstract Floating UI Element to represent POS/Data -->
          <Motion
            :initial="{ opacity: 0, scale: 0.8, rotate: -5 }"
            :animate="{ opacity: 1, scale: 1, rotate: 0 }"
            :transition="{ duration: 1.2, type: 'spring', bounce: 0.3, delay: 0.2 }"
            class="absolute right-0 top-1/2 -translate-y-1/2 w-[110%] max-w-[500px] bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] p-8 overflow-hidden pointer-events-none select-none z-10"
          >
            <!-- Liquid Glass Refraction Border -->
            <div class="absolute inset-0 rounded-[3rem] border border-white/40 dark:border-white/5 pointer-events-none" />

            <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6 mb-6">
              <div class="flex gap-3">
                <div class="w-3 h-3 rounded-full bg-error/85" />
                <div class="w-3 h-3 rounded-full bg-warning/85" />
                <div class="w-3 h-3 rounded-full bg-success/85" />
              </div>
              <span class="text-[9px] font-extrabold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase px-2.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80">
                Ilustrasi Preview
              </span>
            </div>

            <!-- Perpetual Auto-Scrolling List Mockup with Fade Out -->
            <div class="relative overflow-hidden">
              <div class="space-y-4">
                <Motion
                  v-for="i in 4"
                  :key="i"
                  :animate="{ x: ['100%', '0%'] }"
                  :transition="{ duration: 0.6, type: 'spring', bounce: 0.2, delay: 0.4 + (i * 0.1) }"
                  class="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50"
                  :class="i === 4 ? 'opacity-20' : i === 3 ? 'opacity-60' : 'opacity-100'"
                >
                  <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UIcon
                      name="i-lucide-shopping-cart"
                      class="text-primary size-5"
                    />
                  </div>
                  <div class="flex-1 space-y-2">
                    <div class="h-2.5 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                    <div class="h-2 w-1/3 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                  </div>
                  <div class="h-3 w-16 bg-primary/20 rounded-full" />
                </Motion>
              </div>
              <!-- Elegant fade-out covering the bottom elements -->
              <div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent pointer-events-none" />
            </div>
          </Motion>
        </ClientOnly>
      </div>
    </section>

    <!-- Bento Grid Section -->
    <section class="max-w-7xl mx-auto px-6 md:px-12 pb-24">
      <div class="mb-12">
        <h2 class="text-sm font-bold text-zinc-400 tracking-widest uppercase mb-2">
          Modul Inti
        </h2>
        <div class="h-px w-24 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <ClientOnly>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[220px]">
          <Motion
            v-for="item in bentoItems"
            :key="item.id"
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, type: 'spring', bounce: 0.2, delay: 0.4 + item.delay }"
            :class="[item.colSpan, item.rowSpan]"
            class="group"
          >
            <NuxtLink
              :to="item.to"
              class="block w-full h-full"
            >
              <div
                :class="[item.bg]"
                class="relative w-full h-full rounded-[2.5rem] border border-slate-200/60 dark:border-zinc-800/60 p-8 flex flex-col justify-between overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)]"
              >
                <!-- Liquid Glass Inner Refraction -->
                <div class="absolute inset-0 rounded-[2.5rem] border border-white/60 dark:border-white/5 pointer-events-none" />

                <!-- Top Icon -->
                <div class="flex justify-between items-start">
                  <div class="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 ease-out">
                    <UIcon
                      :name="item.icon"
                      :class="item.color"
                      class="size-6"
                    />
                  </div>
                  <UIcon
                    name="i-lucide-arrow-up-right"
                    class="size-5 text-zinc-300 dark:text-zinc-600 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500 ease-out"
                  />
                </div>

                <!-- Content -->
                <div class="mt-auto relative z-10">
                  <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">{{ item.label }}</h3>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-[25ch]">
                    {{ item.description }}
                  </p>
                </div>

                <!-- Subtle Gradient Glow on Hover -->
                <div class="absolute -inset-px rounded-[2.5rem] bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </NuxtLink>
          </Motion>
        </div>
      </ClientOnly>
    </section>
  </div>
</template>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
    <!-- Subtle Background Pattern -->
    <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
      <div
        class="absolute inset-0"
        style="background-image: radial-gradient(circle at 2px 2px, var(--color-primary-500) 1px, transparent 0); background-size: 40px 40px;"
      />
    </div>

    <div class="relative z-10 w-full flex flex-col items-center px-4">
      <NuxtLink
        to="/"
        class="mb-8"
      >
        <AppLogo class="h-10 w-auto" />
      </NuxtLink>

      <UCard class="w-full max-w-sm shadow-xl">
        <slot />
      </UCard>
    </div>
  </div>
</template>

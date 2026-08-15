<script setup lang="ts">
defineProps<{
  to?: string
  icon: string
  label: string
  active?: boolean
  badge?: string | number
  collapsed?: boolean
}>()
</script>

<template>
  <UTooltip
    :text="label"
    :disabled="!collapsed"
    side="right"
    :ui="{ content: 'max-w-fit' }"
  >
    <ULink
      :to="to"
      class="flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative"
      :class="[
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-toned hover:bg-muted/50 hover:text-default',
        collapsed ? 'justify-center px-0 mx-2' : 'px-3'
      ]"
    >
      <UIcon
        :name="icon"
        class="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105"
        :class="[active ? 'text-primary' : 'text-muted group-hover:text-default']"
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
          v-if="!collapsed"
          class="truncate flex-1"
        >{{ label }}</span>
      </transition>

      <!-- Optional Badge -->
      <span
        v-if="badge !== undefined && badge !== '' && !collapsed"
        class="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full"
        :class="[active ? 'bg-primary/20 text-primary' : 'bg-muted text-toned']"
      >
        {{ badge }}
      </span>

      <!-- Active Indicator Pill on the left -->
      <div
        v-if="active"
        class="absolute left-0 top-1/4 w-1 h-1/2 bg-primary"
        :class="collapsed ? 'rounded-r-full -ml-2' : 'rounded-r-full'"
      />
    </ULink>
  </UTooltip>
</template>

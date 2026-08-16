<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Customer } from '~/core/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [customer: Customer]
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const { createCustomer } = useCustomers()
const submittings = ref(false)
const toast = useToast()
const customerSchema = z.object({
  name: z.string().min(3, 'Nama pelanggan minimal 3 karakter'),
  phone: z.string().optional().or(z.literal(''))
})

type CustomerSchema = z.output<typeof customerSchema>

const state = reactive<Partial<CustomerSchema>>({
  name: '',
  phone: ''
})

function resetForm() {
  state.name = ''
  state.phone = ''
}

async function onSubmit(event: FormSubmitEvent<CustomerSchema>) {
  submittings.value = true
  try {
    const result = await createCustomer({
      name: event.data.name,
      phone: event.data.phone || undefined
    })

    if (result.success && result.data) {
      toast.add({
        title: 'Pelanggan ditambahkan',
        description: `Pelanggan "${event.data.name}" berhasil terdaftar.`,
        color: 'success'
      })
      emit('saved', result.data)
      isOpen.value = false
      resetForm()
    } else {
      toast.add({
        title: 'Gagal menambah pelanggan',
        description: result.error || 'Terjadi kesalahan.',
        color: 'error'
      })
    }
  } finally {
    submittings.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Tambah Pelanggan Baru"
    class="max-w-md"
  >
    <template #body>
      <UForm
        :schema="customerSchema"
        :state="state"
        class="space-y-5"
        @submit="onSubmit"
      >
        <!-- Name -->
        <UFormField
          name="name"
          label="Nama Lengkap Pelanggan"
          required
        >
          <UInput
            v-model="state.name"
            placeholder="Misal: Budi Santoso"
            class="w-full"
            size="md"
          />
        </UFormField>

        <!-- Phone Number -->
        <UFormField
          name="phone"
          label="No. Telepon / WhatsApp (Opsional)"
        >
          <UInput
            v-model="state.phone"
            placeholder="Misal: 081234567890"
            class="w-full"
            size="md"
            type="tel"
          >
            <template #leading>
              <span class="text-xs text-muted font-bold px-1">+62</span>
            </template>
          </UInput>
          <p class="text-[10px] text-muted mt-1">
            Dapat digunakan untuk pengiriman struk digital via WhatsApp.
          </p>
        </UFormField>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-default">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            class="rounded-xl font-medium"
            @click="isOpen = false"
          />
          <UButton
            type="submit"
            label="Daftarkan Pelanggan"
            :loading="submittings"
            class="rounded-xl font-bold"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

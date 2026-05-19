<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [customer: any]
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()
const submittings = ref(false)

const { isDemo } = useDemoMode()

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

  if (isDemo.value) {
    // Demo Mode: Local Storage
    const newCustomer = {
      id: `cust-${Date.now()}`,
      merchant_id: 'demo-merchant-id',
      name: event.data.name,
      phone: event.data.phone || null,
      total_debt: 0,
      loyalty_points: 0,
      created_at: new Date().toISOString()
    }

    try {
      const rawCusts = localStorage.getItem('warungku_customers')
      const customersList = rawCusts ? JSON.parse(rawCusts) : []
      customersList.unshift(newCustomer)
      localStorage.setItem('warungku_customers', JSON.stringify(customersList))

      toast.add({
        title: 'Pelanggan ditambahkan',
        description: `Pelanggan "${newCustomer.name}" berhasil terdaftar (Mode Demo).`,
        color: 'success'
      })

      emit('saved', newCustomer)
      isOpen.value = false
      resetForm()
    } catch (err: any) {
      toast.add({
        title: 'Gagal menambahkan pelanggan',
        description: err.message,
        color: 'error'
      })
    } finally {
      submittings.value = false
    }
    return
  }

  // Live Mode: Supabase
  if (!user.value) return
  try {
    let merchantId = user.value.id
    try {
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id')
        .single() as any
      if (merchantData?.id) {
        merchantId = merchantData.id
      }
    } catch (e) {
      // Fallback
    }

    const payload = {
      merchant_id: merchantId,
      name: event.data.name,
      phone: event.data.phone || null,
      total_debt: 0,
      loyalty_points: 0
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(payload as any)
      .select()
      .single() as any

    if (error) throw error

    toast.add({
      title: 'Pelanggan ditambahkan',
      description: `Pelanggan "${payload.name}" berhasil terdaftar.`,
      color: 'success'
    })

    emit('saved', data)
    isOpen.value = false
    resetForm()
  } catch (err: any) {
    toast.add({
      title: 'Gagal menambahkan pelanggan',
      description: err.message,
      color: 'error'
    })
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

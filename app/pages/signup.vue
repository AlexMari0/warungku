<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'name',
  type: 'text',
  label: 'Nama Warung',
  placeholder: 'Warung Sari Makmur',
  required: true
}, {
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'alex@example.com',
  required: true
}, {
  name: 'password',
  label: 'Kata Sandi',
  type: 'password',
  placeholder: '••••••••',
  required: true
}]

const schema = z.object({
  name: z.string().min(3, 'Nama warung minimal 3 karakter'),
  email: z.string().email('Alamat email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter')
})

type Schema = z.output<typeof schema>

const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { error } = await supabase.auth.signUp({
      email: payload.data.email,
      password: payload.data.password,
      options: {
        data: {
          name: payload.data.name
        }
      }
    })

    if (error) throw error

    toast.add({
      title: 'Pendaftaran berhasil!',
      description: 'Silakan periksa email Anda untuk verifikasi.',
      color: 'success'
    })

    await navigateTo('/login')
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal daftar',
      description: (error as Error).message || 'Terjadi kesalahan saat mendaftar.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UAuthForm
    :schema="schema"
    :fields="fields"
    :loading="loading"
    title="Daftar WarungKu"
    description="Mulai modernisasi warung Anda hari ini."
    icon="i-lucide-user-plus"
    :submit="{ label: 'Daftar', block: true }"
    @submit="onSubmit"
  >
    <template #footer>
      Sudah punya akun? <ULink
        to="/login"
        class="text-primary font-medium underline underline-offset-4"
      >Masuk</ULink>
    </template>
  </UAuthForm>
</template>

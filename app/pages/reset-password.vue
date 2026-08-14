<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'password',
  label: 'Kata Sandi Baru',
  type: 'password',
  placeholder: '••••••••',
  required: true
}, {
  name: 'confirmPassword',
  label: 'Konfirmasi Kata Sandi',
  type: 'password',
  placeholder: '••••••••',
  required: true
}]

const schema = z.object({
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  confirmPassword: z.string().min(8, 'Kata sandi minimal 8 karakter')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Kata sandi tidak cocok',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      password: payload.data.password
    })

    if (error) throw error

    toast.add({
      title: 'Kata sandi diperbarui',
      description: 'Kata sandi Anda telah berhasil diubah. Silakan masuk kembali.',
      color: 'success'
    })

    await navigateTo('/login')
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal memperbarui kata sandi',
      description: (error as Error).message || 'Terjadi kesalahan.',
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
    title="Reset Kata Sandi"
    description="Masukkan kata sandi baru Anda untuk mengamankan akun."
    icon="i-lucide-shield-check"
    :submit="{ label: 'Simpan Kata Sandi', block: true }"
    @submit="onSubmit"
  >
    <template #footer>
      Kembali ke <ULink
        to="/login"
        class="text-primary font-medium underline underline-offset-4"
      >Masuk</ULink>
    </template>
  </UAuthForm>
</template>

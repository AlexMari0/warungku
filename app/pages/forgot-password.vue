<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'alex@example.com',
  required: true
}]

const schema = z.object({
  email: z.string().email('Alamat email tidak valid')
})

type Schema = z.output<typeof schema>

const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(payload.data.email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw error

    toast.add({
      title: 'Email terkirim',
      description: 'Tautan reset kata sandi telah dikirim ke email Anda.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal mengirim email',
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
    title="Lupa Kata Sandi"
    description="Masukkan email Anda untuk menerima tautan reset."
    icon="i-lucide-key-round"
    :submit="{ label: 'Kirim Tautan Reset', block: true }"
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

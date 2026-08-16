<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'alex@example.com',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: '••••••••',
  required: true
}]

const schema = z.object({
  email: z.string().email('Alamat email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter')
})

type Schema = z.output<typeof schema>

const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.data.email,
      password: payload.data.password
    })

    if (error) throw error

    // Wait for the user state to sync to avoid middleware intercepting
    if (!user.value) {
      await new Promise<void>((resolve) => {
        const unwatch = watch(user, (newUser) => {
          if (newUser) {
            unwatch()
            resolve()
          }
        })
        // Timeout fallback
        setTimeout(() => {
          unwatch()
          resolve()
        }, 2000)
      })
    }

    toast.add({
      title: 'Selamat datang kembali!',
      description: 'Berhasil masuk ke WarungKu.',
      color: 'success'
    })

    await navigateTo('/', { replace: true })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal masuk',
      description: (error as Error).message || 'Terjadi kesalahan saat masuk.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <UAuthForm
      :schema="schema"
      :fields="fields"
      :loading="loading"
      title="Masuk ke WarungKu"
      description="Kelola warung Anda dengan lebih mudah dan cerdas."
      icon="i-lucide-lock"
      :submit="{ label: 'Masuk', block: true }"
      @submit="onSubmit"
    >
      <template #password-hint>
        <ULink
          to="/forgot-password"
          class="text-sm text-primary font-medium"
        >Lupa kata sandi?</ULink>
      </template>
      <template #footer>
        Belum punya akun? <ULink
          to="/signup"
          class="text-primary font-medium underline underline-offset-4"
        >Daftar sekarang</ULink>
      </template>
    </UAuthForm>
  </div>
</template>

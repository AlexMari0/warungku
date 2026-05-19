<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: val => emit('update:open', val)
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const categories = ref<any[]>([])
const loading = ref(false)
const submittings = ref(false)

// Active category being edited (null = adding new)
const editingCategory = ref<any | null>(null)

// Color preset options (modern, sleek HSL palettes matching the premium aesthetic)
const colorPresets = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Forest', hex: '#065f46' },
  { name: 'Ocean', hex: '#0284c7' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Amethyst', hex: '#a855f7' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Charcoal', hex: '#4b5563' }
]

// Zod form validation
const schema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Format warna hex tidak valid'),
  sort_order: z.number().int().min(0, 'Urutan minimal 0')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  color: colorPresets[0]!.hex,
  sort_order: 0
})

const { isDemo } = useDemoMode()

// Fetch all categories for the active merchant
async function fetchCategories() {
  if (isDemo.value) {
    loading.value = true
    const raw = localStorage.getItem('warungku_categories')
    if (raw) {
      categories.value = JSON.parse(raw)
    } else {
      const initial = [
        { id: 'cat-1', name: 'Makanan', color: '#10b981', sort_order: 1, created_at: new Date().toISOString() },
        { id: 'cat-2', name: 'Minuman', color: '#0284c7', sort_order: 2, created_at: new Date().toISOString() },
        { id: 'cat-3', name: 'Rokok & Tembakau', color: '# Rose'.replace(' ', '').replace('Rose', '#f43f5e'), sort_order: 3, created_at: new Date().toISOString() } // Keep rose preset
      ]
      localStorage.setItem('warungku_categories', JSON.stringify(initial))
      categories.value = initial
    }
    loading.value = false
    return
  }

  if (!user.value) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    categories.value = data || []
  } catch (err: any) {
    toast.add({
      title: 'Gagal memuat kategori',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Reset the form state
function resetForm() {
  editingCategory.value = null
  state.name = ''
  state.color = colorPresets[0]!.hex
  state.sort_order = categories.value.length
}

// Populate the form to edit an existing category
function startEdit(category: any) {
  editingCategory.value = category
  state.name = category.name
  state.color = category.color || colorPresets[0]!.hex
  state.sort_order = category.sort_order || 0
}

// Create or update a category
async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isDemo.value) {
    submittings.value = true
    const payload = {
      id: editingCategory.value?.id || `cat-${Date.now()}`,
      merchant_id: 'demo-merchant-id',
      name: event.data.name,
      color: event.data.color,
      sort_order: event.data.sort_order,
      created_at: editingCategory.value?.created_at || new Date().toISOString()
    }

    let list = [...categories.value]
    if (editingCategory.value) {
      list = list.map(c => c.id === payload.id ? payload : c)
      toast.add({
        title: 'Kategori diperbarui',
        description: `Kategori "${payload.name}" berhasil disimpan (Mode Demo).`,
        color: 'success'
      })
    } else {
      list.push(payload)
      toast.add({
        title: 'Kategori dibuat',
        description: `Kategori "${payload.name}" berhasil ditambahkan (Mode Demo).`,
        color: 'success'
      })
    }

    localStorage.setItem('warungku_categories', JSON.stringify(list))
    categories.value = list
    resetForm()
    emit('saved')
    submittings.value = false
    return
  }

  if (!user.value) return
  submittings.value = true

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
      // Fallback to user.value.id
    }

    const payload = {
      merchant_id: merchantId,
      name: event.data.name,
      color: event.data.color,
      sort_order: event.data.sort_order
    }

    if (editingCategory.value) {
      // Update existing category
      const { error } = await (supabase.from('categories') as any)
        .update(payload)
        .eq('id', editingCategory.value.id)

      if (error) throw error
      toast.add({
        title: 'Kategori diperbarui',
        description: `Kategori "${payload.name}" berhasil disimpan.`,
        color: 'success'
      })
    } else {
      // Create new category
      const { error } = await (supabase
        .from('categories')
        .insert(payload as any) as any)

      if (error) throw error
      toast.add({
        title: 'Kategori dibuat',
        description: `Kategori "${payload.name}" berhasil ditambahkan.`,
        color: 'success'
      })
    }

    resetForm()
    await fetchCategories()
    emit('saved')
  } catch (err: any) {
    toast.add({
      title: 'Gagal menyimpan kategori',
      description: err.message,
      color: 'error'
    })
  } finally {
    submittings.value = false
  }
}

// Delete a category
async function deleteCategory(id: string, name: string) {
  if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"? Produk yang terkait dengan kategori ini akan diset tanpa kategori.`)) {
    return
  }

  if (isDemo.value) {
    loading.value = true
    const list = categories.value.filter(c => c.id !== id)
    localStorage.setItem('warungku_categories', JSON.stringify(list))
    categories.value = list
    toast.add({
      title: 'Kategori dihapus',
      description: `Kategori "${name}" berhasil dihapus (Mode Demo).`,
      color: 'success'
    })
    if (editingCategory.value?.id === id) {
      resetForm()
    }
    loading.value = false
    emit('saved')
    return
  }

  loading.value = true
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
    toast.add({
      title: 'Kategori dihapus',
      description: `Kategori "${name}" berhasil dihapus.`,
      color: 'success'
    })

    if (editingCategory.value?.id === id) {
      resetForm()
    }
    await fetchCategories()
    emit('saved')
  } catch (err: any) {
    toast.add({
      title: 'Gagal menghapus kategori',
      description: err.message,
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Fetch categories on open
watch(isOpen, (newVal) => {
  if (newVal) {
    fetchCategories().then(() => {
      state.sort_order = categories.value.length
    })
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Kelola Kategori Produk"
    description="Kelompokkan produk warung Anda agar lebih teratur."
    class="max-w-2xl"
  >
    <template #body>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
        <!-- Left Side: Add/Edit Form -->
        <div class="md:col-span-5 border-b md:border-b-0 md:border-r border-default pb-6 md:pb-0 md:pr-6">
          <h3 class="text-sm font-bold text-default mb-4 flex items-center gap-1.5">
            <UIcon
              :name="editingCategory ? 'i-lucide-pencil' : 'i-lucide-plus-circle'"
              class="text-primary size-4"
            />
            {{ editingCategory ? 'Edit Kategori' : 'Kategori Baru' }}
          </h3>

          <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <!-- Category Name -->
            <UFormField
              name="name"
              label="Nama Kategori"
              required
            >
              <UInput
                v-model="state.name"
                placeholder="Misal: Minuman, Makanan"
                class="w-full"
              />
            </UFormField>

            <!-- Color Palette Preset -->
            <UFormField
              name="color"
              label="Warna Label"
              required
            >
              <div class="flex flex-col gap-2">
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="preset in colorPresets"
                    :key="preset.hex"
                    type="button"
                    class="size-8 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                    :style="{ backgroundColor: preset.hex }"
                    :class="[
                      state.color === preset.hex
                        ? 'border-default ring-2 ring-primary scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    ]"
                    @click="state.color = preset.hex"
                  >
                    <UIcon
                      v-if="state.color === preset.hex"
                      name="i-lucide-check"
                      class="text-white size-4"
                    />
                  </button>
                </div>

                <!-- Custom Hex Code -->
                <div class="flex items-center gap-2 mt-1">
                  <div
                    class="size-6 rounded-md border border-default shrink-0"
                    :style="{ backgroundColor: state.color }"
                  />
                  <UInput
                    v-model="state.color"
                    placeholder="#ffffff"
                    class="w-full text-xs"
                    size="sm"
                  />
                </div>
              </div>
            </UFormField>

            <!-- Sort Order -->
            <UFormField
              name="sort_order"
              label="Urutan Tampilan"
            >
              <UInput
                v-model.number="state.sort_order"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>

            <!-- Actions buttons -->
            <div class="flex items-center gap-2 pt-2">
              <UButton
                type="submit"
                :label="editingCategory ? 'Simpan' : 'Tambah'"
                :loading="submittings"
                block
              />
              <UButton
                v-if="editingCategory"
                label="Batal"
                color="neutral"
                variant="subtle"
                @click="resetForm"
              />
            </div>
          </UForm>
        </div>

        <!-- Right Side: Category List -->
        <div class="md:col-span-7 flex flex-col">
          <h3 class="text-sm font-bold text-default mb-4">
            Daftar Kategori Saat Ini
          </h3>

          <div
            v-if="loading"
            class="flex items-center justify-center py-12"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="animate-spin text-primary size-8"
            />
          </div>

          <div
            v-else-if="categories.length === 0"
            class="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-2xl border border-dashed border-default"
          >
            <UIcon
              name="i-lucide-tag"
              class="text-muted size-10 mb-2"
            />
            <p class="text-sm font-medium text-default">
              Belum ada kategori
            </p>
            <p class="text-xs text-muted max-w-[200px] mt-0.5">
              Mulai dengan menambahkan kategori di formulir sebelah kiri.
            </p>
          </div>

          <div
            v-else
            class="space-y-2 overflow-y-auto max-h-[350px] pr-1"
          >
            <div
              v-for="category in categories"
              :key="category.id"
              class="flex items-center justify-between p-3 rounded-xl border border-default bg-elevated/40 hover:bg-elevated transition-colors"
            >
              <div class="flex items-center gap-2.5">
                <span
                  class="size-3.5 rounded-full shrink-0 border border-black/10"
                  :style="{ backgroundColor: category.color || '#9ca3af' }"
                />
                <span class="font-semibold text-sm text-default">{{ category.name }}</span>
                <span class="text-xs text-muted px-1.5 py-0.5 bg-muted/80 rounded-md">Urutan: {{ category.sort_order }}</span>
              </div>

              <div class="flex items-center gap-1">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="rounded-lg"
                  @click="startEdit(category)"
                />
                <UButton
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  size="xs"
                  class="rounded-lg"
                  @click="deleteCategory(category.id, category.name)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Product, Category } from '~/core/types'

const props = defineProps<{
  open: boolean
  editingProduct: Product | null
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { createProduct, updateProduct } = useProducts()
const toast = useToast()

const submitting = ref(false)

const unitOptions = ['pcs', 'box', 'pack', 'kg', 'gr', 'liter', 'ml', 'sachet', 'porsi']

const productSchema = z.object({
  name: z.string().min(3, 'Nama produk minimal 3 karakter'),
  category_id: z.string().nullable().optional(),
  sku: z.string().default(''),
  barcode: z.string().default(''),
  buy_price: z.number().min(0, 'Harga beli tidak boleh negatif'),
  sell_price: z.number().min(0, 'Harga jual tidak boleh negatif'),
  stock_qty: z.number().int().min(0, 'Stok tidak boleh negatif'),
  min_stock: z.number().int().min(0, 'Stok minimum tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan wajib dipilih'),
  image_url: z.string().default(''),
  is_active: z.boolean().default(true)
})

type ProductSchema = z.output<typeof productSchema>

const productState = reactive<ProductSchema>({
  name: '',
  category_id: undefined,
  sku: '',
  barcode: '',
  buy_price: 0,
  sell_price: 0,
  stock_qty: 0,
  min_stock: 0,
  unit: 'pcs',
  image_url: '',
  is_active: true
})

function resetForm() {
  productState.name = ''
  productState.category_id = undefined
  productState.sku = ''
  productState.barcode = ''
  productState.buy_price = 0
  productState.sell_price = 0
  productState.stock_qty = 0
  productState.min_stock = 0
  productState.unit = 'pcs'
  productState.image_url = ''
  productState.is_active = true
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.editingProduct) {
      productState.name = props.editingProduct.name
      productState.category_id = props.editingProduct.category_id || undefined
      productState.sku = props.editingProduct.sku || ''
      productState.barcode = props.editingProduct.barcode || ''
      productState.buy_price = Number(props.editingProduct.buy_price) || 0
      productState.sell_price = Number(props.editingProduct.sell_price) || 0
      productState.stock_qty = props.editingProduct.stock_qty || 0
      productState.min_stock = props.editingProduct.min_stock || 0
      productState.unit = props.editingProduct.unit || 'pcs'
      productState.image_url = props.editingProduct.image_url || ''
      productState.is_active = props.editingProduct.is_active ?? true
    } else {
      resetForm()
    }
  }
})

async function onSubmit(event: FormSubmitEvent<ProductSchema>) {
  submitting.value = true
  const payload = {
    ...event.data,
    category_id: event.data.category_id || null,
    sku: event.data.sku ? event.data.sku.trim() : null,
    barcode: event.data.barcode ? event.data.barcode.trim() : null,
    image_url: event.data.image_url ? event.data.image_url.trim() : null
  }

  try {
    if (props.editingProduct) {
      const result = await updateProduct(props.editingProduct.id, payload)
      if (!result.success) {
        toast.add({
          title: 'Gagal memperbarui produk',
          description: result.error || 'Terjadi kesalahan.',
          color: 'error'
        })
        return
      }
      toast.add({
        title: 'Produk berhasil diperbarui',
        color: 'success'
      })
    } else {
      const result = await createProduct(payload)
      if (!result.success) {
        toast.add({
          title: 'Gagal menambah produk',
          description: result.error || 'Terjadi kesalahan.',
          color: 'error'
        })
        return
      }
      toast.add({
        title: 'Produk berhasil ditambahkan',
        description: `Produk "${payload.name}" siap dijual.`,
        color: 'success'
      })
    }

    emit('update:open', false)
    emit('saved')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'"
    class="max-w-xl"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UForm
        :schema="productSchema"
        :state="productState"
        class="space-y-5"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Product Name -->
          <UFormField
            name="name"
            label="Nama Produk"
            required
            class="sm:col-span-2"
          >
            <UInput
              v-model="productState.name"
              placeholder="Misal: Kopi Susu Creamy"
              class="w-full"
            />
          </UFormField>

          <!-- Category -->
          <UFormField
            name="category_id"
            label="Kategori Produk"
          >
            <USelect
              :model-value="productState.category_id ?? undefined"
              placeholder="Pilih Kategori"
              class="w-full"
              :items="categories.map(c => ({ label: c.name, value: c.id }))"
              @update:model-value="productState.category_id = $event as string | undefined"
            />
          </UFormField>

          <!-- Unit -->
          <UFormField
            name="unit"
            label="Satuan"
            required
          >
            <USelect
              v-model="productState.unit"
              class="w-full"
              :items="unitOptions.map(u => ({ label: u, value: u }))"
            />
          </UFormField>

          <!-- SKU -->
          <UFormField
            name="sku"
            label="Kode SKU (Stok Keeping Unit)"
          >
            <UInput
              v-model="productState.sku"
              placeholder="Misal: KOPI-CRM-01"
              class="w-full"
            />
          </UFormField>

          <!-- Barcode -->
          <UFormField
            name="barcode"
            label="Barcode (EAN/UPC)"
          >
            <UInput
              v-model="productState.barcode"
              placeholder="Misal: 89912345678"
              class="w-full"
            />
          </UFormField>

          <!-- Buy Price -->
          <UFormField
            name="buy_price"
            label="Harga Beli (Modal)"
            required
          >
            <UInput
              v-model.number="productState.buy_price"
              type="number"
              min="0"
              placeholder="Rp 0"
              class="w-full"
            >
              <template #leading>
                <span class="text-xs text-muted px-1">Rp</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Sell Price -->
          <UFormField
            name="sell_price"
            label="Harga Jual"
            required
          >
            <UInput
              v-model.number="productState.sell_price"
              type="number"
              min="0"
              placeholder="Rp 0"
              class="w-full"
            >
              <template #leading>
                <span class="text-xs text-muted px-1">Rp</span>
              </template>
            </UInput>
          </UFormField>

          <!-- Stock Quantity -->
          <UFormField
            name="stock_qty"
            label="Jumlah Stok Saat Ini"
            required
          >
            <UInput
              v-model.number="productState.stock_qty"
              type="number"
              min="0"
              placeholder="0"
              class="w-full"
            />
          </UFormField>

          <!-- Min Stock (low stock alert threshold) -->
          <UFormField
            name="min_stock"
            label="Batas Stok Minimum"
            required
          >
            <UInput
              v-model.number="productState.min_stock"
              type="number"
              min="0"
              placeholder="5"
              class="w-full"
            />
          </UFormField>

          <!-- Image URL -->
          <UFormField
            name="image_url"
            label="Link URL Foto Produk"
            class="sm:col-span-2"
          >
            <UInput
              v-model="productState.image_url"
              placeholder="https://image-source.com/product.jpg"
              class="w-full"
            />
          </UFormField>

          <!-- Active Status Toggle -->
          <div class="sm:col-span-2 flex items-center justify-between py-3 px-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl mt-1">
            <div>
              <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Produk Aktif
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Produk yang tidak aktif disembunyikan dari modul Kasir POS.
              </p>
            </div>
            <USwitch
              v-model="productState.is_active"
              class="active:scale-95 transition-transform"
            />
          </div>
        </div>

        <!-- Actions Panel -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            class="rounded-xl font-bold border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-all duration-300"
            @click="emit('update:open', false)"
          />
          <UButton
            type="submit"
            :label="editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'"
            :loading="submitting"
            class="rounded-xl font-bold bg-primary text-white shadow-md active:scale-95 transition-all duration-300"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import fs from 'fs'
import path from 'path'

// Parse .env
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env')
const envFile = fs.readFileSync(envPath, 'utf8')
const env = {}
envFile.split('\n').forEach((line) => {
  const [key, ...values] = line.split('=')
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim()
  }
})

const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_KEY = env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL or SUPABASE_KEY not found in .env')
  process.exit(1)
}

const supabaseMerchant = createClient(SUPABASE_URL, SUPABASE_KEY)
// Create an unauthenticated client to verify public storefront access (anonymous customer role)
const supabaseGuest = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runStorefrontTests() {
  console.log('🧪 Starting Module 4: Digital Online Store E2E Integration Tests...\n')

  // =========================================================================
  // STEP 1: Sign in merchant
  // =========================================================================
  const testEmail = 'test_1779208029340@warungku.com'
  const testPassword = 'TestPassword123!'
  console.log(`[1/5] Signing in test merchant user: ${testEmail}`)

  const { data: signInData, error: signInErr } = await supabaseMerchant.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (signInErr) {
    console.error('Merchant sign in failed:', signInErr)
    process.exit(1)
  }

  const merchantId = signInData.user.id
  console.log(`✅ Authenticated merchant: ${merchantId}`)

  // =========================================================================
  // STEP 2: Setup inventory & category data as merchant
  // =========================================================================
  console.log('\n[2/5] Setting up inventory and catalog data...')

  const uniqueSuffix = Date.now()
  const slug = `test-warung-${uniqueSuffix}`

  // Create category
  const { data: cat, error: catErr } = await supabaseMerchant
    .from('categories')
    .insert({ merchant_id: merchantId, name: `Storefront Test Cat ${uniqueSuffix}` })
    .select().single()
  assert(!catErr, `Category insert failed: ${catErr?.message}`)

  // Create product
  const { data: prod, error: prodErr } = await supabaseMerchant
    .from('products')
    .insert({
      merchant_id: merchantId,
      category_id: cat.id,
      name: `Storefront Test Product ${uniqueSuffix}`,
      buy_price: 5000,
      sell_price: 7500,
      stock_qty: 15,
      min_stock: 3,
      unit: 'pcs',
      is_active: true
    })
    .select().single()
  assert(!prodErr, `Product insert failed: ${prodErr?.message}`)

  console.log(`✅ Inventory ready: Product "${prod.name}" (ID: ${prod.id}) under Category (ID: ${cat.id})`)

  // =========================================================================
  // STEP 3: Setup & publish storefront, link product
  // =========================================================================
  console.log('\n[3/5] Constructing storefront settings & linking products...')

  // Insert or Update Storefront settings for the merchant
  const { data: sf, error: sfErr } = await supabaseMerchant
    .from('storefronts')
    .upsert({
      merchant_id: merchantId,
      slug: slug,
      display_name: 'Warung E2E Testing',
      description: 'The premier SME for digital storefront E2E automation testing',
      theme_color: 'slate',
      is_published: true
    }, { onConflict: 'merchant_id' })
    .select().single()

  assert(!sfErr, `Storefront configuration upsert failed: ${sfErr?.message}`)
  console.log(`✅ Storefront published successfully. Slug: /store/${sf.slug} (ID: ${sf.id})`)

  // Link product to storefront catalog
  const { data: link, error: linkErr } = await supabaseMerchant
    .from('storefront_products')
    .insert({
      storefront_id: sf.id,
      product_id: prod.id,
      is_featured: true,
      custom_description: 'Highly recommended for test validation!'
    })
    .select().single()

  assert(!linkErr, `Storefront product linking failed: ${linkErr?.message}`)
  console.log(`✅ Product linked to online catalog. Link ID: ${link.id}`)

  // =========================================================================
  // STEP 4: Anonymous customer guest access verification (RLS Checks)
  // =========================================================================
  console.log('\n[4/5] Verifying Anonymous Guest Public RLS Access Policies...')

  // 4a. Read published storefront
  const { data: guestSf, error: guestSfErr } = await supabaseGuest
    .from('storefronts')
    .select('*')
    .eq('slug', slug)
    .single()

  assert(!guestSfErr, `Guest storefront read failed: ${guestSfErr?.message}`)
  assert(guestSf.display_name === 'Warung E2E Testing', 'Storefront name mismatch')
  console.log('✅ Guest public storefront view check: PASS')

  // 4b. Read storefront product links
  const { data: guestLinks, error: guestLinksErr } = await supabaseGuest
    .from('storefront_products')
    .select('*')
    .eq('storefront_id', sf.id)

  assert(!guestLinksErr, `Guest storefront catalog links read failed: ${guestLinksErr?.message}`)
  assert(guestLinks.length >= 1, 'Guest should see at least 1 catalog product linked')
  console.log(`✅ Guest public catalog links check: PASS (${guestLinks.length} products found)`)

  // 4c. Read underlying products
  const { data: guestProd, error: guestProdErr } = await supabaseGuest
    .from('products')
    .select('*')
    .eq('id', prod.id)
    .single()

  assert(!guestProdErr, `Guest product detail read failed: ${guestProdErr?.message}`)
  assert(guestProd.sell_price === 7500, 'Product details fields mismatch')
  console.log('✅ Guest public product details check: PASS')

  // 4d. Read underlying categories
  const { data: guestCat, error: guestCatErr } = await supabaseGuest
    .from('categories')
    .select('*')
    .eq('id', cat.id)
    .single()

  assert(!guestCatErr && guestCat, `Guest category read failed: ${guestCatErr?.message}`)
  console.log('✅ Guest public category check: PASS')

  // 4e. Submit online checkout order anonymously
  const { data: guestOrder, error: guestOrderErr } = await supabaseGuest
    .from('online_orders')
    .insert({
      storefront_id: sf.id,
      customer_name: 'Shopper Guest Tester',
      customer_phone: '089999888877',
      total_amount: 15000, // 2 items at 7500
      notes: 'COD delivery near the town square please'
    })
    .select().single()

  assert(!guestOrderErr, `Guest online checkout order placement failed: ${guestOrderErr?.message}`)
  assert(guestOrder.status === 'pending', 'Order initial status should be pending')
  console.log(`✅ Guest public online checkout check: PASS (Order ID: ${guestOrder.id})`)

  // =========================================================================
  // STEP 5: Merchant order verification & Clean-up
  // =========================================================================
  console.log('\n[5/5] Validating merchant receipts and cleaning up test records...')

  // Merchant verifies the incoming online order
  const { data: merchantOrder, error: merchantOrderErr } = await supabaseMerchant
    .from('online_orders')
    .select('*')
    .eq('id', guestOrder.id)
    .single()

  assert(!merchantOrderErr, `Merchant order verification check failed: ${merchantOrderErr?.message}`)
  assert(merchantOrder.customer_name === 'Shopper Guest Tester', 'Merchant order data mismatch')
  console.log('✅ Merchant order visualization verification: PASS')

  // Perform clean-up to prevent test database bloat
  console.log('\nCleaning up E2E records...')

  // Delete online order
  const { error: delOrderErr } = await supabaseMerchant
    .from('online_orders')
    .delete()
    .eq('id', guestOrder.id)
  assert(!delOrderErr, `Failed to clean up online order: ${delOrderErr?.message}`)

  // Delete product link
  const { error: delLinkErr } = await supabaseMerchant
    .from('storefront_products')
    .delete()
    .eq('id', link.id)
  assert(!delLinkErr, `Failed to clean up link: ${delLinkErr?.message}`)

  // Delete product
  const { error: delProdErr } = await supabaseMerchant
    .from('products')
    .delete()
    .eq('id', prod.id)
  assert(!delProdErr, `Failed to clean up product: ${delProdErr?.message}`)

  // Delete category
  const { error: delCatErr } = await supabaseMerchant
    .from('categories')
    .delete()
    .eq('id', cat.id)
  assert(!delCatErr, `Failed to clean up category: ${delCatErr?.message}`)

  console.log('✅ Test data clean-up completed successfully.')
  console.log('\n🎉 ALL DIGITAL ONLINE STORE E2E TESTS PASSED SUCCESSFULLY!')
}

runStorefrontTests().catch((err) => {
  console.error('\n❌ Storefront E2E test execution failed:', err)
  process.exit(1)
})

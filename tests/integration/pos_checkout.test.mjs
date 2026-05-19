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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log('🧪 Starting POS Atomic Checkout Integration Tests...')

  // 1. Setup Test User
  const testEmail = 'test_1779208029340@warungku.com'
  const testPassword = 'TestPassword123!'
  console.log(`\n[1/5] Signing in test user: ${testEmail}`)

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (signInErr) {
    console.error('Sign in failed:', signInErr)
    process.exit(1)
  }

  const userId = signInData.user.id
  console.log(`✅ Successfully signed in. ID: ${userId}`)

  // Using userId directly as merchantId since our trigger enforces merchants.id = auth.users.id
  const merchantId = userId

  // 2. Setup Test Data (Category, Product, Customer)
  console.log('\n[2/5] Setting up test data...')

  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .insert({ merchant_id: merchantId, name: 'Integration Test Category ' + Date.now() })
    .select().single()
  assert(!catErr, `Category insert failed: ${catErr?.message}`)

  const { data: prod, error: prodErr } = await supabase
    .from('products')
    .insert({
      merchant_id: merchantId,
      category_id: cat.id,
      name: 'Integration Test Product',
      buy_price: 2500,
      sell_price: 3000,
      stock_qty: 10,
      min_stock: 2,
      unit: 'pcs',
      is_active: true
    })
    .select().single()
  assert(!prodErr, `Product insert failed: ${prodErr?.message}`)

  const { data: cust, error: custErr } = await supabase
    .from('customers')
    .insert({
      merchant_id: merchantId,
      name: 'Integration Tester',
      phone: '08123456789'
    })
    .select().single()
  assert(!custErr, `Customer insert failed: ${custErr?.message}`)

  console.log(`✅ Test data setup complete. Product ID: ${prod.id} (Stock: 10)`)

  // 3. Test 1: Happy Path Commit
  console.log('\n[3/5] Test: Happy Path Commit (Buying 2 items)')

  const orderItemsPayload1 = [
    { product_id: prod.id, quantity: 2, discount: 0 }
  ]
  const paidAmount1 = 10000 // Total should be 2 * 3000 = 6000

  const { data: res1, error: rpcErr1 } = await supabase.rpc('pos_checkout_atomic', {
    p_items: orderItemsPayload1,
    p_payment_method: 'cash',
    p_paid_amount: paidAmount1,
    p_customer_id: cust.id,
    p_discount_amount: 0,
    p_notes: 'Happy path test'
  })

  assert(!rpcErr1, `RPC failed: ${rpcErr1?.message}`)
  assert(res1.order.total_amount === 6000, 'Order total should be 6000')
  assert(res1.payment.change_amount === 4000, 'Change should be 4000')
  assert(res1.points_earned === 0, 'Should earn 0 points for 6000 spend')

  // Verify stock decrement
  const { data: prodAfter1 } = await supabase.from('products').select('stock_qty').eq('id', prod.id).single()
  assert(prodAfter1.stock_qty === 8, `Stock should be 8, but is ${prodAfter1.stock_qty}`)

  // Verify related tables
  const { data: orderItemCheck } = await supabase.from('order_items').select('*').eq('order_id', res1.order.id)
  assert(orderItemCheck.length === 1, 'Should have 1 order item')

  const { data: movementCheck } = await supabase.from('stock_movements').select('*').eq('reference_id', res1.order.id)
  assert(movementCheck.length === 1 && movementCheck[0].qty_after === 8, 'Stock movement log incorrect')

  console.log('✅ Happy Path verified! Database records exactly match atomic expectations.')

  // 4. Test 2: Insufficient Stock Rollback
  console.log('\n[4/5] Test: Insufficient Stock Rollback (Buying 20 items)')

  const orderItemsPayload2 = [
    { product_id: prod.id, quantity: 20, discount: 0 }
  ]

  const { error: rpcErr2 } = await supabase.rpc('pos_checkout_atomic', {
    p_items: orderItemsPayload2,
    p_payment_method: 'qris',
    p_paid_amount: 60000, // 20 * 3000
    p_customer_id: cust.id,
    p_discount_amount: 0,
    p_notes: 'Insufficient stock test'
  })

  assert(rpcErr2 !== null, 'RPC should have failed due to insufficient stock')
  assert(rpcErr2.message.includes('Stok barang tidak mencukupi'), `Unexpected error message: ${rpcErr2.message}`)

  // Verify stock remains untouched
  const { data: prodAfter2 } = await supabase.from('products').select('stock_qty').eq('id', prod.id).single()
  assert(prodAfter2.stock_qty === 8, `Stock should still be 8, but is ${prodAfter2.stock_qty}`)
  console.log('✅ Insufficient Stock Rollback verified! Stock untouched.')

  // 5. Test 3: Invalid Payment Rejection
  console.log('\n[5/5] Test: Invalid Payment Rejection (Paying less than total)')

  const orderItemsPayload3 = [
    { product_id: prod.id, quantity: 1, discount: 0 }
  ] // Total will be 3000

  const { error: rpcErr3 } = await supabase.rpc('pos_checkout_atomic', {
    p_items: orderItemsPayload3,
    p_payment_method: 'cash',
    p_paid_amount: 1000, // < 3000
    p_customer_id: null,
    p_discount_amount: 0
  })

  assert(rpcErr3 !== null, 'RPC should have failed due to insufficient payment')
  assert(rpcErr3.message.includes('Nominal pembayaran lebih kecil'), `Unexpected error message: ${rpcErr3.message}`)

  // Verify stock remains untouched
  const { data: prodAfter3 } = await supabase.from('products').select('stock_qty').eq('id', prod.id).single()
  assert(prodAfter3.stock_qty === 8, `Stock should still be 8, but is ${prodAfter3.stock_qty}`)
  console.log('✅ Invalid Payment Rejection verified! Stock untouched.')

  console.log('\n🎉 All Integration Tests Passed Successfully!')
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err)
  process.exit(1)
})

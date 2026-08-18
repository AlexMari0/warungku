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
  console.log('🧪 Testing API Checkout triggering Analytics Refresh...')

  // 1. Setup Test User
  const testEmail = 'test_1779208029340@warungku.com'
  const testPassword = 'TestPassword123!'

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (signInErr) {
    console.error('Sign in failed:', signInErr)
    process.exit(1)
  }

  const jwt = signInData.session.access_token
  const merchantId = signInData.user.id
  console.log(`✅ Successfully signed in.`)

  // 2. Fetch a product to checkout
  const { data: prod } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchantId)
    .limit(1)
    .single()

  if (!prod) {
    console.error('No products found to checkout.')
    process.exit(1)
  }

  const today = new Date().toISOString().split('T')[0]

  // Get current analytics state
  const { data: beforeData } = await supabase
    .from('daily_summaries')
    .select('total_orders')
    .eq('merchant_id', merchantId)
    .eq('summary_date', today)
    .single()

  const ordersBefore = beforeData ? beforeData.total_orders : 0
  console.log(`📊 Total orders before checkout: ${ordersBefore}`)

  // 3. Hit the Go API Checkout
  console.log(`\n🛒 Triggering POST /api/checkout to Go Backend...`)
  
  const payload = {
    items: [
      { product_id: prod.id, quantity: 1, discount: 0 }
    ],
    payment_method: 'cash',
    paid_amount: prod.sell_price,
    customer_id: null,
    discount_amount: 0,
    notes: 'Testing Analytics API'
  }

  const response = await fetch('http://localhost:8080/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`❌ Checkout API failed with status ${response.status}: ${errText}`)
    process.exit(1)
  }

  console.log('✅ Checkout API returned success. Waiting 2 seconds for goroutine to finish...')
  await new Promise(r => setTimeout(r, 2000))

  // 4. Verify Analytics updated
  const { data: afterData } = await supabase
    .from('daily_summaries')
    .select('total_orders')
    .eq('merchant_id', merchantId)
    .eq('summary_date', today)
    .single()

  const ordersAfter = afterData ? afterData.total_orders : 0
  console.log(`📊 Total orders after checkout: ${ordersAfter}`)

  assert(ordersAfter > ordersBefore, `Analytics did not update! Expected > ${ordersBefore}, got ${ordersAfter}\nWait, did you restart 'make dev' in your terminal?`)

  console.log('\n🎉 Test Passed: Analytics is successfully updating via Go API background task!')
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err)
  process.exit(1)
})

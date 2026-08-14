import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// These need to match your actual test data in the DB
const TEST_EMAIL = 'test_1779208029340@warungku.com'
const TEST_PASSWORD = 'TestPassword123!'

async function run() {
  console.log('--- WarungKu Analytics Integration Test ---')

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key in .env')
    process.exit(1)
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

  try {
    // 1. Authenticate as test merchant
    console.log('1. Authenticating test user...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })

    if (authError) throw authError
    const userId = authData.user.id
    console.log(`✓ Authenticated as ${userId}`)

    // 2. Refresh Analytics via new RPC
    console.log('2. Triggering analytics aggregation RPC...')
    const today = new Date().toISOString().split('T')[0]
    const { error: rpcError } = await supabase.rpc('refresh_merchant_analytics', {
      p_merchant_id: userId,
      p_date: today
    })

    if (rpcError) throw rpcError
    console.log('✓ Analytics aggregation completed.')

    // 3. Verify Daily Summaries
    console.log('3. Validating daily_summaries...')
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('merchant_id', userId)
      .eq('summary_date', today)
      .single()

    if (dailyError && dailyError.code !== 'PGRST116') throw dailyError

    if (dailyData) {
      console.log(`✓ Found daily summary: ${dailyData.total_orders} orders, Revenue: ${dailyData.total_revenue}`)
    } else {
      console.log('⚠ No daily summary found for today. (This is normal if no transactions occurred today).')
    }

    // 4. Verify Product Sales Summary
    console.log('4. Validating product_sales_summary...')
    const { data: productData, error: productError } = await supabase
      .from('product_sales_summary')
      .select('*')
      .eq('merchant_id', userId)
      .eq('period_type', 'daily')
      .eq('period_start', today)

    if (productError) throw productError
    console.log(`✓ Found ${productData.length} products sold today.`)
    productData.forEach((p) => {
      console.log(`  - Product ID ${p.product_id} | Qty: ${p.quantity_sold} | Revenue: ${p.revenue}`)
    })

    console.log('\n--- Test Completed Successfully ---')
    process.exit(0)
  } catch (err) {
    console.error('\n❌ Test Failed:')
    console.error(err.message || err)
    process.exit(1)
  }
}

run()

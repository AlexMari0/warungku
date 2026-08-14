import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// These need to match your actual test data in the DB
const TEST_EMAIL = 'test_1779208029340@warungku.com'
const TEST_PASSWORD = 'TestPassword123!'

async function run() {
  console.log('--- WarungKu Digital Storefront Analytics Test ---')

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

    // 2. Setup / Fetch Storefront
    console.log('2. Fetching active storefront...')
    const { data: initialSfData, error: sfError } = await supabase
      .from('storefronts')
      .select('*')
      .eq('merchant_id', userId)
      .single()
    let sfData = initialSfData

    if (sfError && sfError.code === 'PGRST116') {
      console.log('  Creating a dummy storefront for test...')
      const res = await supabase.from('storefronts').insert({
        merchant_id: userId,
        slug: 'test-store-' + Date.now(),
        display_name: 'Test Store',
        is_published: true
      }).select().single()
      sfData = res.data
      if (res.error) throw res.error
    } else if (sfError) {
      throw sfError
    }

    if (!sfData.is_published) {
      await supabase.from('storefronts').update({ is_published: true }).eq('id', sfData.id)
      sfData.is_published = true
    }
    
    console.log(`✓ Using Storefront Slug: ${sfData.slug}`)

    // 3. Simulate Anonymous Page Views & WhatsApp Clicks
    console.log('3. Simulating page views & clicks...')
    // Use an anonymous client to test SECURITY DEFINER
    const anonSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

    const r1 = await anonSupabase.rpc('track_storefront_event', { p_slug: sfData.slug, p_event_type: 'page_view' })
    if (r1.error) throw r1.error
    const r2 = await anonSupabase.rpc('track_storefront_event', { p_slug: sfData.slug, p_event_type: 'page_view' })
    if (r2.error) throw r2.error
    const r3 = await anonSupabase.rpc('track_storefront_event', { p_slug: sfData.slug, p_event_type: 'whatsapp_click' })
    if (r3.error) throw r3.error
    
    console.log('✓ Successfully pushed 2 page views and 1 whatsapp click')

    // 4. Simulate a conversion (online order)
    console.log('4. Simulating online order conversion...')
    const { error: orderError } = await anonSupabase.from('online_orders').insert({
      storefront_id: sfData.id,
      customer_name: 'Test Customer',
      customer_phone: '08123456789',
      total_amount: 150000,
      status: 'pending'
    })
    
    if (orderError) throw orderError
    console.log('✓ Injected 1 online order conversion')

    // 5. Trigger Analytics Aggregation
    console.log('5. Triggering analytics aggregation RPC...')
    const today = new Date().toISOString().split('T')[0]
    const { error: rpcError } = await supabase.rpc('refresh_merchant_analytics', {
      p_merchant_id: userId,
      p_date: today
    })

    if (rpcError) throw rpcError
    console.log('✓ Analytics aggregation completed.')

    // 6. Verify Daily Summaries Contains Storefront Analytics
    console.log('6. Validating daily_summaries storefront metrics...')
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('merchant_id', userId)
      .eq('summary_date', today)
      .single()

    if (dailyError) throw dailyError

    console.log(`✓ Daily summary metrics:`)
    console.log(`  - Page Views: ${dailyData.storefront_page_views}`)
    console.log(`  - WhatsApp Clicks: ${dailyData.storefront_whatsapp_clicks}`)
    console.log(`  - Conversions: ${dailyData.storefront_conversions}`)

    if (dailyData.storefront_page_views >= 2 && dailyData.storefront_whatsapp_clicks >= 1 && dailyData.storefront_conversions >= 1) {
      console.log('✅ TEST PASSED: Storefront analytics successfully aggregated.')
      process.exit(0)
    } else {
      throw new Error('Metrics mismatch. The aggregated counts do not reflect the simulated events.')
    }

  } catch (err) {
    console.error('\n❌ Test Failed:')
    console.error(err.message || err)
    process.exit(1)
  }
}

run()

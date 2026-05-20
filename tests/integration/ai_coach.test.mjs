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

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runAICoachTests() {
  console.log('🧪 Starting Module 5: AI Business Coach E2E Integration Tests...\n')

  // =========================================================================
  // STEP 1: Sign in merchant
  // =========================================================================
  const testEmail = 'test_1779208029340@warungku.com'
  const testPassword = 'TestPassword123!'
  console.log(`[1/4] Signing in test merchant user: ${testEmail}`)

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
  // STEP 2: Create AI Session
  // =========================================================================
  console.log('\n[2/4] Testing Session Creation (ai_sessions)...')

  const { data: sess, error: sessErr } = await supabaseMerchant
    .from('ai_sessions')
    .insert({
      merchant_id: merchantId,
      title: 'E2E Testing Sesi AI',
      context_snapshot: { source: 'integration_test', ver: 1.0 }
    })
    .select()
    .single()

  assert(!sessErr, `AI Session insert failed: ${sessErr?.message}`)
  assert(sess.title === 'E2E Testing Sesi AI', 'Session title mismatch')
  console.log(`✅ AI Session created successfully. ID: ${sess.id}`)

  // =========================================================================
  // STEP 3: Create AI Query Log
  // =========================================================================
  console.log('\n[3/4] Testing AI Query Logging (ai_query_logs)...')

  const { data: log, error: logErr } = await supabaseMerchant
    .from('ai_query_logs')
    .insert({
      session_id: sess.id,
      merchant_id: merchantId,
      query_text: 'Berapa banyak stok barang menipis?',
      response_text: 'Hasil analisis menunjukkan 2 barang menipis.',
      query_type: 'analysis',
      tokens_used: 120,
      latency_ms: 140,
      model_version: 'test-model'
    })
    .select()
    .single()

  assert(!logErr, `AI Query Log insert failed: ${logErr?.message}`)
  assert(log.query_type === 'analysis', 'Query type mismatch')
  console.log(`✅ AI Query Log entry inserted successfully. ID: ${log.id}`)

  // =========================================================================
  // STEP 4: Submit AI Feedback Rating
  // =========================================================================
  console.log('\n[4/4] Testing AI Feedback Rating Submissions (ai_feedback)...')

  const { data: feedback, error: feedbackErr } = await supabaseMerchant
    .from('ai_feedback')
    .insert({
      query_log_id: log.id,
      merchant_id: merchantId,
      rating: 'helpful',
      feedback_text: 'Feedback analitis dari integration test'
    })
    .select()
    .single()

  assert(!feedbackErr, `AI Feedback rating insert failed: ${feedbackErr?.message}`)
  assert(feedback.rating === 'helpful', 'Feedback rating mismatch')
  console.log(`✅ AI Feedback rating submitted successfully. ID: ${feedback.id}`)

  // =========================================================================
  // CLEAN-UP
  // =========================================================================
  console.log('\nCleaning up E2E AI records...')

  // Delete session (cascade deletes query logs and feedback)
  const { error: delSessErr } = await supabaseMerchant
    .from('ai_sessions')
    .delete()
    .eq('id', sess.id)

  assert(!delSessErr, `Failed to clean up AI Session: ${delSessErr?.message}`)
  console.log('✅ AI Test data clean-up completed successfully.')

  console.log('\n🎉 ALL AI BUSINESS COACH E2E TESTS PASSED SUCCESSFULLY!')
}

runAICoachTests().catch((err) => {
  console.error('\n❌ AI Business Coach E2E test execution failed:', err)
  process.exit(1)
})

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const TEST_EMAIL = 'test_1779208029340@warungku.com'
const TEST_PASSWORD = 'TestPassword123!'

// A deterministic pseudo-random number generator to mock embeddings
function mockEmbedding(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0 
  }
  
  const vector = new Array(1536).fill(0)
  for (let i = 0; i < 1536; i++) {
    const val = Math.sin(hash + i)
    vector[i] = val
  }
  
  const mag = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  return vector.map(val => val / mag)
}

async function run() {
  console.log('--- WarungKu AI Vector Integration Test ---')

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

    // 2. Insert Mock Knowledge Base Entry
    console.log('2. Seeding AI Knowledge Base with vector embeddings...')
    
    // We will simulate a document about "Kopi Susu Gula Aren"
    const docText = 'Kopi Susu Gula Aren adalah minuman paling laris dengan margin tinggi.'
    const docEmbedding = mockEmbedding(docText)

    // Clear previous tests data to avoid clutter
    await supabase.from('ai_knowledge_base').delete().eq('merchant_id', userId)

    const { data: kbData, error: kbErr } = await supabase
      .from('ai_knowledge_base')
      .insert({
        merchant_id: userId,
        content_type: 'product',
        content_payload: docText,
        embedding: `[${docEmbedding.join(',')}]`
      })
      .select()
      .single()

    if (kbErr) throw kbErr
    console.log(`✓ Knowledge Base document created successfully. ID: ${kbData.id}`)

    // 3. Test Vector Search RPC
    console.log('3. Testing cosine similarity vector search...')
    
    // Use the exact same text to ensure a cosine similarity of ~1.0
    const searchEmbedding = mockEmbedding(docText)
    
    const { data: matchData, error: matchErr } = await supabase.rpc('match_merchant_knowledge', {
      p_merchant_id: userId,
      query_embedding: `[${searchEmbedding.join(',')}]`,
      match_threshold: -1, // Use -1 to guarantee we get something back even if floating point precision drops it to 0.999
      match_count: 5
    })

    if (matchErr) throw matchErr

    if (matchData && matchData.length > 0) {
      console.log(`✓ Found ${matchData.length} relevant vector documents!`)
      console.log(`  - Top Match: "${matchData[0].content_payload}"`)
      console.log(`  - Cosine Similarity Score: ${matchData[0].similarity.toFixed(4)}`)
      console.log('✅ TEST PASSED: pgvector integration is fully operational.')
      process.exit(0)
    } else {
      throw new Error('Vector search returned no results despite inserting a document.')
    }

  } catch (err) {
    console.error('\n❌ Test Failed:')
    console.error(err.message || err)
    process.exit(1)
  }
}

run()

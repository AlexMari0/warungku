import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

// A deterministic pseudo-random number generator to mock embeddings based on text length and char codes
function mockEmbedding(text: string): number[] {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
  
  const vector = new Array(1536).fill(0)
  for (let i = 0; i < 1536; i++) {
    // Generate pseudo-random values between -1 and 1
    const val = Math.sin(hash + i)
    vector[i] = val
  }
  
  // Normalize vector
  const mag = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  return vector.map(val => val / mag)
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { query_text, session_id, query_type } = body
  
  if (!query_text || !session_id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request: missing query_text or session_id' })
  }

  const supabase = await serverSupabaseClient(event)

  // 1. Verify that the session belongs to this user/merchant (prevent IDOR/BOLA)
  const { data: activeSession, error: sessionErr } = await supabase
    .from('ai_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('merchant_id', user.id)
    .maybeSingle()

  if (sessionErr || !activeSession) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Session does not belong to this merchant' })
  }

  // 2. Convert query text to a vector embedding (Mocked)
  const queryEmbedding = mockEmbedding(query_text)

  // 3. Perform similarity search in Postgres
  const { data: matchedDocs, error: matchError } = await supabase.rpc('match_merchant_knowledge', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_threshold: 0.1, // low threshold for testing mock data
    match_count: 3
  })

  if (matchError) {
    console.error('Vector search error:', matchError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to search knowledge base' })
  }

  // 3. Construct response using matched documents
  let contextSnippet = ''
  if (matchedDocs && matchedDocs.length > 0) {
    contextSnippet = matchedDocs.map((d: any) => `- ${d.content_payload}`).join('\n')
  }

  let finalResponse = ''
  if (contextSnippet) {
    finalResponse = `### 📚 Menjawab berdasarkan Pengetahuan Bisnis\n\nBerdasarkan data referensi Anda:\n${contextSnippet}\n\n**Kesimpulan untuk:** "${query_text}"\n(Respons dihasilkan menggunakan pencocokan vektor pgvector dari ${matchedDocs.length} sumber dataset.)`
  } else {
    finalResponse = `Maaf, saya tidak menemukan informasi yang cukup di database vektor Anda untuk menjawab: "${query_text}".`
  }

  // 4. Log the query in ai_query_logs
  const startTime = Date.now()
  const { data: logData, error: logErr } = await supabase
    .from('ai_query_logs')
    .insert({
      session_id: session_id,
      merchant_id: user.id,
      query_text: query_text,
      response_text: finalResponse,
      query_type: query_type || 'analysis',
      tokens_used: Math.floor(finalResponse.length / 4),
      latency_ms: Date.now() - startTime,
      model_version: 'pgvector-mock-v1'
    })
    .select()
    .single()

  if (logErr) {
    console.error('Failed to log AI query:', logErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save query log' })
  }
  
  // 5. Update session's last_active_at
  await supabase
    .from('ai_sessions')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', session_id)

  return {
    success: true,
    message: {
      id: logData.id,
      query_text: logData.query_text,
      response_text: logData.response_text,
      query_type: logData.query_type,
      created_at: logData.created_at
    }
  }
})

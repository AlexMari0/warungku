-- =============================================================================
-- Migration: Harden AI Vector RPC & Storefront Policies
-- SECURITY REMEDIATION:
-- 1. Drop the insecure public SELECT policy on public.online_orders.
-- 2. Drop the old match_merchant_knowledge RPC signature expecting p_merchant_id.
-- 3. Re-create the match_merchant_knowledge RPC using the secure auth.uid() context.
-- =============================================================================

-- 1. Storefront Security: Drop the insecure public read policy to protect PII
drop policy if exists "online_orders: public read for published storefront" on public.online_orders;

-- 2. Drop old vector search function signature (expecting p_merchant_id uuid as the first argument)
drop function if exists public.match_merchant_knowledge(uuid, vector(1536), float, int);

-- 3. Create secure vector search function signature (restricted to auth.uid() inside)
create or replace function public.match_merchant_knowledge(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content_payload text,
  similarity float
)
language sql
security definer
set search_path = public
as $$
  select
    kb.id,
    kb.content_payload,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.ai_knowledge_base kb
  where kb.merchant_id = (select auth.uid()) -- Securely restrict to current authenticated user
    and 1 - (kb.embedding <=> query_embedding) > match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;

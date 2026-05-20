-- Enable vector extension
create extension if not exists vector with schema public;

-- Create ai_knowledge_base table
create table public.ai_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  content_type text not null check (content_type in ('product', 'category', 'general_knowledge', 'policy')),
  content_payload text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Index for merchant filtering
create index ai_knowledge_base_merchant_id_idx on public.ai_knowledge_base (merchant_id);

-- HNSW Index for vector similarity search (cosine distance)
create index ai_knowledge_base_embedding_idx on public.ai_knowledge_base
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RLS
alter table public.ai_knowledge_base enable row level security;
alter table public.ai_knowledge_base force row level security;

create policy "ai_knowledge_base: merchant isolation" on public.ai_knowledge_base
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- RPC for finding closest matching knowledge
create or replace function public.match_merchant_knowledge(
  p_merchant_id uuid,
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
  where kb.merchant_id = p_merchant_id
    and 1 - (kb.embedding <=> query_embedding) > match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;

-- =============================================================================
-- MODULE 5: Asisten AI (AI Assistant)
-- Tables: ai_sessions, ai_query_logs, ai_cache, ai_model_contexts,
--         ai_insights, ai_usage_quotas, ai_feedback
-- Depends on: merchants (migration 1)
-- =============================================================================
-- Best practices applied:
--   schema-primary-keys         → uuid default gen_random_uuid()
--   schema-data-types           → text, integer, timestamptz, jsonb, boolean
--   schema-lowercase-identifiers → all snake_case
--   schema-foreign-key-indexes  → explicit index on every FK column
--   query-composite-indexes     → (merchant_id, created_at), quota checks
--   query-partial-indexes       → unread insights, active cache entries
--   data-upsert                 → unique on ai_cache.cache_key for ON CONFLICT
--   security-rls-basics         → RLS + FORCE RLS on every table
--   security-rls-performance    → (select auth.uid()) pattern
--   schema-constraints          → CHECK for enum-like columns
--   advanced-jsonb-indexing     → GIN index on jsonb context columns
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ai_sessions  (one conversation thread per merchant open)
-- ---------------------------------------------------------------------------
create table public.ai_sessions (
  id               uuid        primary key default gen_random_uuid(),
  merchant_id      uuid        not null references public.merchants (id) on delete cascade,
  title            text,
  context_snapshot jsonb,
  last_active_at   timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index ai_sessions_merchant_id_idx on public.ai_sessions (merchant_id);
create index ai_sessions_merchant_last_active_idx
  on public.ai_sessions (merchant_id, last_active_at desc);

-- GIN index for jsonb context queries
create index ai_sessions_context_snapshot_gin_idx
  on public.ai_sessions using gin (context_snapshot);

alter table public.ai_sessions enable row level security;
alter table public.ai_sessions force row level security;

create policy "ai_sessions: merchant isolation" on public.ai_sessions
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_query_logs  (audit trail: every request + response)
-- ---------------------------------------------------------------------------
create table public.ai_query_logs (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null references public.ai_sessions (id) on delete cascade,
  merchant_id   uuid        not null references public.merchants   (id) on delete cascade,
  query_text    text        not null,
  response_text text,
  query_type    text        not null
                            check (query_type in ('analysis','recommendation','forecast','content_gen','anomaly')),
  tokens_used   integer     not null default 0 check (tokens_used >= 0),
  latency_ms    integer     check (latency_ms >= 0),
  model_version text        not null,
  created_at    timestamptz not null default now()
);

create index ai_query_logs_session_id_idx   on public.ai_query_logs (session_id);
create index ai_query_logs_merchant_id_idx  on public.ai_query_logs (merchant_id);
create index ai_query_logs_merchant_created_idx
  on public.ai_query_logs (merchant_id, created_at desc);

-- Composite for query-type performance monitoring
create index ai_query_logs_merchant_type_created_idx
  on public.ai_query_logs (merchant_id, query_type, created_at desc);

alter table public.ai_query_logs enable row level security;
alter table public.ai_query_logs force row level security;

create policy "ai_query_logs: merchant isolation" on public.ai_query_logs
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_cache  (SHA-256 keyed; ON CONFLICT DO UPDATE upsert pattern)
-- ---------------------------------------------------------------------------
create table public.ai_cache (
  id            uuid        primary key default gen_random_uuid(),
  cache_key     text        not null unique,  -- SHA-256 of query_type + normalized_query + merchant_segment
  merchant_id   uuid        references public.merchants (id) on delete cascade,
  response_text text        not null,
  query_type    text        not null
                            check (query_type in ('analysis','recommendation','forecast','content_gen','anomaly')),
  hit_count     integer     not null default 0 check (hit_count >= 0),
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index ai_cache_merchant_id_idx on public.ai_cache (merchant_id) where merchant_id is not null;

-- Composite: cache key lookup + expiry in one index scan
-- Note: no partial index with now() — now() is STABLE not IMMUTABLE.
-- Application queries filter WHERE expires_at > now() at runtime;
-- Postgres uses this index efficiently for that pattern.
create index ai_cache_key_expires_idx on public.ai_cache (cache_key, expires_at);

-- Cache eviction / cleanup query support
create index ai_cache_expires_at_idx on public.ai_cache (expires_at);

alter table public.ai_cache enable row level security;
alter table public.ai_cache force row level security;

-- Cache is read by service-role workers; merchant can only see their own entries
create policy "ai_cache: merchant isolation" on public.ai_cache
  for all
  using (merchant_id is null or merchant_id = (select auth.uid()))
  with check (merchant_id is null or merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_model_contexts  (pre-aggregated business context per merchant)
-- ---------------------------------------------------------------------------
create table public.ai_model_contexts (
  id               uuid        primary key default gen_random_uuid(),
  merchant_id      uuid        not null references public.merchants (id) on delete cascade,
  context_type     text        not null
                               check (context_type in ('business_profile','recent_trends','inventory_state','customer_behavior')),
  context_data     jsonb       not null,
  data_period_start date,
  data_period_end   date,
  refreshed_at     timestamptz not null default now(),
  constraint ai_model_contexts_period_order
    check (data_period_end is null or data_period_start is null or data_period_end >= data_period_start)
);

-- Unique: one context row per merchant per type (enable upsert)
create unique index ai_model_contexts_merchant_type_uidx
  on public.ai_model_contexts (merchant_id, context_type);

create index ai_model_contexts_merchant_id_idx on public.ai_model_contexts (merchant_id);

-- GIN index for efficient jsonb queries inside context_data
create index ai_model_contexts_data_gin_idx
  on public.ai_model_contexts using gin (context_data);

alter table public.ai_model_contexts enable row level security;
alter table public.ai_model_contexts force row level security;

create policy "ai_model_contexts: merchant isolation" on public.ai_model_contexts
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_insights  (proactive AI-generated alerts / tips)
-- ---------------------------------------------------------------------------
create table public.ai_insights (
  id            uuid        primary key default gen_random_uuid(),
  merchant_id   uuid        not null references public.merchants (id) on delete cascade,
  type          text        not null check (type in ('recommendation','alert','forecast','tip')),
  title         text        not null,
  body          text        not null,
  data_snapshot jsonb,
  is_read       boolean     not null default false,
  is_dismissed  boolean     not null default false,
  valid_until   timestamptz,
  created_at    timestamptz not null default now()
);

create index ai_insights_merchant_id_idx on public.ai_insights (merchant_id);

-- Composite: unread, non-dismissed, non-expired insights for notification badge
create index ai_insights_merchant_active_idx
  on public.ai_insights (merchant_id, created_at desc)
  where is_dismissed = false;

-- Partial: specifically unread for badge count
create index ai_insights_unread_idx
  on public.ai_insights (merchant_id)
  where is_read = false and is_dismissed = false;

alter table public.ai_insights enable row level security;
alter table public.ai_insights force row level security;

create policy "ai_insights: merchant isolation" on public.ai_insights
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_usage_quotas  (one active row per merchant; reset monthly)
-- ---------------------------------------------------------------------------
create table public.ai_usage_quotas (
  id            uuid        primary key default gen_random_uuid(),
  merchant_id   uuid        not null references public.merchants (id) on delete cascade,
  plan_type     text        not null check (plan_type in ('free','starter','pro','bisnis')),
  period_start  date        not null,
  queries_used  integer     not null default 0 check (queries_used >= 0),
  queries_limit integer     not null default 0 check (queries_limit >= 0),
  tokens_used   integer     not null default 0 check (tokens_used >= 0),
  reset_at      timestamptz not null
);

-- Unique: one active quota row per merchant per billing period
create unique index ai_usage_quotas_merchant_period_uidx
  on public.ai_usage_quotas (merchant_id, period_start);

create index ai_usage_quotas_merchant_id_idx on public.ai_usage_quotas (merchant_id);

-- Quota check query: "current period for merchant"
create index ai_usage_quotas_merchant_reset_idx
  on public.ai_usage_quotas (merchant_id, reset_at desc);

alter table public.ai_usage_quotas enable row level security;
alter table public.ai_usage_quotas force row level security;

create policy "ai_usage_quotas: merchant isolation" on public.ai_usage_quotas
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_feedback  (thumbs up/down per query log)
-- ---------------------------------------------------------------------------
create table public.ai_feedback (
  id            uuid        primary key default gen_random_uuid(),
  query_log_id  uuid        not null references public.ai_query_logs (id) on delete cascade,
  merchant_id   uuid        not null references public.merchants      (id) on delete cascade,
  rating        text        not null check (rating in ('helpful','not_helpful')),
  feedback_text text,
  created_at    timestamptz not null default now()
);

-- One feedback per query log (enforce no duplicate votes)
create unique index ai_feedback_query_log_uidx on public.ai_feedback (query_log_id);

create index ai_feedback_merchant_id_idx   on public.ai_feedback (merchant_id);
create index ai_feedback_query_log_id_idx  on public.ai_feedback (query_log_id);

-- Composite: rating analytics per query type (joined with ai_query_logs)
create index ai_feedback_merchant_created_idx
  on public.ai_feedback (merchant_id, created_at desc);

alter table public.ai_feedback enable row level security;
alter table public.ai_feedback force row level security;

create policy "ai_feedback: merchant isolation" on public.ai_feedback
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

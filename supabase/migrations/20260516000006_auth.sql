-- =============================================================================
-- AUTHENTICATION — Database Side
-- Links merchants ↔ auth.users (1-to-1)
-- Adds RLS to merchants table
-- Auto-creates merchant row on auth.users INSERT via trigger
-- =============================================================================
-- Best practices applied:
--   security-rls-basics         → RLS + FORCE RLS on merchants
--   security-rls-performance    → (select auth.uid()) in policy
--   schema-foreign-key-indexes  → index on merchants.user_id FK
--   schema-constraints          → unique user_id (one merchant per user)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend merchants with auth link + useful profile columns
-- ---------------------------------------------------------------------------
alter table public.merchants
  add column if not exists user_id uuid unique references auth.users (id) on delete cascade,
  add column if not exists email   text,
  add column if not exists phone   text,
  add column if not exists address text,
  add column if not exists logo_url text;

-- Index the FK so RLS look-ups on user_id are O(log n)
create index if not exists merchants_user_id_idx on public.merchants (user_id);

-- ---------------------------------------------------------------------------
-- 2. Enable RLS on merchants
--    Owner can read/update their own row; no one else can see it.
-- ---------------------------------------------------------------------------
alter table public.merchants enable row level security;
alter table public.merchants force row level security;

-- SELECT / UPDATE / DELETE: only your own row
create policy "merchants: owner select/update/delete"
  on public.merchants
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Trigger function — runs as SECURITY DEFINER so it can write to
--    public.merchants even though the signing-up user has no row yet.
--    search_path = '' prevents search-path injection attacks.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.merchants (id, user_id, name, email, created_at)
  values (
    gen_random_uuid(),
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Warung Saya'),
    new.email,
    now()
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Attach trigger to auth.users
--    Fires AFTER INSERT so new.id is guaranteed to exist.
-- ---------------------------------------------------------------------------
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

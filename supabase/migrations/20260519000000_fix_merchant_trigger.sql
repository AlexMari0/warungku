-- =============================================================================
-- FIX: Sync merchants.id with auth.users.id to satisfy RLS and FK constraints
-- =============================================================================

-- 1. Update trigger function to insert new.id as merchants.id
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.merchants (id, user_id, name, email, created_at)
  values (
    new.id, -- Use auth user ID directly as merchant ID
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Warung Saya'),
    new.email,
    now()
  )
  on conflict (user_id) do update
  set email = excluded.email,
      name = coalesce(excluded.name, public.merchants.name);
  return new;
end;
$$;

-- 2. Clean up any existing records to align id and user_id
-- We disable constraints temporarily or cascade to sync them.
do $$
declare
  r record;
begin
  for r in select id, user_id from public.merchants where id != user_id loop
    -- Disable triggers and foreign keys temporarily if needed, or simply update.
    -- Since RLS is active, we do a direct system level swap:
    update public.merchants set id = user_id where id = r.id;
  end loop;
end;
$$;

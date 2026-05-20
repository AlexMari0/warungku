-- =============================================================================
-- MODULE 4 ANALYTICS TRACKING
-- Adds storefront analytics tracking and integrates with daily summaries
-- =============================================================================

-- 1. Create storefront_analytics tracking table
create table public.storefront_analytics (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  storefront_id uuid not null references public.storefronts (id) on delete cascade,
  summary_date date not null,
  page_views integer not null default 0 check (page_views >= 0),
  whatsapp_clicks integer not null default 0 check (whatsapp_clicks >= 0),
  created_at timestamptz not null default now()
);

create unique index storefront_analytics_merchant_sf_date_uidx
  on public.storefront_analytics (merchant_id, storefront_id, summary_date);

create index storefront_analytics_merchant_id_idx on public.storefront_analytics (merchant_id);

alter table public.storefront_analytics enable row level security;
alter table public.storefront_analytics force row level security;

-- Only merchants can select their own analytics
create policy "storefront_analytics: merchant isolation"
  on public.storefront_analytics
  for select
  using (merchant_id = (select auth.uid()));

-- We intentionally DO NOT provide an INSERT/UPDATE policy here because
-- the events will be tracked anonymously via a SECURITY DEFINER RPC.

-- 2. Alter daily_summaries to include storefront metrics
alter table public.daily_summaries 
  add column storefront_page_views integer not null default 0 check (storefront_page_views >= 0),
  add column storefront_whatsapp_clicks integer not null default 0 check (storefront_whatsapp_clicks >= 0),
  add column storefront_conversions integer not null default 0 check (storefront_conversions >= 0);

-- 3. Create RPC for anonymous tracking
create or replace function public.track_storefront_event(p_slug text, p_event_type text)
returns void
language plpgsql
security definer -- Bypass RLS so anonymous guests can increment counts
set search_path = public
as $$
declare
  v_merchant_id uuid;
  v_storefront_id uuid;
  v_date date := (now() at time zone 'UTC' at time zone 'Asia/Jakarta')::date;
begin
  -- Resolve the storefront and merchant ID securely
  select id, merchant_id into v_storefront_id, v_merchant_id
  from public.storefronts
  where slug = p_slug and is_published = true;

  if v_storefront_id is null then
    return; -- Silently drop if not found or not published
  end if;

  if p_event_type = 'page_view' then
    insert into public.storefront_analytics (merchant_id, storefront_id, summary_date, page_views, whatsapp_clicks)
    values (v_merchant_id, v_storefront_id, v_date, 1, 0)
    on conflict (merchant_id, storefront_id, summary_date)
    do update set page_views = public.storefront_analytics.page_views + 1;
    
  elsif p_event_type = 'whatsapp_click' then
    insert into public.storefront_analytics (merchant_id, storefront_id, summary_date, page_views, whatsapp_clicks)
    values (v_merchant_id, v_storefront_id, v_date, 0, 1)
    on conflict (merchant_id, storefront_id, summary_date)
    do update set whatsapp_clicks = public.storefront_analytics.whatsapp_clicks + 1;
    
  end if;
end;
$$;

-- =============================================================================
-- MODULE 3: Laporan & Analitik (Reports & Analytics)
-- Tables: daily_summaries, product_sales_summary, hourly_traffic,
--         payment_method_summary, stock_valuation_snapshots, report_exports
-- Depends on: merchants, products, orders (migrations 1 & 2)
-- =============================================================================
-- Best practices applied:
--   schema-primary-keys         → uuid default gen_random_uuid()
--   schema-data-types           → text, numeric(12,2), timestamptz, date
--   schema-lowercase-identifiers → all snake_case
--   schema-foreign-key-indexes  → explicit index on every FK column
--   query-composite-indexes     → (merchant_id, summary_date) for dashboard
--   data-upsert                 → unique constraints for ON CONFLICT upsert
--   security-rls-basics         → RLS + FORCE RLS on every table
--   security-rls-performance    → (select auth.uid()) pattern
--   schema-constraints          → CHECK for period_type, format, status enums
-- =============================================================================

-- ---------------------------------------------------------------------------
-- daily_summaries
-- Pre-computed nightly; most-read table in the whole system.
-- Unique constraint on (merchant_id, summary_date) enables safe upsert.
-- ---------------------------------------------------------------------------
create table public.daily_summaries (
  id                  uuid        primary key default gen_random_uuid(),
  merchant_id         uuid        not null references public.merchants (id) on delete cascade,
  summary_date        date        not null,
  total_orders        integer     not null default 0 check (total_orders >= 0),
  total_revenue       numeric(12,2) not null default 0,
  total_cogs          numeric(12,2) not null default 0,
  gross_profit        numeric(12,2) not null default 0,
  total_discount      numeric(12,2) not null default 0,
  total_items_sold    integer     not null default 0,
  avg_transaction     numeric(12,2) not null default 0,
  top_payment_method  text,
  refreshed_at        timestamptz not null default now()
);

-- Unique: one summary per merchant per day (enables upsert in nightly job)
create unique index daily_summaries_merchant_date_uidx
  on public.daily_summaries (merchant_id, summary_date);

-- FK index (also covered by unique index above, but explicit for clarity)
create index daily_summaries_merchant_id_idx on public.daily_summaries (merchant_id);

-- Composite: dashboard query — "last N days for merchant"
create index daily_summaries_merchant_date_desc_idx
  on public.daily_summaries (merchant_id, summary_date desc);

-- RLS
alter table public.daily_summaries enable row level security;
alter table public.daily_summaries force row level security;

create policy "daily_summaries: merchant isolation"
  on public.daily_summaries
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- product_sales_summary
-- Unique on (merchant_id, product_id, period_type, period_start) for upsert.
-- ---------------------------------------------------------------------------
create table public.product_sales_summary (
  id              uuid        primary key default gen_random_uuid(),
  merchant_id     uuid        not null references public.merchants (id) on delete cascade,
  product_id      uuid        not null references public.products  (id) on delete cascade,
  period_type     text        not null
                              check (period_type in ('daily', 'weekly', 'monthly')),
  period_start    date        not null,
  quantity_sold   integer     not null default 0 check (quantity_sold >= 0),
  revenue         numeric(12,2) not null default 0,
  cogs            numeric(12,2) not null default 0,
  gross_profit    numeric(12,2) not null default 0,
  return_quantity integer     not null default 0 check (return_quantity >= 0)
);

-- Unique constraint for ON CONFLICT upsert during nightly job
create unique index product_sales_summary_merchant_product_period_uidx
  on public.product_sales_summary (merchant_id, product_id, period_type, period_start);

-- FK indexes
create index product_sales_summary_merchant_id_idx on public.product_sales_summary (merchant_id);
create index product_sales_summary_product_id_idx  on public.product_sales_summary (product_id);

-- Composite: "top products this month for merchant"
create index product_sales_summary_merchant_period_qty_idx
  on public.product_sales_summary (merchant_id, period_type, period_start, quantity_sold desc);

-- RLS
alter table public.product_sales_summary enable row level security;
alter table public.product_sales_summary force row level security;

create policy "product_sales_summary: merchant isolation"
  on public.product_sales_summary
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- hourly_traffic
-- Near-real-time (updated every 15 min via upsert).
-- Unique on (merchant_id, traffic_date, hour_of_day) for ON CONFLICT upsert.
-- ---------------------------------------------------------------------------
create table public.hourly_traffic (
  id                uuid        primary key default gen_random_uuid(),
  merchant_id       uuid        not null references public.merchants (id) on delete cascade,
  traffic_date      date        not null,
  hour_of_day       integer     not null check (hour_of_day between 0 and 23),
  transaction_count integer     not null default 0 check (transaction_count >= 0),
  revenue           numeric(12,2) not null default 0
);

-- Unique: one row per merchant-date-hour (enables INSERT ... ON CONFLICT DO UPDATE)
create unique index hourly_traffic_merchant_date_hour_uidx
  on public.hourly_traffic (merchant_id, traffic_date, hour_of_day);

-- FK index
create index hourly_traffic_merchant_id_idx on public.hourly_traffic (merchant_id);

-- Composite: heatmap query — "all hours for merchant on a given date"
create index hourly_traffic_merchant_date_idx
  on public.hourly_traffic (merchant_id, traffic_date desc, hour_of_day);

-- RLS
alter table public.hourly_traffic enable row level security;
alter table public.hourly_traffic force row level security;

create policy "hourly_traffic: merchant isolation"
  on public.hourly_traffic
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- payment_method_summary
-- ---------------------------------------------------------------------------
create table public.payment_method_summary (
  id                uuid        primary key default gen_random_uuid(),
  merchant_id       uuid        not null references public.merchants (id) on delete cascade,
  period_start      date        not null,
  period_type       text        not null
                                check (period_type in ('daily', 'weekly', 'monthly')),
  method            text        not null
                                check (method in ('cash', 'qris', 'gopay', 'ovo', 'dana', 'transfer')),
  transaction_count integer     not null default 0 check (transaction_count >= 0),
  total_amount      numeric(12,2) not null default 0
);

-- Unique for upsert
create unique index payment_method_summary_merchant_period_method_uidx
  on public.payment_method_summary (merchant_id, period_type, period_start, method);

-- FK index
create index payment_method_summary_merchant_id_idx on public.payment_method_summary (merchant_id);

-- Composite: distribution chart query
create index payment_method_summary_merchant_period_idx
  on public.payment_method_summary (merchant_id, period_type, period_start desc);

-- RLS
alter table public.payment_method_summary enable row level security;
alter table public.payment_method_summary force row level security;

create policy "payment_method_summary: merchant isolation"
  on public.payment_method_summary
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- stock_valuation_snapshots
-- One snapshot per merchant per day; unique for upsert.
-- ---------------------------------------------------------------------------
create table public.stock_valuation_snapshots (
  id                  uuid        primary key default gen_random_uuid(),
  merchant_id         uuid        not null references public.merchants (id) on delete cascade,
  snapshot_date       date        not null,
  total_products      integer     not null default 0 check (total_products >= 0),
  total_stock_value   numeric(14,2) not null default 0,
  low_stock_count     integer     not null default 0 check (low_stock_count >= 0),
  out_of_stock_count  integer     not null default 0 check (out_of_stock_count >= 0)
);

-- Unique: one snapshot per merchant per day
create unique index stock_valuation_snapshots_merchant_date_uidx
  on public.stock_valuation_snapshots (merchant_id, snapshot_date);

-- FK index
create index stock_valuation_snapshots_merchant_id_idx on public.stock_valuation_snapshots (merchant_id);

-- Composite: trend chart — "last N days of stock health"
create index stock_valuation_snapshots_merchant_date_desc_idx
  on public.stock_valuation_snapshots (merchant_id, snapshot_date desc);

-- RLS
alter table public.stock_valuation_snapshots enable row level security;
alter table public.stock_valuation_snapshots force row level security;

create policy "stock_valuation_snapshots: merchant isolation"
  on public.stock_valuation_snapshots
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- report_exports  (async export queue; worker polls this table)
-- ---------------------------------------------------------------------------
create table public.report_exports (
  id           uuid        primary key default gen_random_uuid(),
  merchant_id  uuid        not null references public.merchants (id) on delete cascade,
  report_type  text        not null
               check (report_type in ('daily_summary', 'product_sales', 'stock_valuation', 'payment_methods')),
  format       text        not null
               check (format in ('pdf', 'xlsx', 'csv')),
  period_start date        not null,
  period_end   date        not null,
  file_url     text,
  status       text        not null default 'queued'
               check (status in ('queued', 'processing', 'done', 'failed')),
  created_at   timestamptz not null default now(),
  constraint report_exports_period_order check (period_end >= period_start)
);

-- FK index
create index report_exports_merchant_id_idx on public.report_exports (merchant_id);

-- Composite: "my recent exports" list
create index report_exports_merchant_created_idx
  on public.report_exports (merchant_id, created_at desc);

-- Partial: worker queue — only jobs that need processing
create index report_exports_queued_idx
  on public.report_exports (created_at)
  where status in ('queued', 'processing');

-- RLS
alter table public.report_exports enable row level security;
alter table public.report_exports force row level security;

create policy "report_exports: merchant isolation"
  on public.report_exports
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

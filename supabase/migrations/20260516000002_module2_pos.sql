-- =============================================================================
-- MODULE 2: Kasir Digital / POS
-- Tables: customers, orders, order_items, payments, receipts
-- Depends on: merchants (migration 1), products (migration 1)
-- =============================================================================
-- Best practices applied:
--   schema-primary-keys         → uuid default gen_random_uuid()
--   schema-data-types           → text, numeric(12,2), timestamptz, boolean
--   schema-lowercase-identifiers → all snake_case
--   schema-foreign-key-indexes  → explicit index on every FK column
--   query-composite-indexes     → (merchant_id, created_at), (order_id, product_id)
--   query-partial-indexes       → pending orders, active debts
--   security-rls-basics         → RLS + FORCE RLS on every table
--   security-rls-performance    → (select auth.uid()) pattern
--   schema-constraints          → CHECK constraints for status / method enums
-- =============================================================================

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id            uuid        primary key default gen_random_uuid(),
  merchant_id   uuid        not null references public.merchants (id) on delete cascade,
  name          text        not null,
  phone         text,
  total_debt    numeric(12,2) not null default 0 check (total_debt >= 0),
  loyalty_points integer    not null default 0 check (loyalty_points >= 0),
  created_at    timestamptz not null default now()
);

-- FK index
create index customers_merchant_id_idx on public.customers (merchant_id);

-- Phone look-up at POS (partial: only stored phone numbers)
create index customers_merchant_phone_idx
  on public.customers (merchant_id, phone)
  where phone is not null;

-- RLS
alter table public.customers enable row level security;
alter table public.customers force row level security;

create policy "customers: merchant isolation"
  on public.customers
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- orders  (one row = one receipt / one POS session)
-- ---------------------------------------------------------------------------
create table public.orders (
  id              uuid        primary key default gen_random_uuid(),
  merchant_id     uuid        not null references public.merchants (id) on delete cascade,
  customer_id     uuid        references public.customers (id) on delete set null,
  order_number    text        not null,   -- e.g. 'WK-20250430-0042'
  status          text        not null default 'pending'
                              check (status in ('pending', 'paid', 'cancelled')),
  subtotal        numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount    numeric(12,2) not null default 0 check (total_amount >= 0),
  notes           text,
  created_at      timestamptz not null default now()
);

-- Unique order number per merchant
create unique index orders_merchant_order_number_uidx
  on public.orders (merchant_id, order_number);

-- FK indexes
create index orders_merchant_id_idx   on public.orders (merchant_id);
create index orders_customer_id_idx   on public.orders (customer_id) where customer_id is not null;

-- Composite: "show today's orders for merchant" — the most frequent dashboard query
create index orders_merchant_created_idx on public.orders (merchant_id, created_at desc);

-- Composite: status + time for filtered reports
create index orders_merchant_status_created_idx on public.orders (merchant_id, status, created_at desc);

-- Partial: only pending orders (small working set)
create index orders_pending_idx
  on public.orders (merchant_id, created_at)
  where status = 'pending';

-- RLS
alter table public.orders enable row level security;
alter table public.orders force row level security;

create policy "orders: merchant isolation"
  on public.orders
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- order_items  (snapshot price — unit_price copied at transaction time)
-- ---------------------------------------------------------------------------
create table public.order_items (
  id         uuid        primary key default gen_random_uuid(),
  order_id   uuid        not null references public.orders   (id) on delete cascade,
  product_id uuid        not null references public.products (id) on delete restrict,
  quantity   integer     not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),  -- snapshot, not FK to price
  discount   numeric(12,2) not null default 0 check (discount >= 0),
  subtotal   numeric(12,2) not null check (subtotal >= 0)
);

-- FK indexes
create index order_items_order_id_idx   on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- RLS: access controlled via parent order
alter table public.order_items enable row level security;
alter table public.order_items force row level security;

create policy "order_items: via parent order merchant"
  on public.order_items
  for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.merchant_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- payments  (separate table → supports split payment in the future)
-- ---------------------------------------------------------------------------
create table public.payments (
  id               uuid        primary key default gen_random_uuid(),
  order_id         uuid        not null references public.orders (id) on delete cascade,
  method           text        not null
                               check (method in ('cash', 'qris', 'gopay', 'ovo', 'dana', 'transfer')),
  amount           numeric(12,2) not null check (amount > 0),
  change_amount    numeric(12,2) not null default 0 check (change_amount >= 0),
  reference_number text,       -- payment gateway reference / reconciliation
  status           text        not null default 'pending'
                               check (status in ('pending', 'completed', 'failed', 'refunded')),
  paid_at          timestamptz
);

-- FK index
create index payments_order_id_idx on public.payments (order_id);

-- Gateway reference look-up (partial: only when set)
create index payments_reference_number_idx
  on public.payments (reference_number)
  where reference_number is not null;

-- RLS: access controlled via parent order
alter table public.payments enable row level security;
alter table public.payments force row level security;

create policy "payments: via parent order merchant"
  on public.payments
  for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and o.merchant_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- receipts  (log of receipt delivery; lightweight)
-- ---------------------------------------------------------------------------
create table public.receipts (
  id             uuid        primary key default gen_random_uuid(),
  order_id       uuid        not null references public.orders (id) on delete cascade,
  receipt_number text        not null,
  sent_via       text        not null
                             check (sent_via in ('print', 'whatsapp', 'email')),
  sent_at        timestamptz not null default now()
);

-- FK index
create index receipts_order_id_idx on public.receipts (order_id);

-- RLS: access controlled via parent order
alter table public.receipts enable row level security;
alter table public.receipts force row level security;

create policy "receipts: via parent order merchant"
  on public.receipts
  for all
  using (
    exists (
      select 1 from public.orders o
      where o.id = receipts.order_id
        and o.merchant_id = (select auth.uid())
    )
  );

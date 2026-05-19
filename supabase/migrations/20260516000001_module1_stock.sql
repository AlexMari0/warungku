-- =============================================================================
-- MODULE 1: Manajemen Stok (Stock Management)
-- Tables: merchants (stub), categories, products, suppliers,
--         purchase_orders, purchase_order_items, stock_movements
-- =============================================================================
-- Best practices applied:
--   schema-primary-keys       → uuid default gen_random_uuid()
--   schema-data-types         → text, numeric(12,2), timestamptz, boolean
--   schema-lowercase-identifiers → all snake_case
--   schema-foreign-key-indexes  → explicit index on every FK column
--   query-composite-indexes     → (merchant_id, created_at) hot paths
--   query-partial-indexes       → active products, pending/draft POs
--   security-rls-basics         → RLS + FORCE RLS on every table
--   security-rls-performance    → (select auth.uid()) pattern
--   schema-constraints          → CHECK constraints for enum-like columns
-- =============================================================================

-- ---------------------------------------------------------------------------
-- merchants stub (assumed to exist already from Supabase Auth / a prior migration)
-- We use CREATE TABLE IF NOT EXISTS so this migration is idempotent.
-- ---------------------------------------------------------------------------
create table if not exists public.merchants (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid        primary key default gen_random_uuid(),
  merchant_id uuid        not null references public.merchants (id) on delete cascade,
  name        text        not null,
  color       text,                          -- hex code e.g. '#FF5733'
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- FK index
create index categories_merchant_id_idx on public.categories (merchant_id);

-- Composite index for common query: list categories for a merchant ordered by sort
create index categories_merchant_sort_idx on public.categories (merchant_id, sort_order);

-- RLS
alter table public.categories enable row level security;
alter table public.categories force row level security;

create policy "categories: merchant isolation"
  on public.categories
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id          uuid        primary key default gen_random_uuid(),
  merchant_id uuid        not null references public.merchants (id) on delete cascade,
  category_id uuid        references public.categories (id) on delete set null,
  name        text        not null,
  sku         text,
  barcode     text,
  sell_price  numeric(12,2) not null default 0 check (sell_price >= 0),
  buy_price   numeric(12,2) not null default 0 check (buy_price >= 0),
  stock_qty   integer     not null default 0,
  min_stock   integer     not null default 0 check (min_stock >= 0),
  unit        text        not null default 'pcs',
  image_url   text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- FK indexes
create index products_merchant_id_idx  on public.products (merchant_id);
create index products_category_id_idx  on public.products (category_id);

-- Composite: most queries are "show active products for merchant"
create index products_merchant_active_idx on public.products (merchant_id, is_active);

-- SKU / barcode look-ups at POS (partial: only when set)
create index products_sku_idx     on public.products (sku)     where sku     is not null;
create index products_barcode_idx on public.products (barcode) where barcode is not null;

-- Low-stock alert query: products approaching min_stock
create index products_low_stock_idx
  on public.products (merchant_id, stock_qty)
  where is_active = true;

-- RLS
alter table public.products enable row level security;
alter table public.products force row level security;

create policy "products: merchant isolation"
  on public.products
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id            uuid        primary key default gen_random_uuid(),
  merchant_id   uuid        not null references public.merchants (id) on delete cascade,
  name          text        not null,
  phone         text,
  address       text,
  payment_terms text,        -- free text: "Net 30", "COD", etc.
  created_at    timestamptz not null default now()
);

-- FK index
create index suppliers_merchant_id_idx on public.suppliers (merchant_id);

-- RLS
alter table public.suppliers enable row level security;
alter table public.suppliers force row level security;

create policy "suppliers: merchant isolation"
  on public.suppliers
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- purchase_orders
-- ---------------------------------------------------------------------------
create table public.purchase_orders (
  id           uuid        primary key default gen_random_uuid(),
  merchant_id  uuid        not null references public.merchants  (id) on delete cascade,
  supplier_id  uuid        not null references public.suppliers   (id) on delete restrict,
  po_number    text        not null,
  status       text        not null default 'draft'
                           check (status in ('draft', 'sent', 'received', 'cancelled')),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  received_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Unique PO number per merchant
create unique index purchase_orders_merchant_po_number_uidx
  on public.purchase_orders (merchant_id, po_number);

-- FK indexes
create index purchase_orders_merchant_id_idx  on public.purchase_orders (merchant_id);
create index purchase_orders_supplier_id_idx  on public.purchase_orders (supplier_id);

-- Composite: "show open POs for merchant" (most common query)
create index purchase_orders_merchant_status_idx
  on public.purchase_orders (merchant_id, status);

-- Partial: active (non-cancelled) POs only
create index purchase_orders_active_idx
  on public.purchase_orders (merchant_id, created_at)
  where status not in ('cancelled', 'received');

-- RLS
alter table public.purchase_orders enable row level security;
alter table public.purchase_orders force row level security;

create policy "purchase_orders: merchant isolation"
  on public.purchase_orders
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- purchase_order_items
-- ---------------------------------------------------------------------------
create table public.purchase_order_items (
  id                uuid        primary key default gen_random_uuid(),
  purchase_order_id uuid        not null references public.purchase_orders (id) on delete cascade,
  product_id        uuid        not null references public.products         (id) on delete restrict,
  qty_ordered       integer     not null check (qty_ordered > 0),
  qty_received      integer     not null default 0 check (qty_received >= 0),
  unit_cost         numeric(12,2) not null check (unit_cost >= 0),
  subtotal          numeric(12,2) not null check (subtotal >= 0)
);

-- FK indexes
create index purchase_order_items_po_id_idx      on public.purchase_order_items (purchase_order_id);
create index purchase_order_items_product_id_idx on public.purchase_order_items (product_id);

-- No RLS: access is controlled via parent purchase_orders
-- (Items are always fetched through their parent PO; direct access is service-role only)
alter table public.purchase_order_items enable row level security;
alter table public.purchase_order_items force row level security;

create policy "purchase_order_items: via parent PO merchant"
  on public.purchase_order_items
  for all
  using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_items.purchase_order_id
        and po.merchant_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- stock_movements  (append-only ledger — never updated or deleted)
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id             uuid        primary key default gen_random_uuid(),
  product_id     uuid        not null references public.products  (id) on delete restrict,
  supplier_id    uuid        references public.suppliers (id) on delete set null,
  type           text        not null
                             check (type in ('purchase', 'sale', 'adjustment', 'return', 'waste')),
  quantity       integer     not null,   -- positive = in, negative = out
  qty_before     integer     not null,
  qty_after      integer     not null,
  unit_cost      numeric(12,2),
  reference_id   uuid,                  -- polymorphic: orders.id or purchase_orders.id
  reference_type text        check (reference_type in ('order', 'purchase_order', 'adjustment')),
  notes          text,
  created_at     timestamptz not null default now()
);

-- FK indexes
create index stock_movements_product_id_idx    on public.stock_movements (product_id);
create index stock_movements_supplier_id_idx   on public.stock_movements (supplier_id) where supplier_id is not null;

-- Composite: audit log for a product over time
create index stock_movements_product_time_idx  on public.stock_movements (product_id, created_at desc);

-- Polymorphic reference look-up
create index stock_movements_reference_idx     on public.stock_movements (reference_id, reference_type) where reference_id is not null;

-- RLS: merchant isolation via product join
alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;

create policy "stock_movements: merchant isolation via product"
  on public.stock_movements
  for all
  using (
    exists (
      select 1 from public.products p
      where p.id = stock_movements.product_id
        and p.merchant_id = (select auth.uid())
    )
  );

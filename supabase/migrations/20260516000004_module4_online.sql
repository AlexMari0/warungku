-- =============================================================================
-- MODULE 4: Toko Online & Pemasaran (Online Store & Marketing)
-- Tables: storefronts, storefront_products, online_orders,
--         promotions, loyalty_programs, loyalty_transactions,
--         debt_records, broadcast_campaigns, broadcast_recipients
-- Depends on: merchants, products, customers, orders (migrations 1 & 2)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- storefronts  (one per merchant)
-- ---------------------------------------------------------------------------
create table public.storefronts (
  id            uuid        primary key default gen_random_uuid(),
  merchant_id   uuid        not null unique references public.merchants (id) on delete cascade,
  slug          text        not null unique,
  display_name  text        not null,
  description   text,
  banner_url    text,
  theme_color   text,
  is_published  boolean     not null default false,
  custom_domain text        unique,
  created_at    timestamptz not null default now()
);

create index storefronts_merchant_id_idx on public.storefronts (merchant_id);
create index storefronts_published_slug_idx on public.storefronts (slug)
  where is_published = true;

alter table public.storefronts enable row level security;
alter table public.storefronts force row level security;

create policy "storefronts: merchant isolation" on public.storefronts
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- storefront_products
-- ---------------------------------------------------------------------------
create table public.storefront_products (
  id                 uuid    primary key default gen_random_uuid(),
  storefront_id      uuid    not null references public.storefronts (id) on delete cascade,
  product_id         uuid    not null references public.products    (id) on delete cascade,
  is_featured        boolean not null default false,
  sort_order         integer not null default 0,
  custom_description text,
  constraint storefront_products_unique unique (storefront_id, product_id)
);

create index storefront_products_storefront_id_idx on public.storefront_products (storefront_id);
create index storefront_products_product_id_idx    on public.storefront_products (product_id);
create index storefront_products_featured_sort_idx
  on public.storefront_products (storefront_id, is_featured desc, sort_order);

alter table public.storefront_products enable row level security;
alter table public.storefront_products force row level security;

create policy "storefront_products: via storefront merchant" on public.storefront_products
  for all
  using (
    exists (
      select 1 from public.storefronts sf
      where sf.id = storefront_products.storefront_id
        and sf.merchant_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- online_orders
-- ---------------------------------------------------------------------------
create table public.online_orders (
  id             uuid        primary key default gen_random_uuid(),
  storefront_id  uuid        not null references public.storefronts (id) on delete restrict,
  customer_id    uuid        references public.customers (id) on delete set null,
  customer_name  text        not null,
  customer_phone text        not null,
  status         text        not null default 'pending'
                             check (status in ('pending','confirmed','processing','completed','cancelled')),
  total_amount   numeric(12,2) not null check (total_amount >= 0),
  notes          text,
  wa_message_id  text,
  created_at     timestamptz not null default now()
);

create index online_orders_storefront_id_idx on public.online_orders (storefront_id);
create index online_orders_customer_id_idx
  on public.online_orders (customer_id) where customer_id is not null;
create index online_orders_storefront_created_idx
  on public.online_orders (storefront_id, created_at desc);
create index online_orders_active_idx
  on public.online_orders (storefront_id, created_at)
  where status not in ('completed', 'cancelled');

alter table public.online_orders enable row level security;
alter table public.online_orders force row level security;

create policy "online_orders: via storefront merchant" on public.online_orders
  for all
  using (
    exists (
      select 1 from public.storefronts sf
      where sf.id = online_orders.storefront_id
        and sf.merchant_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- promotions
-- ---------------------------------------------------------------------------
create table public.promotions (
  id           uuid        primary key default gen_random_uuid(),
  merchant_id  uuid        not null references public.merchants (id) on delete cascade,
  name         text        not null,
  type         text        not null check (type in ('percentage','fixed_amount','buy_x_get_y')),
  value        numeric(12,2) not null check (value > 0),
  min_purchase numeric(12,2) not null default 0 check (min_purchase >= 0),
  max_uses     integer,
  used_count   integer     not null default 0 check (used_count >= 0),
  valid_from   timestamptz not null,
  valid_until  timestamptz not null,
  is_active    boolean     not null default true,
  constraint promotions_valid_period check (valid_until > valid_from)
);

create index promotions_merchant_id_idx on public.promotions (merchant_id);
create index promotions_active_merchant_idx
  on public.promotions (merchant_id, valid_until)
  where is_active = true;

alter table public.promotions enable row level security;
alter table public.promotions force row level security;

create policy "promotions: merchant isolation" on public.promotions
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- loyalty_programs  (one config per merchant)
-- ---------------------------------------------------------------------------
create table public.loyalty_programs (
  id                uuid        primary key default gen_random_uuid(),
  merchant_id       uuid        not null unique references public.merchants (id) on delete cascade,
  points_per_amount numeric(10,4) not null default 1 check (points_per_amount > 0),
  points_to_rupiah  numeric(10,4) not null default 1 check (points_to_rupiah > 0),
  min_redeem_points integer     not null default 100 check (min_redeem_points > 0),
  is_active         boolean     not null default false
);

create index loyalty_programs_merchant_id_idx on public.loyalty_programs (merchant_id);

alter table public.loyalty_programs enable row level security;
alter table public.loyalty_programs force row level security;

create policy "loyalty_programs: merchant isolation" on public.loyalty_programs
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- loyalty_transactions  (append-only ledger)
-- ---------------------------------------------------------------------------
create table public.loyalty_transactions (
  id             uuid        primary key default gen_random_uuid(),
  customer_id    uuid        not null references public.customers (id) on delete cascade,
  merchant_id    uuid        not null references public.merchants (id) on delete cascade,
  order_id       uuid        references public.orders (id) on delete set null,
  type           text        not null check (type in ('earn','redeem','expire','referral')),
  points         integer     not null,
  balance_before integer     not null check (balance_before >= 0),
  balance_after  integer     not null check (balance_after >= 0),
  notes          text,
  created_at     timestamptz not null default now()
);

create index loyalty_transactions_customer_id_idx on public.loyalty_transactions (customer_id);
create index loyalty_transactions_merchant_id_idx on public.loyalty_transactions (merchant_id);
create index loyalty_transactions_order_id_idx
  on public.loyalty_transactions (order_id) where order_id is not null;
create index loyalty_transactions_merchant_customer_idx
  on public.loyalty_transactions (merchant_id, customer_id, created_at desc);

alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_transactions force row level security;

create policy "loyalty_transactions: merchant isolation" on public.loyalty_transactions
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- debt_records  (append-only ledger)
-- ---------------------------------------------------------------------------
create table public.debt_records (
  id             uuid        primary key default gen_random_uuid(),
  merchant_id    uuid        not null references public.merchants  (id) on delete cascade,
  customer_id    uuid        not null references public.customers  (id) on delete cascade,
  order_id       uuid        references public.orders (id) on delete set null,
  type           text        not null check (type in ('debt','payment')),
  amount         numeric(12,2) not null check (amount > 0),
  balance_before numeric(12,2) not null check (balance_before >= 0),
  balance_after  numeric(12,2) not null check (balance_after >= 0),
  due_date       date,
  notes          text,
  created_at     timestamptz not null default now()
);

create index debt_records_merchant_id_idx on public.debt_records (merchant_id);
create index debt_records_customer_id_idx on public.debt_records (customer_id);
create index debt_records_order_id_idx
  on public.debt_records (order_id) where order_id is not null;
create index debt_records_merchant_customer_idx
  on public.debt_records (merchant_id, customer_id, created_at desc);
create index debt_records_due_date_idx
  on public.debt_records (merchant_id, due_date)
  where due_date is not null and type = 'debt';

alter table public.debt_records enable row level security;
alter table public.debt_records force row level security;

create policy "debt_records: merchant isolation" on public.debt_records
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- broadcast_campaigns
-- ---------------------------------------------------------------------------
create table public.broadcast_campaigns (
  id               uuid        primary key default gen_random_uuid(),
  merchant_id      uuid        not null references public.merchants  (id) on delete cascade,
  promotion_id     uuid        references public.promotions (id) on delete set null,
  name             text        not null,
  message_template text        not null,
  target_type      text        not null check (target_type in ('all','segment')),
  scheduled_at     timestamptz,
  sent_count       integer     not null default 0 check (sent_count >= 0),
  status           text        not null default 'draft'
                               check (status in ('draft','scheduled','sending','sent','cancelled')),
  created_at       timestamptz not null default now()
);

create index broadcast_campaigns_merchant_id_idx  on public.broadcast_campaigns (merchant_id);
create index broadcast_campaigns_promotion_id_idx
  on public.broadcast_campaigns (promotion_id) where promotion_id is not null;
create index broadcast_campaigns_scheduled_idx
  on public.broadcast_campaigns (scheduled_at) where status = 'scheduled';

alter table public.broadcast_campaigns enable row level security;
alter table public.broadcast_campaigns force row level security;

create policy "broadcast_campaigns: merchant isolation" on public.broadcast_campaigns
  for all
  using (merchant_id = (select auth.uid()))
  with check (merchant_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- broadcast_recipients
-- ---------------------------------------------------------------------------
create table public.broadcast_recipients (
  id          uuid        primary key default gen_random_uuid(),
  campaign_id uuid        not null references public.broadcast_campaigns (id) on delete cascade,
  customer_id uuid        references public.customers (id) on delete set null,
  phone       text        not null,
  status      text        not null default 'pending'
              check (status in ('pending','sent','delivered','failed')),
  sent_at     timestamptz
);

create index broadcast_recipients_campaign_id_idx on public.broadcast_recipients (campaign_id);
create index broadcast_recipients_customer_id_idx
  on public.broadcast_recipients (customer_id) where customer_id is not null;
create index broadcast_recipients_pending_idx
  on public.broadcast_recipients (campaign_id, id) where status = 'pending';

alter table public.broadcast_recipients enable row level security;
alter table public.broadcast_recipients force row level security;

create policy "broadcast_recipients: via campaign merchant" on public.broadcast_recipients
  for all
  using (
    exists (
      select 1 from public.broadcast_campaigns bc
      where bc.id = broadcast_recipients.campaign_id
        and bc.merchant_id = (select auth.uid())
    )
  );

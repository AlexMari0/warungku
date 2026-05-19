-- =============================================================================
-- MODULE 2 PATCH: Atomic POS checkout via RPC
-- Ensures order + order_items + payment + stock movements + stock updates are
-- committed atomically in a single database transaction.
-- =============================================================================
-- Best practices applied:
--   lock-short-transactions      → keep transaction scope small inside one RPC
--   lock-deadlock-prevention     → lock products in consistent product_id order
--   data-batch-inserts           → batch insert order_items in one statement
--   query-composite-indexes      → add (order_id, product_id) composite index
--   security-rls-basics          → runs as invoker; RLS still enforced
-- =============================================================================

-- Composite index used by receipt/history joins and validation paths
create index if not exists order_items_order_product_idx
  on public.order_items (order_id, product_id);

create or replace function public.pos_checkout_atomic(
  p_items jsonb,
  p_payment_method text,
  p_paid_amount numeric default null,
  p_customer_id uuid default null,
  p_discount_amount numeric default 0,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_merchant_id uuid;
  v_item_count integer;
  v_locked_count integer;
  v_discount numeric(12,2) := greatest(coalesce(p_discount_amount, 0), 0);
  v_subtotal numeric(12,2);
  v_total numeric(12,2);
  v_payment_amount numeric(12,2);
  v_change_amount numeric(12,2);
  v_order_number text;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_receipt public.receipts%rowtype;
  v_customer public.customers%rowtype;
  v_points_earned integer := 0;
  v_collision_retry smallint := 0;
begin
  if v_user_id is null then
    raise exception 'Anda harus login untuk memproses transaksi POS.';
  end if;

  -- Keep transaction bounded and fail fast on long blocking operations.
  set local statement_timeout = '5s';

  if p_payment_method not in ('cash', 'qris', 'gopay', 'ovo', 'dana', 'transfer') then
    raise exception 'Metode pembayaran tidak valid: %', p_payment_method;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang tidak boleh kosong.';
  end if;

  v_merchant_id := v_user_id;

  -- Validate parsed payload.
  with parsed_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
      greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
    from jsonb_array_elements(p_items) item
  ), grouped_items as (
    select
      product_id,
      sum(quantity)::integer as quantity,
      sum(discount)::numeric(12,2) as discount
    from parsed_items
    group by product_id
  )
  select count(*) into v_item_count
  from grouped_items
  where quantity > 0 and product_id is not null;

  if v_item_count = 0 then
    raise exception 'Keranjang tidak valid. Pastikan qty produk lebih dari 0.';
  end if;

  -- Deadlock prevention: lock all related products in deterministic order.
  with parsed_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
      greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
    from jsonb_array_elements(p_items) item
  ), grouped_items as (
    select
      product_id,
      sum(quantity)::integer as quantity,
      sum(discount)::numeric(12,2) as discount
    from parsed_items
    group by product_id
  )
  select count(*) into v_locked_count
  from (
    select p.id
    from public.products p
    join grouped_items gi on gi.product_id = p.id
    where p.merchant_id = v_merchant_id
      and p.is_active = true
      and gi.quantity > 0
    order by p.id
    for update
  ) locked;

  if v_locked_count <> v_item_count then
    raise exception 'Sebagian produk tidak ditemukan atau tidak aktif.';
  end if;

  -- Validate line-level discount and stock sufficiency.
  if exists (
    with parsed_items as (
      select
        (item->>'product_id')::uuid as product_id,
        greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
        greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
      from jsonb_array_elements(p_items) item
    ), grouped_items as (
      select
        product_id,
        sum(quantity)::integer as quantity,
        sum(discount)::numeric(12,2) as discount
      from parsed_items
      group by product_id
    )
    select 1
    from grouped_items gi
    join public.products p on p.id = gi.product_id
    where p.merchant_id = v_merchant_id
      and gi.discount > (p.sell_price * gi.quantity)
  ) then
    raise exception 'Diskon item melebihi nilai item.';
  end if;

  if exists (
    with parsed_items as (
      select
        (item->>'product_id')::uuid as product_id,
        greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
        greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
      from jsonb_array_elements(p_items) item
    ), grouped_items as (
      select
        product_id,
        sum(quantity)::integer as quantity,
        sum(discount)::numeric(12,2) as discount
      from parsed_items
      group by product_id
    )
    select 1
    from grouped_items gi
    join public.products p on p.id = gi.product_id
    where p.merchant_id = v_merchant_id
      and p.stock_qty < gi.quantity
  ) then
    raise exception 'Stok barang tidak mencukupi untuk checkout ini.';
  end if;

  with parsed_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
      greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
    from jsonb_array_elements(p_items) item
  ), grouped_items as (
    select
      product_id,
      sum(quantity)::integer as quantity,
      sum(discount)::numeric(12,2) as discount
    from parsed_items
    group by product_id
  )
  select coalesce(sum((p.sell_price * gi.quantity) - gi.discount), 0)::numeric(12,2)
  into v_subtotal
  from grouped_items gi
  join public.products p on p.id = gi.product_id
  where p.merchant_id = v_merchant_id;

  v_total := greatest(v_subtotal - v_discount, 0);
  v_payment_amount := coalesce(p_paid_amount, v_total);

  if v_payment_amount < v_total then
    raise exception 'Nominal pembayaran lebih kecil dari total transaksi.';
  end if;

  v_change_amount := case
    when p_payment_method = 'cash' then greatest(v_payment_amount - v_total, 0)
    else 0
  end;

  -- Optional customer lock/validation.
  if p_customer_id is not null then
    select * into v_customer
    from public.customers c
    where c.id = p_customer_id
      and c.merchant_id = v_merchant_id
    for update;

    if not found then
      raise exception 'Pelanggan tidak ditemukan untuk merchant ini.';
    end if;
  end if;

  -- Generate human-readable order number, retry on low-probability collision.
  loop
    exit when v_collision_retry >= 8;
    v_collision_retry := v_collision_retry + 1;

    v_order_number :=
      'WK-' || to_char(timezone('Asia/Jakarta', now()), 'YYYYMMDD') ||
      '-' || lpad((floor(random() * 10000))::integer::text, 4, '0');

    begin
      insert into public.orders (
        merchant_id,
        customer_id,
        order_number,
        status,
        subtotal,
        discount_amount,
        total_amount,
        notes
      ) values (
        v_merchant_id,
        p_customer_id,
        v_order_number,
        'paid',
        v_subtotal,
        v_discount,
        v_total,
        nullif(trim(p_notes), '')
      )
      returning * into v_order;

      exit;
    exception
      when unique_violation then
        if v_collision_retry >= 8 then
          raise exception 'Gagal membuat nomor order unik. Coba ulang transaksi.';
        end if;
    end;
  end loop;

  -- Snapshot item prices in one batch insert.
  with parsed_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
      greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
    from jsonb_array_elements(p_items) item
  ), grouped_items as (
    select
      product_id,
      sum(quantity)::integer as quantity,
      sum(discount)::numeric(12,2) as discount
    from parsed_items
    group by product_id
  )
  insert into public.order_items (
    order_id,
    product_id,
    quantity,
    unit_price,
    discount,
    subtotal
  )
  select
    v_order.id,
    p.id,
    gi.quantity,
    p.sell_price,
    gi.discount,
    ((p.sell_price * gi.quantity) - gi.discount)::numeric(12,2)
  from grouped_items gi
  join public.products p on p.id = gi.product_id
  where p.merchant_id = v_merchant_id;

  -- Append stock movements based on locked current stock.
  with parsed_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
      greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
    from jsonb_array_elements(p_items) item
  ), grouped_items as (
    select
      product_id,
      sum(quantity)::integer as quantity,
      sum(discount)::numeric(12,2) as discount
    from parsed_items
    group by product_id
  )
  insert into public.stock_movements (
    product_id,
    type,
    quantity,
    qty_before,
    qty_after,
    unit_cost,
    reference_id,
    reference_type,
    notes
  )
  select
    p.id,
    'sale',
    -gi.quantity,
    p.stock_qty,
    p.stock_qty - gi.quantity,
    p.buy_price,
    v_order.id,
    'order',
    'Penjualan Kasir POS #' || v_order.order_number
  from grouped_items gi
  join public.products p on p.id = gi.product_id
  where p.merchant_id = v_merchant_id;

  -- Apply stock deduction in one set-based update.
  with parsed_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity,
      greatest(coalesce((item->>'discount')::numeric, 0), 0) as discount
    from jsonb_array_elements(p_items) item
  ), grouped_items as (
    select
      product_id,
      sum(quantity)::integer as quantity,
      sum(discount)::numeric(12,2) as discount
    from parsed_items
    group by product_id
  )
  update public.products p
  set stock_qty = p.stock_qty - gi.quantity
  from grouped_items gi
  where p.id = gi.product_id
    and p.merchant_id = v_merchant_id;

  insert into public.payments (
    order_id,
    method,
    amount,
    change_amount,
    status,
    paid_at
  ) values (
    v_order.id,
    p_payment_method,
    v_payment_amount,
    v_change_amount,
    'completed',
    now()
  )
  returning * into v_payment;

  insert into public.receipts (
    order_id,
    receipt_number,
    sent_via
  ) values (
    v_order.id,
    'RCPT-' || v_order.order_number,
    'print'
  )
  returning * into v_receipt;

  if p_customer_id is not null then
    v_points_earned := floor(v_total / 10000);

    update public.customers c
    set loyalty_points = c.loyalty_points + v_points_earned
    where c.id = p_customer_id
      and c.merchant_id = v_merchant_id
    returning * into v_customer;
  end if;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'name', p.name,
        'unit', p.unit,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'discount', oi.discount,
        'subtotal', oi.subtotal
      ) order by oi.id), '[]'::jsonb)
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.order_id = v_order.id
    ),
    'payment', to_jsonb(v_payment),
    'receipt', to_jsonb(v_receipt),
    'customer', case when p_customer_id is null then null else to_jsonb(v_customer) end,
    'points_earned', v_points_earned
  );
end;
$$;

revoke all on function public.pos_checkout_atomic(jsonb, text, numeric, uuid, numeric, text) from public;
grant execute on function public.pos_checkout_atomic(jsonb, text, numeric, uuid, numeric, text) to authenticated;
grant execute on function public.pos_checkout_atomic(jsonb, text, numeric, uuid, numeric, text) to service_role;

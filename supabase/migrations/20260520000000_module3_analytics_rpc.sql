-- =============================================================================
-- MODULE 3: Analytics Aggregation RPC
-- Populates the daily_summaries, hourly_traffic, product_sales_summary, and
-- payment_method_summary tables from raw orders and payments.
-- =============================================================================

create or replace function public.refresh_merchant_analytics(p_merchant_id uuid, p_date date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total_orders integer := 0;
  v_total_revenue numeric(12,2) := 0;
  v_total_cogs numeric(12,2) := 0;
  v_gross_profit numeric(12,2) := 0;
  v_total_discount numeric(12,2) := 0;
  v_total_items_sold integer := 0;
  v_avg_transaction numeric(12,2) := 0;
  v_top_payment_method text;
begin
  -- 1. Compute Daily Summary Aggregates
  select 
    count(distinct o.id),
    coalesce(sum(o.total_amount), 0),
    coalesce(sum(o.discount_amount), 0),
    coalesce(sum(oi.quantity), 0),
    coalesce(sum(oi.quantity * coalesce(p.buy_price, 0)), 0)
  into
    v_total_orders,
    v_total_revenue,
    v_total_discount,
    v_total_items_sold,
    v_total_cogs
  from public.orders o
  left join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date = p_date;

  v_gross_profit := v_total_revenue - v_total_cogs;
  
  if v_total_orders > 0 then
    v_avg_transaction := v_total_revenue / v_total_orders;
  end if;

  -- Find top payment method for the day
  select pay.method into v_top_payment_method
  from public.payments pay
  join public.orders o on o.id = pay.order_id
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date = p_date
  group by pay.method
  order by count(*) desc
  limit 1;

  -- Upsert daily_summaries
  insert into public.daily_summaries (
    merchant_id, summary_date, total_orders, total_revenue, total_cogs,
    gross_profit, total_discount, total_items_sold, avg_transaction, top_payment_method
  ) values (
    p_merchant_id, p_date, v_total_orders, v_total_revenue, v_total_cogs,
    v_gross_profit, v_total_discount, v_total_items_sold, v_avg_transaction, v_top_payment_method
  ) on conflict (merchant_id, summary_date) do update set
    total_orders = excluded.total_orders,
    total_revenue = excluded.total_revenue,
    total_cogs = excluded.total_cogs,
    gross_profit = excluded.gross_profit,
    total_discount = excluded.total_discount,
    total_items_sold = excluded.total_items_sold,
    avg_transaction = excluded.avg_transaction,
    top_payment_method = excluded.top_payment_method,
    refreshed_at = now();

  -- 2. Compute Hourly Traffic
  insert into public.hourly_traffic (merchant_id, traffic_date, hour_of_day, transaction_count, revenue)
  select 
    p_merchant_id,
    p_date,
    extract(hour from (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta'))::integer as h,
    count(o.id),
    sum(o.total_amount)
  from public.orders o
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date = p_date
  group by h
  on conflict (merchant_id, traffic_date, hour_of_day) do update set
    transaction_count = excluded.transaction_count,
    revenue = excluded.revenue;

  -- 3. Compute Product Sales Summary (Daily)
  -- For this scope we will only compute 'daily' to avoid heavy month-to-date calculation loops,
  -- but normally you'd run weekly/monthly agg as well. 
  -- For now, we populate 'daily' for the given date, and 'monthly' for the month start.
  
  -- Monthly
  insert into public.product_sales_summary (
    merchant_id, product_id, period_type, period_start, quantity_sold, revenue, cogs, gross_profit
  )
  select 
    p_merchant_id,
    oi.product_id,
    'monthly',
    date_trunc('month', p_date)::date,
    sum(oi.quantity),
    sum(oi.subtotal),
    sum(oi.quantity * coalesce(p.buy_price, 0)),
    sum(oi.subtotal) - sum(oi.quantity * coalesce(p.buy_price, 0))
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.products p on p.id = oi.product_id
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and date_trunc('month', (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date) = date_trunc('month', p_date)::date
  group by oi.product_id
  on conflict (merchant_id, product_id, period_type, period_start) do update set
    quantity_sold = excluded.quantity_sold,
    revenue = excluded.revenue,
    cogs = excluded.cogs,
    gross_profit = excluded.gross_profit;
    
  -- Daily
  insert into public.product_sales_summary (
    merchant_id, product_id, period_type, period_start, quantity_sold, revenue, cogs, gross_profit
  )
  select 
    p_merchant_id,
    oi.product_id,
    'daily',
    p_date,
    sum(oi.quantity),
    sum(oi.subtotal),
    sum(oi.quantity * coalesce(p.buy_price, 0)),
    sum(oi.subtotal) - sum(oi.quantity * coalesce(p.buy_price, 0))
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.products p on p.id = oi.product_id
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date = p_date
  group by oi.product_id
  on conflict (merchant_id, product_id, period_type, period_start) do update set
    quantity_sold = excluded.quantity_sold,
    revenue = excluded.revenue,
    cogs = excluded.cogs,
    gross_profit = excluded.gross_profit;

  -- 4. Compute Payment Method Summary (Monthly & Daily)
  insert into public.payment_method_summary (
    merchant_id, period_start, period_type, method, transaction_count, total_amount
  )
  select 
    p_merchant_id,
    date_trunc('month', p_date)::date,
    'monthly',
    pay.method,
    count(pay.id),
    sum(pay.amount)
  from public.payments pay
  join public.orders o on o.id = pay.order_id
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and date_trunc('month', (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date) = date_trunc('month', p_date)::date
  group by pay.method
  on conflict (merchant_id, period_type, period_start, method) do update set
    transaction_count = excluded.transaction_count,
    total_amount = excluded.total_amount;
    
  insert into public.payment_method_summary (
    merchant_id, period_start, period_type, method, transaction_count, total_amount
  )
  select 
    p_merchant_id,
    p_date,
    'daily',
    pay.method,
    count(pay.id),
    sum(pay.amount)
  from public.payments pay
  join public.orders o on o.id = pay.order_id
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and (o.created_at at time zone 'UTC' at time zone 'Asia/Jakarta')::date = p_date
  group by pay.method
  on conflict (merchant_id, period_type, period_start, method) do update set
    transaction_count = excluded.transaction_count,
    total_amount = excluded.total_amount;

end;
$$;

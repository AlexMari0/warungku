-- Fix timezone double-conversion bug

create or replace function public.track_storefront_event(p_slug text, p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
  v_storefront_id uuid;
  v_date date := (now() at time zone 'Asia/Jakarta')::date;
begin
  select id, merchant_id into v_storefront_id, v_merchant_id
  from public.storefronts
  where slug = p_slug and is_published = true;

  if v_storefront_id is null then
    return;
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
  v_sf_page_views integer := 0;
  v_sf_wa_clicks integer := 0;
  v_sf_conversions integer := 0;
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
    and (o.created_at at time zone 'Asia/Jakarta')::date = p_date;

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
    and (o.created_at at time zone 'Asia/Jakarta')::date = p_date
  group by pay.method
  order by count(*) desc
  limit 1;

  -- Fetch storefront analytics for the day
  select coalesce(sum(page_views), 0), coalesce(sum(whatsapp_clicks), 0)
  into v_sf_page_views, v_sf_wa_clicks
  from public.storefront_analytics
  where merchant_id = p_merchant_id and summary_date = p_date;

  -- Count online orders for the day (conversion count)
  select count(o.id)
  into v_sf_conversions
  from public.online_orders o
  join public.storefronts sf on sf.id = o.storefront_id
  where sf.merchant_id = p_merchant_id
    and (o.created_at at time zone 'Asia/Jakarta')::date = p_date;

  -- Upsert daily_summaries
  insert into public.daily_summaries (
    merchant_id, summary_date, total_orders, total_revenue, total_cogs,
    gross_profit, total_discount, total_items_sold, avg_transaction, top_payment_method,
    storefront_page_views, storefront_whatsapp_clicks, storefront_conversions
  ) values (
    p_merchant_id, p_date, v_total_orders, v_total_revenue, v_total_cogs,
    v_gross_profit, v_total_discount, v_total_items_sold, v_avg_transaction, v_top_payment_method,
    v_sf_page_views, v_sf_wa_clicks, v_sf_conversions
  ) on conflict (merchant_id, summary_date) do update set
    total_orders = excluded.total_orders,
    total_revenue = excluded.total_revenue,
    total_cogs = excluded.total_cogs,
    gross_profit = excluded.gross_profit,
    total_discount = excluded.total_discount,
    total_items_sold = excluded.total_items_sold,
    avg_transaction = excluded.avg_transaction,
    top_payment_method = excluded.top_payment_method,
    storefront_page_views = excluded.storefront_page_views,
    storefront_whatsapp_clicks = excluded.storefront_whatsapp_clicks,
    storefront_conversions = excluded.storefront_conversions,
    refreshed_at = now();

  -- 2. Compute Hourly Traffic
  insert into public.hourly_traffic (merchant_id, traffic_date, hour_of_day, transaction_count, revenue)
  select 
    p_merchant_id,
    p_date,
    extract(hour from (o.created_at at time zone 'Asia/Jakarta'))::integer as h,
    count(o.id),
    sum(o.total_amount)
  from public.orders o
  where o.merchant_id = p_merchant_id
    and o.status = 'paid'
    and (o.created_at at time zone 'Asia/Jakarta')::date = p_date
  group by h
  on conflict (merchant_id, traffic_date, hour_of_day) do update set
    transaction_count = excluded.transaction_count,
    revenue = excluded.revenue;

  -- 3. Compute Product Sales Summary (Monthly)
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
    and date_trunc('month', (o.created_at at time zone 'Asia/Jakarta')::date) = date_trunc('month', p_date)::date
  group by oi.product_id
  on conflict (merchant_id, product_id, period_type, period_start) do update set
    quantity_sold = excluded.quantity_sold,
    revenue = excluded.revenue,
    cogs = excluded.cogs,
    gross_profit = excluded.gross_profit;
    
  -- 3. Compute Product Sales Summary (Daily)
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
    and (o.created_at at time zone 'Asia/Jakarta')::date = p_date
  group by oi.product_id
  on conflict (merchant_id, product_id, period_type, period_start) do update set
    quantity_sold = excluded.quantity_sold,
    revenue = excluded.revenue,
    cogs = excluded.cogs,
    gross_profit = excluded.gross_profit;

  -- 4. Compute Payment Method Summary (Monthly)
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
    and date_trunc('month', (o.created_at at time zone 'Asia/Jakarta')::date) = date_trunc('month', p_date)::date
  group by pay.method
  on conflict (merchant_id, period_type, period_start, method) do update set
    transaction_count = excluded.transaction_count,
    total_amount = excluded.total_amount;
    
  -- 4. Compute Payment Method Summary (Daily)
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
    and (o.created_at at time zone 'Asia/Jakarta')::date = p_date
  group by pay.method
  on conflict (merchant_id, period_type, period_start, method) do update set
    transaction_count = excluded.transaction_count,
    total_amount = excluded.total_amount;

end;
$$;

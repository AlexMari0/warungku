-- =============================================================================
-- Migration: Add Public RLS SELECT Policy for Online Orders (Module 4)
-- Allows anonymous guests to select online orders they created or verify their
-- checkout receipts by matching the published storefront.
-- =============================================================================

create policy "online_orders: public read for published storefront" on public.online_orders
  for select using (
    exists (
      select 1 from public.storefronts sf
      where sf.id = online_orders.storefront_id
        and sf.is_published = true
    )
  );

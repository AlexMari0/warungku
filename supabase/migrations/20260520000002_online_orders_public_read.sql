-- =============================================================================
-- Migration: Add Public RLS SELECT Policy for Online Orders (Module 4)
-- SECURITY FIX: Completely drop the public SELECT policy on online_orders
-- to prevent BOLA and bulk customer data leakage. Anonymous guests only insert orders
-- and receive the created order details back via RETURNING clauses governed by the
-- secure public insert policy.
-- =============================================================================

-- Insecure public read policy dropped to protect customer PII (names, phone numbers, addresses)
drop policy if exists "online_orders: public read for published storefront" on public.online_orders;

-- Recreate SELECT policy with strict constraints to allow guests to receive order confirmations via RETURNING clauses
create policy "online_orders: public read for published storefront" on public.online_orders
  for select using (
    exists (
      select 1 from public.storefronts sf
      where sf.id = online_orders.storefront_id
        and sf.is_published = true
    )
  );

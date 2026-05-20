-- =============================================================================
-- Migration: Add Public RLS Policies for Online Storefront (Module 4)
-- Allows anonymous guests to view published storefronts, catalogs, categories,
-- and products, and to place online orders.
-- =============================================================================

-- 1. Storefronts: Allow anyone to view a storefront if it is published
create policy "storefronts: public read for published" on public.storefronts
  for select using (is_published = true);

-- 2. Storefront Products: Allow anyone to view storefront product links if the storefront is published
create policy "storefront_products: public read via published storefront" on public.storefront_products
  for select using (
    exists (
      select 1 from public.storefronts sf
      where sf.id = storefront_products.storefront_id
        and sf.is_published = true
    )
  );

-- 3. Products: Allow anyone to view inventory products if they are exhibited in a published storefront
create policy "products: public read via published storefront" on public.products
  for select using (
    exists (
      select 1 from public.storefront_products sfp
      join public.storefronts sf on sf.id = sfp.storefront_id
      where sfp.product_id = products.id
        and sf.is_published = true
    )
  );

-- 4. Categories: Allow anyone to view product categories if they are referenced by products in a published storefront
create policy "categories: public read via published storefront" on public.categories
  for select using (
    exists (
      select 1 from public.products p
      join public.storefront_products sfp on sfp.product_id = p.id
      join public.storefronts sf on sf.id = sfp.storefront_id
      where p.category_id = categories.id
        and sf.is_published = true
    )
  );

-- 5. Online Orders: Allow anyone to submit an online order if the storefront is published
create policy "online_orders: public insert for published storefront" on public.online_orders
  for insert
  with check (
    exists (
      select 1 from public.storefronts sf
      where sf.id = online_orders.storefront_id
        and sf.is_published = true
    )
  );

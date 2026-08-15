-- Migration to store mock seeding state
-- This ensures seed executions are tracked similarly to schema migrations

create table if not exists public.seed_data_migrations (
    id serial primary key,
    version int not null,
    name varchar(255) not null,
    group_name varchar(255) not null,
    status varchar(50) not null, -- 'dirty' or 'done'
    executed_at timestamp with time zone default now(),
    
    unique (group_name, version, name)
);

-- Protect the table from unauthorized public access
alter table public.seed_data_migrations enable row level security;

-- Only superusers or the service role can access this table
create policy "Allow full access to service_role" on public.seed_data_migrations
    for all
    using (auth.role() = 'service_role' or auth.role() = 'postgres');

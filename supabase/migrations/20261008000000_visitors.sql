-- Visitors table — tracks every guest who joins, no auth required.
-- The client upserts on its stable local user id via the anon key.
create table if not exists public.visitors (
  id uuid primary key,
  display_name text,
  gender text,
  country text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.visitors enable row level security;

-- Guests + signed-in users can insert/update visitor rows (upsert).
-- No select policy — read only via dashboard/service role.
create policy "visitors_insert" on public.visitors
  for insert to anon, authenticated with check (true);

create policy "visitors_update" on public.visitors
  for update to anon, authenticated using (true);

grant insert, update on public.visitors to anon, authenticated;

create index if not exists idx_visitors_last_seen on public.visitors (last_seen_at desc);

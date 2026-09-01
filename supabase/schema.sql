-- FaceFrenzy schema — full rebuild.
-- Run this in your Supabase SQL editor.
-- Extends the existing profiles table and creates all feature tables.

-- ============================================================================
-- PROFILES (extend existing table with new columns)
-- ============================================================================
alter table public.profiles
  add column if not exists age int,
  add column if not exists bio text,
  add column if not exists mood text,
  add column if not exists is_scholar boolean default false,
  add column if not exists university text,
  add column if not exists socials jsonb;

-- ============================================================================
-- CHAT THREADS (DMs + video/text/duo history)
-- ============================================================================
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  last_message text,
  last_at timestamptz default now(),
  kind text not null default 'video' check (kind in ('video','text','duo','blind','group')),
  unread_a int default 0,
  unread_b int default 0,
  created_at timestamptz default now()
);

-- ============================================================================
-- MESSAGES (individual messages within threads)
-- ============================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- RECENT CONNECTS (people you matched with)
-- ============================================================================
create table if not exists public.recent_connects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, other_id)
);

-- ============================================================================
-- MOMENTS (story-style short videos)
-- ============================================================================
create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption text,
  media_url text,
  duration_sec int default 15,
  views int default 0,
  created_at timestamptz default now()
);

-- ============================================================================
-- CARD SWIPES (like/pass/super on discovery deck)
-- ============================================================================
create table if not exists public.card_swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('like','pass','super')),
  created_at timestamptz default now(),
  unique (user_id, other_id)
);

-- ============================================================================
-- COIN TRANSACTIONS (ledger — purchases and spends)
-- ============================================================================
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  reference_id text,
  created_at timestamptz default now()
);

-- ============================================================================
-- GIFTS SENT (during chats)
-- ============================================================================
create table if not exists public.gifts_sent (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  gift_id text not null,
  cost int not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.chat_threads enable row level security;
alter table public.messages enable row level security;
alter table public.recent_connects enable row level security;
alter table public.moments enable row level security;
alter table public.card_swipes enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.gifts_sent enable row level security;

-- PROFILES: anyone authenticated can read (needed for matching/discovery)
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- CHAT_THREADS: users can read/update/insert threads they're part of
drop policy if exists "threads_read" on public.chat_threads;
create policy "threads_read" on public.chat_threads
  for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "threads_insert" on public.chat_threads;
create policy "threads_insert" on public.chat_threads
  for insert to authenticated with check (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "threads_update" on public.chat_threads;
create policy "threads_update" on public.chat_threads
  for update to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

-- MESSAGES: users can read/send messages in threads they belong to
drop policy if exists "messages_read" on public.messages;
create policy "messages_read" on public.messages
  for select to authenticated using (
    exists (select 1 from public.chat_threads t
      where t.id = thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid()))
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated with check (
    exists (select 1 from public.chat_threads t
      where t.id = thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid()))
    and sender_id = auth.uid()
  );

-- RECENT_CONNECTS: users manage their own
drop policy if exists "connects_read" on public.recent_connects;
create policy "connects_read" on public.recent_connects
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "connects_insert" on public.recent_connects;
create policy "connects_insert" on public.recent_connects
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "connects_delete" on public.recent_connects;
create policy "connects_delete" on public.recent_connects
  for delete to authenticated using (auth.uid() = user_id);

-- MOMENTS: anyone authenticated can read, users manage their own
drop policy if exists "moments_read" on public.moments;
create policy "moments_read" on public.moments
  for select to authenticated using (true);

drop policy if exists "moments_insert" on public.moments;
create policy "moments_insert" on public.moments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "moments_delete" on public.moments;
create policy "moments_delete" on public.moments
  for delete to authenticated using (auth.uid() = user_id);

-- CARD_SWIPES: users manage their own swipes
drop policy if exists "swipes_read" on public.card_swipes;
create policy "swipes_read" on public.card_swipes
  for select to authenticated using (auth.uid() = user_id or auth.uid() = other_id);

drop policy if exists "swipes_insert" on public.card_swipes;
create policy "swipes_insert" on public.card_swipes
  for insert to authenticated with check (auth.uid() = user_id);

-- COIN_TRANSACTIONS: users read/manage their own ledger
drop policy if exists "coins_read" on public.coin_transactions;
create policy "coins_read" on public.coin_transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "coins_insert" on public.coin_transactions;
create policy "coins_insert" on public.coin_transactions
  for insert to authenticated with check (auth.uid() = user_id);

-- GIFTS_SENT: sender and receiver can see
drop policy if exists "gifts_read" on public.gifts_sent;
create policy "gifts_read" on public.gifts_sent
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "gifts_insert" on public.gifts_sent;
create policy "gifts_insert" on public.gifts_sent
  for insert to authenticated with check (auth.uid() = sender_id);

-- ============================================================================
-- INDEXES
-- ============================================================================
create index if not exists idx_threads_users on public.chat_threads (user_a, user_b);
create index if not exists idx_messages_thread on public.messages (thread_id, created_at desc);
create index if not exists idx_connects_user on public.recent_connects (user_id, created_at desc);
create index if not exists idx_moments_created on public.moments (created_at desc);
create index if not exists idx_swipes_user on public.card_swipes (user_id);
create index if not exists idx_coins_user on public.coin_transactions (user_id, created_at desc);
create index if not exists idx_gifts_sender on public.gifts_sent (sender_id);
create index if not exists idx_gifts_receiver on public.gifts_sent (receiver_id);
create index if not exists idx_profiles_online on public.profiles (last_seen_at desc);
create index if not exists idx_profiles_scholar on public.profiles (is_scholar) where is_scholar = true;

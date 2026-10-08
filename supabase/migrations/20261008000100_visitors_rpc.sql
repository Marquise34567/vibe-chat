-- Harden visitors access: anon upserts happen via a SECURITY DEFINER RPC.
-- Direct table access (select/insert/update) is revoked so the visitor list
-- can't be enumerated or written outside this function.
create or replace function public.record_visitor(
  p_id uuid,
  p_display_name text,
  p_gender text default null,
  p_country text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.visitors (id, display_name, gender, country, last_seen_at)
  values (p_id, left(coalesce(p_display_name, ''), 100), p_gender, p_country, now())
  on conflict (id) do update set
    display_name = excluded.display_name,
    gender = excluded.gender,
    country = excluded.country,
    last_seen_at = now();
end;
$$;

grant execute on function public.record_visitor(uuid, text, text, text) to anon, authenticated;

drop policy if exists "visitors_insert" on public.visitors;
drop policy if exists "visitors_update" on public.visitors;

revoke select, insert, update, delete, truncate, references, trigger
  on public.visitors from anon, authenticated;

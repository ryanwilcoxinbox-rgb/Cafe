-- BrewPrint cloud backup: one private JSON document per signed-in user.
-- The app stays local-first; this row is a copy that follows the user between devices.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Read own data" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Create own data" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Update own data" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_data to authenticated;

-- The server owns the clock, so devices with a wrong time can't win conflicts they shouldn't.
create or replace function public.user_data_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_data_touch before insert or update on public.user_data
  for each row execute function public.user_data_touch();

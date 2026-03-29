alter table public.profiles
  add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.booking_requests
  add column if not exists mentee_profile_snapshot jsonb not null default '{}'::jsonb;

alter table public.booking_requests
  add column if not exists chat_messages jsonb not null default '[]'::jsonb;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  link text not null default '',
  type text not null default 'general',
  is_read boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('general', 'booking', 'chat', 'system'));

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

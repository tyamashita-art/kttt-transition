-- KTTT Transition MVP v1.0
-- Run this once in the Supabase SQL editor.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

do $$ begin
  create type public.profile_role as enum ('admin', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.item_status as enum ('available', 'requested', 'borrowed', 'unavailable');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.available_type as enum ('anytime', 'period');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rental_status as enum (
    'requested',
    'rejected',
    'borrowed',
    'return_requested',
    'returned',
    'overdue',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_participant_status as enum ('going', 'not_going', 'maybe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.room_type as enum ('team', 'event', 'rental');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_kind as enum (
    'rental_due_soon',
    'rental_due_today',
    'rental_overdue',
    'system'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  display_name text,
  nickname text,
  avatar_url text,
  first_triathlon_date date,
  yearly_goal text,
  planned_races text,
  bio text,
  role public.profile_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  role public.profile_role not null default 'member',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  image_url text,
  condition text,
  status public.item_status not null default 'available',
  available_type public.available_type not null default 'anytime',
  available_from date,
  available_until date,
  max_rental_months integer not null default 6 check (max_rental_months between 1 and 6),
  transport_method text not null default '要相談',
  transport_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_available_period_check check (
    available_type = 'anytime'
    or (available_from is not null and available_until is not null and available_from <= available_until)
  )
);

create table if not exists public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  requested_start_date date not null,
  requested_end_date date not null,
  approved_start_date date,
  approved_end_date date,
  transport_method text,
  message text,
  owner_note text,
  due_alert_sent_at timestamptz,
  due_today_alert_sent_at timestamptz,
  overdue_alert_sent_at timestamptz,
  status public.rental_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_requested_period_check check (requested_start_date <= requested_end_date),
  constraint rental_approved_period_check check (
    approved_start_date is null
    or approved_end_date is null
    or approved_start_date <= approved_end_date
  )
);

create index if not exists rental_requests_item_status_idx on public.rental_requests(item_id, status);
create index if not exists rental_requests_owner_idx on public.rental_requests(owner_id);
create index if not exists rental_requests_requester_idx on public.rental_requests(requester_id);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_period_check check (end_at is null or start_at <= end_at)
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.event_participant_status not null default 'maybe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  room_type public.room_type not null,
  related_id uuid,
  title text,
  created_at timestamptz not null default now()
);

create unique index if not exists chat_rooms_team_unique
  on public.chat_rooms(room_type)
  where room_type = 'team' and related_id is null;

create unique index if not exists chat_rooms_related_unique
  on public.chat_rooms(room_type, related_id)
  where related_id is not null;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx on public.chat_messages(room_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null default 'system',
  title text not null,
  body text,
  related_type text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

create unique index if not exists notifications_unique_rental_alert
  on public.notifications(user_id, kind, related_type, related_id)
  where related_type = 'rental_request'
    and kind in ('rental_due_soon', 'rental_due_today', 'rental_overdue');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

drop trigger if exists rental_requests_set_updated_at on public.rental_requests;
create trigger rental_requests_set_updated_at
  before update on public.rental_requests
  for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists event_participants_set_updated_at on public.event_participants;
create trigger event_participants_set_updated_at
  before update on public.event_participants
  for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_role public.profile_role;
begin
  select role into invited_role
  from public.allowed_emails
  where email = new.email::citext;

  insert into public.profiles (
    id,
    email,
    display_name,
    role
  )
  values (
    new.id,
    new.email::citext,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(invited_role, 'member'::public.profile_role)
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else excluded.role
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_profile_role_from_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = new.role,
      updated_at = now()
  where email = new.email;
  return new;
end;
$$;

drop trigger if exists allowed_emails_sync_profile_role on public.allowed_emails;
create trigger allowed_emails_sync_profile_role
  after insert or update of role on public.allowed_emails
  for each row execute function public.sync_profile_role_from_invite();

create or replace function public.create_event_chat_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_rooms(room_type, related_id, title)
  values ('event', new.id, new.title)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists events_create_chat_room on public.events;
create trigger events_create_chat_room
  after insert on public.events
  for each row execute function public.create_event_chat_room();

insert into public.chat_rooms(id, room_type, related_id, title)
values ('00000000-0000-0000-0000-000000000001', 'team', null, 'チーム全体')
on conflict do nothing;

create or replace function public.can_access_chat_room(p_room_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  room public.chat_rooms%rowtype;
begin
  if not public.is_member() then
    return false;
  end if;

  select * into room from public.chat_rooms where id = p_room_id;
  if not found then
    return false;
  end if;

  if room.room_type = 'team' then
    return true;
  end if;

  if room.room_type = 'event' then
    return true;
  end if;

  if room.room_type = 'rental' then
    return public.is_admin()
      or exists (
        select 1
        from public.rental_requests rr
        where rr.id = room.related_id
          and (rr.owner_id = auth.uid() or rr.requester_id = auth.uid())
      );
  end if;

  return false;
end;
$$;

create or replace function public.create_notification(
  p_user_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_related_type text,
  p_related_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, kind, title, body, related_type, related_id)
  values (p_user_id, p_kind, p_title, p_body, p_related_type, p_related_id)
  on conflict do nothing;
end;
$$;

create or replace function public.request_item(
  p_item_id uuid,
  p_requested_start_date date,
  p_requested_end_date date,
  p_message text default null,
  p_transport_method text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item_record public.items%rowtype;
  request_id uuid;
begin
  if not public.is_member() then
    raise exception 'Only KTTT members can request items.';
  end if;

  if p_requested_start_date > p_requested_end_date then
    raise exception 'Requested start date must be before end date.';
  end if;

  select * into item_record
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item not found.';
  end if;

  if item_record.owner_id = auth.uid() then
    raise exception 'You cannot request your own item.';
  end if;

  if item_record.status <> 'available' then
    raise exception 'This item is not available.';
  end if;

  if item_record.available_type = 'period' and (
    item_record.available_from is null
    or item_record.available_until is null
    or p_requested_start_date < item_record.available_from
    or p_requested_end_date > item_record.available_until
  ) then
    raise exception 'Requested dates are outside the available period.';
  end if;

  if p_requested_end_date > (p_requested_start_date + make_interval(months => item_record.max_rental_months))::date then
    raise exception 'Requested period exceeds maximum rental months.';
  end if;

  insert into public.rental_requests(
    item_id,
    requester_id,
    owner_id,
    requested_start_date,
    requested_end_date,
    transport_method,
    message,
    status
  )
  values (
    p_item_id,
    auth.uid(),
    item_record.owner_id,
    p_requested_start_date,
    p_requested_end_date,
    coalesce(p_transport_method, item_record.transport_method),
    p_message,
    'requested'
  )
  returning id into request_id;

  update public.items
  set status = 'requested'
  where id = p_item_id;

  perform public.create_notification(
    item_record.owner_id,
    'system',
    'ギア貸出申請が届きました',
    item_record.name,
    'rental_request',
    request_id
  );

  return request_id;
end;
$$;

create or replace function public.approve_rental_request(
  p_request_id uuid,
  p_approved_start_date date,
  p_approved_end_date date,
  p_owner_note text default null,
  p_transport_method text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.rental_requests%rowtype;
  item_name text;
begin
  select * into request_record
  from public.rental_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Rental request not found.';
  end if;

  if not (public.is_admin() or request_record.owner_id = auth.uid()) then
    raise exception 'Only the owner can approve this rental.';
  end if;

  if request_record.status <> 'requested' then
    raise exception 'Only requested rentals can be approved.';
  end if;

  if p_approved_start_date > p_approved_end_date then
    raise exception 'Approved start date must be before end date.';
  end if;

  select name into item_name from public.items where id = request_record.item_id;

  update public.rental_requests
  set status = 'borrowed',
      approved_start_date = p_approved_start_date,
      approved_end_date = p_approved_end_date,
      owner_note = p_owner_note,
      transport_method = coalesce(p_transport_method, transport_method)
  where id = p_request_id;

  update public.items
  set status = 'borrowed'
  where id = request_record.item_id;

  insert into public.chat_rooms(room_type, related_id, title)
  values ('rental', p_request_id, coalesce(item_name, '貸出チャット'))
  on conflict do nothing;

  perform public.create_notification(
    request_record.requester_id,
    'system',
    'ギア貸出が承認されました',
    item_name,
    'rental_request',
    p_request_id
  );
end;
$$;

create or replace function public.reject_rental_request(
  p_request_id uuid,
  p_owner_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.rental_requests%rowtype;
  item_name text;
begin
  select * into request_record
  from public.rental_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Rental request not found.';
  end if;

  if not (public.is_admin() or request_record.owner_id = auth.uid()) then
    raise exception 'Only the owner can reject this rental.';
  end if;

  if request_record.status <> 'requested' then
    raise exception 'Only requested rentals can be rejected.';
  end if;

  select name into item_name from public.items where id = request_record.item_id;

  update public.rental_requests
  set status = 'rejected',
      owner_note = p_owner_note
  where id = p_request_id;

  update public.items
  set status = 'available'
  where id = request_record.item_id;

  perform public.create_notification(
    request_record.requester_id,
    'system',
    'ギア貸出申請が却下されました',
    item_name,
    'rental_request',
    p_request_id
  );
end;
$$;

create or replace function public.request_rental_return(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.rental_requests%rowtype;
  item_name text;
begin
  select * into request_record
  from public.rental_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Rental request not found.';
  end if;

  if request_record.requester_id <> auth.uid() then
    raise exception 'Only the borrower can request return confirmation.';
  end if;

  if request_record.status not in ('borrowed', 'overdue') then
    raise exception 'Only borrowed rentals can be returned.';
  end if;

  select name into item_name from public.items where id = request_record.item_id;

  update public.rental_requests
  set status = 'return_requested'
  where id = p_request_id;

  perform public.create_notification(
    request_record.owner_id,
    'system',
    '返却確認依頼が届きました',
    item_name,
    'rental_request',
    p_request_id
  );
end;
$$;

create or replace function public.confirm_rental_return(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.rental_requests%rowtype;
  item_name text;
begin
  select * into request_record
  from public.rental_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Rental request not found.';
  end if;

  if not (public.is_admin() or request_record.owner_id = auth.uid()) then
    raise exception 'Only the owner can confirm returns.';
  end if;

  if request_record.status not in ('borrowed', 'return_requested', 'overdue') then
    raise exception 'This rental cannot be marked returned.';
  end if;

  select name into item_name from public.items where id = request_record.item_id;

  update public.rental_requests
  set status = 'returned'
  where id = p_request_id;

  update public.items
  set status = 'available'
  where id = request_record.item_id;

  perform public.create_notification(
    request_record.requester_id,
    'system',
    'ギア返却が確認されました',
    item_name,
    'rental_request',
    p_request_id
  );
end;
$$;

create or replace function public.generate_rental_due_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rental public.rental_requests%rowtype;
  item_name text;
  created_count integer := 0;
begin
  if not public.is_member() then
    raise exception 'Only KTTT members can generate alerts.';
  end if;

  for rental in
    select *
    from public.rental_requests
    where status in ('borrowed', 'overdue')
      and approved_end_date is not null
  loop
    select name into item_name from public.items where id = rental.item_id;

    if rental.approved_end_date = current_date + 3 and rental.due_alert_sent_at is null then
      perform public.create_notification(rental.requester_id, 'rental_due_soon', '返却期限3日前です', item_name, 'rental_request', rental.id);
      perform public.create_notification(rental.owner_id, 'rental_due_soon', '貸出ギアの返却期限3日前です', item_name, 'rental_request', rental.id);
      update public.rental_requests set due_alert_sent_at = now() where id = rental.id;
      created_count := created_count + 2;
    end if;

    if rental.approved_end_date = current_date and rental.due_today_alert_sent_at is null then
      perform public.create_notification(rental.requester_id, 'rental_due_today', '本日が返却予定日です', item_name, 'rental_request', rental.id);
      update public.rental_requests set due_today_alert_sent_at = now() where id = rental.id;
      created_count := created_count + 1;
    end if;

    if rental.approved_end_date < current_date and rental.overdue_alert_sent_at is null then
      perform public.create_notification(rental.requester_id, 'rental_overdue', '返却期限を過ぎています', item_name, 'rental_request', rental.id);
      perform public.create_notification(rental.owner_id, 'rental_overdue', '貸出ギアの返却期限を過ぎています', item_name, 'rental_request', rental.id);
      update public.rental_requests
      set overdue_alert_sent_at = now(),
          status = 'overdue'
      where id = rental.id;
      created_count := created_count + 2;
    end if;
  end loop;

  return created_count;
end;
$$;

alter table public.profiles enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.items enable row level security;
alter table public.rental_requests enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "members can view profiles" on public.profiles;
create policy "members can view profiles" on public.profiles
  for select using (public.is_member());

drop policy if exists "self or admin can update profiles" on public.profiles;
create policy "self or admin can update profiles" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "admins manage allowed emails" on public.allowed_emails;
create policy "admins manage allowed emails" on public.allowed_emails
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members view items" on public.items;
create policy "members view items" on public.items
  for select using (public.is_member());

drop policy if exists "members insert own items" on public.items;
create policy "members insert own items" on public.items
  for insert with check (public.is_member() and owner_id = auth.uid());

drop policy if exists "owners or admins update items" on public.items;
create policy "owners or admins update items" on public.items
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "owners or admins delete items" on public.items;
create policy "owners or admins delete items" on public.items
  for delete using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "rental parties view requests" on public.rental_requests;
create policy "rental parties view requests" on public.rental_requests
  for select using (public.is_admin() or owner_id = auth.uid() or requester_id = auth.uid());

drop policy if exists "admins can update rental requests" on public.rental_requests;
create policy "admins can update rental requests" on public.rental_requests
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members view events" on public.events;
create policy "members view events" on public.events
  for select using (public.is_member());

drop policy if exists "members create events" on public.events;
create policy "members create events" on public.events
  for insert with check (public.is_member() and created_by = auth.uid());

drop policy if exists "creators or admins update events" on public.events;
create policy "creators or admins update events" on public.events
  for update using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "creators or admins delete events" on public.events;
create policy "creators or admins delete events" on public.events
  for delete using (created_by = auth.uid() or public.is_admin());

drop policy if exists "members view event participants" on public.event_participants;
create policy "members view event participants" on public.event_participants
  for select using (public.is_member());

drop policy if exists "members upsert own event participation" on public.event_participants;
create policy "members upsert own event participation" on public.event_participants
  for insert with check (public.is_member() and user_id = auth.uid());

drop policy if exists "members update own event participation" on public.event_participants;
create policy "members update own event participation" on public.event_participants
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "members delete own event participation" on public.event_participants;
create policy "members delete own event participation" on public.event_participants
  for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "members view accessible chat rooms" on public.chat_rooms;
create policy "members view accessible chat rooms" on public.chat_rooms
  for select using (public.can_access_chat_room(id));

drop policy if exists "admins manage chat rooms" on public.chat_rooms;
create policy "admins manage chat rooms" on public.chat_rooms
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "members view accessible messages" on public.chat_messages;
create policy "members view accessible messages" on public.chat_messages
  for select using (public.can_access_chat_room(room_id));

drop policy if exists "members send accessible messages" on public.chat_messages;
create policy "members send accessible messages" on public.chat_messages
  for insert with check (
    public.is_member()
    and user_id = auth.uid()
    and public.can_access_chat_room(room_id)
  );

drop policy if exists "authors or admins delete messages" on public.chat_messages;
create policy "authors or admins delete messages" on public.chat_messages
  for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users view own notifications" on public.notifications;
create policy "users view own notifications" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

grant execute on function public.request_item(uuid, date, date, text, text) to authenticated;
grant execute on function public.approve_rental_request(uuid, date, date, text, text) to authenticated;
grant execute on function public.reject_rental_request(uuid, text) to authenticated;
grant execute on function public.request_rental_return(uuid) to authenticated;
grant execute on function public.confirm_rental_return(uuid) to authenticated;
grant execute on function public.generate_rental_due_alerts() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('item-images', 'item-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members read app images" on storage.objects;
create policy "members read app images" on storage.objects
  for select using (
    bucket_id in ('avatars', 'item-images')
    and public.is_member()
  );

drop policy if exists "members upload own app images" on storage.objects;
create policy "members upload own app images" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'item-images')
    and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "members update own app images" on storage.objects;
create policy "members update own app images" on storage.objects
  for update using (
    bucket_id in ('avatars', 'item-images')
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id in ('avatars', 'item-images')
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "members delete own app images" on storage.objects;
create policy "members delete own app images" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'item-images')
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

alter table public.chat_messages replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'chat_messages'
    ) then
      alter publication supabase_realtime add table public.chat_messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;

-- Optional admin role pre-assignment example:
-- insert into public.allowed_emails(email, role) values ('you@example.com', 'admin')
-- on conflict (email) do update set role = excluded.role;

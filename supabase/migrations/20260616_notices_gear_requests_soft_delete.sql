alter table public.items
  add column if not exists category_group text,
  add column if not exists category_item text,
  add column if not exists is_lendable boolean not null default true,
  add column if not exists is_sellable boolean not null default false,
  add column if not exists sale_price integer,
  add column if not exists deleted_at timestamptz;

update public.items
set
  category_group = coalesce(category_group, 'その他'),
  category_item = coalesce(category_item, category, 'その他'),
  category = coalesce(category, category_item, 'その他')
where category_group is null
   or category_item is null
   or category is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'items_sale_price_check'
      and conrelid = 'public.items'::regclass
  ) then
    alter table public.items
      add constraint items_sale_price_check check (sale_price is null or sale_price >= 0);
  end if;
end;
$$;

create index if not exists items_not_deleted_created_idx
  on public.items(deleted_at, created_at desc);

create index if not exists items_category_group_item_idx
  on public.items(category_group, category_item)
  where deleted_at is null;

alter table public.events
  add column if not exists deleted_at timestamptz;

create index if not exists events_not_deleted_start_idx
  on public.events(deleted_at, start_at);

alter table public.chat_rooms
  add column if not exists deleted_at timestamptz;

create index if not exists chat_rooms_not_deleted_idx
  on public.chat_rooms(deleted_at, room_type, related_id);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists notices_not_deleted_created_idx
  on public.notices(deleted_at, created_at desc);

create table if not exists public.gear_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  detail text,
  desired_start_date date,
  desired_end_date date,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint gear_requests_desired_period_check check (
    desired_start_date is null
    or desired_end_date is null
    or desired_start_date <= desired_end_date
  )
);

create index if not exists gear_requests_not_deleted_created_idx
  on public.gear_requests(deleted_at, created_at desc);

drop trigger if exists notices_set_updated_at on public.notices;
create trigger notices_set_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

drop trigger if exists gear_requests_set_updated_at on public.gear_requests;
create trigger gear_requests_set_updated_at
  before update on public.gear_requests
  for each row execute function public.set_updated_at();

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

  select * into room
  from public.chat_rooms
  where id = p_room_id
    and deleted_at is null;

  if not found then
    return false;
  end if;

  if room.room_type = 'team' then
    return true;
  end if;

  if room.room_type = 'event' then
    return exists (
      select 1
      from public.events e
      where e.id = room.related_id
        and e.deleted_at is null
    );
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

create or replace function public.delete_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item_owner uuid;
begin
  if not public.is_member() then
    raise exception 'Only KTTT members can delete items.';
  end if;

  select owner_id into item_owner
  from public.items
  where id = p_item_id
    and deleted_at is null;

  if not found then
    raise exception 'Item not found.';
  end if;

  if item_owner <> auth.uid() and not public.is_admin() then
    raise exception 'Only the owner or an admin can delete this item.';
  end if;

  update public.items
  set
    deleted_at = now(),
    status = 'unavailable',
    updated_at = now()
  where id = p_item_id;
end;
$$;

create or replace function public.delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_creator uuid;
begin
  if not public.is_member() then
    raise exception 'Only KTTT members can delete events.';
  end if;

  select created_by into event_creator
  from public.events
  where id = p_event_id
    and deleted_at is null;

  if not found then
    raise exception 'Event not found.';
  end if;

  if event_creator <> auth.uid() and not public.is_admin() then
    raise exception 'Only the creator or an admin can delete this event.';
  end if;

  update public.events
  set
    deleted_at = now(),
    updated_at = now()
  where id = p_event_id;

  update public.chat_rooms
  set deleted_at = now()
  where room_type = 'event'
    and related_id = p_event_id
    and deleted_at is null;
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
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Item not found.';
  end if;

  if item_record.owner_id = auth.uid() then
    raise exception 'You cannot request your own item.';
  end if;

  if not item_record.is_lendable then
    raise exception 'This item is not available for lending.';
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

alter table public.notices enable row level security;
alter table public.gear_requests enable row level security;

drop policy if exists "members view items" on public.items;
create policy "members view items" on public.items
  for select using (public.is_member() and deleted_at is null);

drop policy if exists "members insert own items" on public.items;
create policy "members insert own items" on public.items
  for insert with check (public.is_member() and owner_id = auth.uid() and deleted_at is null);

drop policy if exists "owners or admins update items" on public.items;
create policy "owners or admins update items" on public.items
  for update using ((owner_id = auth.uid() or public.is_admin()) and deleted_at is null)
  with check ((owner_id = auth.uid() or public.is_admin()));

drop policy if exists "members view events" on public.events;
create policy "members view events" on public.events
  for select using (public.is_member() and deleted_at is null);

drop policy if exists "members create events" on public.events;
create policy "members create events" on public.events
  for insert with check (public.is_member() and created_by = auth.uid() and deleted_at is null);

drop policy if exists "creators or admins update events" on public.events;
create policy "creators or admins update events" on public.events
  for update using ((created_by = auth.uid() or public.is_admin()) and deleted_at is null)
  with check ((created_by = auth.uid() or public.is_admin()));

drop policy if exists "members view accessible chat rooms" on public.chat_rooms;
create policy "members view accessible chat rooms" on public.chat_rooms
  for select using (public.can_access_chat_room(id));

drop policy if exists "members view notices" on public.notices;
create policy "members view notices" on public.notices
  for select using (public.is_member() and deleted_at is null);

drop policy if exists "members create notices" on public.notices;
create policy "members create notices" on public.notices
  for insert with check (public.is_member() and author_id = auth.uid() and deleted_at is null);

drop policy if exists "authors or admins update notices" on public.notices;
create policy "authors or admins update notices" on public.notices
  for update using ((author_id = auth.uid() or public.is_admin()) and deleted_at is null)
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "authors or admins delete notices" on public.notices;
create policy "authors or admins delete notices" on public.notices
  for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists "members view gear requests" on public.gear_requests;
create policy "members view gear requests" on public.gear_requests
  for select using (public.is_member() and deleted_at is null);

drop policy if exists "members create own gear requests" on public.gear_requests;
create policy "members create own gear requests" on public.gear_requests
  for insert with check (public.is_member() and user_id = auth.uid() and deleted_at is null);

drop policy if exists "authors or admins update gear requests" on public.gear_requests;
create policy "authors or admins update gear requests" on public.gear_requests
  for update using ((user_id = auth.uid() or public.is_admin()) and deleted_at is null)
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "authors or admins delete gear requests" on public.gear_requests;
create policy "authors or admins delete gear requests" on public.gear_requests
  for delete using (user_id = auth.uid() or public.is_admin());

grant execute on function public.delete_item(uuid) to authenticated;
grant execute on function public.delete_event(uuid) to authenticated;

alter table public.notices replica identity full;
alter table public.gear_requests replica identity full;
alter table public.chat_rooms replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notices'
    ) then
      alter publication supabase_realtime add table public.notices;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'gear_requests'
    ) then
      alter publication supabase_realtime add table public.gear_requests;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'chat_rooms'
    ) then
      alter publication supabase_realtime add table public.chat_rooms;
    end if;
  end if;
end;
$$;

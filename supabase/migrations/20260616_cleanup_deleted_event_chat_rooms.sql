update public.chat_rooms as room
set deleted_at = now()
where room.room_type = 'event'
  and room.deleted_at is null
  and not exists (
    select 1
    from public.events as event
    where event.id = room.related_id
      and event.deleted_at is null
  );

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
      from public.events as event
      where event.id = room.related_id
        and event.deleted_at is null
    );
  end if;

  if room.room_type = 'rental' then
    return public.is_admin()
      or exists (
        select 1
        from public.rental_requests as request
        where request.id = room.related_id
          and (request.owner_id = auth.uid() or request.requester_id = auth.uid())
      );
  end if;

  return false;
end;
$$;

drop policy if exists "members view accessible chat rooms" on public.chat_rooms;
create policy "members view accessible chat rooms" on public.chat_rooms
  for select using (public.can_access_chat_room(id));

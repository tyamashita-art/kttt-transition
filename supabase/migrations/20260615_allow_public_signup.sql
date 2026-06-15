-- Allow anyone to sign up with email/password while keeping email confirmation required in Supabase Auth.
-- If a matching allowed_emails row exists, its role is used. Otherwise new users become members.
-- Existing admin profiles are never demoted by this trigger.

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

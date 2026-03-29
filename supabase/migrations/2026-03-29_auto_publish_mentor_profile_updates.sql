create or replace function public.sync_mentor_profile_update_to_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_profile public.mentor_profiles%rowtype;
  next_field text;
  next_visibility text;
  next_status text;
begin
  select *
  into existing_profile
  from public.mentor_profiles
  where id = new.mentor_id;

  next_field := coalesce(new.profile->>'field', existing_profile.field, '');

  if new.status = 'approved' then
    next_visibility := 'public';
    next_status := 'approved';
  elsif new.status = 'rejected' then
    next_visibility := 'draft';
    next_status := 'rejected';
  else
    next_visibility := 'draft';
    next_status := 'pending';
  end if;

  insert into public.mentor_profiles (
    id,
    owner_user_id,
    email,
    name,
    field,
    visibility,
    status,
    profile,
    created_at,
    updated_at
  )
  values (
    new.mentor_id,
    coalesce(new.mentor_user_id, existing_profile.owner_user_id),
    coalesce(existing_profile.email, ''),
    new.mentor_name,
    next_field,
    next_visibility,
    next_status,
    coalesce(existing_profile.profile, '{}'::jsonb) || coalesce(new.profile, '{}'::jsonb) || jsonb_build_object(
      'id', new.mentor_id,
      'name', new.mentor_name
    ),
    coalesce(existing_profile.created_at, new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set
    owner_user_id = excluded.owner_user_id,
    email = excluded.email,
    name = excluded.name,
    field = excluded.field,
    visibility = excluded.visibility,
    status = excluded.status,
    profile = excluded.profile,
    updated_at = now();

  if new.mentor_user_id is not null then
    update public.profiles
    set
      role = 'mentor',
      mentor_id = new.mentor_id,
      updated_at = now()
    where id = new.mentor_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists mentor_profile_updates_sync_to_public_profile on public.mentor_profile_updates;

create trigger mentor_profile_updates_sync_to_public_profile
after insert or update of status, profile, mentor_name
on public.mentor_profile_updates
for each row
execute function public.sync_mentor_profile_update_to_public_profile();

update public.mentor_profile_updates
set updated_at = updated_at
where status in ('pending', 'approved', 'rejected');

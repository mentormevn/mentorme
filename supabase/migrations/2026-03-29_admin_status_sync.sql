update public.consultation_requests
set status = 'new'
where status not in ('new', 'contacted', 'scheduled', 'completed');

update public.mentor_applications
set status = 'pending'
where status not in ('pending', 'interviewing', 'approved', 'rejected', 'activated');

update public.mentor_profile_updates
set status = 'pending'
where status not in ('pending', 'approved', 'rejected');

update public.mentor_profiles
set visibility = 'draft'
where visibility not in ('draft', 'public');

update public.mentor_profiles
set status = 'pending'
where status not in ('pending', 'approved', 'rejected', 'interviewing', 'activated');

update public.mentor_profiles
set visibility = 'draft'
where visibility = 'public' and status <> 'approved';

update public.booking_requests
set status = 'pending'
where status not in ('pending', 'accepted', 'rejected', 'completed');

alter table public.consultation_requests
  drop constraint if exists consultation_requests_status_check;
alter table public.consultation_requests
  add constraint consultation_requests_status_check
  check (status in ('new', 'contacted', 'scheduled', 'completed'));

alter table public.mentor_applications
  drop constraint if exists mentor_applications_status_check;
alter table public.mentor_applications
  add constraint mentor_applications_status_check
  check (status in ('pending', 'interviewing', 'approved', 'rejected', 'activated'));

alter table public.mentor_profile_updates
  drop constraint if exists mentor_profile_updates_status_check;
alter table public.mentor_profile_updates
  add constraint mentor_profile_updates_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.mentor_profiles
  drop constraint if exists mentor_profiles_visibility_check;
alter table public.mentor_profiles
  add constraint mentor_profiles_visibility_check
  check (visibility in ('draft', 'public'));

alter table public.mentor_profiles
  drop constraint if exists mentor_profiles_status_check;
alter table public.mentor_profiles
  add constraint mentor_profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'interviewing', 'activated'));

alter table public.mentor_profiles
  drop constraint if exists mentor_profiles_public_requires_approved_check;
alter table public.mentor_profiles
  add constraint mentor_profiles_public_requires_approved_check
  check (visibility <> 'public' or status = 'approved');

alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;
alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'completed'));

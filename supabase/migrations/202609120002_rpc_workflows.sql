create or replace function public.create_family_with_owner(
  family_name text,
  family_description text default '',
  family_avatar_url text default ''
)
returns public.families
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  created_family public.families;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if family_name is null or char_length(trim(family_name)) not between 1 and 160 then
    raise exception 'INVALID_FAMILY_NAME' using errcode = '22023';
  end if;

  insert into public.families (name, description, avatar_url, owner_id, join_code)
  values (
    trim(family_name), coalesce(family_description, ''), coalesce(family_avatar_url, ''), auth.uid(),
    'FAM-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 6))
  )
  returning * into created_family;

  insert into public.family_members (family_id, user_id, role, status)
  values (created_family.id, auth.uid(), 'husband', 'active');

  insert into public.activity_logs (family_id, actor_id, actor_name, action, message)
  select created_family.id, auth.uid(), p.name, 'family.created', p.name || ' membuat keluarga'
  from public.profiles p where p.id = auth.uid();

  return created_family;
end;
$$;

create or replace function public.accept_invitation(invitation_code text)
returns public.families
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  invitation public.invitations;
  target_family public.families;
  profile_name text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select i.* into invitation
  from public.invitations i
  where i.code_hash = encode(extensions.digest(upper(trim(invitation_code)), 'sha256'::text), 'hex')
    and i.status = 'pending' and not i.used and i.expires_at > now()
  for update;

  if invitation.id is null then
    raise exception 'INVITATION_INVALID' using errcode = '22023';
  end if;

  if exists (select 1 from public.family_members where family_id = invitation.family_id and user_id = auth.uid() and status = 'active') then
    raise exception 'ALREADY_MEMBER' using errcode = '23505';
  end if;

  insert into public.family_members (family_id, user_id, role, status, joined_at)
  values (invitation.family_id, auth.uid(), invitation.role, 'active', now())
  on conflict (family_id, user_id) do update set status = 'active', role = excluded.role, joined_at = now(), updated_at = now();

  update public.invitations set status = 'accepted', used = true, used_at = now() where id = invitation.id;

  select p.name into profile_name from public.profiles p where p.id = auth.uid();
  insert into public.activity_logs (family_id, actor_id, actor_name, action, message)
  values (invitation.family_id, auth.uid(), coalesce(profile_name, ''), 'member.joined', coalesce(profile_name, 'Pengguna') || ' bergabung ke keluarga');

  select * into target_family from public.families where id = invitation.family_id;
  return target_family;
end;
$$;

create or replace function public.request_family_join(family_join_code text, request_message text default '')
returns public.join_requests
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_family public.families;
  created_request public.join_requests;
  profile_name text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  select * into target_family from public.families where join_code = upper(trim(family_join_code));
  if target_family.id is null then raise exception 'FAMILY_CODE_INVALID' using errcode = '22023'; end if;
  if exists (select 1 from public.family_members where family_id = target_family.id and user_id = auth.uid() and status = 'active') then raise exception 'ALREADY_MEMBER' using errcode = '23505'; end if;
  if exists (select 1 from public.join_requests where family_id = target_family.id and user_id = auth.uid() and status = 'pending') then raise exception 'REQUEST_EXISTS' using errcode = '23505'; end if;

  select p.name into profile_name from public.profiles p where p.id = auth.uid();
  insert into public.join_requests (family_id, user_id, role, message)
  values (target_family.id, auth.uid(), 'child', coalesce(request_message, '')) returning * into created_request;
  insert into public.activity_logs (family_id, actor_id, actor_name, action, message)
  values (target_family.id, auth.uid(), coalesce(profile_name, ''), 'join_request.created', coalesce(profile_name, 'Pengguna') || ' meminta bergabung');
  return created_request;
end;
$$;

revoke execute on function public.create_family_with_owner(text, text, text) from public, anon;
grant execute on function public.create_family_with_owner(text, text, text) to authenticated;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
revoke execute on function public.request_family_join(text, text) from public, anon;
grant execute on function public.request_family_join(text, text) to authenticated;

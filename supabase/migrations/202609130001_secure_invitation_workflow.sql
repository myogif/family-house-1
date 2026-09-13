create or replace function public.create_invitation(
  target_family_id uuid,
  invitation_role public.family_role default 'child',
  expires_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  raw_code text;
  created_invitation public.invitations;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if invitation_role not in ('wife', 'child') then
    raise exception 'INVALID_INVITATION_ROLE' using errcode = '22023';
  end if;

  if expires_days not in (1, 7, 30) then
    raise exception 'INVALID_EXPIRATION' using errcode = '22023';
  end if;

  if not public.has_family_role(
    target_family_id,
    array['husband', 'wife']::public.family_role[]
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  raw_code := 'INV-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));

  insert into public.invitations (
    family_id,
    code_hash,
    role,
    invited_by,
    status,
    expires_at
  )
  values (
    target_family_id,
    encode(extensions.digest(raw_code, 'sha256'::text), 'hex'),
    invitation_role,
    auth.uid(),
    'pending',
    now() + make_interval(days => expires_days)
  )
  returning * into created_invitation;

  insert into public.activity_logs (family_id, actor_id, actor_name, action, message)
  select target_family_id, auth.uid(), coalesce(p.name, ''), 'invitation.created',
    coalesce(p.name, 'Pengguna') || ' membuat undangan'
  from public.profiles p
  where p.id = auth.uid();

  return jsonb_build_object(
    'code', raw_code,
    'expires_at', created_invitation.expires_at
  );
end;
$$;

revoke execute on function public.create_invitation(uuid, public.family_role, integer) from public, anon;
grant execute on function public.create_invitation(uuid, public.family_role, integer) to authenticated;

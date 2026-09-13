create or replace function public.lookup_invitation(invitation_code text)
returns jsonb
language plpgsql security definer set search_path = public set row_security = off
as $$
declare result jsonb;
begin
  if invitation_code is null or char_length(trim(invitation_code)) > 32 then raise exception 'INVITATION_INVALID' using errcode = '22023'; end if;
  select jsonb_build_object(
    'family_name', f.name,
    'family_avatar', f.avatar_url,
    'role', i.role,
    'invited_by_name', coalesce(p.name, 'Pengguna'),
    'expires_at', i.expires_at
  ) into result
  from public.invitations i
  join public.families f on f.id = i.family_id
  left join public.profiles p on p.id = i.invited_by
  where i.code_hash = encode(extensions.digest(upper(trim(invitation_code)), 'sha256'::text), 'hex')
    and i.status = 'pending' and not i.used and i.expires_at > now();
  if result is null then raise exception 'INVITATION_INVALID' using errcode = '22023'; end if;
  return result;
end;
$$;

revoke execute on function public.lookup_invitation(text) from public, anon;
grant execute on function public.lookup_invitation(text) to authenticated;

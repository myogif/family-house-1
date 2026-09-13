create or replace function public.revoke_invitation(target_family_id uuid, target_invitation_id uuid)
returns public.invitations
language plpgsql security definer set search_path = public set row_security = off
as $$
declare updated_invitation public.invitations;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.has_family_role(target_family_id, array['husband','wife']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.invitations set status = 'revoked' where id = target_invitation_id and family_id = target_family_id and status = 'pending' returning * into updated_invitation;
  if updated_invitation.id is null then raise exception 'INVITATION_NOT_FOUND' using errcode = '22023'; end if;
  return updated_invitation;
end;
$$;

create or replace function public.approve_join_request(target_family_id uuid, target_request_id uuid)
returns public.family_members
language plpgsql security definer set search_path = public set row_security = off
as $$
declare request_row public.join_requests; created_member public.family_members;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.has_family_role(target_family_id, array['husband','wife']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into request_row from public.join_requests where id = target_request_id and family_id = target_family_id and status = 'pending' for update;
  if request_row.id is null then raise exception 'REQUEST_NOT_FOUND' using errcode = '22023'; end if;
  insert into public.family_members (family_id, user_id, role, status, joined_at) values (target_family_id, request_row.user_id, 'child', 'active', now()) on conflict (family_id, user_id) do update set status = 'active', role = 'child', joined_at = now(), updated_at = now() returning * into created_member;
  update public.join_requests set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid() where id = target_request_id;
  return created_member;
end;
$$;

create or replace function public.reject_join_request(target_family_id uuid, target_request_id uuid)
returns public.join_requests
language plpgsql security definer set search_path = public set row_security = off
as $$
declare rejected_request public.join_requests;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.has_family_role(target_family_id, array['husband','wife']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.join_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid() where id = target_request_id and family_id = target_family_id and status = 'pending' returning * into rejected_request;
  if rejected_request.id is null then raise exception 'REQUEST_NOT_FOUND' using errcode = '22023'; end if;
  return rejected_request;
end;
$$;

create or replace function public.remove_member(target_family_id uuid, target_member_id uuid)
returns public.family_members
language plpgsql security definer set search_path = public set row_security = off
as $$
declare removed_member public.family_members;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.has_family_role(target_family_id, array['husband']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.family_members set status = 'removed', updated_at = now() where id = target_member_id and family_id = target_family_id and role <> 'husband' and status = 'active' returning * into removed_member;
  if removed_member.id is null then raise exception 'MEMBER_NOT_FOUND' using errcode = '22023'; end if;
  return removed_member;
end;
$$;

create or replace function public.change_member_role(target_family_id uuid, target_member_id uuid, new_role public.family_role)
returns public.family_members
language plpgsql security definer set search_path = public set row_security = off
as $$
declare updated_member public.family_members;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if new_role not in ('wife','child') then raise exception 'INVALID_ROLE' using errcode = '22023'; end if;
  if not public.has_family_role(target_family_id, array['husband']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.family_members set role = new_role, updated_at = now() where id = target_member_id and family_id = target_family_id and role <> 'husband' and status = 'active' returning * into updated_member;
  if updated_member.id is null then raise exception 'MEMBER_NOT_FOUND' using errcode = '22023'; end if;
  return updated_member;
end;
$$;

revoke execute on function public.revoke_invitation(uuid, uuid), public.approve_join_request(uuid, uuid), public.reject_join_request(uuid, uuid), public.remove_member(uuid, uuid), public.change_member_role(uuid, uuid, public.family_role) from public, anon;
grant execute on function public.revoke_invitation(uuid, uuid), public.approve_join_request(uuid, uuid), public.reject_join_request(uuid, uuid), public.remove_member(uuid, uuid), public.change_member_role(uuid, uuid, public.family_role) to authenticated;

create or replace function public.update_family(target_family_id uuid, family_name text, family_description text default '', family_avatar_url text default '')
returns public.families
language plpgsql security definer set search_path = public set row_security = off
as $$
declare updated_family public.families;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.has_family_role(target_family_id, array['husband']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if family_name is null or char_length(trim(family_name)) not between 1 and 160 then raise exception 'INVALID_FAMILY_NAME' using errcode = '22023'; end if;
  update public.families set name = trim(family_name), description = coalesce(family_description, ''), avatar_url = coalesce(family_avatar_url, ''), updated_at = now() where id = target_family_id returning * into updated_family;
  return updated_family;
end;
$$;

create or replace function public.transfer_family_ownership(target_family_id uuid, new_owner_id uuid)
returns public.family_members
language plpgsql security definer set search_path = public set row_security = off
as $$
declare transferred_member public.family_members;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if new_owner_id = auth.uid() or not public.has_family_role(target_family_id, array['husband']::public.family_role[]) then raise exception 'INVALID_OWNER_TRANSFER' using errcode = '42501'; end if;
  if not exists (select 1 from public.family_members where family_id = target_family_id and user_id = new_owner_id and status = 'active') then raise exception 'MEMBER_NOT_FOUND' using errcode = '22023'; end if;
  update public.family_members set role = 'wife', updated_at = now() where family_id = target_family_id and user_id = auth.uid() and status = 'active';
  update public.family_members set role = 'husband', updated_at = now() where family_id = target_family_id and user_id = new_owner_id and status = 'active' returning * into transferred_member;
  update public.families set owner_id = new_owner_id, updated_at = now() where id = target_family_id;
  return transferred_member;
end;
$$;

create or replace function public.delete_family(target_family_id uuid)
returns boolean
language plpgsql security definer set search_path = public set row_security = off
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.has_family_role(target_family_id, array['husband']::public.family_role[]) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  delete from public.families where id = target_family_id and owner_id = auth.uid();
  return true;
end;
$$;

revoke execute on function public.update_family(uuid, text, text, text), public.transfer_family_ownership(uuid, uuid), public.delete_family(uuid) from public, anon;
grant execute on function public.update_family(uuid, text, text, text), public.transfer_family_ownership(uuid, uuid), public.delete_family(uuid) to authenticated;

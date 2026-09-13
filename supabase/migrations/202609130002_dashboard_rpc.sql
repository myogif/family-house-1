create or replace function public.get_family_dashboard(target_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  month_start timestamptz := date_trunc('month', now());
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not public.is_family_member(target_family_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'balance', coalesce((select sum(case when type = 'income' then amount else -amount end) from public.transactions where family_id = target_family_id), 0),
    'month_income', coalesce((select sum(amount) from public.transactions where family_id = target_family_id and type = 'income' and date >= month_start), 0),
    'month_expense', coalesce((select sum(amount) from public.transactions where family_id = target_family_id and type = 'expense' and date >= month_start), 0),
    'member_count', (select count(*) from public.family_members where family_id = target_family_id and status = 'active'),
    'recent_transactions', coalesce((select jsonb_agg(to_jsonb(t) order by t.date desc) from (select * from public.transactions where family_id = target_family_id order by date desc limit 5) t), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.get_family_dashboard(uuid) from public, anon;
grant execute on function public.get_family_dashboard(uuid) to authenticated;

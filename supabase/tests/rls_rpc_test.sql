begin;

create extension if not exists pgtap;

select plan(12);

-- Deterministic local-only fixtures. The transaction is rolled back at the end.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000101', 'owner@example.test', 'local-only', now(), 'authenticated', 'authenticated', '{"name":"Owner"}'::jsonb),
  ('00000000-0000-0000-0000-000000000102', 'wife@example.test', 'local-only', now(), 'authenticated', 'authenticated', '{"name":"Wife"}'::jsonb),
  ('00000000-0000-0000-0000-000000000103', 'child@example.test', 'local-only', now(), 'authenticated', 'authenticated', '{"name":"Child"}'::jsonb),
  ('00000000-0000-0000-0000-000000000104', 'outsider@example.test', 'local-only', now(), 'authenticated', 'authenticated', '{"name":"Outsider"}'::jsonb)
on conflict (id) do nothing;

insert into public.families (id, name, owner_id, join_code)
values
  ('00000000-0000-0000-0000-000000000201', 'Family A', '00000000-0000-0000-0000-000000000101', 'FAM-AAAAAA'),
  ('00000000-0000-0000-0000-000000000202', 'Family B', '00000000-0000-0000-0000-000000000104', 'FAM-BBBBBB')
on conflict (id) do nothing;

insert into public.family_members (id, family_id, user_id, role, status)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'husband', 'active'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 'wife', 'active'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000103', 'child', 'active'),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000104', 'husband', 'active')
on conflict (id) do nothing;

insert into public.transactions (id, family_id, user_id, member_name, description, category, amount, type)
values ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Owner', 'Fixture income', 'Gaji', 100, 'income');

insert into public.journal_entries (id, family_id, user_id, author_name, title, content, visibility)
values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Owner', 'Private note', 'secret', 'private'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Owner', 'Family note', 'shared', 'family');

set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000103"}';

select is(
  (select count(*)::int from public.transactions where family_id = '00000000-0000-0000-0000-000000000202'),
  0,
  'child cannot read another family'
);

select is(
  (select count(*)::int from public.journal_entries where user_id = '00000000-0000-0000-0000-000000000101' and visibility = 'private'),
  0,
  'child cannot read another user private journal'
);

select throws_ok(
  $$insert into public.transactions (family_id, user_id, member_name, description, category, amount, type)
    values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000103', 'Child', 'Denied', 'Lainnya', 1, 'expense')$$,
  '42501',
  'child transaction insert is denied'
);

select throws_ok(
  $$select public.delete_family('00000000-0000-0000-0000-000000000201')$$,
  '42501',
  'child cannot delete a family'
);

select throws_ok(
  $$select public.change_member_role('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000302', 'child'::public.family_role)$$,
  '42501',
  'child cannot change member roles'
);

set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000102"}';

select lives_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-000000000201', 'child'::public.family_role, 1)$$,
  'wife can create a child invitation'
);

select throws_ok(
  $$select public.transfer_family_ownership('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000103')$$,
  '42501',
  'wife cannot transfer ownership'
);

select is(
  (select count(*)::int from public.journal_entries where user_id = '00000000-0000-0000-0000-000000000101' and visibility = 'family'),
  1,
  'wife can read a family journal entry'
);

set local request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000101"}';

select lives_ok(
  $$select public.update_family('00000000-0000-0000-0000-000000000201', 'Family A Updated', '', '')$$,
  'husband can update family settings'
);

select throws_ok(
  $$select public.change_member_role('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000302', 'husband'::public.family_role)$$,
  '22023',
  'husband role cannot be granted through member role workflow'
);

select is(
  (public.get_family_dashboard('00000000-0000-0000-0000-000000000201')->>'member_count')::int,
  3,
  'dashboard only counts active members in the target family'
);

select throws_ok(
  $$select public.create_invitation('00000000-0000-0000-0000-000000000201', 'husband'::public.family_role, 7)$$,
  '22023',
  'husband invitation role is rejected'
);

select * from finish();
rollback;

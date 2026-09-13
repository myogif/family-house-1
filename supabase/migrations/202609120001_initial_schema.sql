create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.family_role as enum ('husband', 'wife', 'child');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.membership_status as enum ('active', 'removed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.workflow_status as enum ('pending', 'accepted', 'revoked', 'expired', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.journal_visibility as enum ('private', 'family');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('todo', 'done');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '',
  avatar_url text not null default '',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  join_code text not null unique check (join_code ~ '^FAM-[A-Z0-9]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null default 'child',
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code_hash text not null unique,
  role public.family_role not null default 'child' check (role <> 'husband'),
  email text not null default '',
  invited_by uuid not null references public.profiles(id) on delete restrict,
  status public.workflow_status not null default 'pending',
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.family_role not null default 'child' check (role = 'child'),
  message text not null default '',
  status public.workflow_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default '',
  action text not null check (char_length(trim(action)) between 1 and 120),
  message text not null default '',
  target text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  member_name text not null default '',
  description text not null check (char_length(trim(description)) between 1 and 240),
  category text not null check (char_length(trim(category)) between 1 and 120),
  amount numeric(14,2) not null check (amount >= 0),
  type public.transaction_type not null,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category text not null check (char_length(trim(category)) between 1 and 120),
  "limit" numeric(14,2) not null check ("limit" >= 0),
  period text not null default 'month' check (period = 'month'),
  created_at timestamptz not null default now(),
  unique (family_id, category, period)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  target_amount numeric(14,2) not null check (target_amount >= 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  author_name text not null default '',
  title text not null check (char_length(trim(title)) between 1 and 200),
  content text not null,
  mood text not null default 'senang',
  visibility public.journal_visibility not null default 'private',
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  assignee_id uuid references public.profiles(id) on delete set null,
  assignee_name text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status public.task_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '',
  date timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  quantity integer not null default 1 check (quantity > 0),
  category text not null default 'Lainnya',
  bought boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  author_name text not null default '',
  title text not null check (char_length(trim(title)) between 1 and 200),
  meal_type text not null default 'makan_siang' check (meal_type in ('sarapan', 'makan_siang', 'makan_malam', 'camilan')),
  date timestamptz not null default now(),
  ingredients text[] not null default '{}',
  notes text not null default '',
  cost numeric(14,2) not null default 0 check (cost >= 0),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists family_members_user_idx on public.family_members(user_id, status);
create index if not exists family_members_family_idx on public.family_members(family_id, status);
create index if not exists invitations_family_idx on public.invitations(family_id, status, created_at desc);
create index if not exists join_requests_family_idx on public.join_requests(family_id, status, created_at desc);
create index if not exists activity_logs_family_idx on public.activity_logs(family_id, created_at desc);
create index if not exists transactions_family_idx on public.transactions(family_id, date desc);
create index if not exists journal_entries_family_idx on public.journal_entries(family_id, date desc);
create index if not exists tasks_family_idx on public.tasks(family_id, status, created_at desc);
create index if not exists calendar_events_family_idx on public.calendar_events(family_id, date);
create index if not exists shopping_items_family_idx on public.shopping_items(family_id, created_at desc);
create index if not exists meals_family_idx on public.meals(family_id, date);

create or replace function public.is_family_member(target_family_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = target_user_id and status = 'active'
  );
$$;

create or replace function public.has_family_role(target_family_id uuid, allowed_roles public.family_role[], target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = target_user_id
      and status = 'active' and role = any(allowed_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do update set name = excluded.name, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.invitations enable row level security;
alter table public.join_requests enable row level security;
alter table public.activity_logs enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.shopping_items enable row level security;
alter table public.meals enable row level security;

create policy profiles_select_authenticated on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.family_members viewer where viewer.user_id = auth.uid() and viewer.status = 'active' and viewer.family_id in (select family_id from public.family_members subject where subject.user_id = profiles.id and subject.status = 'active')));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy families_select_member on public.families for select to authenticated using (public.is_family_member(id));
create policy families_insert_self on public.families for insert to authenticated with check (owner_id = auth.uid());
create policy families_update_owner on public.families for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy families_delete_owner on public.families for delete to authenticated using (owner_id = auth.uid());

create policy family_members_select_member on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy family_members_insert_authorized on public.family_members for insert to authenticated with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy family_members_update_owner on public.family_members for update to authenticated using (public.has_family_role(family_id, array['husband']::public.family_role[])) with check (public.has_family_role(family_id, array['husband']::public.family_role[]));
create policy family_members_delete_owner on public.family_members for delete to authenticated using (public.has_family_role(family_id, array['husband']::public.family_role[]));

create policy invitations_select_authorized on public.invitations for select to authenticated using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy join_requests_select_authorized on public.join_requests for select to authenticated using (user_id = auth.uid() or public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

create policy activity_logs_select_member on public.activity_logs for select to authenticated using (public.is_family_member(family_id));
create policy transactions_select_member on public.transactions for select to authenticated using (public.is_family_member(family_id));
create policy transactions_insert_authorized on public.transactions for insert to authenticated with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]) and user_id = auth.uid());
create policy transactions_delete_authorized on public.transactions for delete to authenticated using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy budgets_select_member on public.budgets for select to authenticated using (public.is_family_member(family_id));
create policy budgets_manage_authorized on public.budgets for all to authenticated using (public.has_family_role(family_id, array['husband','wife']::public.family_role[])) with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy goals_select_member on public.goals for select to authenticated using (public.is_family_member(family_id));
create policy goals_manage_authorized on public.goals for all to authenticated using (public.has_family_role(family_id, array['husband','wife']::public.family_role[])) with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy journal_select_member on public.journal_entries for select to authenticated using (public.is_family_member(family_id) and (visibility = 'family' or user_id = auth.uid()));
create policy journal_insert_member on public.journal_entries for insert to authenticated with check (public.is_family_member(family_id) and user_id = auth.uid());
create policy journal_delete_author on public.journal_entries for delete to authenticated using (user_id = auth.uid());
create policy tasks_select_member on public.tasks for select to authenticated using (public.is_family_member(family_id));
create policy tasks_insert_member on public.tasks for insert to authenticated with check (public.is_family_member(family_id));
create policy tasks_update_member on public.tasks for update to authenticated using (public.is_family_member(family_id));
create policy tasks_delete_authorized on public.tasks for delete to authenticated using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy events_select_member on public.calendar_events for select to authenticated using (public.is_family_member(family_id));
create policy events_manage_authorized on public.calendar_events for all to authenticated using (public.has_family_role(family_id, array['husband','wife']::public.family_role[])) with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));
create policy shopping_select_member on public.shopping_items for select to authenticated using (public.is_family_member(family_id));
create policy shopping_insert_member on public.shopping_items for insert to authenticated with check (public.is_family_member(family_id));
create policy shopping_update_member on public.shopping_items for update to authenticated using (public.is_family_member(family_id));
create policy shopping_delete_authorized on public.shopping_items for delete to authenticated using (public.has_family_role(family_id, array['husband','wife','child']::public.family_role[]));
create policy meals_select_member on public.meals for select to authenticated using (public.is_family_member(family_id));
create policy meals_insert_member on public.meals for insert to authenticated with check (public.is_family_member(family_id) and user_id = auth.uid());
create policy meals_update_member on public.meals for update to authenticated using (public.is_family_member(family_id));
create policy meals_delete_authorized on public.meals for delete to authenticated using (user_id = auth.uid() or public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

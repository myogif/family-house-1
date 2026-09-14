-- ============================================================================
-- Comprehensive Family Finance Module Migration
-- Accounts (Wallets), Debts & Loans, Subscriptions, Assets, and Multi-Wallet Transactions
-- ============================================================================

-- 1. WALLETS / ACCOUNTS TABLE
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  type text not null default 'bank' check (type in ('bank', 'ewallet', 'cash', 'investment', 'credit_card', 'other')),
  initial_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  account_number text not null default '',
  color text not null default '#3b82f6',
  icon text not null default 'wallet',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. TRANSACTIONS ENHANCEMENTS FOR MULTI-WALLET & TRANSFERS
alter type public.transaction_type add value if not exists 'transfer';

alter table public.transactions
  add column if not exists wallet_id uuid references public.wallets(id) on delete set null,
  add column if not exists destination_wallet_id uuid references public.wallets(id) on delete set null,
  add column if not exists transfer_fee numeric(14,2) not null default 0;

-- 3. DEBTS & LOANS TABLE (Hutang & Piutang)
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  type text not null check (type in ('debt', 'loan')), -- debt: hutang (kewajiban), loan: piutang (hak)
  person_name text not null check (char_length(trim(person_name)) between 1 and 150),
  total_amount numeric(14,2) not null check (total_amount > 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  due_date date,
  notes text not null default '',
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. SUBSCRIPTIONS & RECURRING BILLS TABLE (Langganan & Tagihan Rutin)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 150),
  category text not null default 'Tagihan',
  amount numeric(14,2) not null check (amount > 0),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_billing_date date not null,
  wallet_id uuid references public.wallets(id) on delete set null,
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. ASSETS & NET WORTH TABLE (Aset Keluarga)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 150),
  category text not null default 'property' check (category in ('property', 'vehicle', 'precious_metal', 'electronic', 'investment', 'other')),
  estimated_value numeric(14,2) not null check (estimated_value >= 0),
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  purchase_date date,
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. INDEXES
create index if not exists wallets_family_idx on public.wallets(family_id, is_active);
create index if not exists transactions_wallet_idx on public.transactions(wallet_id);
create index if not exists transactions_dest_wallet_idx on public.transactions(destination_wallet_id);
create index if not exists debts_family_idx on public.debts(family_id, status, due_date);
create index if not exists subscriptions_family_idx on public.subscriptions(family_id, is_active, next_billing_date);
create index if not exists assets_family_idx on public.assets(family_id, category);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.wallets enable row level security;
alter table public.debts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.assets enable row level security;

-- Wallets RLS
create policy wallets_select_member on public.wallets
  for select to authenticated
  using (public.is_family_member(family_id));

create policy wallets_manage_authorized on public.wallets
  for all to authenticated
  using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]))
  with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

-- Debts RLS
create policy debts_select_member on public.debts
  for select to authenticated
  using (public.is_family_member(family_id));

create policy debts_manage_authorized on public.debts
  for all to authenticated
  using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]))
  with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

-- Subscriptions RLS
create policy subscriptions_select_member on public.subscriptions
  for select to authenticated
  using (public.is_family_member(family_id));

create policy subscriptions_manage_authorized on public.subscriptions
  for all to authenticated
  using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]))
  with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

-- Assets RLS
create policy assets_select_member on public.assets
  for select to authenticated
  using (public.is_family_member(family_id));

create policy assets_manage_authorized on public.assets
  for all to authenticated
  using (public.has_family_role(family_id, array['husband','wife']::public.family_role[]))
  with check (public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

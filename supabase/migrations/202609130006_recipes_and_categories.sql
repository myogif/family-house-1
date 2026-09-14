-- Add category, video_url, and recipe_id reference to meals table
alter table public.meals
  add column if not exists category text not null default 'makanan' check (category in ('makanan', 'cemilan', 'minuman')),
  add column if not exists video_url text not null default '',
  add column if not exists recipe_id uuid;

-- Create recipes master table
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  author_name text not null default '',
  title text not null check (char_length(trim(title)) between 1 and 200),
  category text not null default 'makanan' check (category in ('makanan', 'cemilan', 'minuman')),
  meal_type text not null default 'makan_siang' check (meal_type in ('sarapan', 'makan_siang', 'makan_malam', 'camilan')),
  servings integer not null default 4 check (servings > 0),
  prep_time integer not null default 0 check (prep_time >= 0),
  cook_time integer not null default 0 check (cook_time >= 0),
  ingredients text[] not null default '{}',
  instructions text not null default '',
  video_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add foreign key constraint to meals for recipe_id if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'meals_recipe_id_fkey' and table_name = 'meals'
  ) then
    alter table public.meals
      add constraint meals_recipe_id_fkey foreign key (recipe_id) references public.recipes(id) on delete set null;
  end if;
end $$;

-- Indexes
create index if not exists recipes_family_idx on public.recipes(family_id, created_at desc);
create index if not exists recipes_family_category_idx on public.recipes(family_id, category);
create index if not exists meals_recipe_id_idx on public.meals(recipe_id);

-- RLS for recipes
alter table public.recipes enable row level security;

create policy recipes_select_member on public.recipes
  for select to authenticated
  using (public.is_family_member(family_id));

create policy recipes_insert_member on public.recipes
  for insert to authenticated
  with check (public.is_family_member(family_id) and user_id = auth.uid());

create policy recipes_update_member on public.recipes
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

create policy recipes_delete_authorized on public.recipes
  for delete to authenticated
  using (user_id = auth.uid() or public.has_family_role(family_id, array['husband','wife']::public.family_role[]));

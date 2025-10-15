-- Create table to store crowdfunding submissions
create table if not exists public.crowdfunding_submissions (
  task_id uuid primary key,
  user_id bigint not null,
  crowdfunding_data jsonb not null,
  task_specifics jsonb not null,
  total_cost numeric not null,
  photos text[] not null,
  location_gps jsonb not null,
  created_at timestamptz not null
);

-- Helpful indexes
create index if not exists idx_crowdfunding_submissions_user_id
  on public.crowdfunding_submissions (user_id);

create index if not exists idx_crowdfunding_submissions_created_at
  on public.crowdfunding_submissions (created_at);

-- Enable Row Level Security (RLS)
alter table public.crowdfunding_submissions enable row level security;

-- Permissive policies (adjust for production as needed)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crowdfunding_submissions'
      and policyname = 'allow all inserts'
  ) then
    create policy "allow all inserts" on public.crowdfunding_submissions
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crowdfunding_submissions'
      and policyname = 'allow all updates'
  ) then
    create policy "allow all updates" on public.crowdfunding_submissions
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'crowdfunding_submissions'
      and policyname = 'allow all selects'
  ) then
    create policy "allow all selects" on public.crowdfunding_submissions
      for select
      using (true);
  end if;
end
$$;

-- Ensure roles can access the table (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.crowdfunding_submissions to anon, authenticated;


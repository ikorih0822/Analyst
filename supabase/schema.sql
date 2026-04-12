create extension if not exists pgcrypto;

create table if not exists public.research_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sec_code text,
  edinet_code text,
  name text not null,
  industry text,
  status text not null default '追跡',
  next_earnings date,
  thesis text not null default '',
  variant_view text not null default '',
  key_debate text not null default '',
  scorecard jsonb not null default '{"quality":3,"momentum":3,"valuation":3,"management":3}'::jsonb,
  manual_forecast jsonb not null default '{"revenue_mn":"","operating_income_mn":"","eps":"","note":""}'::jsonb,
  manual_valuation jsonb not null default '{"bull":"","base":"","bear":"","memo":"","price_source_note":""}'::jsonb,
  research_notes jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  external_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists research_companies_set_updated_at on public.research_companies;
create trigger research_companies_set_updated_at
before update on public.research_companies
for each row
execute function public.set_updated_at();

alter table public.research_companies enable row level security;

drop policy if exists "research_companies_select_own" on public.research_companies;
create policy "research_companies_select_own"
on public.research_companies
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "research_companies_insert_own" on public.research_companies;
create policy "research_companies_insert_own"
on public.research_companies
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "research_companies_update_own" on public.research_companies;
create policy "research_companies_update_own"
on public.research_companies
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "research_companies_delete_own" on public.research_companies;
create policy "research_companies_delete_own"
on public.research_companies
for delete
to authenticated
using ((select auth.uid()) = user_id);

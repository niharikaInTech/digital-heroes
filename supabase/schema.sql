-- =====================================================================
-- Digital Heroes - database schema
-- Run this whole file once in Supabase > SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- 1. CHARITIES ---------------------------------------------
create table charities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  image_url   text,
  website     text,
  featured    boolean not null default false,
  -- upcoming events, e.g. [{"title":"Golf day","date":"2026-11-02","location":"Hyderabad"}]
  events      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- 2. PROFILES (one row per auth user) -----------------------
create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text,
  full_name              text,
  role                   text not null default 'subscriber'
                           check (role in ('subscriber', 'admin')),
  charity_id             uuid references charities(id) on delete set null,
  charity_percent        int  not null default 10
                           check (charity_percent between 10 and 100),  -- PRD: minimum 10%
  plan                   text check (plan in ('monthly', 'yearly')),
  subscription_status    text not null default 'inactive'
                           check (subscription_status in ('inactive', 'active', 'past_due', 'canceled')),
  current_period_end     timestamptz,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  created_at             timestamptz not null default now()
);

-- Create a profile automatically whenever someone signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, charity_id, charity_percent)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    nullif(new.raw_user_meta_data->>'charity_id', '')::uuid,
    greatest(coalesce((new.raw_user_meta_data->>'charity_percent')::int, 10), 10)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- 3. SCORES (max 5 per user, one per date) ------------------
create table scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  score      int  not null check (score between 1 and 45),   -- Stableford range
  played_on  date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on)                                 -- one score per date
);

-- Rolling window: after every insert keep only the 5 most recent scores.
create or replace function keep_latest_five() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from scores
  where id in (
    select id from scores
    where user_id = new.user_id
    order by played_on desc, created_at desc
    offset 5
  );
  return null;
end $$;

create trigger scores_keep_latest_five
  after insert on scores
  for each row execute function keep_latest_five();

-- ---------- 4. DRAWS ---------------------------------------------------
create table draws (
  id                 uuid primary key default gen_random_uuid(),
  draw_month         date not null unique,                 -- always the 1st of the month
  logic              text not null check (logic in ('random', 'algorithmic')),
  winning_numbers    int[] not null,
  participants       int  not null default 0,
  prize_pool         numeric(12,2) not null default 0,     -- fresh money this month
  tier5_pool         numeric(12,2) not null default 0,     -- includes jackpot carried in
  tier4_pool         numeric(12,2) not null default 0,
  tier3_pool         numeric(12,2) not null default 0,
  jackpot_carry_in   numeric(12,2) not null default 0,
  jackpot_carry_out  numeric(12,2) not null default 0,
  published_at       timestamptz not null default now()
);

-- Snapshot of what each participant had when the draw ran.
create table draw_entries (
  id          uuid primary key default gen_random_uuid(),
  draw_id     uuid not null references draws(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  scores      int[] not null,
  match_count int   not null default 0,
  created_at  timestamptz not null default now(),
  unique (draw_id, user_id)
);

-- ---------- 5. WINNERS -------------------------------------------------
create table winners (
  id                  uuid primary key default gen_random_uuid(),
  draw_id             uuid not null references draws(id) on delete cascade,
  user_id             uuid not null references profiles(id) on delete cascade,
  match_type          int  not null check (match_type in (3, 4, 5)),
  prize_amount        numeric(12,2) not null,
  proof_path          text,
  -- awaiting_proof -> submitted -> approved / rejected (rejected can re-submit)
  verification_status text not null default 'awaiting_proof'
                        check (verification_status in ('awaiting_proof', 'submitted', 'approved', 'rejected')),
  payment_status      text not null default 'pending'
                        check (payment_status in ('pending', 'paid')),
  created_at          timestamptz not null default now()
);

-- ---------- 6. MONEY TRACKING (for reports) ---------------------------
create table payments (              -- one row per paid subscription invoice
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete set null,
  charity_id       uuid references charities(id) on delete set null,
  stripe_invoice_id text unique,
  amount           numeric(12,2) not null,
  charity_amount   numeric(12,2) not null,
  prize_amount     numeric(12,2) not null,
  created_at       timestamptz not null default now()
);

create table donations (             -- independent, one-off donations
  id                uuid primary key default gen_random_uuid(),
  charity_id        uuid not null references charities(id) on delete cascade,
  donor_id          uuid references profiles(id) on delete set null,
  amount            numeric(12,2) not null,
  stripe_session_id text unique,
  created_at        timestamptz not null default now()
);

-- =====================================================================
-- HELPER FUNCTIONS used by security policies
-- =====================================================================
create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Real-time subscription check (PRD section 04: validate on every request)
create or replace function is_active_subscriber() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and subscription_status = 'active'
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table charities    enable row level security;
alter table profiles     enable row level security;
alter table scores       enable row level security;
alter table draws        enable row level security;
alter table draw_entries enable row level security;
alter table winners      enable row level security;
alter table payments     enable row level security;
alter table donations    enable row level security;

-- charities: everyone can read, only admin can change
create policy charities_read  on charities for select using (true);
create policy charities_admin on charities for all using (is_admin()) with check (is_admin());

-- profiles: read your own row; admin can do everything.
-- (Normal users have NO update policy - profile changes go through
--  server actions so nobody can promote themselves to admin.)
create policy profiles_read  on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin on profiles for all using (is_admin()) with check (is_admin());

-- scores: you manage only your own, and only while subscribed
create policy scores_read   on scores for select using (user_id = auth.uid() or is_admin());
create policy scores_insert on scores for insert
  with check (is_admin() or (user_id = auth.uid() and is_active_subscriber()));
create policy scores_update on scores for update
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy scores_delete on scores for delete using (user_id = auth.uid() or is_admin());

-- draws: results are public; admin publishes
create policy draws_read  on draws for select using (true);
create policy draws_admin on draws for all using (is_admin()) with check (is_admin());

create policy entries_read  on draw_entries for select using (user_id = auth.uid() or is_admin());
create policy entries_admin on draw_entries for all using (is_admin()) with check (is_admin());

create policy winners_read  on winners for select using (user_id = auth.uid() or is_admin());
create policy winners_admin on winners for all using (is_admin()) with check (is_admin());

create policy payments_read on payments for select using (user_id = auth.uid() or is_admin());
create policy donations_admin on donations for select using (is_admin());
-- payments/donations are written only by the Stripe webhook (service role bypasses RLS)

-- =====================================================================
-- RPC FUNCTIONS (one round trip, no 1000-row API limit problems)
-- =====================================================================

-- All active subscribers with their scores, for the draw engine.
create or replace function draw_inputs() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', p.id,
      'name',    coalesce(p.full_name, p.email),
      'plan',    p.plan,
      'scores',  coalesce((select jsonb_agg(s.score) from scores s where s.user_id = p.id), '[]'::jsonb)
    ))
    from profiles p
    where p.subscription_status = 'active'
      and (p.current_period_end is null or p.current_period_end > now())
  ), '[]'::jsonb);
end $$;

-- Numbers for the admin reports page.
create or replace function admin_report() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  return jsonb_build_object(
    'total_users',        (select count(*) from profiles),
    'active_monthly',     (select count(*) from profiles where subscription_status = 'active' and coalesce(plan, 'monthly') = 'monthly'),
    'active_yearly',      (select count(*) from profiles where subscription_status = 'active' and plan = 'yearly'),
    'draws_published',    (select count(*) from draws),
    'total_pool_paid_in', (select coalesce(sum(prize_pool), 0) from draws),
    'total_winners',      (select count(*) from winners),
    'prizes_awarded',     (select coalesce(sum(prize_amount), 0) from winners),
    'prizes_paid',        (select coalesce(sum(prize_amount), 0) from winners where payment_status = 'paid'),
    'jackpot_carry',      (select coalesce(jackpot_carry_out, 0) from draws order by draw_month desc limit 1),
    'charity_totals',     (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select c.id, c.name,
               coalesce((select sum(p.charity_amount) from payments  p where p.charity_id = c.id), 0) as subscriptions,
               coalesce((select sum(d.amount)         from donations d where d.charity_id = c.id), 0) as donations
        from charities c order by c.name
      ) t
    )
  );
end $$;

-- =====================================================================
-- STORAGE: private bucket for winner proof screenshots
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- a user may upload only inside their own folder: proofs/<user-id>/...
create policy proofs_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- =====================================================================
-- SEED DATA
-- =====================================================================
insert into charities (name, description, image_url, featured, events) values
('Green Fields Foundation',
 'Builds sports grounds and coaching programmes for children in under-served districts, so every kid has a place to play.',
 null, true,
 '[{"title":"Charity golf day","date":"2026-11-15","location":"Hyderabad"}]'),
('Bright Minds Trust',
 'Funds scholarships and after-school learning centres for first-generation students.',
 null, true, '[]'),
('Clean Water Collective',
 'Installs community water purifiers in villages that rely on unsafe water.',
 null, true,
 '[{"title":"Sponsor-a-hole evening","date":"2026-12-05","location":"Bengaluru"}]'),
('Second Innings',
 'Supports retired sportspeople with medical bills and re-skilling.',
 null, false, '[]');

-- =====================================================================
-- MAKE YOURSELF ADMIN (after you sign up in the app, run this once):
--   update profiles set role = 'admin' where email = 'you@example.com';
-- =====================================================================

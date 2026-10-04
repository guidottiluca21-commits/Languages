-- =============================================================================
-- Lingua OS — Supabase schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- It is idempotent where reasonably possible (safe to re-run after changes).
--
-- Security model
--   * Every personal row carries user_id = the Supabase Auth user (auth.users.id).
--   * Row Level Security (RLS) is enabled on every table: a user can only
--     SELECT / INSERT / UPDATE / DELETE rows where user_id = auth.uid().
--   * The anon role (not logged in) has no access to personal tables at all.
--   * Passwords are never stored here: Supabase Auth manages credentials.
--
-- Extensibility
--   * Languages live in a lookup table (add 'fr', 'de' … with one INSERT).
--   * Most tables have a "data jsonb" column for new fields without migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- CEFR helpers used by CHECK constraints
create or replace function public.is_cefr(v text)
returns boolean
language sql
immutable
set search_path = ''
as $$ select v is null or v in ('A1','A2','B1','B2','C1','C2') $$;

create or replace function public.is_cefr_sub(v text)
returns boolean
language sql
immutable
set search_path = ''
as $$ select v is null or v ~ '^(A1|A2|B1|B2|C1|C2)(\.[12])?$' $$;

-- ---------------------------------------------------------------------------
-- 1. Languages (shared, read-only for users)
-- ---------------------------------------------------------------------------
create table if not exists public.languages (
  code        text primary key check (code ~ '^[a-z]{2,3}$'),
  name        text not null,
  enabled     boolean not null default true
);
insert into public.languages (code, name) values ('en', 'English'), ('es', 'Spanish')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Personal tables
-- ---------------------------------------------------------------------------

-- 2.1 Profile (one per user)
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  display_name    text check (char_length(display_name) <= 80),
  native_language text not null default 'it' check (char_length(native_language) <= 10),
  data            jsonb not null default '{}'::jsonb check (pg_column_size(data) < 65536),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 2.2 Settings (one per user)
create table if not exists public.user_settings (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  daily_minimum         integer not null default 15 check (daily_minimum between 0 and 600),
  daily_target          integer not null default 40 check (daily_target between 0 and 600),
  daily_maximum         integer not null default 90 check (daily_maximum between 0 and 600),
  preferred_language    text references public.languages(code),
  dark_mode             text not null default 'system' check (dark_mode in ('light','dark','system')),
  notifications_enabled boolean not null default false,
  data                  jsonb not null default '{}'::jsonb check (pg_column_size(data) < 262144),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint daily_order check (daily_minimum <= daily_target and daily_target <= daily_maximum)
);

-- 2.3 Language profiles (one per user per language) — levels are on a 0–6 scale (A1=0 … C2=5–6)
create table if not exists public.language_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language          text not null references public.languages(code),
  current_level     text check (public.is_cefr_sub(current_level)),
  target_level      text not null default 'C2' check (public.is_cefr(target_level)),
  grammar_level     numeric(4,2) check (grammar_level between 0 and 6),
  vocabulary_level  numeric(4,2) check (vocabulary_level between 0 and 6),
  reading_level     numeric(4,2) check (reading_level between 0 and 6),
  listening_level   numeric(4,2) check (listening_level between 0 and 6),
  writing_level     numeric(4,2) check (writing_level between 0 and 6),
  speaking_level    numeric(4,2) check (speaking_level between 0 and 6),
  fluency_level     numeric(4,2) check (fluency_level between 0 and 6),
  onboarded         boolean not null default false,
  assessed          boolean not null default false,
  enabled           boolean not null default true,
  goals             text[] not null default '{}',
  target_date       date,
  data              jsonb not null default '{}'::jsonb check (pg_column_size(data) < 524288),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, language)
);

-- 2.4 Vocabulary (built-in items the user is learning + the user's own items)
create table if not exists public.vocabulary (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language        text not null references public.languages(code),
  item_key        text not null check (char_length(item_key) <= 200),
  word            text not null check (char_length(word) <= 200),
  translation     text check (char_length(translation) <= 500),
  definition      text check (char_length(definition) <= 1000),
  example         text check (char_length(example) <= 1000),
  part_of_speech  text check (char_length(part_of_speech) <= 60),
  register        text check (char_length(register) <= 30),
  cefr_level      text check (public.is_cefr(cefr_level)),
  kind            text check (char_length(kind) <= 30),
  domain          text check (char_length(domain) <= 30),
  is_custom       boolean not null default false,
  stage           smallint check (stage between 0 and 4),
  mastery         numeric(5,2) check (mastery between 0 and 100),
  ease_factor     numeric(4,2) check (ease_factor between 1 and 5),
  interval        integer check (interval >= 0),
  next_review     date,
  last_review     date,
  data            jsonb not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, language, item_key)
);

-- 2.5 Vocabulary review log (append-only history of Again/Hard/Good/Easy)
create table if not exists public.vocabulary_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vocabulary_id  uuid references public.vocabulary(id) on delete cascade,
  language       text not null references public.languages(code),
  item_key       text not null,
  rating         smallint not null check (rating between 0 and 3),
  reviewed_at    timestamptz not null default now()
);

-- 2.6 Grammar progress (one row per topic)
create table if not exists public.grammar_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language      text not null references public.languages(code),
  topic         text not null check (char_length(topic) <= 120),
  cefr_level    text check (public.is_cefr(cefr_level)),
  mastery       numeric(5,2) check (mastery between 0 and 100),
  ease_factor   numeric(4,2) check (ease_factor between 1 and 5),
  interval      integer check (interval >= 0),
  difficulty    smallint check (difficulty between 1 and 3),
  last_review   date,
  next_review   date,
  notes         text check (char_length(notes) <= 2000),
  data          jsonb not null default '{}'::jsonb check (pg_column_size(data) < 32768),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, language, topic)
);

-- 2.7 Study sessions (one row per completed activity)
create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id         text not null check (char_length(client_id) <= 64),
  language          text not null references public.languages(code),
  activity_type     text not null check (char_length(activity_type) <= 30),
  skill             text check (char_length(skill) <= 30),
  title             text check (char_length(title) <= 200),
  duration_minutes  integer not null check (duration_minutes between 0 and 600),
  score             numeric(4,3) check (score between 0 and 1),
  session_date      date not null,
  completed_at      timestamptz not null default now(),
  data              jsonb not null default '{}'::jsonb check (pg_column_size(data) < 8192),
  created_at        timestamptz not null default now(),
  unique (user_id, client_id)
);

-- 2.8 Error log (+ the error's own spaced-repetition card)
create table if not exists public.errors (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id         text not null check (char_length(client_id) <= 64),
  language          text not null references public.languages(code),
  category          text not null check (char_length(category) <= 30),
  label             text check (char_length(label) <= 120),
  source            text check (char_length(source) <= 30),
  original          text check (char_length(original) <= 2000),
  correction        text check (char_length(correction) <= 2000),
  explanation       text check (char_length(explanation) <= 2000),
  improved_version  text check (char_length(improved_version) <= 2000),
  topic             text check (char_length(topic) <= 120),
  occurrences       integer not null default 1 check (occurrences >= 1),
  resolved          boolean not null default false,
  error_date        date not null default current_date,
  card              jsonb check (card is null or pg_column_size(card) < 8192),
  data              jsonb not null default '{}'::jsonb check (pg_column_size(data) < 8192),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, client_id)
);

-- 2.9 Listening log (YouTube / podcasts / any authentic audio)
create table if not exists public.listening_content (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id      text not null check (char_length(client_id) <= 64),
  language       text not null references public.languages(code),
  title          text check (char_length(title) <= 300),
  url            text check (url is null or url = '' or (url ~* '^https?://' and char_length(url) <= 2000)),
  source         text check (char_length(source) <= 60),
  cefr_level     text check (public.is_cefr(cefr_level)),
  duration       integer check (duration between 0 and 600),
  completed      boolean not null default true,
  comprehension  smallint check (comprehension between 0 and 100),
  difficulty     smallint check (difficulty between 1 and 5),
  notes          text check (char_length(notes) <= 5000),
  listened_on    date,
  data           jsonb not null default '{}'::jsonb check (pg_column_size(data) < 16384),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, client_id)
);

-- 2.10 Work schedule (one row per day that differs from the weekly pattern, or is flagged rest / low energy)
create table if not exists public.work_schedule (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  type        text check (type in ('work','night','off','vacation','recovery')),
  start_time  time,
  end_time    time,
  workload    text check (workload in ('heavy','normal','free')),
  rest        boolean not null default false,
  low_energy  boolean not null default false,
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- 2.11 Writing & speaking productions
create table if not exists public.productions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id    text not null check (char_length(client_id) <= 64),
  language     text not null references public.languages(code),
  kind         text not null check (kind in ('writing','speaking')),
  prompt_id    text check (char_length(prompt_id) <= 120),
  title        text check (char_length(title) <= 200),
  cefr_level   text check (public.is_cefr(cefr_level)),
  content      text check (char_length(content) <= 20000),
  scores       jsonb,
  overall      numeric(3,2) check (overall between 0 and 5),
  est_level    numeric(4,2) check (est_level between 0 and 6),
  produced_on  date not null default current_date,
  data         jsonb not null default '{}'::jsonb check (pg_column_size(data) < 16384),
  created_at   timestamptz not null default now(),
  unique (user_id, client_id)
);

-- 2.12 Daily plans (the planner's output and each activity's status)
create table if not exists public.daily_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  language    text not null references public.languages(code),
  plan_date   date not null,
  data        jsonb not null check (pg_column_size(data) < 65536),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, language, plan_date)
);

-- 2.13 Placement test results
create table if not exists public.assessments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id      text not null check (char_length(client_id) <= 64),
  language       text not null references public.languages(code),
  taken_on       date not null,
  overall_level  text check (public.is_cefr_sub(overall_level)),
  result         jsonb not null check (pg_column_size(result) < 65536),
  created_at     timestamptz not null default now(),
  unique (user_id, client_id)
);

-- 2.14 Weekly reviews
create table if not exists public.weekly_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id   text not null check (char_length(client_id) <= 64),
  language    text not null references public.languages(code),
  week_start  date not null,
  review      jsonb not null check (pg_column_size(review) < 65536),
  created_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

-- ---------------------------------------------------------------------------
-- 3. Indexes (every RLS check filters on user_id; most queries also on language/dates)
-- ---------------------------------------------------------------------------
create index if not exists language_profiles_user_idx   on public.language_profiles (user_id);
create index if not exists vocabulary_user_lang_due_idx on public.vocabulary (user_id, language, next_review);
create index if not exists vocab_reviews_user_time_idx  on public.vocabulary_reviews (user_id, reviewed_at desc);
create index if not exists vocab_reviews_vocab_idx      on public.vocabulary_reviews (vocabulary_id);
create index if not exists grammar_user_lang_due_idx    on public.grammar_progress (user_id, language, next_review);
create index if not exists sessions_user_lang_date_idx  on public.study_sessions (user_id, language, session_date desc);
create index if not exists errors_user_lang_date_idx    on public.errors (user_id, language, error_date desc);
create index if not exists listening_user_lang_idx      on public.listening_content (user_id, language, listened_on desc);
create index if not exists schedule_user_date_idx       on public.work_schedule (user_id, date);
create index if not exists productions_user_lang_idx    on public.productions (user_id, language, produced_on desc);
create index if not exists plans_user_lang_date_idx     on public.daily_plans (user_id, language, plan_date desc);
create index if not exists assessments_user_lang_idx    on public.assessments (user_id, language);
create index if not exists reviews_user_lang_idx        on public.weekly_reviews (user_id, language);

-- ---------------------------------------------------------------------------
-- 4. Automatic timestamps
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','user_settings','language_profiles','vocabulary','grammar_progress',
                           'errors','listening_content','work_schedule','daily_plans']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_updated_at', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Link review-log rows to their vocabulary row (client only knows item_key)
-- ---------------------------------------------------------------------------
create or replace function public.fill_vocabulary_review_ref()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.vocabulary_id is null then
    select v.id into new.vocabulary_id
    from public.vocabulary v
    where v.user_id = new.user_id and v.language = new.language and v.item_key = new.item_key;
  end if;
  return new;
end;
$$;
drop trigger if exists vocabulary_reviews_fill_ref on public.vocabulary_reviews;
create trigger vocabulary_reviews_fill_ref before insert on public.vocabulary_reviews
  for each row execute function public.fill_vocabulary_review_ref();

-- ---------------------------------------------------------------------------
-- 6. Create profile + settings automatically when someone signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security: each user sees and changes only their own rows
-- ---------------------------------------------------------------------------
alter table public.languages enable row level security;
drop policy if exists "languages readable by signed-in users" on public.languages;
create policy "languages readable by signed-in users" on public.languages
  for select to authenticated using (true);
revoke all on public.languages from anon;
grant select on public.languages to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','user_settings','language_profiles','vocabulary','vocabulary_reviews',
                           'grammar_progress','study_sessions','errors','listening_content','work_schedule',
                           'productions','daily_plans','assessments','weekly_reviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists "own rows: select" on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);
    execute format('drop policy if exists "own rows: delete" on public.%I', t);

    execute format('create policy "own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Account deletion (Settings → Account → Delete account)
--    Deletes the caller's auth user; every table cascades (on delete cascade).
--    It can only ever delete the account of the person calling it.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = me;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Internal helper functions are not meant to be called through the API
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.fill_vocabulary_review_ref() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

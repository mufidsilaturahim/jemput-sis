create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class text not null
);

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  class text not null,
  created_at timestamptz not null default now()
);

alter table students enable row level security;
alter table calls enable row level security;

-- Anon (public) key: read-only on students, read+insert on calls.
-- No insert/update/delete policy on students for anon — student
-- mutations only happen via the service-role key in Route Handlers.
drop policy if exists "students_select_anon" on students;
create policy "students_select_anon" on students
  for select
  using (true);

drop policy if exists "calls_select_anon" on calls;
create policy "calls_select_anon" on calls
  for select
  using (true);

drop policy if exists "calls_insert_anon" on calls;
create policy "calls_insert_anon" on calls
  for insert
  with check (true);

-- Required for /kelas clients to receive realtime INSERT events.
-- This statement is NOT idempotent: it errors with
-- "relation \"calls\" is already member of publication" if `calls` is
-- already added. On a re-run of this script, that error is expected and
-- safe to ignore.
alter publication supabase_realtime add table calls;

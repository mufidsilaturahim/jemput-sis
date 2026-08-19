create extension if not exists pgcrypto;

create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class text not null
);

create table calls (
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
create policy "students_select_anon" on students
  for select
  using (true);

create policy "calls_select_anon" on calls
  for select
  using (true);

create policy "calls_insert_anon" on calls
  for insert
  with check (true);

-- Required for /kelas clients to receive realtime INSERT events.
alter publication supabase_realtime add table calls;

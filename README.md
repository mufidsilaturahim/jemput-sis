# jemput-sis

A realtime school pickup-call board. A staff member on duty (`/piket`) searches
for a student and calls them; the call appears immediately on a classroom
display (`/kelas`) filtered to that student's class, with sound and a
flap-drop animation, and expires automatically after a short active window.
An admin area (`/admin`) manages the student roster behind a simple
password-gated session.

## First-run setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor to create the
   `students` and `calls` tables, enable row-level security, and add `calls`
   to the `supabase_realtime` publication.
3. Copy `.env.local.example` to `.env.local` and fill in the values:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
     your Supabase project's API settings.
   - `SUPABASE_SERVICE_ROLE_KEY` — used server-side only, for admin student
     CRUD.
   - `ADMIN_PASSWORD` — the password for `/admin/login`.
   - `ADMIN_SESSION_SECRET` — a random secret used to sign the admin session
     cookie.
4. Add a `public/call-notification.mp3` notification sound file (not
   included in this repo).
5. `npm install`
6. `npm run dev`

## Tests and build

- `npm test` — run the test suite (Vitest).
- `npm run typecheck` — run the TypeScript compiler in check-only mode.
- `npm run build` — production build (Next.js).

# Jemput SIS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a realtime web app that replaces the school's PA-speaker pickup announcements — guru piket calls a student, guru kelas sees it instantly on a tablet with sound + vibration, no more loudspeaker interruptions.

**Architecture:** Next.js (App Router, TypeScript) frontend deployed on Vercel, backed by Supabase (Postgres + Realtime). Guru piket inserts a row into `calls`; Supabase Realtime pushes it to any `/kelas` client subscribed to that class. No custom WebSocket server, no accounts for piket/kelas — only `/admin` is password-protected.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, @supabase/supabase-js, Vitest + @testing-library/react (jsdom) for tests.

**Spec:** `docs/superpowers/specs/2026-08-19-jemput-sis-design.md`

## Global Constraints

- One-way flow: guru kelas never confirms back to guru piket (no status/confirmation field on `calls`).
- No permanent call history — `/kelas` only ever reads calls newer than the active-call window.
- Active-call window / auto-hide duration = 60,000ms (`ACTIVE_CALL_WINDOW_MS`), single constant shared by the client-side auto-expire timer and the initial-load query filter.
- No accounts/login for guru piket or guru kelas — class selection is a plain picker persisted to `localStorage`, no server-side session.
- `/admin` is the only protected surface: single shared password (`ADMIN_PASSWORD` env var), session is an HMAC token cookie (`ADMIN_SESSION_SECRET` env var) — no user table, no Supabase Auth.
- Student mutations (create/update/delete) go through Next.js Route Handlers using the Supabase **service role key** (server-only); the anon key only ever gets `select` on `students` and `select`+`insert` on `calls` (enforced via Postgres RLS policies).
- Out of scope for this plan: Excel/CSV import, call history/audit log, QR/barcode cards, offline mode, multi-piket accounts.

---

### Task 1: Project Scaffolding & Supabase Schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: `@/*` path alias resolving to `src/*` (used by every later task's imports), Vitest configured with `jsdom` environment and `@testing-library/jest-dom` matchers loaded globally.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "jemput-sis",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^24.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
.next
.env.local
```

- [ ] **Step 7: Create `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

- [ ] **Step 8: Create `src/app/layout.tsx`**

```tsx
export const metadata = {
  title: 'Jemput SIS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 9: Create `src/app/page.tsx`**

```tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>Jemput SIS</h1>
      <ul>
        <li>
          <Link href="/piket">Guru Piket</Link>
        </li>
        <li>
          <Link href="/kelas">Guru Kelas</Link>
        </li>
        <li>
          <Link href="/admin">Admin</Link>
        </li>
      </ul>
    </main>
  )
}
```

- [ ] **Step 10: Create `supabase/schema.sql`**

```sql
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
```

- [ ] **Step 11: Install dependencies and verify the project builds**

Run: `npm install && npm run build`
Expected: build succeeds (pages `/`, `/piket` placeholder-free — only `/` exists so far — compile with no errors).

- [ ] **Step 12: Manually create the Supabase project**

In the Supabase dashboard: create a new project, run `supabase/schema.sql` in the SQL editor, then copy the Project URL, `anon` key, and `service_role` key into a local `.env.local` (not committed) following `.env.local.example`. Also set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (any long random string) in `.env.local`.

- [ ] **Step 13: Commit**

```bash
git add package.json tsconfig.json next.config.mjs vitest.config.ts vitest.setup.ts .gitignore .env.local.example src/app/layout.tsx src/app/page.tsx supabase/schema.sql
git commit -m "chore: scaffold Next.js project and Supabase schema"
```

---

### Task 2: Active-Call Filtering Logic

**Files:**
- Create: `src/lib/activeCalls.ts`
- Test: `src/lib/activeCalls.test.ts`

**Interfaces:**
- Produces: `CallRow` type (`id`, `student_name`, `class`, `created_at`), `ACTIVE_CALL_WINDOW_MS` constant (`60_000`), `filterActiveCalls(calls: CallRow[], nowMs: number, windowMs: number): CallRow[]` — consumed by Task 8 (`CallCard`) and Task 10 (`/kelas` page).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { filterActiveCalls, type CallRow } from './activeCalls'

function callAt(now: number, ageMs: number): CallRow {
  return {
    id: '1',
    student_name: 'Sasa',
    class: '1B',
    created_at: new Date(now - ageMs).toISOString(),
  }
}

describe('filterActiveCalls', () => {
  it('keeps calls created within the window', () => {
    const now = 1_000_000
    expect(filterActiveCalls([callAt(now, 30_000)], now, 60_000)).toHaveLength(1)
  })

  it('drops calls older than the window', () => {
    const now = 1_000_000
    expect(filterActiveCalls([callAt(now, 90_000)], now, 60_000)).toHaveLength(0)
  })

  it('drops a call exactly at the boundary', () => {
    const now = 1_000_000
    expect(filterActiveCalls([callAt(now, 60_000)], now, 60_000)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/activeCalls.test.ts`
Expected: FAIL — `./activeCalls` has no exported member `filterActiveCalls`.

- [ ] **Step 3: Write the implementation**

```ts
export interface CallRow {
  id: string
  student_name: string
  class: string
  created_at: string
}

export const ACTIVE_CALL_WINDOW_MS = 60_000

export function filterActiveCalls(
  calls: CallRow[],
  nowMs: number,
  windowMs: number
): CallRow[] {
  return calls.filter((call) => {
    const createdMs = new Date(call.created_at).getTime()
    return nowMs - createdMs < windowMs
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/activeCalls.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/activeCalls.ts src/lib/activeCalls.test.ts
git commit -m "feat: add active-call time-window filter"
```

---

### Task 3: Student Search Logic

**Files:**
- Create: `src/lib/studentSearch.ts`
- Test: `src/lib/studentSearch.test.ts`

**Interfaces:**
- Produces: `Student` type (`id`, `name`, `class`), `searchStudents(students: Student[], query: string): Student[]` — consumed by Task 9 (`StudentAutocomplete`) and Task 11/12 (`/piket`, `/admin` pages).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { searchStudents, type Student } from './studentSearch'

const students: Student[] = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Sasi', class: '2A' },
  { id: '3', name: 'Budi', class: '1A' },
]

describe('searchStudents', () => {
  it('returns an empty list for an empty query', () => {
    expect(searchStudents(students, '')).toEqual([])
  })

  it('matches a case-insensitive substring of the name', () => {
    expect(searchStudents(students, 'sas')).toEqual([students[0], students[1]])
  })

  it('returns an empty list when nothing matches', () => {
    expect(searchStudents(students, 'zzz')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/studentSearch.test.ts`
Expected: FAIL — `./studentSearch` has no exported member `searchStudents`.

- [ ] **Step 3: Write the implementation**

```ts
export interface Student {
  id: string
  name: string
  class: string
}

export function searchStudents(students: Student[], query: string): Student[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return []
  return students.filter((student) => student.name.toLowerCase().includes(trimmed))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/studentSearch.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/studentSearch.ts src/lib/studentSearch.test.ts
git commit -m "feat: add case-insensitive student name search"
```

---

### Task 4: Admin Session Token Helpers

**Files:**
- Create: `src/lib/adminSession.ts`
- Test: `src/lib/adminSession.test.ts`

**Interfaces:**
- Produces: `computeSessionToken(secret: string): string`, `isValidSessionToken(token: string | undefined | null, secret: string): boolean` — consumed by Task 6 (login/session routes) and Task 7 (`requireAdminSession`).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { computeSessionToken, isValidSessionToken } from './adminSession'

describe('computeSessionToken', () => {
  it('is deterministic for the same secret', () => {
    expect(computeSessionToken('secret-a')).toBe(computeSessionToken('secret-a'))
  })

  it('differs for different secrets', () => {
    expect(computeSessionToken('secret-a')).not.toBe(computeSessionToken('secret-b'))
  })
})

describe('isValidSessionToken', () => {
  it('is true for a token matching the secret', () => {
    const token = computeSessionToken('secret-a')
    expect(isValidSessionToken(token, 'secret-a')).toBe(true)
  })

  it('is false for a token from a different secret', () => {
    const token = computeSessionToken('secret-b')
    expect(isValidSessionToken(token, 'secret-a')).toBe(false)
  })

  it('is false for a missing token', () => {
    expect(isValidSessionToken(undefined, 'secret-a')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/adminSession.test.ts`
Expected: FAIL — `./adminSession` has no exported members.

- [ ] **Step 3: Write the implementation**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_PAYLOAD = 'jemput-sis-admin-session'

export function computeSessionToken(secret: string): string {
  return createHmac('sha256', secret).update(SESSION_PAYLOAD).digest('hex')
}

export function isValidSessionToken(
  token: string | undefined | null,
  secret: string
): boolean {
  if (!token) return false

  const expected = computeSessionToken(secret)
  const tokenBuf = Buffer.from(token)
  const expectedBuf = Buffer.from(expected)

  if (tokenBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(tokenBuf, expectedBuf)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/adminSession.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminSession.ts src/lib/adminSession.test.ts
git commit -m "feat: add HMAC-based admin session token helpers"
```

---

### Task 5: Supabase Browser & Admin Clients

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Test: `src/lib/supabaseClient.test.ts`
- Create: `src/lib/supabaseAdmin.ts`
- Test: `src/lib/supabaseAdmin.server.test.ts`
- Test: `src/lib/supabaseAdmin.browser-guard.test.ts`

**Interfaces:**
- Produces: `getSupabaseBrowserClient(): SupabaseClient` — consumed by Task 10/11 (`/kelas`, `/piket` pages). `getSupabaseAdminClient(): SupabaseClient` — consumed by Task 7 (students API routes).

- [ ] **Step 1: Write the failing test for the browser client**

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { getSupabaseBrowserClient } from './supabaseClient'

describe('getSupabaseBrowserClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when env vars are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(() => getSupabaseBrowserClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('returns a client when env vars are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    const client = getSupabaseBrowserClient()
    expect(typeof client.from).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/supabaseClient.test.ts`
Expected: FAIL — `./supabaseClient` has no exported member `getSupabaseBrowserClient`.

- [ ] **Step 3: Write `src/lib/supabaseClient.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
    )
  }

  return createClient(url, anonKey)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/supabaseClient.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing tests for the admin client (server-side success path)**

Create `src/lib/supabaseAdmin.server.test.ts` with a `node` environment (no `window`):

```ts
// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest'
import { getSupabaseAdminClient } from './supabaseAdmin'

describe('getSupabaseAdminClient (server)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when env vars are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(() => getSupabaseAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('returns a client when env vars are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    const client = getSupabaseAdminClient()
    expect(typeof client.from).toBe('function')
  })
})
```

- [ ] **Step 6: Write the failing test for the browser guard**

Create `src/lib/supabaseAdmin.browser-guard.test.ts` (default `jsdom` environment, so `window` exists):

```ts
import { describe, it, expect } from 'vitest'
import { getSupabaseAdminClient } from './supabaseAdmin'

describe('getSupabaseAdminClient (browser guard)', () => {
  it('throws if called where window is defined', () => {
    expect(() => getSupabaseAdminClient()).toThrow(/server/i)
  })
})
```

- [ ] **Step 7: Run both tests to verify they fail**

Run: `npx vitest run src/lib/supabaseAdmin.server.test.ts src/lib/supabaseAdmin.browser-guard.test.ts`
Expected: FAIL — `./supabaseAdmin` module does not exist yet.

- [ ] **Step 8: Write `src/lib/supabaseAdmin.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient must only be called on the server')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/lib/supabaseAdmin.server.test.ts src/lib/supabaseAdmin.browser-guard.test.ts`
Expected: PASS (3 tests total)

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabaseClient.ts src/lib/supabaseClient.test.ts src/lib/supabaseAdmin.ts src/lib/supabaseAdmin.server.test.ts src/lib/supabaseAdmin.browser-guard.test.ts
git commit -m "feat: add Supabase browser and server-only admin clients"
```

---

### Task 6: Admin Login & Session API Routes

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Test: `src/app/api/admin/login/route.test.ts`
- Create: `src/app/api/admin/session/route.ts`
- Test: `src/app/api/admin/session/route.test.ts`

**Interfaces:**
- Consumes: `computeSessionToken`, `isValidSessionToken` from `@/lib/adminSession` (Task 4).
- Produces: `POST /api/admin/login` (sets `admin_session` cookie on success), `GET /api/admin/session` (returns `{ authenticated: boolean }`) — consumed by Task 12 (`/admin/login`, `/admin` pages).

- [ ] **Step 1: Write the failing test for the login route**

Create `src/app/api/admin/login/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from './route'

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret123')
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 for the wrong password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('sets a session cookie for the correct password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('admin_session=')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/admin/login/route.test.ts`
Expected: FAIL — `./route` module does not exist.

- [ ] **Step 3: Write `src/app/api/admin/login/route.ts`**

```ts
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { computeSessionToken } from '@/lib/adminSession'

const COOKIE_NAME = 'admin_session'

function passwordsMatch(candidate: string, expected: string): boolean {
  const candidateBuf = Buffer.from(candidate)
  const expectedBuf = Buffer.from(expected)
  if (candidateBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(candidateBuf, expectedBuf)
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!adminPassword || !sessionSecret) {
    return NextResponse.json(
      { error: 'Server belum dikonfigurasi (ADMIN_PASSWORD/ADMIN_SESSION_SECRET hilang)' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!password || !passwordsMatch(password, adminPassword)) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, computeSessionToken(sessionSecret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/admin/login/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for the session route**

Create `src/app/api/admin/session/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const getCookie = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: getCookie }),
}))

import { GET } from './route'
import { computeSessionToken } from '@/lib/adminSession'

describe('GET /api/admin/session', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    getCookie.mockReset()
  })

  it('returns authenticated:false when the cookie is missing', async () => {
    getCookie.mockReturnValue(undefined)
    const res = await GET()
    const json = await res.json()
    expect(json.authenticated).toBe(false)
  })

  it('returns authenticated:true for a valid cookie', async () => {
    getCookie.mockReturnValue({ value: computeSessionToken('session-secret') })
    const res = await GET()
    const json = await res.json()
    expect(json.authenticated).toBe(true)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/app/api/admin/session/route.test.ts`
Expected: FAIL — `./route` module does not exist.

- [ ] **Step 7: Write `src/app/api/admin/session/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isValidSessionToken } from '@/lib/adminSession'

export async function GET() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET
  const token = cookies().get('admin_session')?.value

  const authenticated = Boolean(sessionSecret) && isValidSessionToken(token, sessionSecret!)
  return NextResponse.json({ authenticated })
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/app/api/admin/session/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add src/app/api/admin/login/route.ts src/app/api/admin/login/route.test.ts src/app/api/admin/session/route.ts src/app/api/admin/session/route.test.ts
git commit -m "feat: add admin login and session-check API routes"
```

---

### Task 7: Students API Routes (Admin CRUD)

**Files:**
- Create: `src/lib/requireAdminSession.ts`
- Test: `src/lib/requireAdminSession.test.ts`
- Create: `src/lib/testUtils/mockSupabaseAdmin.ts`
- Create: `src/app/api/students/route.ts`
- Test: `src/app/api/students/route.test.ts`
- Create: `src/app/api/students/[id]/route.ts`
- Test: `src/app/api/students/[id]/route.test.ts`

**Interfaces:**
- Consumes: `isValidSessionToken` from `@/lib/adminSession` (Task 4), `getSupabaseAdminClient` from `@/lib/supabaseAdmin` (Task 5).
- Produces: `isAuthorizedRequest(request: Request): boolean`; `GET/POST /api/students`, `PATCH/DELETE /api/students/[id]` — consumed by Task 12 (`/admin` page).

- [ ] **Step 1: Write the failing test for the auth guard**

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { isAuthorizedRequest } from './requireAdminSession'
import { computeSessionToken } from './adminSession'

describe('isAuthorizedRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when there is no cookie header', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
    const request = new Request('http://localhost/api/students')
    expect(isAuthorizedRequest(request)).toBe(false)
  })

  it('is false for a wrong token', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
    const request = new Request('http://localhost/api/students', {
      headers: { cookie: 'admin_session=wrong-token' },
    })
    expect(isAuthorizedRequest(request)).toBe(false)
  })

  it('is true for a valid token', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
    const token = computeSessionToken('session-secret')
    const request = new Request('http://localhost/api/students', {
      headers: { cookie: `admin_session=${token}` },
    })
    expect(isAuthorizedRequest(request)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/requireAdminSession.test.ts`
Expected: FAIL — `./requireAdminSession` module does not exist.

- [ ] **Step 3: Write `src/lib/requireAdminSession.ts`**

```ts
import { isValidSessionToken } from '@/lib/adminSession'

export function isAuthorizedRequest(request: Request): boolean {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET
  if (!sessionSecret) return false

  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('admin_session='))

  if (!match) return false
  const token = decodeURIComponent(match.slice('admin_session='.length))
  return isValidSessionToken(token, sessionSecret)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/requireAdminSession.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the shared Supabase mock test utility**

Create `src/lib/testUtils/mockSupabaseAdmin.ts` (test-only helper, not imported by app code):

```ts
import { vi } from 'vitest'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

export function createMockSupabaseAdmin(result: QueryResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (value: QueryResult) => void) => void
  } = {
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (resolve) => resolve(result),
  } as never

  const from = vi.fn(() => chain)
  return { client: { from } as never, from, chain }
}
```

- [ ] **Step 6: Write the failing tests for `/api/students`**

Create `src/app/api/students/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createMockSupabaseAdmin } from '@/lib/testUtils/mockSupabaseAdmin'

const isAuthorizedRequest = vi.fn()
vi.mock('@/lib/requireAdminSession', () => ({ isAuthorizedRequest }))

let mockAdmin = createMockSupabaseAdmin({ data: null, error: null })
vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin.client,
}))

import { GET, POST } from './route'

describe('/api/students', () => {
  afterEach(() => {
    isAuthorizedRequest.mockReset()
  })

  it('GET returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await GET(new Request('http://localhost/api/students'))
    expect(res.status).toBe(401)
  })

  it('GET returns the student list when authorized', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({
      data: [{ id: '1', name: 'Sasa', class: '1B' }],
      error: null,
    })
    const res = await GET(new Request('http://localhost/api/students'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.students).toEqual([{ id: '1', name: 'Sasa', class: '1B' }])
  })

  it('POST returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await POST(
      new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sasa', class: '1B' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when fields are missing', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    const res = await POST(
      new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST creates a student when authorized with valid fields', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({
      data: { id: '1', name: 'Sasa', class: '1B' },
      error: null,
    })
    const res = await POST(
      new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sasa', class: '1B' }),
      })
    )
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.student).toEqual({ id: '1', name: 'Sasa', class: '1B' })
    expect(mockAdmin.from).toHaveBeenCalledWith('students')
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/app/api/students/route.test.ts`
Expected: FAIL — `./route` module does not exist.

- [ ] **Step 8: Write `src/app/api/students/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isAuthorizedRequest } from '@/lib/requireAdminSession'

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase.from('students').select('*').order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ students: data })
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const studentClass = typeof body?.class === 'string' ? body.class.trim() : ''

  if (!name || !studentClass) {
    return NextResponse.json({ error: 'name dan class wajib diisi' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('students')
    .insert({ name, class: studentClass })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ student: data }, { status: 201 })
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/app/api/students/route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 10: Write the failing tests for `/api/students/[id]`**

Create `src/app/api/students/[id]/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createMockSupabaseAdmin } from '@/lib/testUtils/mockSupabaseAdmin'

const isAuthorizedRequest = vi.fn()
vi.mock('@/lib/requireAdminSession', () => ({ isAuthorizedRequest }))

let mockAdmin = createMockSupabaseAdmin({ data: null, error: null })
vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin.client,
}))

import { PATCH, DELETE } from './route'

describe('/api/students/[id]', () => {
  afterEach(() => {
    isAuthorizedRequest.mockReset()
  })

  it('PATCH returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await PATCH(
      new Request('http://localhost/api/students/1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Sasa' }),
      }),
      { params: { id: '1' } }
    )
    expect(res.status).toBe(401)
  })

  it('PATCH returns 400 when no valid fields are given', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    const res = await PATCH(
      new Request('http://localhost/api/students/1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: { id: '1' } }
    )
    expect(res.status).toBe(400)
  })

  it('PATCH updates the student when authorized', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({
      data: { id: '1', name: 'Sasa Baru', class: '1B' },
      error: null,
    })
    const res = await PATCH(
      new Request('http://localhost/api/students/1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Sasa Baru' }),
      }),
      { params: { id: '1' } }
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.student.name).toBe('Sasa Baru')
  })

  it('DELETE returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await DELETE(new Request('http://localhost/api/students/1'), {
      params: { id: '1' },
    })
    expect(res.status).toBe(401)
  })

  it('DELETE removes the student when authorized', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({ data: null, error: null })
    const res = await DELETE(new Request('http://localhost/api/students/1'), {
      params: { id: '1' },
    })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})
```

- [ ] **Step 11: Run test to verify it fails**

Run: `npx vitest run src/app/api/students/[id]/route.test.ts`
Expected: FAIL — `./route` module does not exist.

- [ ] **Step 12: Write `src/app/api/students/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isAuthorizedRequest } from '@/lib/requireAdminSession'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const updates: Record<string, string> = {}
  if (typeof body?.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body?.class === 'string' && body.class.trim()) updates.class = body.class.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan valid' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ student: data })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('students').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npx vitest run src/app/api/students/[id]/route.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 14: Commit**

```bash
git add src/lib/requireAdminSession.ts src/lib/requireAdminSession.test.ts src/lib/testUtils/mockSupabaseAdmin.ts src/app/api/students
git commit -m "feat: add admin-gated students CRUD API routes"
```

---

### Task 8: CallCard Component

**Files:**
- Create: `src/components/CallCard.tsx`
- Test: `src/components/CallCard.test.tsx`
- Manual asset: `public/call-notification.mp3`

**Interfaces:**
- Consumes: `ACTIVE_CALL_WINDOW_MS` from `@/lib/activeCalls` (Task 2).
- Produces: `CallCard` React component with props `{ studentName: string, className: string, onExpire: () => void }` — consumed by Task 10 (`/kelas` page).

- [ ] **Step 1: Add the notification sound asset (manual step, not code)**

Add a short (1-2 second), royalty-free notification sound file at `public/call-notification.mp3`. This is a binary asset and cannot be generated as part of this plan — download one from a royalty-free source (e.g. freesound.org, mixkit.co) and place it at that exact path before running the app or the component test below.

- [ ] **Step 2: Write the failing tests**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { CallCard } from './CallCard'

describe('CallCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays a sound and vibrates on mount', () => {
    render(<CallCard studentName="Sasa" className="1B" onExpire={() => {}} />)
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(window.navigator.vibrate).toHaveBeenCalledWith(400)
  })

  it('calls onExpire after the active-call window elapses', () => {
    const onExpire = vi.fn()
    render(<CallCard studentName="Sasa" className="1B" onExpire={onExpire} />)
    vi.advanceTimersByTime(60_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('renders the student name and class', () => {
    const { getByText } = render(
      <CallCard studentName="Sasa" className="1B" onExpire={() => {}} />
    )
    expect(getByText('Sasa')).toBeInTheDocument()
    expect(getByText('1B')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/CallCard.test.tsx`
Expected: FAIL — `./CallCard` module does not exist.

- [ ] **Step 4: Write `src/components/CallCard.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { ACTIVE_CALL_WINDOW_MS } from '@/lib/activeCalls'

export interface CallCardProps {
  studentName: string
  className: string
  onExpire: () => void
}

export function CallCard({ studentName, className, onExpire }: CallCardProps) {
  useEffect(() => {
    const audio = new Audio('/call-notification.mp3')
    audio.play().catch(() => {
      // Autoplay bisa diblokir browser sebelum ada interaksi user; abaikan.
    })
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(400)
    }

    const timer = setTimeout(onExpire, ACTIVE_CALL_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [studentName, className, onExpire])

  return (
    <div className="call-card">
      <p className="call-card__name">{studentName}</p>
      <p className="call-card__class">{className}</p>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/CallCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/CallCard.tsx src/components/CallCard.test.tsx public/call-notification.mp3
git commit -m "feat: add CallCard component with sound, vibrate, and auto-expire"
```

---

### Task 9: StudentAutocomplete Component

**Files:**
- Create: `src/components/StudentAutocomplete.tsx`
- Test: `src/components/StudentAutocomplete.test.tsx`

**Interfaces:**
- Consumes: `searchStudents`, `Student` from `@/lib/studentSearch` (Task 3).
- Produces: `StudentAutocomplete` React component with props `{ students: Student[], onSelect: (student: Student) => void }` — consumed by Task 11 (`/piket` page).

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentAutocomplete } from './StudentAutocomplete'

const students = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Budi', class: '1A' },
]

describe('StudentAutocomplete', () => {
  it('shows matching students as the user types', () => {
    render(<StudentAutocomplete students={students} onSelect={() => {}} />)
    fireEvent.change(screen.getByLabelText('Cari nama siswa'), {
      target: { value: 'sas' },
    })
    expect(screen.getByText('Sasa — 1B')).toBeInTheDocument()
    expect(screen.queryByText('Budi — 1A')).not.toBeInTheDocument()
  })

  it('calls onSelect with the chosen student and clears the query', () => {
    const onSelect = vi.fn()
    render(<StudentAutocomplete students={students} onSelect={onSelect} />)
    const input = screen.getByLabelText('Cari nama siswa') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sas' } })
    fireEvent.click(screen.getByText('Sasa — 1B'))
    expect(onSelect).toHaveBeenCalledWith(students[0])
    expect(input.value).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/StudentAutocomplete.test.tsx`
Expected: FAIL — `./StudentAutocomplete` module does not exist.

- [ ] **Step 3: Write `src/components/StudentAutocomplete.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { searchStudents, type Student } from '@/lib/studentSearch'

export interface StudentAutocompleteProps {
  students: Student[]
  onSelect: (student: Student) => void
}

export function StudentAutocomplete({ students, onSelect }: StudentAutocompleteProps) {
  const [query, setQuery] = useState('')
  const results = searchStudents(students, query)

  return (
    <div className="student-autocomplete">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari nama siswa..."
        aria-label="Cari nama siswa"
      />
      <ul>
        {results.map((student) => (
          <li key={student.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(student)
                setQuery('')
              }}
            >
              {student.name} — {student.class}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/StudentAutocomplete.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/StudentAutocomplete.tsx src/components/StudentAutocomplete.test.tsx
git commit -m "feat: add student search autocomplete component"
```

---

### Task 10: Realtime Class-Calls Channel & `/kelas` Page

**Files:**
- Create: `src/lib/classCallsChannel.ts`
- Test: `src/lib/classCallsChannel.test.ts`
- Create: `src/app/kelas/page.tsx`

**Interfaces:**
- Consumes: `CallRow`, `ACTIVE_CALL_WINDOW_MS`, `filterActiveCalls` from `@/lib/activeCalls` (Task 2); `getSupabaseBrowserClient` from `@/lib/supabaseClient` (Task 5); `CallCard` from `@/components/CallCard` (Task 8).
- Produces: `subscribeToClassCalls(client, className, onInsert): RealtimeChannel`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest'
import { subscribeToClassCalls } from './classCallsChannel'

describe('subscribeToClassCalls', () => {
  it('subscribes to postgres_changes filtered by class', () => {
    const subscribe = vi.fn().mockReturnValue('channel-instance')
    const on = vi.fn().mockReturnValue({ subscribe })
    const channel = vi.fn().mockReturnValue({ on })
    const client = { channel } as never

    const result = subscribeToClassCalls(client, '1B', vi.fn())

    expect(channel).toHaveBeenCalledWith('class-calls-1B')
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'calls', filter: 'class=eq.1B' },
      expect.any(Function)
    )
    expect(subscribe).toHaveBeenCalled()
    expect(result).toBe('channel-instance')
  })

  it('maps INSERT payloads to the onInsert callback', () => {
    let handler: (payload: unknown) => void = () => {}
    const subscribe = vi.fn().mockReturnValue('channel-instance')
    const on = vi.fn((_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
      handler = cb
      return { subscribe }
    })
    const channel = vi.fn().mockReturnValue({ on })
    const client = { channel } as never

    const onInsert = vi.fn()
    subscribeToClassCalls(client, '1B', onInsert)

    handler({ new: { id: '1', student_name: 'Sasa', class: '1B', created_at: 'now' } })
    expect(onInsert).toHaveBeenCalledWith({
      id: '1',
      student_name: 'Sasa',
      class: '1B',
      created_at: 'now',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/classCallsChannel.test.ts`
Expected: FAIL — `./classCallsChannel` module does not exist.

- [ ] **Step 3: Write `src/lib/classCallsChannel.ts`**

```ts
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { CallRow } from '@/lib/activeCalls'

export function subscribeToClassCalls(
  client: SupabaseClient,
  className: string,
  onInsert: (call: CallRow) => void
): RealtimeChannel {
  return client
    .channel(`class-calls-${className}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'calls', filter: `class=eq.${className}` },
      (payload) => onInsert(payload.new as CallRow)
    )
    .subscribe()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/classCallsChannel.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `src/app/kelas/page.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { ACTIVE_CALL_WINDOW_MS, filterActiveCalls, type CallRow } from '@/lib/activeCalls'
import { subscribeToClassCalls } from '@/lib/classCallsChannel'
import { CallCard } from '@/components/CallCard'

const CLASS_STORAGE_KEY = 'jemput-sis:selected-class'

export default function KelasPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [calls, setCalls] = useState<CallRow[]>([])

  useEffect(() => {
    const stored = window.localStorage.getItem(CLASS_STORAGE_KEY)
    if (stored) setSelectedClass(stored)
  }, [])

  useEffect(() => {
    async function loadClasses() {
      const { data } = await supabase.from('students').select('class')
      if (data) {
        const unique = Array.from(
          new Set(data.map((row: { class: string }) => row.class))
        ).sort()
        setAvailableClasses(unique)
      }
    }
    loadClasses()
  }, [supabase])

  useEffect(() => {
    if (!selectedClass) return

    let active = true

    async function loadActiveCalls() {
      const since = new Date(Date.now() - ACTIVE_CALL_WINDOW_MS).toISOString()
      const { data } = await supabase
        .from('calls')
        .select('*')
        .eq('class', selectedClass)
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (active && data) setCalls(data as CallRow[])
    }

    loadActiveCalls()

    const channel = subscribeToClassCalls(supabase, selectedClass, (call) => {
      setCalls((current) => [call, ...current])
    })

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [selectedClass, supabase])

  useEffect(() => {
    if (!selectedClass) return
    const interval = setInterval(() => {
      setCalls((current) => filterActiveCalls(current, Date.now(), ACTIVE_CALL_WINDOW_MS))
    }, 1000)
    return () => clearInterval(interval)
  }, [selectedClass])

  function selectClass(className: string) {
    window.localStorage.setItem(CLASS_STORAGE_KEY, className)
    setSelectedClass(className)
  }

  if (!selectedClass) {
    return (
      <main>
        <h1>Pilih Kelas</h1>
        <ul>
          {availableClasses.map((className) => (
            <li key={className}>
              <button type="button" onClick={() => selectClass(className)}>
                {className}
              </button>
            </li>
          ))}
        </ul>
      </main>
    )
  }

  return (
    <main>
      <h1>Antrian Jemputan — {selectedClass}</h1>
      <div className="call-queue">
        {calls.map((call) => (
          <CallCard
            key={call.id}
            studentName={call.student_name}
            className={call.class}
            onExpire={() => setCalls((current) => current.filter((c) => c.id !== call.id))}
          />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Manual end-to-end verification**

Run `npm run dev`, open `/kelas` on one device, select a class. In another tab open `/piket` (built in Task 11) — this step will be re-verified after Task 11 exists. For now, confirm `/kelas` loads, the class picker lists classes seeded in `students`, and picking a class persists across a page reload (`localStorage`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/classCallsChannel.ts src/lib/classCallsChannel.test.ts src/app/kelas/page.tsx
git commit -m "feat: add realtime class-calls subscription and /kelas page"
```

---

### Task 11: Submit-Call Logic & `/piket` Page

**Files:**
- Create: `src/lib/submitCall.ts`
- Test: `src/lib/submitCall.test.ts`
- Create: `src/app/piket/page.tsx`

**Interfaces:**
- Consumes: `getSupabaseBrowserClient` from `@/lib/supabaseClient` (Task 5); `StudentAutocomplete` from `@/components/StudentAutocomplete` (Task 9); `Student` from `@/lib/studentSearch` (Task 3).
- Produces: `submitCall(client, studentName, className): Promise<{ ok: boolean, error?: string }>`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi } from 'vitest'
import { submitCall } from './submitCall'

function mockClient(result: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(result)
  const from = vi.fn(() => ({ insert }))
  return { client: { from } as never, from, insert }
}

describe('submitCall', () => {
  it('inserts a call row with the student name and class', async () => {
    const { client, from, insert } = mockClient({ error: null })
    const result = await submitCall(client, 'Sasa', '1B')

    expect(from).toHaveBeenCalledWith('calls')
    expect(insert).toHaveBeenCalledWith({ student_name: 'Sasa', class: '1B' })
    expect(result).toEqual({ ok: true })
  })

  it('returns the error message when the insert fails', async () => {
    const { client } = mockClient({ error: { message: 'network down' } })
    const result = await submitCall(client, 'Sasa', '1B')
    expect(result).toEqual({ ok: false, error: 'network down' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/submitCall.test.ts`
Expected: FAIL — `./submitCall` module does not exist.

- [ ] **Step 3: Write `src/lib/submitCall.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SubmitCallResult {
  ok: boolean
  error?: string
}

export async function submitCall(
  client: SupabaseClient,
  studentName: string,
  className: string
): Promise<SubmitCallResult> {
  const { error } = await client.from('calls').insert({
    student_name: studentName,
    class: className,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/submitCall.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `src/app/piket/page.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { submitCall } from '@/lib/submitCall'
import { StudentAutocomplete } from '@/components/StudentAutocomplete'
import type { Student } from '@/lib/studentSearch'

export default function PiketPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [students, setStudents] = useState<Student[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  })

  useEffect(() => {
    async function loadStudents() {
      const { data } = await supabase.from('students').select('*')
      if (data) setStudents(data as Student[])
    }
    loadStudents()
  }, [supabase])

  async function handleSelect(student: Student) {
    setSubmitting(true)
    setStatus({ type: 'idle' })
    const result = await submitCall(supabase, student.name, student.class)
    setSubmitting(false)

    if (result.ok) {
      setStatus({
        type: 'success',
        message: `Berhasil memanggil ${student.name} — ${student.class}`,
      })
    } else {
      setStatus({ type: 'error', message: result.error ?? 'Gagal memanggil siswa' })
    }
  }

  return (
    <main>
      <h1>Panggil Siswa</h1>
      <StudentAutocomplete students={students} onSelect={submitting ? () => {} : handleSelect} />
      {status.type === 'success' && <p role="status">{status.message}</p>}
      {status.type === 'error' && <p role="alert">{status.message}</p>}
    </main>
  )
}
```

- [ ] **Step 6: Manual end-to-end verification**

Seed a few rows in `students` via the Supabase dashboard SQL editor. Run `npm run dev`, open `/piket` in one browser/device and `/kelas` (pick the matching class) in another. Search a student name in `/piket`, click it, and confirm within ~1 second the call card appears in `/kelas` with sound + vibration, then disappears after 60 seconds. Then toggle the `/kelas` device's WiFi off and back on mid-session and confirm a call made while offline still appears once reconnected.

- [ ] **Step 7: Commit**

```bash
git add src/lib/submitCall.ts src/lib/submitCall.test.ts src/app/piket/page.tsx
git commit -m "feat: add call-submission logic and /piket page"
```

---

### Task 12: Admin Student Management (Form, List, Pages)

**Files:**
- Create: `src/components/StudentForm.tsx`
- Test: `src/components/StudentForm.test.tsx`
- Create: `src/components/StudentList.tsx`
- Test: `src/components/StudentList.test.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `Student` from `@/lib/studentSearch` (Task 3); `GET/POST /api/students`, `PATCH/DELETE /api/students/[id]` (Task 7); `POST /api/admin/login`, `GET /api/admin/session` (Task 6).
- Produces: `StudentForm` (props `{ onSubmit, submitLabel, initialName?, initialClass? }`), `StudentList` (props `{ students, onDelete, onUpdate }`) — both used only by `/admin/page.tsx`.

- [ ] **Step 1: Write the failing tests for StudentForm**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentForm } from './StudentForm'

describe('StudentForm', () => {
  it('shows an error and does not submit when fields are empty', () => {
    const onSubmit = vi.fn()
    render(<StudentForm submitLabel="Tambah" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByText('Tambah'))
    expect(screen.getByRole('alert')).toHaveTextContent('Nama dan kelas wajib diisi')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed name and class', () => {
    const onSubmit = vi.fn()
    render(<StudentForm submitLabel="Tambah" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Nama'), { target: { value: '  Sasa  ' } })
    fireEvent.change(screen.getByLabelText('Kelas'), { target: { value: ' 1B ' } })
    fireEvent.click(screen.getByText('Tambah'))
    expect(onSubmit).toHaveBeenCalledWith('Sasa', '1B')
  })

  it('pre-fills initial values for editing', () => {
    render(
      <StudentForm
        submitLabel="Simpan"
        initialName="Sasa"
        initialClass="1B"
        onSubmit={() => {}}
      />
    )
    expect((screen.getByLabelText('Nama') as HTMLInputElement).value).toBe('Sasa')
    expect((screen.getByLabelText('Kelas') as HTMLInputElement).value).toBe('1B')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/StudentForm.test.tsx`
Expected: FAIL — `./StudentForm` module does not exist.

- [ ] **Step 3: Write `src/components/StudentForm.tsx`**

```tsx
'use client'

import { useState, type FormEvent } from 'react'

export interface StudentFormProps {
  onSubmit: (name: string, className: string) => void
  submitLabel: string
  initialName?: string
  initialClass?: string
}

export function StudentForm({
  onSubmit,
  submitLabel,
  initialName = '',
  initialClass = '',
}: StudentFormProps) {
  const [name, setName] = useState(initialName)
  const [className, setClassName] = useState(initialClass)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !className.trim()) {
      setError('Nama dan kelas wajib diisi')
      return
    }
    setError(null)
    onSubmit(name.trim(), className.trim())
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Nama
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Kelas
        <input value={className} onChange={(e) => setClassName(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">{submitLabel}</button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/StudentForm.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing tests for StudentList**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StudentList } from './StudentList'

const students = [
  { id: '1', name: 'Sasa', class: '1B' },
  { id: '2', name: 'Budi', class: '1A' },
]

describe('StudentList', () => {
  it('renders each student with Edit and Hapus buttons', () => {
    render(<StudentList students={students} onDelete={() => {}} onUpdate={() => {}} />)
    expect(screen.getByText('Sasa — 1B')).toBeInTheDocument()
    expect(screen.getAllByText('Edit')).toHaveLength(2)
    expect(screen.getAllByText('Hapus')).toHaveLength(2)
  })

  it('calls onDelete with the student id', () => {
    const onDelete = vi.fn()
    render(<StudentList students={students} onDelete={onDelete} onUpdate={() => {}} />)
    fireEvent.click(screen.getAllByText('Hapus')[0])
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('shows a pre-filled form on Edit and calls onUpdate on save', () => {
    const onUpdate = vi.fn()
    render(<StudentList students={students} onDelete={() => {}} onUpdate={onUpdate} />)
    fireEvent.click(screen.getAllByText('Edit')[0])
    const nameInput = screen.getByLabelText('Nama') as HTMLInputElement
    expect(nameInput.value).toBe('Sasa')
    fireEvent.change(nameInput, { target: { value: 'Sasa Baru' } })
    fireEvent.click(screen.getByText('Simpan'))
    expect(onUpdate).toHaveBeenCalledWith('1', 'Sasa Baru', '1B')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/StudentList.test.tsx`
Expected: FAIL — `./StudentList` module does not exist.

- [ ] **Step 7: Write `src/components/StudentList.tsx`**

```tsx
'use client'

import { useState } from 'react'
import type { Student } from '@/lib/studentSearch'
import { StudentForm } from './StudentForm'

export interface StudentListProps {
  students: Student[]
  onDelete: (id: string) => void
  onUpdate: (id: string, name: string, className: string) => void
}

export function StudentList({ students, onDelete, onUpdate }: StudentListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <ul>
      {students.map((student) => (
        <li key={student.id}>
          {editingId === student.id ? (
            <StudentForm
              submitLabel="Simpan"
              initialName={student.name}
              initialClass={student.class}
              onSubmit={(name, className) => {
                onUpdate(student.id, name, className)
                setEditingId(null)
              }}
            />
          ) : (
            <>
              <span>
                {student.name} — {student.class}
              </span>
              <button type="button" onClick={() => setEditingId(student.id)}>
                Edit
              </button>
              <button type="button" onClick={() => onDelete(student.id)}>
                Hapus
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/StudentList.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 9: Write `src/app/admin/login/page.tsx`**

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Gagal login')
    }
  }

  return (
    <main>
      <h1>Login Admin</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit">Masuk</button>
      </form>
    </main>
  )
}
```

- [ ] **Step 10: Write `src/app/admin/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentForm } from '@/components/StudentForm'
import { StudentList } from '@/components/StudentList'
import type { Student } from '@/lib/studentSearch'

export default function AdminPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/admin/session')
      const { authenticated } = await res.json()
      if (!authenticated) {
        router.push('/admin/login')
        return
      }
      setChecked(true)
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (!checked) return
    async function loadStudents() {
      const res = await fetch('/api/students')
      const { students: data } = await res.json()
      setStudents(data ?? [])
    }
    loadStudents()
  }, [checked])

  async function handleAdd(name: string, className: string) {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, class: className }),
    })
    if (res.ok) {
      const { student } = await res.json()
      setStudents((current) => [...current, student])
    }
  }

  async function handleUpdate(id: string, name: string, className: string) {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, class: className }),
    })
    if (res.ok) {
      const { student } = await res.json()
      setStudents((current) => current.map((s) => (s.id === id ? student : s)))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setStudents((current) => current.filter((s) => s.id !== id))
    }
  }

  if (!checked) return null

  return (
    <main>
      <h1>Kelola Siswa</h1>
      <StudentForm submitLabel="Tambah" onSubmit={handleAdd} />
      <StudentList students={students} onUpdate={handleUpdate} onDelete={handleDelete} />
    </main>
  )
}
```

- [ ] **Step 11: Manual end-to-end verification**

Run `npm run dev`, open `/admin` without a session and confirm it redirects to `/admin/login`. Log in with the wrong password and confirm the error message shows. Log in with the correct `ADMIN_PASSWORD` and confirm it redirects to `/admin`, lists seeded students, and that add/edit/delete all work and immediately reflect in `/piket`'s autocomplete on reload.

- [ ] **Step 12: Commit**

```bash
git add src/components/StudentForm.tsx src/components/StudentForm.test.tsx src/components/StudentList.tsx src/components/StudentList.test.tsx src/app/admin
git commit -m "feat: add admin login and student management pages"
```

---

## Final Verification

- [ ] Run the full test suite: `npm test` — expect all tests passing.
- [ ] Run `npm run build` — expect a clean production build.
- [ ] Full manual walkthrough per the spec's Testing section: `/piket` → `/kelas` realtime call with sound+vibrate+auto-expire, WiFi drop/reconnect on `/kelas`, and `/admin` CRUD with password protection.

# KTTT Transition

KTTT members-only community MVP built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Database, Storage, and Realtime.

## Setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
   - For an existing project that already ran the old invite-only schema, run [`supabase/migrations/20260615_allow_public_signup.sql`](./supabase/migrations/20260615_allow_public_signup.sql) once in the SQL editor.
3. Create your first account from the signup screen, then promote it to admin in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Optional: `allowed_emails` can still be used to pre-assign an admin role before signup, but it no longer blocks public signup:

```sql
insert into public.allowed_emails(email, role)
values ('you@example.com', 'admin')
on conflict (email) do update set role = excluded.role;
```

4. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://kttt-transition.vercel.app
```

`NEXT_PUBLIC_SITE_URL` is used for email confirmation redirects. Keep it set to the production URL so confirmation emails always return to the deployed app, even when signup is tested from a local development server.

5. Configure Supabase Authentication.

In Supabase, open **Authentication -> Sign In / Providers -> Email**:

- Turn **Confirm email** ON.
- Keep email/password sign-in enabled.

Then open **Authentication -> URL Configuration**:

- Site URL: `https://kttt-transition.vercel.app`
- Redirect URLs:
  - `https://kttt-transition.vercel.app/**`
  - `http://localhost:3000/**`
  - `http://localhost:3001/**`
  - `http://localhost:3002/**`

The app sends signup confirmation links to `/auth/callback?next=/login?verified=1`. That callback exchanges the Supabase auth code, then returns the user to the login screen with a success message. `/dashboard` also exists as an alias for `/`.

When `NEXT_PUBLIC_SITE_URL` is set, local signup and resend actions also generate production confirmation redirects. Remove `NEXT_PUBLIC_SITE_URL` only when you intentionally need local auth callback testing.

6. Start the app:

```bash
npm install
npm run dev
```

## Implemented MVP Scope

- Public email/password signup through Supabase Auth with required email confirmation.
- Optional `allowed_emails` admin role pre-assignment without blocking normal member signup.
- Email confirmation callback with local/production redirect handling.
- Profiles, member list, profile detail, and profile image upload.
- Gear registration, image upload, owner/admin editing, rental request, approval, rejection, return request, return confirmation.
- In-app due alerts for 3 days before, due date, and overdue rentals.
- Event creation, edit/delete by creator/admin, RSVP, participants, and event chat.
- Team, event, and rental Realtime chat.
- Admin role reservation management, role management, gear management, and event management.
- Mobile-first UI with bottom navigation, dark mode, responsive layout, and PWA manifest/service worker.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

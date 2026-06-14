# KTTT Transition

KTTT members-only community MVP built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Database, Storage, and Realtime.

## Setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
3. Bootstrap the first admin invite in the SQL editor:

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

`NEXT_PUBLIC_SITE_URL` is used for production email confirmation redirects. In local development, the app automatically uses the current localhost origin instead.

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

The app sends signup confirmation links to `/auth/callback?next=/login?verified=1`. That callback exchanges the Supabase auth code, then returns the user to the login screen with a success message. `/dashboard` also exists as an alias for `/`.

When the local app is opened on `127.0.0.1`, signup confirmation redirects are normalized to `localhost` so they match the allowed Supabase redirect URLs above.

6. Start the app:

```bash
npm install
npm run dev
```

## Implemented MVP Scope

- Invite-gated email/password auth through Supabase Auth and `allowed_emails`.
- Email confirmation callback with local/production redirect handling.
- Profiles, member list, profile detail, and profile image upload.
- Gear registration, image upload, owner/admin editing, rental request, approval, rejection, return request, return confirmation.
- In-app due alerts for 3 days before, due date, and overdue rentals.
- Event creation, edit/delete by creator/admin, RSVP, participants, and event chat.
- Team, event, and rental Realtime chat.
- Admin invite management, role management, gear management, and event management.
- Mobile-first UI with bottom navigation, dark mode, responsive layout, and PWA manifest/service worker.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

# Account backend setup

1. Copy `.env.example` to `.env.local`. Set your Supabase project URL and publishable key (legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works). Set `NEXT_PUBLIC_SITE_URL` to the canonical app URL. Do not use a service-role key.
2. Run [the migration](migrations/202609260001_profiles.sql) once in your project's SQL Editor, or apply it using the Supabase CLI after linking your project. It creates `public.profiles`, permissions, row-level security policies, and a trigger that inserts a profile when an Auth user is created. Existing Auth users are backfilled.
3. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs. Add the equivalent HTTPS deployment URLs before deploying.
4. Enable the Email provider. Email confirmation is supported and recommended. To support signup confirmation across devices, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` as the Confirm signup email template link. The default PKCE confirmation callback is also supported when opened in the signup browser.
5. Restart the dev server after changing environment variables. Create an account at `/signup`; it appears under Authentication → Users and Table Editor → profiles. Confirm your email, then sign in. Configure SMTP delivery for production.

Supabase Auth stores credentials; no plaintext passwords are stored in app tables. Authenticated users can select only their own profile and update only its `full_name` column. Anonymous users cannot access profiles. Clients cannot create/delete profiles, modify IDs/timestamps, or assign themselves elevated roles. The signup trigger creates profiles atomically with Auth users.

`GET /api/account` verifies the current user and returns only that user's identity/profile. Middleware refreshes cookies and verifies the user before workspace access; missing configuration fails closed. The account menu uses the real profile and provides sign-out. All account/session responses are private and not cached.

Google, SSO, and self-service password recovery are not enabled. Commerce sessions, analytics, and merchant settings still use the existing demo data. This backend implements user accounts only.

## Verification against your project

After the migration, create two test users and confirm their emails. Verify both appear in Authentication → Users and `profiles`. Each user's `GET /api/account` must return their own ID. Using each user's Supabase access token and the publishable key, query `/rest/v1/profiles`: only their own row should appear; selecting the other user's ID returns an empty array. Updating the other user's name affects zero rows; inserting/deleting profiles or updating `id`/`created_at` must fail with permission errors. Without a user token, table access must fail.

Run the live login/profile/logout check with `GATEWAY_TEST_EMAIL` and `GATEWAY_TEST_PASSWORD` set in your test environment:

```sh
npm run test:e2e -- tests/login.spec.ts
```

The live test is skipped without these values. Workspace regression tests require `GATEWAY_TEST_STORAGE_STATE` pointing to a signed-in Playwright storage-state file outside the repository. No service-role credential is needed by the running application.

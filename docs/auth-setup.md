# Auth Setup

## Local Redirects

In Supabase `Authentication -> URL Configuration`:

- Site URL: `http://localhost:3456`
- Redirect URL: `http://localhost:3456/**`

When the site is published, add the production domain too.

## Google Login

The `CONTINUER AVEC GOOGLE` button is wired in the app, but Supabase must be configured before it can work.

If Chrome shows `DNS_PROBE_FINISHED_NXDOMAIN` on a URL like
`https://<project-ref>.supabase.co/auth/v1/authorize`, the Supabase Project URL in
`supabase-config.js` is wrong, deleted, paused in a way that removed the host, or copied
from another project. Copy the exact `Project URL` from Supabase:

- `Project Settings -> API -> Project URL`
- Then paste it into `supabase-config.js`

In Supabase:

1. Go to `Authentication -> Sign In / Providers`.
2. Enable `Google`.
3. Add the Google OAuth client ID and client secret.

In Google Cloud OAuth:

- Authorized JavaScript origin: `http://localhost:3456`
- Authorized redirect URI: copy the callback URL shown by Supabase in the Google provider settings.

## Public User ID

The app stores a public handle in `profiles.handle`.
This is the visible user id for leaderboard/social display, for example `@alice`.

For now, login is done with Google or email/password. Logging in directly with a handle can be added later with a dedicated backend lookup, but email/password + Google is safer for the MVP.

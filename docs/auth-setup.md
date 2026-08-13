# Auth Setup

## Protection des données

Avant d'ouvrir le site au public, exécuter entièrement `docs/supabase-schema.sql`
dans le SQL Editor du projet Supabase. Ce script active la sécurité ligne par
ligne : un compte ne peut lire, modifier ou supprimer que son propre profil et
sa propre progression. Les visiteurs non connectés n'ont aucun accès à ces
tables.

Ne jamais placer une `secret key`, une clé `service_role`, un mot de passe de
base de données ou un secret Google dans les fichiers du site. Seule la
`publishable key` Supabase peut être présente dans `supabase-config.js`.

## Local Redirects

In Supabase `Authentication -> URL Configuration`:

- Site URL: `http://localhost:3456`
- Redirect URL: `http://localhost:3456/**`

For GitHub Pages production:

- Site URL: `https://canardculture.com/`
- Redirect URL: `https://canardculture.com/**`
- Temporary fallback redirect: `https://alicebrun2106-lgtm.github.io/cultureeeee/**`

## Google Login

The `CONTINUER AVEC GOOGLE` button is wired in the app, but Supabase must be configured before it can work.

If Chrome shows `DNS_PROBE_FINISHED_NXDOMAIN` on a URL like
`https://<project-ref>.supabase.co/auth/v1/authorize`, the Supabase Project URL in
`supabase-config.js` is wrong, deleted, paused in a way that removed the host, or copied
from another project. Copy the exact `Project URL` from Supabase:

- `Project Settings -> API -> Project URL`
- Then paste it into `supabase-config.js`

Current project URL:

- `https://zkhnlewpmbetwlauwooz.supabase.co`

In Supabase:

1. Go to `Authentication -> Sign In / Providers`.
2. Enable `Google`.
3. Add the Google OAuth client ID and client secret.
4. Keep email confirmation enabled.
5. Enable CAPTCHA before a public launch and review Auth rate limits.

In Google Cloud OAuth:

- Authorized JavaScript origin: `http://localhost:3456`
- Authorized JavaScript origin: `https://canardculture.com`
- Authorized redirect URI: copy the callback URL shown by Supabase in the Google provider settings.

Production URLs in `Authentication -> URL Configuration`:

- Site URL: `https://canardculture.com/`
- Redirect URL: `https://canardculture.com/**`

## Public User ID

The app stores a public handle in `profiles.handle`.
This is the visible user id for leaderboard/social display, for example `@alice`.

For now, login is done with Google or email/password. Logging in directly with a handle can be added later with a dedicated backend lookup, but email/password + Google is safer for the MVP.

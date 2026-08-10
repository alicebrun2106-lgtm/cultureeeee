# CULTURE!!! Product Structure

## Product Spine

CULTURE!!! is first a flashcards app.

The user should always understand the loop:

1. Find or create a pack.
2. Add it to my packs.
3. Review with Anki-style scheduling.
4. See progress.
5. Compare socially when connected.

Everything else is secondary and should not compete with that loop.

## Navigation

Recommended simple structure:

1. Today
   Daily topic, short learning bite, optional daily pack to add.
2. Explore
   Public packs generated/curated by us.
3. My Packs
   Due cards, mixed review, strengths, weak packs, personal packs.
4. Create
   Fast manual creation, on-the-go add card, later AI/document/book generation.
5. Social
   Leaderboards, friends, domains, challenges.
6. Duck
   Site-only extra. Hidden in installed app/PWA.

Current implementation can keep `Trouver`, `Mes paquets`, `Social`, and `Canard` while we migrate toward this structure.

## Account And Sync

Use a real backend before launch. Local-only progress is fine for prototypes, but not for published users.

Recommended stack:

- Supabase Auth for email magic link / OTP.
- Supabase Postgres for user progress and packs.
- Row Level Security so users can only write their own progress.
- Public aggregate tables or views for leaderboards.

Supabase official docs support passwordless email login through magic links / OTP with `signInWithOtp`.

## Data Model

Core tables:

- `profiles`: user display name, avatar, public handle.
- `public_packs`: curated packs shipped by us.
- `user_packs`: packs created manually by users.
- `cards`: cards belonging to either a public or user pack.
- `user_pack_memberships`: packs added by a user.
- `card_progress`: SRS state per user and card.
- `pack_stats`: cached mastery, due count, weak count, last reviewed.
- `leaderboard_stats`: public XP/mastery/domain stats.
- `daily_topics`: daily learning topic and generated daily pack.

Local storage should become an offline cache. On login, local progress should sync upward once, then cloud becomes the source of truth.

## Free vs Paid

Free:

- Explore public packs.
- Manual pack creation.
- Add cards quickly.
- Anki-style reviews.
- Basic progress.
- Social profile and leaderboards.

Paid / later:

- Generate a pack from a prompt.
- Generate flashcards from a document.
- Generate from a book.
- Bigger quotas.
- Advanced stats.
- Duck skins or duck extras on the site.

## Duck

The duck is important for brand and acquisition, but it should not complicate the installed learning app.

Rule:

- Website: duck can exist as a playful assistant and monetizable extra.
- Installed app/PWA: hide duck and keep the learning loop clean.

## Immediate Build Order

1. Clean navigation and reduce visible extras.
2. Add account/auth with cloud sync.
3. Make manual creation fast and obvious.
4. Build Today as a daily topic + daily pack.
5. Replace mock social with real leaderboard data.
6. Reintroduce monetization as a clear paid area, not as core navigation.

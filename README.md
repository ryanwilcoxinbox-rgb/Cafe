# BrewPrint ☕

*A better cup, one step at a time.*

BrewPrint is an installable web app that gives you coffee recipes built around **your** kit. Pick your brewer, say how many people you're brewing for, and it works out the dose, water, temperature and the exact setting for your grinder. Then it walks you through each step with a timer.

## How it works

1. **My kit** (first launch): tick your brewers (and their sizes), grinders, scales and kettle, and choose your cup size.
2. **How are you brewing?**: pick a method from the brewers you own.
3. **Make it yours**: set the number of people and the strength. Numbers update live, and BrewPrint picks
   - the right brewer size (e.g. the 45 cl press for 1 person, the 1 L press for 3),
   - the right grinder (hand grinder normally, electric for doses over 30 g),
   - rounds, when one brewer can't make it all at once (e.g. 2 presses on the AeroPress, or a concentrate topped up with hot water).
4. **Brew**: a "get ready" checklist, then timed steps with scale targets. Timed steps chime and move on by themselves. The screen stays awake while you brew.
5. **Enjoy**: say whether it tasted sour, just right or bitter. BrewPrint suggests a fix (e.g. "grind 4 clicks finer, 88 → 84") and remembers it for next time. That's your *print*.
6. **My beans**: add a bag (roast, process, roast date). The recipe adapts: light roasts get hotter water, dark roasts cooler, very fresh beans a longer bloom. Each bag remembers its own grind.
7. **Journal**: star your best brews to pin them to the home screen, and tap *Brew again* to reload any past brew exactly.

Everything is stored on the device (localStorage). There are no accounts and no server, and it works offline once installed.

## Supported gear

| Brewers | Grinders (exact settings) | Also handles |
|---|---|---|
| V60 (01/02/03), AeroPress (Original/XL), Chemex (3–10 cup), French press (35 cl–1.5 L), Moka pot (1–12 cup), Hario cold brew (600 ml / 1 L), filter machine / drip coffee maker (4–12 cup) | KINGrinder K6 (clicks), Wancle 28-setting electric, Comandante C40, Timemore C2/C3, Baratza Encore | Other burr grinders, blade grinders, pre-ground coffee, no scale (spoons and ml), regular vs gooseneck kettle, temperature-control kettles |

> Grind settings are **starting points** from common community charts. The taste feedback after each brew adjusts them per brewer and grinder.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # recipe engine tests
npm run build    # production build in dist/
npm run icons    # regenerate PWA icons from public/favicon.svg
```

Stack: Vite, React 19, TypeScript, Tailwind CSS 4, Motion, vite-plugin-pwa, Vitest.

### Where things live

- `src/data/brewers.ts`: brewer definitions (sizes, ratio, temperature, grind, bean advice)
- `src/data/grinders.ts`: grinder dial maps (`[coarseness, setting]` points)
- `src/lib/recipe.ts`: the recipe engine (scaling, rounds, grinder choice, step scripts)
- `src/lib/brewAgain.ts`: reload a past brew's settings
- `src/lib/pwa.ts`, `updateLogic.ts`: service-worker registration and update checks
- `src/lib/install.ts`, `installPrompt.ts`, `notices.ts`: the install banner and the one-banner-at-a-time queue
- `src/lib/dialin.ts`: taste feedback turned into grind and strength adjustments
- `src/lib/syncLogic.ts`, `sync.ts`: optional sign-in and cloud backup (Supabase)
- `src/screens/*`: Kit setup → Home → Recipe → Brew → Done → Journal, plus Beans

**Add a grinder:** add an entry to `GRINDERS` with points for the coarseness anchors (25 moka, 40 AeroPress, 50 V60, 55 filter machine, 60 Chemex, 75 French press, 82 cold brew).
**Add a brewer:** add it to `BREWERS`, give it a step script in `STEPS` and a prep list in `prepFor`, and draw an illustration in `components/Art.tsx`.

## Deploy

Hosted on Vercel, which picks up Vite automatically (build: `npm run build`, output: `dist`). `.github/workflows/ci.yml` runs the tests and a build on every push. The app uses relative paths and hash routing, so any static host works.

Vercel Web Analytics is wired up in `src/App.tsx`. Because hash routes aren't page loads, each screen is reported by hand as a tidy path (`/recipe/v60`, `/beans/[id]`); bean ids never leave the device. It only runs in production builds, so `npm run dev` reports nothing.

## Sign-in and backup (optional)

Everything is saved on the device first, so BrewPrint works offline and without an account. Signing in (email plus a one-time code, no password) copies the kit, beans, journal and dial-in to Supabase and restores them on any device. The first sign-in on a phone that already has data merges it with the cloud copy; brews and bags logged on two devices are combined, never overwritten.

Sign-in uses a typed code rather than a magic link because a link opens Safari, which on iPhone doesn't share storage with the Home Screen app.

Without the two env vars below, the app builds exactly as before, with no sign-in anywhere.

**One-time setup**

1. In the Supabase SQL editor, run `supabase/migrations/20260922000000_user_data.sql`.
2. Authentication → Emails → **Magic Link** template: include `{{ .Token }}` so the email contains the code, e.g. `<p>Your BrewPrint code is <strong>{{ .Token }}</strong></p>`.
3. Add to Vercel (Production and Preview) and to `.env.local` for local dev:
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
   ```
   The publishable key is safe in the browser; row-level security limits each person to their own row.

Supabase's built-in email sender allows only a few emails an hour. That's fine for personal use; set up custom SMTP (Authentication → Emails → SMTP) before inviting others.

## Installing and updates

### Add to Home Screen
A single banner explains how to install BrewPrint, with instructions for your device and browser:
- **iPhone/iPad Safari:** the Share-sheet steps.
- **Chrome on iOS:** its own Share steps.
- **Firefox, Edge and other iOS browsers:** the same Share steps, plus a fallback to try Safari.
- **Android:** an **Install** button if the browser offers one, otherwise menu instructions.
- **Desktop:** a low-key "best on your phone" note.

The banner never appears when BrewPrint is already running installed, or during a brew. Once closed, it stays gone for good (`installPromptDismissed` in saved state). The decision logic is in `src/lib/install.ts` (pure, unit-tested); the browser side is in `src/lib/installPrompt.ts`.

### How new versions reach people
- `src/lib/pwa.ts` registers the service worker itself (`injectRegister: null`) and keeps the registration. It calls `registration.update()` **every minute** while the app is open and **every time it comes back to the foreground**. The foreground check catches Home Screen apps that sit suspended in the app switcher for days.
- A new version downloads in the background. The app then shows **"A new version is ready — Update and reload"**. It uses `registerType: 'prompt'` rather than `autoUpdate` so a reload can never wipe a brew in progress, and the banner never appears on the brew screen.
- **My kit → About BrewPrint** shows the running version, git commit and build time. **Check for updates** asks the service worker to look for a new version and also fetches `/version.json` (written at build time, never cached) to show the latest deployed build. A failed check says "You may be offline"; it isn't treated as an error.
- `vercel.json` serves `sw.js`, `manifest.webmanifest`, `version.json` and `index.html` with `Cache-Control: public, max-age=0, must-revalidate`. Hashed files in `/assets` are cached for a year (`immutable`).
- Each build embeds its own timestamp, so no two builds are byte-identical. That's intentional: to see what's deployed, compare `version.json`, not a hash of the whole build.

### Support: someone is stuck on an old version
Anyone who installed BrewPrint before version 0.3.0 still has the old service worker, which doesn't have the update checks yet. To move them over **once**:

1. Force-close the Home Screen app.
2. Reopen it.
3. Force-close it again.
4. Reopen it a second time.
5. Open **My kit** and scroll down. You should see an **About BrewPrint** section showing version 0.3.0 or later. Older versions don't have this section at all.

If it still shows the old version:

6. Remove the app from the Home Screen.
7. Open the website again in the browser.
8. Add it to the Home Screen again.

This is a one-time fix for people on the old service worker. From 0.3.0 onwards, updates arrive through the in-app "Update and reload" banner.

## Roadmap

- ~~**Phase 2:** favourites, fine-tune (ratio & temperature), bean library, per-bean dial-in~~ ✅
- **Phase 3:** share a recipe by link, cold brew "ready" notification, more brewers (Kalita, Clever, Origami, espresso)

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

Everything is stored on the device (localStorage). There are no accounts and no server, and it works offline once installed.

## Supported gear

| Brewers | Grinders (exact settings) | Also handles |
|---|---|---|
| V60 (01/02/03), AeroPress (Original/XL), Chemex (3–10 cup), French press (35 cl–1.5 L), Moka pot (1–12 cup), Hario cold brew (600 ml / 1 L) | KINGrinder K6 (clicks), Wancle 28-setting electric, Comandante C40, Timemore C2/C3, Baratza Encore | Other burr grinders, blade grinders, pre-ground coffee, no scale (spoons and ml), regular vs gooseneck kettle, temperature-control kettles |

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
- `src/lib/dialin.ts`: taste feedback turned into grind and strength adjustments
- `src/screens/*`: Kit setup → Home → Recipe → Brew → Done → Journal

**Add a grinder:** add an entry to `GRINDERS` with points for the coarseness anchors (25 moka, 40 AeroPress, 50 V60, 60 Chemex, 75 French press, 82 cold brew).
**Add a brewer:** add it to `BREWERS`, give it a step script in `STEPS` and a prep list in `prepFor`, and draw an illustration in `components/Art.tsx`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages. Enable it once in **Settings → Pages → Source: GitHub Actions**. The app uses relative paths and hash routing, so it also works on Netlify, Vercel or any static host.

## Roadmap

- **Phase 2:** favourites, custom recipe tweaks, bean library, per-bean dial-in
- **Phase 3:** share a recipe by link, cold brew "ready" notification, more brewers (Kalita, Clever, Origami, espresso)

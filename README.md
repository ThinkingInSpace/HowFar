# GeoRange — project handoff

**Two cities. One guess. How far?**

GeoRange is a mobile-first browser game in which players estimate the shortest surface distance between two cities. The daily challenge contains five untimed rounds, awards up to 200 points per round, and gives every player the same city pairs from midnight to midnight in the `America/New_York` time zone. Practice games use fresh random routes and are labeled separately from the daily challenge.

- Live game: <https://thinkinginspace.github.io/HowFar/>
- Source repository: <https://github.com/ThinkingInSpace/HowFar>
- Primary branch: `main`
- Runtime: static HTML, CSS, and JavaScript; no backend or build step
- Product name and tagline are approved and should remain consistent

## Start here on another computer

The handoff archive contains the complete working tree needed to run and change the game. It intentionally excludes Git history, local caches, test output, credentials, and the unrelated `simple-mapmaking-tools-2.0/` directory found beside this project on the original computer.

1. Extract the archive into a new folder.
2. Open that folder as the workspace in Codex.
3. Make sure Python 3 is available. Node.js 20 or later is needed only for tests.
4. Start a local web server from the project folder:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

5. Open <http://127.0.0.1:8000>. Do not open `index.html` directly because the browser must fetch `cities.json`.
6. Run the automated checks:

   ```sh
   npm test
   ```

No `npm install` step is required. All runtime assets, including the 3D globe library and Earth image, are included.

If the extracted folder should continue the existing repository history, initialize it from GitHub and copy these files into that checkout, or run the following in an empty parent directory before copying any changes:

```sh
git clone https://github.com/ThinkingInSpace/HowFar.git
cd HowFar
```

Use the GitHub account name `ThinkingInSpace`. The established commit email is `172847695+ThinkingInSpace@users.noreply.github.com`. GitHub requires a personal access token or SSH key for command-line pushes; account passwords do not work.

## Current behavior

The player chooses kilometers, miles, or nautical miles, then starts either the daily challenge or a practice game and estimates five great-circle distances. Practice games exclude the current daily challenge's five pairs and can be repeated for new random routes. Desktop users can submit with Enter; phone users have a large tap target. Each reveal shows the correct distance, signed percentage error, points, and the route on a globe. The final view shows all five routes, color-coded score tiles, signed errors, and a clipboard-ready result labeled Daily or Practice.

The share text has this shape:

```text
🌍 GeoRange — Sep 21, 2026
Score: 842/1000
🟩 +3.2%
🟦 -14%
🟨 +35%
🟩 0%
🟧 -72%
https://thinkinginspace.github.io/HowFar/
```

Positive error means the guess was too long; negative error means it was too short. Exact guesses show `0%`.

Practice shares begin `🌍 GeoRange — Practice` so they cannot be confused with a dated daily score. The daily route selection recipe and scoring rules are unchanged. As with the existing daily game, scores are calculated in the browser; this is friendly comparison rather than tamper-resistant competition.

## Daily challenge design

`questions.js` converts the current instant to a calendar date using `Intl.DateTimeFormat` with the IANA zone `America/New_York`. This handles Eastern Standard Time and Eastern Daylight Time without fixed UTC offsets. The date key has the form `YYYY-MM-DD`.

The fixed city list is normalized, every valid unique pair is enumerated in stable order, and a seeded pseudo-random shuffle selects five pairs. The seed includes the date and an explicit recipe version:

```text
GeoRange:YYYY-MM-DD:v1
```

This creates the same routes for every player using the same code and `cities.json`. Changing the city data, candidate ordering, seed algorithm, or `v1` value will change daily challenges, including historical dates. If selection rules must change after launch, increment the recipe version deliberately and document the cutoff date.

The game records the challenge date when Start is tapped. A game begun before midnight retains that date and those routes after midnight. A new game started after midnight uses the new Eastern date. Because this is a static client-only app, it trusts the device clock; preventing clock manipulation would require a trusted server.

## Scoring and geography

Distances are approximate shortest paths over a spherical Earth with radius 6,371 km. They are not flight paths or airport-to-airport distances. Distances are rounded to a kilometer before scoring.

Each round uses:

```text
round(200 × max(0, 1 − |guess − actual| / actual))
```

A perfect answer earns 200 points, a 10% error earns 180, a 50% error earns 100, and an error of 100% or more earns zero. Units are alternate displays of the same distance and must produce equivalent scores. There is no timer or speed bonus.

## Architecture and important files

| Path | Purpose |
| --- | --- |
| `index.html` | Production page structure, accessibility labels, and all four screens. |
| `style.css` | Responsive visual system and mobile breakpoints. |
| `app.js` | Browser orchestration, rendering, events, clipboard handling, and game flow. |
| `game.js` | Pure state machine, unit parsing, and scoring. |
| `questions.js` | Eastern date key, seeded daily selection, city validation, and great-circle calculations. |
| `results.js` | Result descriptions, signed errors, score tiers, date display, and share text. |
| `globe.js` | Primary 3D route reveal. |
| `globe-fallback.js` | Canvas 2D globe used when WebGL or the 3D renderer fails. |
| `cities.json` | Runtime dataset containing 243 city records. |
| `cities.dbf`, `placesdbf.py` | Original data source and optional conversion utility. |
| `vendor/` | Pinned Globe.gl 2.46.2 bundle, Earth texture, license, and provenance notes. |
| `tests/` | Node tests for game rules, dates, deterministic challenges, geography, failures, and result text. |
| `docs/AUDIT.md` | Historical audit and validation record. Earlier sections describe prior milestones. |
| `docs/GAMEPLAY-BRIEF.md` | Product identity, current rules, and design direction. |
| `design/` | Earlier interactive visual prototype retained as reference, not production code. |
| `.nojekyll` | Ensures GitHub Pages serves the static tree directly. |

Module URLs use query strings such as `?v=live6` to invalidate browser and GitHub Pages caches. When production JavaScript or CSS changes, advance the relevant cache tag consistently in `index.html` and import statements.

## Development and verification

Run `npm test` after changing game rules, route selection, date handling, units, or result formatting. Tests use Node's built-in test runner and require no third-party packages.

For interface changes, manually check at least:

- a narrow phone viewport around 360 × 800 pixels;
- a desktop viewport;
- Enter submission on desktop and button submission on a touch-sized layout;
- all three units;
- five rounds through the final results screen;
- signed errors for guesses above, below, and equal to the answer;
- clipboard success and the visible fallback text box when clipboard access is unavailable;
- 3D globe loading and the 2D fallback path;
- the Eastern date boundary, especially around daylight-saving changes;
- keyboard focus, browser zoom, reduced motion, and long city/country names.

The automated date tests cover summer rollover at 04:00 UTC and winter rollover at 05:00 UTC. Keep both cases.

## Data conversion

The game already includes `cities.json`; regeneration is optional. The converter requires Python's `dbfread` package, previously verified with 2.0.7:

```sh
python3 placesdbf.py --output cities.generated.json
```

The tool creates a new file and refuses to overwrite an existing one. Review generated content before replacing `cities.json`; changing that file changes the daily challenge sequence.

## Deployment

GitHub Pages publishes the repository's `main` branch from the repository root. A normal release is:

```sh
git status
npm test
git add app.js game.js index.html questions.js results.js style.css tests README.md docs
git commit -m "Describe the change"
git push origin main
```

After pushing, open the live URL in a private window or on a phone and complete one round. If an old version appears, confirm the cache-busting tags were advanced and wait for the Pages deployment to finish.

Do not commit tokens, passwords, `.env` files, browser profiles, test reports, or unrelated folders. The `.gitignore` already excludes common local artifacts.

## Security, privacy, and limitations

- The game does not collect or transmit guesses, scores, names, or analytics.
- Clipboard writing happens only after the player presses **Copy my score**. A read-only text box appears if the Clipboard API is unavailable.
- City data and scoring are public client-side assets, so a player can inspect or alter them. This is acceptable for friendly comparison; ranked competition would need server authority.
- The bundled third-party globe script is pinned and loaded with a recorded SHA-384 integrity value. When updating it, update `vendor/README.md`, the license if needed, and the integrity attribute in `index.html`, then retest both globe renderers.
- The city dataset still needs a formal provenance, licensing, version, and naming review before a broad public launch.
- Physical iOS and Android testing, plus Safari, Firefox, screen-reader, and keyboard-only passes, remain recommended.

## Guidance for the next Codex session

Ask Codex to read this file, inspect `git status`, and run the test suite before editing. Preserve any existing uncommitted work. Keep the app static and mobile-first unless the product owner explicitly changes those constraints. Treat daily challenge compatibility as a public contract: avoid changing the selection recipe casually.

Suggested opening prompt:

```text
Read README.md and inspect the GeoRange repository before making changes. Preserve the mobile-first static architecture, the five-round untimed scoring rules, and deterministic daily challenges based on midnight America/New_York. Run the existing tests before and after your work, then report changed files, validation, and any effect on historical daily challenges.
```

## Current handoff state

The last published baseline before this handoff was commit `26a8bc8`, **Launch GeoRange beta with untimed mobile play and reliable globe**. The handoff adds deterministic daily challenges, dated share text with the live URL, and signed percentage errors in both the results interface and shared output. Run `git status` on the destination computer to determine whether those handoff changes have already been committed or still need a commit and push.

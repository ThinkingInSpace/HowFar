# Code audit and validation — steps 1–2

Reviewed September 16, 2026. Scope: the supplied static HTML/CSS/JavaScript game, city data, converter, and external globe integration. No production service or backend exists in this repository.

## Baseline

All seven original project files matched GitHub commit `620f92d` byte-for-byte. Local main was attached to that history without changing their contents. Commit `40a2274` added the original naming notes, run instructions, and ignore rules. Git author identity was configured only for this repository using the user's supplied private GitHub address.

## Findings and resolutions

| Priority | Finding | Resolution |
| --- | --- | --- |
| High | External executable script loaded from an unversioned URL with no integrity check. | Globe.gl fixed to 2.46.2, HTTPS, SHA-384 integrity, anonymous CORS. Load is asynchronous and optional. |
| High | Timer counted callbacks rather than elapsed time; throttled tabs could extend rounds. | Deadline based on the monotonic clock; submission and visibility changes check expiry. |
| Medium | Round handlers did not enforce valid transitions or exactly one result. | Explicit game phases reject repeated submissions and repeated Next actions. |
| Medium | Invalid/non-finite coordinates and zero-distance pairs could reach scoring; route selection could return fewer than five pairs. | Normalize and validate city records, deduplicate routes, exclude zero distances, require a full five-round game. |
| Medium | Scoring could become non-finite for invalid distances. | Finite-number checks and bounds; exact unit conversion constants. |
| Medium | Missing library/WebGL could throw during result rendering; new globe allocated each round. | Optional renderer with failure messaging; one reused globe, paused when hidden, stale async reveals ignored. |
| Medium | Arithmetic longitude midpoint placed date-line routes on the wrong side of Earth. | Spherical midpoint with a finite antipodal fallback. |
| Medium | Clipboard rejection had no recovery path. | Catch failure and expose selectable results for manual copy. |
| Medium | City-load failure left no useful recovery action. | Clear error, 10-second request timeout, Retry, and no playable controls before successful setup. |
| Medium | Data converter used nonexistent uppercase DBF fields and relied on incorrect default text decoding. | Actual lowercase fields, explicit UTF-8, coordinate checks, and non-overwriting output. |
| Low | No form submission on Enter, missing input labels, unclear invalid guesses and focus behavior. | Real form, labels, inline errors, focus transitions, text score recap and reduced-motion support. |
| Low | Feedback and emoji color thresholds disagreed. | Consistent tiers at 185, 150, 100 and 40 points. |
| Low | “Direct flight distance” was misleading for city coordinates. | State that answers are approximate great-circle surface distances. |

## Security observations

No credentials or secret-bearing configuration were found in the reviewed project files. Application text is assigned using `textContent` or input values; the previous constant `innerHTML` clear has been removed. Dataset-derived HTML globe tooltips are disabled. The game has no accounts, server-side writes, payment flows, or score submission endpoint.

The integrity digest was calculated from the fixed script downloaded from UNPKG. It prevents the browser accepting different bytes at that URL; it does not constitute an independent audit of the bundled third-party code. The bundle is still trusted executable code, and imagery downloads still contact UNPKG. A preliminary advisory search was inconclusive; **no claim of an exhaustive dependency vulnerability scan is made**. Before a public release, review the bundled dependency inventory and current advisories, asset/data provenance and licensing, and host security headers. The fixed image URL does not have a browser SRI check.

Scores and answers are client-side and can be changed through developer tools. This is acceptable for a casual unranked game; an authoritative competitive leaderboard would require a separate design. No leaderboard is implemented.

## Validation performed

- 11 automated tests pass, covering scoring bounds/symmetry, unit equivalence, invalid guesses, exact-deadline expiry without timer callbacks, repeated actions, five-round completion and restart, known distances, antipodes/date-line/polar midpoint, malformed city data, unique complete routes, and loader errors.
- All 243 supplied city records normalize successfully.
- The revised converter produces 243 names/countries/coordinate pairs matching the supplied JSON. It writes a new file rather than replacing the dataset.
- Browser: completed five rounds, verified cumulative/final scores, Enter submission, invalid-input feedback, actual textured globe rendering, share-copy success, and restart resetting the score and round.
- Browser: observed a timed-out round with zero points and continued to the next round.
- Browser: inspected a 375-pixel-wide layout; input and unit controls fit without horizontal overflow.
- Failure simulation on a temporary local server: initial city HTTP 503 displayed Retry; Retry started a full game. A missing globe script displayed fallback text and all five rounds remained playable.
- JavaScript syntax checks and `git diff --check` pass.

The browser tooling supplied a working clipboard even in the attempted unavailable-clipboard simulation; the manual-copy UI is implemented but its denied-permission path has not been independently verified in a real browser. WebGL loss, texture-only failure, long device sleep, Safari/Firefox, full screen-reader testing, and extended mobile performance testing remain release checks. Browser observations are manual smoke checks rather than a checked-in automated browser suite.

## Remaining product/data work

The city dataset is small and not difficulty-balanced. Source metadata/version and licensing were not supplied, so provenance should be established before publishing. Country/city naming conventions should be reviewed as editorial work. The app still starts its first timer automatically, preserving the original flow; an explicit Start screen and untimed mode are in the gameplay brief for subsequent milestones.

The existing visual style remains in place with functional accessibility/layout fixes. No full visual redesign or public deployment is included in this milestone.

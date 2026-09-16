# Code audit and validation — steps 1–2

Reviewed September 16, 2026. Scope: the supplied static HTML/CSS/JavaScript game, city data, converter, and globe integration. No production service or backend exists in this repository.

## Baseline

All seven original project files matched GitHub commit `620f92d` byte-for-byte. Local main was attached to that history without changing their contents. Commit `40a2274` added the original naming notes, run instructions, and ignore rules. Git author identity was configured only for this repository using the user's supplied private GitHub address.

## Findings and resolutions

| Priority | Finding | Resolution |
| --- | --- | --- |
| High | External executable script loaded from an unversioned URL with no integrity check. | Globe.gl fixed to 2.46.2 with SHA-384 integrity, then bundled locally with its MIT license. |
| High | Timer counted callbacks rather than elapsed time; throttled tabs could extend rounds. | Deadline based on the monotonic clock; submission and visibility changes check expiry. |
| Medium | Round handlers did not enforce valid transitions or exactly one result. | Explicit game phases reject repeated submissions and repeated Next actions. |
| Medium | Invalid/non-finite coordinates and zero-distance pairs could reach scoring; route selection could return fewer than five pairs. | Normalize and validate city records, deduplicate routes, exclude zero distances, require a full five-round game. |
| Medium | Scoring could become non-finite for invalid distances. | Finite-number checks and bounds; exact unit conversion constants. |
| Medium | Missing library/WebGL could throw during result rendering; new globe allocated each round. | Reuse the 3D globe and pause it when hidden; stale async reveals are ignored. A Canvas 2D globe displays the actual route when 3D rendering fails. |
| Medium | Arithmetic longitude midpoint placed date-line routes on the wrong side of Earth. | Spherical midpoint with a finite antipodal fallback. |
| Medium | Clipboard rejection had no recovery path. | Catch failure and expose selectable results for manual copy. |
| Medium | City-load failure left no useful recovery action. | Clear error, 10-second request timeout, Retry, and no playable controls before successful setup. |
| Medium | Data converter used nonexistent uppercase DBF fields and relied on incorrect default text decoding. | Actual lowercase fields, explicit UTF-8, coordinate checks, and non-overwriting output. |
| Low | No form submission on Enter, missing input labels, unclear invalid guesses and focus behavior. | Real form, labels, inline errors, focus transitions, text score recap and reduced-motion support. |
| Low | Feedback and emoji color thresholds disagreed. | Consistent tiers at 185, 150, 100 and 40 points. |
| Low | “Direct flight distance” was misleading for city coordinates. | State that answers are approximate great-circle surface distances. |

## Security observations

No credentials or secret-bearing configuration were found in the reviewed project files. Application text is assigned using `textContent` or input values; the previous constant `innerHTML` clear has been removed. Dataset-derived HTML globe tooltips are disabled. The game has no accounts, server-side writes, payment flows, or score submission endpoint.

The integrity digest was calculated from the fixed Globe.gl script downloaded from UNPKG and verified again before bundling. The browser checks the locally served script against that digest. This does not constitute an independent audit of the third-party code. Earth imagery is bundled locally and its provenance is recorded in `vendor/README.md`. A preliminary advisory search was inconclusive; **no claim of an exhaustive dependency vulnerability scan is made**. Before a public release, review current advisories, asset/data provenance and licensing, and host security headers.

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


## Integrated mobile-first game — September 16, 2026

The approved GeoRange visual design now runs the actual five-round game. The welcome screen is untimed and offers unit selection before Start. Every reveal, the final total, the share text, and the travel journal use actual game state. The separate `design/` prototype remains only as a reference.

Validation for this integration:

- 16 automated checks pass, including presentation of equivalent-unit guesses, timeout descriptions, very large and near-perfect guesses, real score sharing, and separate city/country labels.
- Completed a real five-round game at phone width: 71 + 47 + 0 + 113 + 98 = 329. The displayed final score and copied share text both matched 329/1000.
- Checked 320- and 375-pixel phone viewports without horizontal overflow; long route names wrap in the journal.
- Checked a 390-by-440 reduced-height viewport: the estimate input and 52-pixel submit button were both within view after focusing the form. This is a viewport simulation, not a physical phone keyboard test.
- Checked restart to round one with a zero score, real timeout earning zero, and continuation after timeout.
- A temporary local failure server returned an initial city HTTP 503: Retry recovered. A missing globe script allowed completion of all five rounds. Forced clipboard rejection exposed a selectable manual-copy box with the actual 614/1000 result, closing the earlier unverified UI branch.
- Phone reveals put the answer and next action before the globe. Actual tap-target measurements were 47 pixels for Help and 54 pixels for Next Round. Live controls have a minimum 44-pixel height. Form controls use at least 16-pixel text, decimal input mode, safe-area padding, and retain page zoom.

Physical iOS/Android browser testing, screen-reader testing, and production hosting remain release checks. No public deployment was performed.

## Reliable globe reveal — September 16, 2026

The previous reveal still downloaded Globe.gl and its Earth image from UNPKG during play. Both assets now live in `vendor/` and load from the game's own origin. The 3D globe remains the normal experience. If its script or WebGL renderer fails, `globe-fallback.js` projects the Earth image and city-to-city great-circle route onto a Canvas 2D sphere.

- Verified the bundled 3D globe visually with a real route and no browser errors.
- Simulated WebGL failure and verified the 2D globe displayed the correct route on desktop and a 375-pixel phone viewport without horizontal overflow. The game still scored and advanced normally.
- The Globe.gl bundle matched its existing SHA-384 digest. The MIT license and asset source information are included under `vendor/`.
- Automated game checks, JavaScript syntax checks, and `git diff --check` passed.

Physical-phone graphics performance and other browser engines still need release testing.

## Untimed play — September 16, 2026

The countdown, automatic expiry, and timeout scoring were removed. A round stays open until the player submits a valid estimate. The estimate form submits with Enter on desktop and with the 52-pixel button on mobile. Browser checks confirmed both actions and that a round remained open after more than 15 seconds; the automated tests pass.

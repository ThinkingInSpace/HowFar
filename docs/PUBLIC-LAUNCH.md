# Public-launch review — October 1, 2026

Scope: the static game's runtime files and the new allowlisted `dist/` deployment artifact. This supersedes unresolved city-data provenance in the historical AUDIT.md. No production settings were changed and nothing was deployed.

## Implemented

- Miles are initially selected in both selectors; kilometers and nautical miles remain available. A player's selection carries through subsequent games in the same page.
- The results globe contains the five completed routes. Colors come from the same score-tier function as the recap: green, blue, yellow, orange, red. Matching color bars appear on recap numbers and score tiles, with numeric scores and textual routes retained for accessibility.
- Pointer rotation, four keyboard-operable rotation buttons, responsive sizing, reduced-motion handling, hidden-tab pausing, and stale-draw guards. The Canvas fallback also supports rotation and all five colors.
- Same-origin CSP blocks external executable code, inline scripts, plugins, form submission, and base-URL rewriting. Inline styles remain allowed because the globe library injects CSS and positions its canvas dynamically. No unsafe-eval permission is granted.
- Existing SHA-384 integrity protection preserved and verified for the vendored script. No runtime CDN, analytics, cookie, location, or persistent-storage integration was added.
- Public privacy/credits page discloses host logging, clipboard behavior, data and image sources, licenses, approximate distances, and local score calculation.
- Build allowlist packages only 15 required public assets. It excludes DBF sources, handoff archives, prototypes, tests, documentation, and unrelated workspace projects. Unexpected existing output files cause a build failure rather than silently shipping them.

## Privacy and security findings

Guesses and scores remain in page memory. Clipboard writes require a user click. Dataset names are inserted as text, and HTML-based globe tooltips remain disabled. There are no account, payment, upload, or backend write endpoints. A same-origin-only browser request check passed through both renderer paths.

GitHub Pages logs visitor IP addresses for security, even for signed-out visitors; this is disclosed rather than promising that no personal data is processed anywhere. Source: [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

The upstream locked runtime tree has 45 packages. OSV returned no advisories for those versions; see dependency-advisory-results.json. The bundle is prebuilt, so this does not independently establish every byte's origin or prove there are no vulnerabilities. Refresh the review when changing the library. No secrets were found by a pattern scan of tracked text files and the public artifact; such scans cannot prove absence.

## Legal and attribution findings

All 243 gameplay city names and coordinates match Natural Earth 5.1.2 at a tolerance of 0.000001 degrees. Natural Earth permits redistribution, modification, and commercial use under its [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/). No data or daily-route selection changed.

The existing Earth asset is documented as NASA Blue Marble from the Three-globe 2.45.2 example. Credits and a no-endorsement statement link to [NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). Do not add NASA logos or imply NASA endorsement. The original NASA image identifier was not supplied; the recorded intermediary asset source is retained.

Globe.gl's MIT license remains included. License and notice texts for the upstream runtime dependency tree are now distributed too, including the Apache-licensed H3 component. See vendor/THIRD-PARTY-NOTICES.txt and vendor/runtime-dependencies.json. This review covers identified asset and dependency terms; it is not a trademark clearance for “GeoRange” or a jurisdiction-specific legal opinion. Commercial expansion, accounts, analytics, or payments would require a fresh review.

## Validation

- 19 Node tests pass for rules, scoring, units, daily/practice selection, and result presentation.
- Real headless Microsoft Edge browser checks pass for default miles, unchanged unit options, switching units, five-round completion, exact route coordinates and colors, rotation buttons, dragging, mobile width, restart, and the privacy page.
- Both WebGL and forced library-failure Canvas paths pass. Verified desktop and 375-pixel screenshots; no horizontal overflow or uncaught page exceptions.
- The allowlisted deployment build passes. Browser checks also run against the built artifact.
- Syntax checks and git diff whitespace checks pass. Physical mobile devices, Safari, Firefox, and full screen-reader behavior were not tested in this review.

## Hosting steps before publishing

1. Run `npm test` and `npm run build`; deploy only `dist/`. Do not copy the repository root or a whole local workspace into a public web directory.
2. Serve HTTPS and enable GitHub Pages **Enforce HTTPS**. Host configuration has not been changed or verified by this code review. See [GitHub HTTPS guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
3. Where the host supports response headers, set `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Permissions-Policy: geolocation=(), camera=(), microphone=()`. Add `frame-ancestors 'none'` in an HTTP CSP header to prevent framing. That directive does not work in HTML meta CSP; GitHub Pages does not offer arbitrary per-site headers, so it requires a suitable proxy or another host. The game's meta policy still applies without it.
4. Confirm the deployed privacy page, license links, city JSON, texture, script integrity, summary globe, and clipboard behavior under the real public URL. Purge stale HTML if the host caches it; runtime imports use the new `live8` version marker.

No technical blocker was found in the tested static-game scope. Hosting configuration and the stated review limits must not be represented as independently certified legal compliance or an exhaustive penetration test.

## October 5, 2026 — aggregate research collection

The historical privacy statements above describe the prior version. Version `live9` adds a separately deployed Cloudflare collector, a pre-play notice and a browser opt-out. See `research/README.md` for the exact transient payloads, three aggregate tables, private reporting, sampling limits, security controls and deployment instructions. Worker request logs, invocation logs, tracing, Logpush and tail consumers are disabled. Provider connection/security processing is disclosed; no claim of anonymous network transport is made. The application cannot count unique people or reliably deduplicate without identifiers, so these are best-effort game counts. Tests cover concurrent atomic storage, strict schemas, rejected identifiers, origins, bounded requests, error calculations, both production origins, and persistent opt-out. No individual test events enter production research totals. This technical review does not establish a jurisdiction-specific research exemption or ethical approval.

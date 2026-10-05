# Aggregate research collection

Both public game URLs use `https://georange-research.anrhodes.workers.dev/collect`.
Local previews are disabled. The public endpoint is not a secret; no credentials belong in browser assets.

The application retains only three aggregate tables per UTC month and game mode:

- `totals`: starts, completions, and sum of completed scores (average = sum / completions).
- `scores`: counts in 100-point buckets; the last bucket is 900–1000 inclusive.
- `routes`: public endpoint names, answer count, overflow count, and sums of signed and absolute percentage errors in tenths.

Starts count successfully loaded games. Completions count the fifth valid answer, even if the player never opens the summary. Route answers include unfinished games. Errors above 1,000% are counted as overflow and excluded from both error means. No individual requests, guesses, scores, exact play timestamps, game identifiers, or player identifiers are saved. Monthly grouping is collection month, not challenge date. A game across a month boundary can contribute to two monthly cohorts.

Requests necessarily contain the individual event transiently while it is merged into totals. Cloudflare still processes connection metadata and may retain platform security records and storage backups. Application logging, invocation logs, tracing, Logpush and tail consumers are disabled to honor aggregate-only retention. Do not enable them or analytics products without reviewing the notice and collection scope.

The local-storage entry `georange-research-opt-out` contains only a boolean preference. It is never transmitted. Opt-out aborts pending requests and suppresses later events; opt-in takes effect at the next game. Previously merged totals cannot be retracted. No retries, offline queues, device fingerprints, deduplication tokens, cookies or accounts are used. Network failures can undercount. Starts/completions count games, not unique people; repeats and malicious requests can inflate results. Origin validation, a 1 KB body limit, strict field validation, a public-city whitelist, bounded error values and an approximate per-edge 600/minute aggregate rate limit constrain abuse, but do not authenticate players. Do not interpret these results as a representative population sample or verified assessment.

## Owner reports

Open Cloudflare Dashboard → Workers & Pages → Durable Objects → `georange-research_ResearchAggregates` → Data Studio, using the account that owns the Worker. Object names are `research-v1:YYYY-MM:daily` and `research-v1:YYYY-MM:practice`. Reports have no public HTTP endpoint. The same queries can be run through the authenticated Durable Objects SQL API using `durable_object_name` and `jurisdiction: "none"`.

```sql
SELECT starts, completions, score_sum * 1.0 / NULLIF(completions, 0) AS average_score FROM totals;
SELECT bucket AS score_range_lower_bound, count FROM scores ORDER BY bucket;
SELECT * FROM route_report ORDER BY mean_absolute_error_percent DESC;
SELECT * FROM route_report ORDER BY mean_absolute_error_percent ASC;
```

`route_report` requires at least 20 non-overflow answers before comparing a route. Keep reports private; apply additional grouping and sample thresholds before publishing. Aggregates are retained for the study; review whether they are still needed when the study ends. SQL contains only aggregate rows, although incremental snapshots of very small cohorts could reveal individual contributions. Do not take or publish per-event snapshots.

## Development and deployment

Node 22+ is needed for the Workers test tooling; the static game needs no dependency install.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:research
pnpm build
pnpm exec wrangler deploy --config research/wrangler.jsonc
```

The lockfile pins the current official Cloudflare Vitest integration and its Workers runtime. `pnpm-workspace.yaml` permits only esbuild and workerd installation scripts. Cloudflare account authentication remains outside the repository. No paid-plan upgrade is required by this code; monitor account usage and billing limits.

Production dataset is `research-v1`. For deployed smoke tests, temporarily use a separate dataset such as `research-qa-v1` before publishing the game, then restore `research-v1`. Never populate research totals with automated tests. In browser tests intercept `/collect` and inspect its body instead of forwarding it. The monthly/mode partition avoids placing all study traffic into one global object. If game rules change, increment the dataset name to keep incompatible results separate. Regenerate `research/cities.js` from the normalized public city list when changing `cities.json`.

Publish only `dist/` to static hosting. The Worker, its configuration, test dependencies and owner documentation are excluded from that build. The custom-domain site's copy must keep its own `GAME_URL` in `results.js`.

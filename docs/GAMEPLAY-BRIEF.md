# Step 3: name and gameplay direction

Prepared September 16, 2026. Recommendation for the check-in; the current in-game title is retained until a name is agreed.

## Recommended name: OrbitGuess

**Tagline: Two cities. One guess. How far?**

This is from the original shortlist. It is short, playful, and directly signals guessing; the globe makes the orbit association work visually. The compromise is that “orbit” can suggest space rather than geography, so the tagline and city-pair imagery should always establish the premise.

My original preference was GlobeSpan. Preliminary web research changed that recommendation: an established travel business already uses [Globespan](https://www.globespan.com/), directly adjacent to the proposed aviation theme. [GLOBALG.A.P.](https://globalgap.org/) is also an established name, making Global Gap a less distinctive search term. [Georange](https://www.georange.se/) is already used by a Swedish organization.

| Candidate | Assessment |
| --- | --- |
| OrbitGuess | Recommended working choice. Exact-name searches did not surface an obvious existing game; this does not establish availability. |
| Great Circle Dash | Best descriptive alternative from the shortlist. Strong fit for timed geography play, but longer and more technical. Exact-name searches did not surface an obvious competing game. |
| GlobeSpan | Attractive sound, but an existing travel business creates a practical discoverability concern. |
| Global Gap | Friendly language, but overlaps a well-established existing name. |
| GeoRange | Geography fit, but already used elsewhere and feels more like a tool than a game. |

The other original options remain in `NameIdeas.txt`; this pass concentrated on the strongest shortlist. This was a preliminary web naming screen, not a trademark, domain, app-store, or social-handle clearance. No availability is claimed and no name or domain has been registered.

## Game promise

A quick geography challenge that turns an instinctive distance estimate into an interesting visual reveal. Players should finish feeling they learned something, even after a poor guess.

## Rules for the first polished release

- Five distinct city pairs per game; a city may recur in a different pair.
- Classic mode: 15 seconds per round. Timer starts when the question is ready and continues when the tab is hidden. Only a submitted guess counts; expiration earns zero.
- Keep kilometers, miles, and nautical miles. Units are different views of the same distance and must award equivalent scores.
- Distances are approximate shortest surface paths on a spherical Earth of radius 6,371 km, rounded to a kilometer before scoring. They are not scheduled flight routes or airport-to-airport distances.
- Up to 200 points per round; up to 1,000 total. Formula: `round(200 × max(0, 1 − absolute_error / actual_distance))`. A 10% miss earns 180; a 50% miss earns 100; a 100% miss or greater earns zero. No speed bonus.
- Retain the current unranked random-city pool for this milestone. Do not present it as balanced difficulty or a common daily challenge.
- Reveal the answer and points immediately. The globe is optional and must never gate progress.
- Use encouraging feedback, consistent color thresholds, and readable text alongside the share grid.

## Direction for steps 4–5

Design a welcome screen with an explicit Start action so players can read instructions and choose units before the clock begins. Keep the globe for the reveal rather than giving away geography while guessing. Make the guessing screen calm and legible; put visual celebration into the reveal and recap. Add error amount/percentage to explain each score.

Use travel-inspired route lines, city cards, clear typography, and a controlled accent palette. Favor readable, accessible controls over cockpit decoration. Support small screens, keyboard use, visible focus, and reduced motion throughout.

Offer an untimed practice option in the later replay milestone and keep its personal records separate from timed scores. Curated difficulty tiers should follow a city-name and route-distribution review rather than arbitrary scoring multipliers. Daily challenges and accounts are outside this milestone.

## Check-in decisions

1. Confirm OrbitGuess with “Two cities. One guess. How far?”, or choose Great Circle Dash.
2. Confirm the five-round, 15-second classic game and later untimed practice option.
3. With those agreed, move to the visual prototype before implementing the full redesign.

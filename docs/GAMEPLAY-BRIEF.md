# Step 3: name and gameplay direction

## Confirmed identity

**Name: GeoRange**

**Tagline: Two cities. One guess. How far?**

Selected by the project owner after the naming check-in. Use this spelling and tagline consistently in the game, browser title, and share text.

## Visual direction

The reviewable prototype is at `design/index.html`. It uses warm ivory, deep green ink, cobalt blue, mint, and a small apricot accent. An illustrated atlas globe, route labels, generous typography, and a ticket-style scorecard establish the travel theme.

The four preview screens are Welcome, Guess, Reveal, and Results. The estimate form uses the real distance/scoring helpers for a fixed Lisbon–Tokyo sample route, and the five-round summary is explicitly sample data. The approved direction is now integrated at the root URL with real routes and results. This separate prototype is retained for reference.

## Game promise

A quick geography challenge that turns an instinctive distance estimate into an interesting visual reveal. Players should finish feeling they learned something, even after a poor guess.

## Rules for the first polished release

- Five distinct city pairs per game; a city may recur in a different pair.
- Classic mode: five untimed rounds. Only a submitted guess counts. Enter submits the estimate on desktop; the button is the primary mobile action.
- Keep kilometers, miles, and nautical miles. Units are different views of the same distance and must award equivalent scores.
- Distances are approximate shortest surface paths on a spherical Earth of radius 6,371 km, rounded to a kilometer before scoring. They are not scheduled flight routes or airport-to-airport distances.
- Up to 200 points per round; up to 1,000 total. Formula: `round(200 × max(0, 1 − absolute_error / actual_distance))`. A 10% miss earns 180; a 50% miss earns 100; a 100% miss or greater earns zero. No speed bonus.
- Retain the current unranked random-city pool for this milestone. Do not present it as balanced difficulty or a common daily challenge.
- Reveal the answer and points immediately. Every reveal should display the cities and route on a globe; a 2D globe replaces the 3D view when WebGL is unavailable. Rendering must never delay scoring or the next round.
- Use encouraging feedback, consistent color thresholds, and readable text alongside the share grid.

## Direction for steps 4–5

Design a welcome screen with an explicit Start action so players can read instructions and choose units before the game begins. Keep the globe for the reveal rather than giving away geography while guessing. Make the guessing screen calm and legible; put visual celebration into the reveal and recap. Add error amount/percentage to explain each score.

Use travel-inspired route lines, city cards, clear typography, and a controlled accent palette. Favor readable, accessible controls over cockpit decoration. Support small screens, keyboard use, visible focus, and reduced motion throughout.

Curated difficulty tiers should follow a city-name and route-distribution review rather than arbitrary scoring multipliers. Daily challenges and accounts are outside this milestone.

## Check-in decisions

1. Review the GeoRange visual prototype across all four screens.
2. Confirm the five-round untimed game and scoring.
3. With those agreed, move to the visual prototype before implementing the full redesign.

## Smartphone priority

Smartphone browsers are the primary target. The live game uses untimed rounds, at least 44-pixel control targets, a decimal keyboard, wrapping city and country labels, safe-area padding, and answer-first reveals. Desktop uses the same rules with wider layouts. The results journal and share text use actual session scores.

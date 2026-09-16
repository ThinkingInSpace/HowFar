# GeoRange

**Two cities. One guess. How far?**

A small browser game: estimate the great-circle distance between two cities over five timed rounds. Each round awards up to 200 points, for a maximum of 1,000.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Use a local web server rather than opening `index.html` directly, because the game fetches `cities.json`. Stop the server with Ctrl+C. Python 3 is sufficient to serve the game; there is no build step.

## Baseline

The original seven game/data files were checked byte-for-byte against GitHub commit `620f92d` and matched. Local `main` follows `origin/main` at https://github.com/ThinkingInSpace/HowFar. `NameIdeas.txt` contains the original naming shortlist.

## Project layout

- `index.html`, `style.css`: page and presentation.
- `app.js`: browser interaction.
- `questions.js`: city data loading and route selection.
- `cities.json`: 243 city records used by the game.
- `cities.dbf`, `placesdbf.py`: source data and optional conversion utility.

The globe library and Earth image are bundled in `vendor/`, so the route reveal needs no third-party download. If a device cannot use WebGL, a 2D globe shows the same route. No account or backend is required.

## Check the rules

With Node.js 20 or later, run `npm test`. No package installation is needed. The tests cover scoring, units, invalid input, repeated actions, restart, geographic edge cases, city validation, complete route selection, and loading failures.

`game.js` contains the pure game rules. `globe.js` owns the 3D reveal, with `globe-fallback.js` providing a Canvas 2D route globe when needed. The browser loads the bundled Globe.gl 2.46.2 script with a SHA-384 integrity check and bundled Earth imagery. Changing the script version requires recomputing its integrity value and testing again. The game does not send guesses or scores to a server.

## Optional data conversion

The conversion utility requires Python's `dbfread` package (verified with 2.0.7). Run:

```sh
python3 placesdbf.py --output cities.generated.json
```

It reads the supplied DBF's lowercase fields and UTF-8 text and creates a new file. It refuses to overwrite an existing file. Review the generated data before replacing `cities.json`; the supplied JSON includes additional metadata that the converter intentionally omits. The game does not require Python packages or data regeneration.

## Review documents

- [Audit and validation](docs/AUDIT.md)
- [Naming and gameplay brief](docs/GAMEPLAY-BRIEF.md)

The responsive visual design is integrated with the five-round game at the root URL. Publishing, practice mode, difficulty tiers, and daily challenges remain future work.

## Visual design preview

With the local server running, open http://127.0.0.1:8000/design/. The four-screen prototype uses sample routes and scores. The sample guess form and globe reveal are interactive. This prototype is retained as a design reference; play the fully integrated game at the root URL.

## Playing on a phone

Choose your distance unit and tap **Let’s go places** to load five routes. Take as long as you need to make each guess. On a desktop keyboard, Enter submits the estimate; on a phone, tap **Lock in my guess**. Each reveal waits for **Next round**; after round five, **See my results** shows the actual score and all five routes.

Controls have a minimum 44-pixel tap area, text fields use a decimal keyboard, and page zoom remains enabled. Phone reveals put the answer and next-round action above the globe. Scores are held for the current page session; refreshing starts over. The app is browser-based and does not require installation.

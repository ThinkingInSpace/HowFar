# HowFar — working title

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

The globe needs internet access; the numeric game should remain usable when the visualization is unavailable. No account or backend is required.

Bundled assets for the GeoRange reveal:

- `globe.gl.min.js`: Globe.gl 2.46.2 from `https://unpkg.com/globe.gl@2.46.2/dist/globe.gl.min.js`. MIT license in `LICENSE.globe-gl.txt`. SHA-384: `1uolMBZ25k3zJcNwCLEv49+L+m2dZudqAzsoSAJfQTzDCSBxJzrMuZ2dkp/5JKiT`.
- `earth-blue-marble.jpg`: Earth image from the Three-globe 2.45.2 example at `https://unpkg.com/three-globe@2.45.2/example/img/earth-blue-marble.jpg` (NASA Blue Marble imagery).

These files are served from the same origin as the game; no external CDN request is needed during play.

## Runtime license and advisory review — October 1, 2026

`THIRD-PARTY-NOTICES.txt` includes license/notice files from 45 runtime packages resolved from Globe.gl's upstream `v2.46.2/yarn.lock`, including Three.js, D3 components, and H3. `runtime-dependencies.json` records versions, archive locations, license identifiers, and archive integrity. The bundled Three.js revision 185 agrees with the upstream lock's 0.185.1. This is an upstream dependency inventory, not an independently reconstructed binary SBOM.

Run `python scripts/review-vendor.py` from the repository root to regenerate the inventory, notices, and scoped OSV advisory query. It downloads archives without executing package scripts or extracting files to disk. `docs/dependency-advisory-results.json` contains the review results. No advisories were returned for the queried versions; this is not proof of the absence of vulnerabilities.

City data: all 243 city names and coordinates in `cities.json` match Natural Earth 5.1.2 `ne_110m_populated_places.geojson`, fetched from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_populated_places.geojson. Coordinate comparison tolerance: 0.000001 degrees. This establishes the gameplay data's provenance without changing daily routes. Natural Earth's public-domain terms: https://www.naturalearthdata.com/about/terms-of-use/ .

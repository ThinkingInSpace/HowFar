import { ROUND_COUNT } from './game.js?v=live3';

const toRad = degrees => degrees * Math.PI / 180;

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
    const clamped = Math.max(0, Math.min(1, a));
    return 2 * 6371 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
}

export function routeMidpoint(a, b) {
    // Average unit vectors rather than longitudes: handles the date line and poles.
    const vector = ({ lat, lon }) => [Math.cos(toRad(lat)) * Math.cos(toRad(lon)), Math.cos(toRad(lat)) * Math.sin(toRad(lon)), Math.sin(toRad(lat))];
    const va = vector(a), vb = vector(b);
    const [x, y, z] = va.map((v, i) => v + vb[i]);
    if (Math.hypot(x, y, z) < 1e-10) return { lat: a.lat, lng: a.lon }; // Antipodes have no unique midpoint.
    return { lat: Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI, lng: Math.atan2(y, x) * 180 / Math.PI };
}

function coordinate(value) {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return NaN;
    return Number(value);
}

export function normalizeCities(raw) {
    const records = Array.isArray(raw) ? raw : raw?.features ?? raw?.cities ?? raw?.data;
    if (!Array.isArray(records)) throw new Error('City data must contain an array.');
    const unique = new Map();
    for (const entry of records) {
        if (!entry || typeof entry !== 'object') continue;
        const p = entry.properties || entry;
        const name = p.name ?? p.NAME ?? p.city ?? p.CITY;
        const country = p.country ?? p.COUNTRY ?? p.adm0name ?? p.ADM0NAME ?? p.admin ?? p.ADMIN ?? '';
        const lat = coordinate(p.lat ?? p.latitude ?? p.LATITUDE ?? entry.coordinates?.lat ?? entry.geometry?.coordinates?.[1]);
        const lon = coordinate(p.lon ?? p.lng ?? p.longitude ?? p.LONGITUDE ?? entry.coordinates?.lon ?? entry.geometry?.coordinates?.[0]);
        if (typeof name !== 'string' || !name.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
        const fullName = typeof country === 'string' && country.trim() ? `${name.trim()}, ${country.trim()}` : name.trim();
        const key = JSON.stringify([fullName, lat, lon]);
        unique.set(key, { name: fullName, cityName: name.trim(), country: typeof country === 'string' ? country.trim() : '', coordinates: { lat, lon } });
    }
    return [...unique.values()];
}

export function selectCityPairs(cities, count = ROUND_COUNT, random = Math.random) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError('Round count must be positive.');
    // Enumerate once: no retry cap that can silently return an incomplete game.
    const candidates = [];
    const seen = new Set();
    for (let i = 0; i < cities.length; i++) {
        for (let j = i + 1; j < cities.length; j++) {
            const cityA = cities[i], cityB = cities[j];
            if (cityA.name === cityB.name) continue;
            const key = JSON.stringify([cityA.name, cityB.name].sort());
            if (seen.has(key)) continue;
            const distanceKm = Math.round(calculateDistance(cityA.coordinates.lat, cityA.coordinates.lon, cityB.coordinates.lat, cityB.coordinates.lon));
            if (!Number.isFinite(distanceKm) || distanceKm < 1) continue;
            seen.add(key);
            candidates.push({ cityA, cityB, distanceKm });
        }
    }
    if (candidates.length < count) throw new Error('Not enough valid city pairs for a full game.');
    for (let i = 0; i < count; i++) {
        const j = i + Math.floor(random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, count);
}

export async function fetchCityPairs(count = ROUND_COUNT) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch('cities.json', { signal: controller.signal });
        if (!response.ok) throw new Error(`City data request failed (${response.status}).`);
        return selectCityPairs(normalizeCities(await response.json()), count);
    } finally {
        clearTimeout(timeout);
    }
}

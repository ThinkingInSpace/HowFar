import { UNIT_FACTORS } from './game.js?v=live9';

export const ENDPOINT = 'https://georange-research.anrhodes.workers.dev/collect';
export const ORIGINS = ['https://thinkinginspace.github.io', 'https://tools.thinkinginspace.net'];
export const cityKey = city => `${city.coordinates.lat.toFixed(4)},${city.coordinates.lon.toFixed(4)}`;
const preference = 'georange-research-opt-out';

export function createResearch({ origin, storage, send = fetch } = {}) {
    let optedOut = false;
    try { optedOut = storage.getItem(preference) === 'true'; } catch { optedOut = true; }
    let eligible = false, completed = false;
    const rounds = new Set(), pending = new Set();
    const active = () => ORIGINS.includes(origin) && !optedOut;
    function record(event) {
        if (!eligible || !active()) return;
        const controller = new AbortController();
        pending.add(controller);
        Promise.resolve().then(() => send(ENDPOINT, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event),
            credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', keepalive: true,
            signal: controller.signal
        })).catch(() => {}).finally(() => pending.delete(controller));
    }
    return {
        get optedOut() { return optedOut; },
        get available() { return ORIGINS.includes(origin); },
        setOptOut(value) {
            optedOut = value;
            eligible = false;
            for (const controller of pending) controller.abort();
            try { storage.setItem(preference, String(value)); return true; } catch { return false; }
        },
        start(mode) {
            eligible = active(); completed = false; rounds.clear(); this.mode = mode;
            record({ type: 'start', mode });
        },
        round(index, round, result) {
            if (rounds.has(index)) return;
            rounds.add(index);
            const ratio = result.guess / (UNIT_FACTORS[result.unit].factor * round.distanceKm);
            const overflow = ratio > 11;
            record({ type: 'round', mode: this.mode, route: [cityKey(round.cityA), cityKey(round.cityB)].sort(),
                errorTenths: overflow ? 10000 : Math.round((ratio - 1) * 1000), overflow });
        },
        complete(score) {
            if (completed) return;
            completed = true; record({ type: 'complete', mode: this.mode, score });
        }
    };
}

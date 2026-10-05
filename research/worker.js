import { DurableObject } from 'cloudflare:workers';
import { cities } from './cities.js';

const origins = new Set(['https://thinkinginspace.github.io', 'https://tools.thinkinginspace.net']);
function validEvent(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event) || !['daily', 'practice'].includes(event.mode)) return false;
    const keys = Object.keys(event).sort().join(',');
    if (event.type === 'start') return keys === 'mode,type';
    if (event.type === 'complete') return keys === 'mode,score,type' && Number.isInteger(event.score) && event.score >= 0 && event.score <= 1000;
    return event.type === 'round' && keys === 'errorTenths,mode,overflow,route,type'
        && Array.isArray(event.route) && event.route.length === 2 && event.route.every(key => Object.hasOwn(cities, key))
        && event.route[0] < event.route[1] && Number.isInteger(event.errorTenths) && event.errorTenths >= -1000 && event.errorTenths <= 10000
        && typeof event.overflow === 'boolean' && (!event.overflow || event.errorTenths === 10000);
}

export class ResearchAggregates extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.sql = ctx.storage.sql;
        this.sql.exec(`CREATE TABLE IF NOT EXISTS totals (id INTEGER PRIMARY KEY CHECK(id=1), starts INTEGER NOT NULL DEFAULT 0, completions INTEGER NOT NULL DEFAULT 0, score_sum INTEGER NOT NULL DEFAULT 0);
            INSERT OR IGNORE INTO totals(id) VALUES(1);
            CREATE TABLE IF NOT EXISTS scores (bucket INTEGER PRIMARY KEY, count INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS routes (route TEXT PRIMARY KEY, city_a TEXT NOT NULL, city_b TEXT NOT NULL, answers INTEGER NOT NULL, overflow INTEGER NOT NULL, signed_tenths INTEGER NOT NULL, absolute_tenths INTEGER NOT NULL);
            CREATE VIEW IF NOT EXISTS route_report AS SELECT route,city_a,city_b,answers,overflow,
                signed_tenths / (10.0 * (answers-overflow)) AS mean_signed_error_percent,
                absolute_tenths / (10.0 * (answers-overflow)) AS mean_absolute_error_percent
                FROM routes WHERE answers-overflow >= 20;`);
    }
    record(event) {
        if (!validEvent(event)) throw new Error('Invalid aggregate');
        this.ctx.storage.transactionSync(() => {
            if (event.type === 'start') this.sql.exec('UPDATE totals SET starts=starts+1 WHERE id=1');
            if (event.type === 'complete') {
                this.sql.exec('UPDATE totals SET completions=completions+1,score_sum=score_sum+? WHERE id=1', event.score);
                this.sql.exec('INSERT INTO scores VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1', Math.min(9, Math.floor(event.score / 100)) * 100);
            }
            if (event.type === 'round') {
                const [a, b] = event.route, error = event.overflow ? 0 : event.errorTenths;
                this.sql.exec(`INSERT INTO routes VALUES(?,?,?,?,?,?,?) ON CONFLICT(route) DO UPDATE SET
                    answers=answers+1,overflow=overflow+excluded.overflow,signed_tenths=signed_tenths+excluded.signed_tenths,
                    absolute_tenths=absolute_tenths+excluded.absolute_tenths`, a + '|' + b, cities[a], cities[b], 1, Number(event.overflow), error, Math.abs(error));
            }
        });
    }
}

async function readEvent(request) {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Empty');
    const chunks = []; let length = 0;
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > 1024) { await reader.cancel(); throw new Error('Too large'); }
            chunks.push(value);
        }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url), origin = request.headers.get('Origin');
        const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
        const reply = status => new Response(null, { status, headers });
        if (url.pathname === '/health' && !url.search && request.method === 'GET') return reply(204);
        if (url.pathname !== '/collect' || url.search) return reply(404);
        if (!origins.has(origin)) return reply(403);
        headers['Access-Control-Allow-Origin'] = origin;
        if (request.method === 'OPTIONS') {
            headers['Access-Control-Allow-Methods'] = 'POST'; headers['Access-Control-Allow-Headers'] = 'Content-Type';
            return reply(204);
        }
        if (request.method !== 'POST') return reply(405);
        if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return reply(415);
        if (env.COLLECTION_LIMITER && !(await env.COLLECTION_LIMITER.limit({ key: 'aggregate-collection' })).success) return reply(429);
        let event;
        try { event = await readEvent(request); } catch { return reply(400); }
        if (!validEvent(event)) return reply(400);
        const month = new Date().toISOString().slice(0, 7);
        try { await env.AGGREGATES.getByName(`${env.DATASET}:${month}:${event.mode}`).record(event); }
        catch { return reply(503); }
        return reply(204);
    }
};

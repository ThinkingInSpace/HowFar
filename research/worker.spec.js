import { env } from 'cloudflare:workers';
import { SELF, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { cities } from './cities.js';

const origin = 'https://tools.thinkinginspace.net';
const route = Object.keys(cities).slice(0, 2).sort();
const post = (body, options = {}) => SELF.fetch('https://collector.test/collect', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
});
const object = () => env.AGGREGATES.getByName(`research-v1:${new Date().toISOString().slice(0,7)}:daily`);

describe('aggregate collector', () => {
    it('atomically counts concurrent events without retaining individual scores', async () => {
        await Promise.all(Array.from({length: 25}, () => post({type:'start',mode:'daily'})));
        await post({type:'complete',mode:'daily',score:1000});
        await post({type:'complete',mode:'daily',score:540});
        await post({type:'start',mode:'practice'});
        await runInDurableObject(object(), (_instance, state) => {
            expect(state.storage.sql.exec('SELECT * FROM totals').toArray()).toEqual([{id:1,starts:25,completions:2,score_sum:1540}]);
            expect(state.storage.sql.exec('SELECT * FROM scores ORDER BY bucket').toArray()).toEqual([{bucket:500,count:1},{bucket:900,count:1}]);
            expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf%' ORDER BY name").toArray().map(r=>r.name)).toEqual(['routes','scores','totals']);
        });
        await runInDurableObject(env.AGGREGATES.getByName(`research-v1:${new Date().toISOString().slice(0,7)}:practice`), (_instance,state) => {
            expect(state.storage.sql.exec('SELECT starts,completions FROM totals').one()).toEqual({starts:1,completions:0});
        });
    });
    it('sums signed and absolute route errors and excludes overflow from averages', async () => {
        for (let i=0; i<20; i++) expect((await post({type:'round',mode:'daily',route,errorTenths:i%2 ? -250 : 500,overflow:false})).status).toBe(204);
        await post({type:'round',mode:'daily',route,errorTenths:10000,overflow:true});
        await runInDurableObject(object(), (_instance,state) => {
            const row=state.storage.sql.exec('SELECT * FROM route_report').one();
            expect(row.answers).toBe(21); expect(row.overflow).toBe(1);
            expect(row.mean_signed_error_percent).toBe(12.5); expect(row.mean_absolute_error_percent).toBe(37.5);
        });
    });
    it('rejects identifiers, unknown routes, invalid values and oversized bodies', async () => {
        for (const event of [
            {type:'start',mode:'daily',playerId:'hidden'}, {type:'start',mode:'bad'},
            {type:'complete',mode:'daily',score:1001}, {type:'complete',mode:'daily',score:0.5},
            {type:'round',mode:'daily',route:['unknown','route'],errorTenths:0,overflow:false},
            {type:'round',mode:'daily',route,errorTenths:0,overflow:true}, 'x'.repeat(1025), '{invalid'
        ]) expect((await post(event)).status).toBe(400);
    });
    it('enforces origin, content type and method; never publishes statistics', async () => {
        expect((await post({type:'start',mode:'daily'},{headers:{Origin:'https://evil.test'}})).status).toBe(403);
        expect((await post({type:'start',mode:'daily'},{headers:{'Content-Type':'text/plain'}})).status).toBe(415);
        expect((await SELF.fetch('https://collector.test/collect',{headers:{Origin:origin}})).status).toBe(405);
        expect((await SELF.fetch('https://collector.test/report')).status).toBe(404);
        expect((await SELF.fetch('https://collector.test/collect?player=x',{method:'POST',headers:{Origin:origin}})).status).toBe(404);
        const preflight=await SELF.fetch('https://collector.test/collect',{method:'OPTIONS',headers:{Origin:origin}});
        expect(preflight.status).toBe(204); expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(preflight.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    });
});

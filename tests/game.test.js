import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Game, calculatePoints, parseGuess, UNIT_FACTORS } from '../game.js';
import { normalizeCities, selectCityPairs, calculateDistance, routeMidpoint, fetchCityPairs } from '../questions.js';

const rounds = Array.from({ length: 5 }, () => ({ distanceKm: 1000 }));

test('score is symmetric, bounded, and rejects invalid distances', () => {
    for (const [guess, score] of [[1000, 200], [900, 180], [1100, 180], [500, 100], [1500, 100], [0, 0], [5000, 0]]) assert.equal(calculatePoints(guess, 1000), score);
    for (const [a, b] of [[NaN, 100], [Infinity, 100], [10, 0], [10, NaN], [-1, 100]]) assert.throws(() => calculatePoints(a, b));
});
test('input validation rejects blank, partial, negative and non-finite values', () => {
    for (const input of ['', ' ', '12oops', '-1', '0', 'Infinity', '1e999']) assert.equal(parseGuess(input, 'km'), null);
    assert.equal(parseGuess('1', 'toString'), null);
    assert.equal(parseGuess('1', '__proto__'), null);
    assert.equal(parseGuess('1', 'unknown'), null);
    assert.equal(parseGuess('12.5', 'km').km, 12.5);
});
test('all units produce equivalent scores', () => {
    for (const [unit, { factor }] of Object.entries(UNIT_FACTORS)) {
        assert.equal(calculatePoints(parseGuess(String(900 * factor), unit).km, 1000), 180);
    }
});
test('late submissions expire even without timer callbacks; a round scores only once', () => {
    let now = 0;
    const game = new Game({ now: () => now });
    game.start(rounds);
    now = 14999;
    assert.equal(game.remaining, 1);
    now = 15000;
    assert.equal(game.submit('1000', 'km').timedOut, true);
    assert.equal(game.submit('1000', 'km'), null);
    assert.equal(game.score, 0);
    assert.equal(game.results.length, 1);
});
test('invalid guesses do not stop the round or change its deadline', () => {
    let now = 0;
    const game = new Game({ now: () => now });
    game.start(rounds);
    now = 9000;
    assert.equal(game.submit('', 'km'), null);
    assert.equal(game.phase, 'guessing');
    assert.equal(game.remaining, 6);
    assert.equal(game.submit('1000', 'km').points, 200);
});
test('five-round game, repeated next, summary, and restart have consistent state', () => {
    const game = new Game({ now: () => 0 });
    game.start(rounds);
    assert.equal(game.next(), false);
    for (let i = 0; i < 5; i++) {
        assert.equal(game.index, i);
        assert.equal(game.submit('1000', 'km').points, 200);
        assert.equal(game.submit('1000', 'km'), null);
        assert.equal(game.next(), true);
        assert.equal(game.next(), false);
    }
    assert.equal(game.phase, 'summary');
    assert.equal(game.score, 1000);
    game.start(rounds);
    assert.equal(game.score, 0);
    assert.equal(game.index, 0);
    assert.equal(game.phase, 'guessing');
    assert.throws(() => game.start(rounds.slice(1)));
});
test('known great-circle distances and antipodal numerical stability', () => {
    assert.equal(calculateDistance(0, 0, 0, 0), 0);
    assert.ok(Math.abs(calculateDistance(0, 0, 0, 90) - 10007.543) < 0.001);
    assert.ok(Math.abs(calculateDistance(51.5074, -0.1278, 40.7128, -74.006) - 5570.2) < 1);
    assert.ok(Math.abs(calculateDistance(0, 0, 0, 180) - Math.PI * 6371) < 1e-8);
});
test('camera midpoint respects the date line, poles, and antipodes', () => {
    const dateLine = routeMidpoint({ lat: 0, lon: 170 }, { lat: 0, lon: -170 });
    assert.ok(Math.abs(Math.abs(dateLine.lng) - 180) < 1e-8);
    const polar = routeMidpoint({ lat: 80, lon: 0 }, { lat: 80, lon: 180 });
    assert.ok(Math.abs(polar.lat - 90) < 1e-8);
    const antipodes = routeMidpoint({ lat: 0, lon: 0 }, { lat: 0, lon: 180 });
    assert.ok(Number.isFinite(antipodes.lat) && Number.isFinite(antipodes.lng));
});
test('city validation handles malformed data, duplicates and GeoJSON', () => {
    const valid = { name: 'A', latitude: 0, longitude: 0 };
    const records = [null, {}, valid, valid, { name: 'B', lat: '12x', lon: 0 }, { name: 'C', lat: 91, lon: 0 }, { name: 'D', lat: 0, lon: Infinity }, { name: 'E', lat: '', lon: 0 }, { name: 'F', lat: false, lon: 0 }];
    assert.equal(normalizeCities(records).length, 1);
    assert.throws(() => normalizeCities(null));
    assert.equal(normalizeCities({ features: [{ properties: { name: 'City', country: 'Country' }, geometry: { coordinates: [20, 10] } }] })[0].name, 'City, Country');
});
test('routes are unique, nonzero and always a complete game', async () => {
    const raw = JSON.parse(await readFile(new URL('../cities.json', import.meta.url), 'utf8'));
    const cities = normalizeCities(raw);
    assert.equal(cities.length, 243);
    const pairs = selectCityPairs(cities, 5, () => 0);
    assert.equal(pairs.length, 5);
    assert.equal(new Set(pairs.map(p => [p.cityA.name, p.cityB.name].sort().join('|'))).size, 5);
    assert.ok(pairs.every(p => p.distanceKm > 0 && p.distanceKm <= 20016));
    assert.throws(() => selectCityPairs(cities.slice(0, 2)));
    assert.throws(() => selectCityPairs(normalizeCities([{ name: 'A', lat: 0, lon: 0 }, { name: 'B', lat: 0, lon: 0 }]), 1));
});
test('loader propagates HTTP, JSON and insufficient-data failures for the retry UI', async () => {
    const original = globalThis.fetch;
    try {
        globalThis.fetch = async () => ({ ok: false, status: 503 });
        await assert.rejects(fetchCityPairs(), /503/);
        globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } });
        await assert.rejects(fetchCityPairs(), /Invalid JSON/);
        globalThis.fetch = async () => ({ ok: true, json: async () => [] });
        await assert.rejects(fetchCityPairs(), /Not enough/);
    } finally { globalThis.fetch = original; }
});

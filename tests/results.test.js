import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, UNIT_FACTORS } from '../game.js';
import { describeResult, formatChallengeDate, formatSignedError, shareText, scoreTier } from '../results.js';

test('reveal describes equivalent guesses correctly in every chosen unit', () => {
    for (const [unit, info] of Object.entries(UNIT_FACTORS)) {
        const detail = describeResult({ distanceKm: 1000 }, { unit, guess: 900 * info.factor, points: 180 });
        assert.match(detail.explanation, /10\.0% below/);
        assert.equal(detail.errorLabel, '-10%');
        assert.equal(detail.unit, info.label);
        const exact = describeResult({ distanceKm: 1000 }, { unit, guess: 1000 * info.factor, points: 200 });
        assert.match(exact.explanation, /perfect 200/);
    }
});
test('signed errors distinguish long and short guesses', () => {
    assert.equal(formatSignedError(35), '+35%');
    assert.equal(formatSignedError(-12), '-12%');
    assert.equal(formatSignedError(0), '0%');
    assert.equal(formatSignedError(0.26), '+0.3%');
    assert.equal(formatChallengeDate('2026-09-21'), 'Sep 21, 2026');
    assert.throws(() => formatSignedError(Infinity));
});
test('very large estimates and almost exact guesses have readable feedback', () => {
    const huge = describeResult({ distanceKm: 1 }, { unit: 'km', guess: 1e300, points: 0 });
    assert.match(huge.explanation, /over 1,000% above/);
    const close = describeResult({ distanceKm: 1000 }, { unit: 'km', guess: 1000.01, points: 200 });
    assert.match(close.explanation, /Less than 0.1% over/);
});
test('share output uses the actual five-round score', () => {
    const game = new Game();
    game.start(Array.from({ length: 5 }, () => ({ distanceKm: 1000 })), '2026-09-21');
    for (let i = 0; i < 5; i++) {
        game.submit(i === 2 ? '500' : '1000', 'km');
        game.next();
    }
    assert.equal(game.score, 900);
    assert.match(shareText(game), /Score: 900\/1000/);
    const shared = shareText(game);
    assert.match(shared, /GeoRange — Sep 21, 2026/);
    assert.match(shared, /🟩 0%\n🟩 0%\n🟨 -50%\n🟩 0%\n🟩 0%/);
    assert.match(shared, /https:\/\/thinkinginspace\.github\.io\/HowFar\/$/);
    assert.equal(scoreTier(185).className, 'tier-excellent');
    assert.equal(scoreTier(184).className, 'tier-great');
});

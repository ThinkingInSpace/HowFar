import { MAX_POINTS, ROUND_COUNT, UNIT_FACTORS } from './game.js?v=live3';

export function scoreTier(points) {
    if (points >= 185) return { className: 'tier-excellent', emoji: '🟩', heading: 'Beautifully close.' };
    if (points >= 150) return { className: 'tier-great', emoji: '🟦', heading: 'Great instincts.' };
    if (points >= 100) return { className: 'tier-good', emoji: '🟨', heading: 'Good instincts.' };
    if (points >= 40) return { className: 'tier-learning', emoji: '🟧', heading: 'A little off course.' };
    return { className: 'tier-exploring', emoji: '🟥', heading: 'A new perspective.' };
}

export function describeResult(round, result) {
    const unit = UNIT_FACTORS[result.unit];
    const actual = Math.round(round.distanceKm * unit.factor).toLocaleString();
    const guessKm = result.guess / unit.factor;
    const difference = guessKm - round.distanceKm;
    const errorPercent = Math.abs(difference) / round.distanceKm * 100;
    const error = errorPercent >= 1000 ? 'over 1,000%' : `${errorPercent.toFixed(1)}%`;
    let explanation;
    if (Math.abs(difference) < 1e-8) explanation = 'Right on the mark. A perfect 200 points!';
    else if (errorPercent < 0.05) explanation = `Less than 0.1% ${difference > 0 ? 'over' : 'under'} the actual distance. Remarkably close!`;
    else explanation = `Your guess was ${error} ${difference > 0 ? 'above' : 'below'} the actual distance.`;
    return { actual, unit: unit.label, guess: `${result.guess.toLocaleString()} ${unit.label}`, heading: scoreTier(result.points).heading, explanation };
}

export function shareText(game) {
    return `🌍 GeoRange\nTwo cities. One guess. How far?\nScore: ${game.score}/${ROUND_COUNT * MAX_POINTS}\n${game.results.map(r => scoreTier(r.points).emoji).join('')}`;
}

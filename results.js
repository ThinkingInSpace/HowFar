import { MAX_POINTS, ROUND_COUNT, UNIT_FACTORS } from './game.js?v=live6';

export const GAME_URL = 'https://thinkinginspace.github.io/HowFar/';

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
    return { actual, unit: unit.label, guess: `${result.guess.toLocaleString()} ${unit.label}`, heading: scoreTier(result.points).heading, explanation, errorLabel: formatSignedError(difference / round.distanceKm * 100) };
}

export function formatSignedError(percent) {
    if (!Number.isFinite(percent)) throw new RangeError('Error percentage must be finite.');
    if (Math.abs(percent) < 1e-10) return '0%';
    const magnitude = Math.abs(percent);
    const number = magnitude < 10 ? magnitude.toFixed(1).replace(/\.0$/, '') : Math.round(magnitude).toLocaleString('en-US');
    return `${percent > 0 ? '+' : '-'}${number}%`;
}

export function formatChallengeDate(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || '')) return 'Daily challenge';
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, day)));
}

export function shareText(game, url = GAME_URL) {
    const rounds = game.results.map((result, index) => {
        const detail = describeResult(game.rounds[index], result);
        return `${scoreTier(result.points).emoji} ${detail.errorLabel}`;
    }).join('\n');
    return `🌍 GeoRange — ${formatChallengeDate(game.challengeDate)}\nScore: ${game.score}/${ROUND_COUNT * MAX_POINTS}\n${rounds}\n${url}`;
}

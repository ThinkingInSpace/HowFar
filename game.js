// Pure game rules, independent of the page and globe renderer.
export const ROUND_COUNT = 5;
export const MAX_POINTS = 200;
export const UNIT_FACTORS = Object.freeze({
    km: { factor: 1, label: 'km' },
    miles: { factor: 1 / 1.609344, label: 'mi' },
    nm: { factor: 1 / 1.852, label: 'NM' }
});

export function calculatePoints(guessKm, actualKm) {
    if (!Number.isFinite(guessKm) || guessKm < 0 || !Number.isFinite(actualKm) || actualKm <= 0) {
        throw new RangeError('Distances must be finite; actual distance must be positive.');
    }
    return Math.max(0, Math.min(MAX_POINTS, Math.round(MAX_POINTS * (1 - Math.abs(guessKm - actualKm) / actualKm))));
}

export function parseGuess(value, unit) {
    const text = String(value).trim();
    if (!Object.hasOwn(UNIT_FACTORS, unit) || !/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(text)) return null;
    const amount = Number(text);
    const km = amount / UNIT_FACTORS[unit].factor;
    return Number.isFinite(km) && amount > 0 ? { amount, km } : null;
}

export class Game {
    constructor() {
        this.phase = 'idle';
        this.rounds = [];
        this.results = [];
        this.index = 0;
        this.challengeDate = null;
    }
    start(rounds, challengeDate = null) {
        if (rounds.length !== ROUND_COUNT || rounds.some(r => !Number.isFinite(r.distanceKm) || r.distanceKm <= 0)) {
            throw new Error(`A game requires ${ROUND_COUNT} valid routes.`);
        }
        if (challengeDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(challengeDate)) {
            throw new Error('Challenge date must use YYYY-MM-DD.');
        }
        this.rounds = rounds;
        this.results = [];
        this.index = 0;
        this.challengeDate = challengeDate;
        this.beginRound();
    }
    beginRound() {
        this.phase = 'guessing';
    }
    get round() { return this.rounds[this.index]; }
    get score() { return this.results.reduce((sum, r) => sum + r.points, 0); }
    submit(value, unit) {
        if (this.phase !== 'guessing') return null;
        const guess = parseGuess(value, unit);
        if (!guess) return null;
        const result = {
            guess: guess.amount,
            unit,
            points: calculatePoints(guess.km, this.round.distanceKm)
        };
        this.results.push(result);
        this.phase = 'result';
        return result;
    }
    next() {
        if (this.phase !== 'result') return false;
        this.index++;
        if (this.index === this.rounds.length) this.phase = 'summary';
        else this.beginRound();
        return true;
    }
}

import { Game, ROUND_COUNT, UNIT_FACTORS } from './game.js?v=live6';
import { challengeDateKey, fetchCityPairs } from './questions.js?v=live6';
import { GlobeView } from './globe.js?v=live6';
import { describeResult, formatChallengeDate, scoreTier, shareText } from './results.js?v=live6';

const $ = id => document.getElementById(id);
const game = new Game();
const globe = new GlobeView($('globeViz'), $('globe-status'));
let loading = false;
let gameId = 0;
let selectedUnit = 'km';

function showScreen(name) {
    globe.hide();
    document.querySelectorAll('.screen').forEach(section => { section.hidden = section.id !== name; });
    document.body.dataset.screen = name;
    window.scrollTo({ top: 0, behavior: 'instant' });
    $(name).querySelector('h1')?.focus({ preventScroll: true });
}
function updateUnit() {
    $('unit').value = selectedUnit;
    $('welcome-unit').value = selectedUnit;
    $('unit-label').textContent = UNIT_FACTORS[selectedUnit].label;
}
function renderRound() {
    showScreen('guess');
    const { cityA, cityB } = game.round;
    $('round-label').textContent = `DAILY / ROUND ${String(game.index + 1).padStart(2, '0')} OF 05`;
    $('current-score').textContent = game.score;
    $('round-dots').replaceChildren();
    $('round-dots').setAttribute('aria-label', `Round ${game.index + 1} of ${ROUND_COUNT}`);
    for (let i = 0; i < ROUND_COUNT; i++) {
        const dot = document.createElement(i <= game.index ? 'b' : 'i');
        $('round-dots').append(dot);
    }
    $('city-a').textContent = cityA.cityName;
    $('city-b').textContent = cityB.cityName;
    $('country-a').textContent = `FROM${cityA.country ? ` / ${cityA.country}` : ''}`;
    $('country-b').textContent = `TO${cityB.country ? ` / ${cityB.country}` : ''}`;
    $('distance').value = '';
    $('distance').removeAttribute('aria-invalid');
    $('guess-error').textContent = '';
    $('submit-btn').disabled = false;
    $('distance').disabled = false;
    $('unit').disabled = false;
    updateUnit();
    // Avoid opening a phone keyboard before the player has seen the cities.
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) $('distance').focus({ preventScroll: true });
}
async function startGame() {
    if (loading || !['idle', 'summary', 'error'].includes(game.phase)) return;
    loading = true;
    gameId++;
    game.phase = 'loading';
    showScreen('welcome');
    $('load-status').textContent = 'Finding your next five connections…';
    $('start-btn').disabled = true;
    $('welcome-unit').disabled = true;
    $('retry-btn').hidden = true;
    $('share-status').textContent = '';
    $('share-fallback').hidden = true;
    $('share-fallback').value = '';
    try {
        const challengeDate = challengeDateKey();
        const rounds = await fetchCityPairs(ROUND_COUNT, challengeDate);
        game.start(rounds, challengeDate);
        $('load-status').textContent = '';
        if ($('help').open) $('help').close();
        renderRound();
    } catch (error) {
        game.phase = 'error';
        $('load-status').textContent = 'We couldn’t load your cities. Please try again.';
        $('retry-btn').hidden = false;
        $('retry-btn').focus();
        console.warn('Game setup failed:', error.message);
    } finally {
        loading = false;
        $('start-btn').disabled = false;
        $('welcome-unit').disabled = false;
    }
}
function coordinates(city) {
    const { lat, lon } = city.coordinates;
    return `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'} · ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}`;
}
function submitGuess() {
    const result = game.submit($('distance').value, selectedUnit);
    if (!result) {
        if (game.phase === 'guessing') {
            $('guess-error').textContent = 'Enter a distance greater than zero, using digits and a decimal point.';
            $('distance').setAttribute('aria-invalid', 'true');
            $('distance').focus();
        }
        return;
    }
    $('distance').blur();
    $('submit-btn').disabled = true;
    $('distance').disabled = true;
    $('unit').disabled = true;
    if ($('help').open) $('help').close();
    const description = describeResult(game.round, result);
    $('reveal-round').textContent = `THE REVEAL / ROUND ${String(game.index + 1).padStart(2, '0')} OF 05`;
    $('reveal-total').textContent = game.score;
    $('route-breadcrumb').textContent = `${game.round.cityA.name} ↗ ${game.round.cityB.name}`;
    $('feedback').textContent = description.heading;
    $('error-copy').textContent = description.explanation;
    $('guess-value').textContent = description.guess;
    $('actual').replaceChildren(document.createTextNode(`${description.actual} `));
    const unitLabel = document.createElement('small');
    unitLabel.textContent = description.unit;
    $('actual').append(unitLabel);
    $('points').textContent = result.points;
    $('coordinates-a').textContent = coordinates(game.round.cityA);
    $('coordinates-b').textContent = coordinates(game.round.cityB);
    $('next-label').textContent = game.index === ROUND_COUNT - 1 ? 'See my results' : 'Next round';
    $('next-btn').disabled = false;
    showScreen('reveal');
    void globe.draw(game.round.cityA, game.round.cityB);
}
function showResults() {
    $('final-score').textContent = game.score.toLocaleString();
    $('results-heading').textContent = game.score >= 500 ? 'A world well guessed.' : 'A little more worldly.';
    $('score-rank').textContent = game.score >= 900 ? 'EXCEPTIONAL INSTINCTS' : game.score >= 750 ? 'EXCELLENT EXPLORING' : game.score >= 500 ? 'FINDING YOUR RANGE' : 'KEEP EXPLORING';
    $('round-recap').replaceChildren();
    $('score-grid').replaceChildren();
    $('score-grid').setAttribute('aria-label', 'Points and percentage error in each round');
    $('results-date').textContent = `GEORANGE / DAILY / ${formatChallengeDate(game.challengeDate).toUpperCase()}`;
    game.results.forEach((result, index) => {
        const round = game.rounds[index];
        const description = describeResult(round, result);
        const tile = document.createElement('span');
        tile.className = scoreTier(result.points).className;
        const tileScore = document.createElement('strong');
        tileScore.textContent = result.points;
        const tileError = document.createElement('small');
        tileError.textContent = description.errorLabel;
        tile.append(tileScore, tileError);
        tile.setAttribute('aria-label', `Round ${index + 1}: ${result.points} points, ${description.errorLabel} error`);
        $('score-grid').append(tile);
        const item = document.createElement('li');
        const number = document.createElement('span');
        number.textContent = String(index + 1).padStart(2, '0');
        const route = document.createElement('div');
        route.className = 'journal-route';
        const names = document.createElement('p');
        names.textContent = `${round.cityA.name} ↗ ${round.cityB.name}`;
        const detail = document.createElement('span');
        detail.className = 'journal-detail';
        detail.textContent = `Guessed ${description.guess} · Actual ${description.actual} ${description.unit} · Error ${description.errorLabel}`;
        route.append(names, detail);
        const score = document.createElement('strong');
        score.textContent = `${result.points} pts`;
        item.append(number, route, score);
        $('round-recap').append(item);
    });
    showScreen('results');
}
$('start-btn').addEventListener('click', startGame);
$('retry-btn').addEventListener('click', startGame);
$('play-again-btn').addEventListener('click', startGame);
$('guess-form').addEventListener('submit', event => { event.preventDefault(); submitGuess(); });
$('next-btn').addEventListener('click', () => {
    if (!game.next()) return;
    $('next-btn').disabled = true;
    if (game.phase === 'summary') showResults();
    else renderRound();
});
for (const id of ['unit', 'welcome-unit']) {
    $(id).addEventListener('change', () => { selectedUnit = $(id).value; updateUnit(); });
}
$('distance').addEventListener('focus', () => {
    if (matchMedia('(pointer: coarse)').matches) $('guess-form').scrollIntoView({ block: 'nearest' });
});
window.visualViewport?.addEventListener('resize', () => {
    if (game.phase === 'guessing' && document.activeElement === $('distance')) {
        requestAnimationFrame(() => {
            if (game.phase === 'guessing' && document.activeElement === $('distance')) $('guess-form').scrollIntoView({ block: 'nearest' });
        });
    }
});
$('help-button').addEventListener('click', () => $('help').showModal());
$('help').querySelector('.close').addEventListener('click', () => $('help').close());
$('help-done').addEventListener('click', () => $('help').close());
$('share-btn').addEventListener('click', async () => {
    if (game.phase !== 'summary') return;
    const sharingGame = gameId;
    const text = shareText(game);
    try {
        await navigator.clipboard.writeText(text);
        if (game.phase === 'summary' && sharingGame === gameId) $('share-status').textContent = 'Score copied. Share a little friendly competition.';
    } catch {
        if (game.phase !== 'summary' || sharingGame !== gameId) return;
        $('share-status').textContent = 'Copy your score from the box below.';
        $('share-fallback').hidden = false;
        $('share-fallback').value = text;
        $('share-fallback').focus();
        $('share-fallback').select();
    }
});
document.addEventListener('visibilitychange', () => globe.syncVisibility());
window.addEventListener('pagehide', () => globe.hide());
window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (game.phase === 'result') void globe.draw(game.round.cityA, game.round.cityB);
});
document.body.dataset.screen = 'welcome';

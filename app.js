import { Game, ROUND_COUNT, ROUND_SECONDS, MAX_POINTS, UNIT_FACTORS } from './game.js';
import { fetchCityPairs } from './questions.js';
import { GlobeView } from './globe.js';

const $ = id => document.getElementById(id);
const game = new Game();
const globe = new GlobeView($('globeViz'), $('globe-status'));
let timerInterval = null;
let loading = false;

function getFeedbackMessage(points) {
    if (points >= 185) return '🎯 Bullseye! Incredible accuracy!';
    if (points >= 150) return '🌟 Great work! You really know your geography.';
    if (points >= 100) return '👍 Good guess! Solid effort.';
    if (points >= 40) return '✈️ A little off course. Try the next route!';
    return '🌍 A new distance to remember. Keep exploring!';
}
function getEmojiForPoints(points) {
    if (points >= 185) return '🟩';
    if (points >= 150) return '🟦';
    if (points >= 100) return '🟨';
    if (points >= 40) return '🟧';
    return '🟥';
}
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}
function tick() {
    if (game.phase !== 'guessing') return;
    $('timer-display').textContent = game.remaining;
    if (!game.remaining) submitGuess();
}
function renderRound() {
    globe.hide();
    $('question-section').classList.remove('hidden');
    $('result-section').classList.add('hidden');
    $('summary-section').classList.add('hidden');
    $('current-round').textContent = game.index + 1;
    $('location-text').textContent = `${game.round.cityA.name} to ${game.round.cityB.name}`;
    $('guess-input').value = '';
    $('guess-input').removeAttribute('aria-invalid');
    $('input-error').textContent = '';
    $('submit-btn').disabled = false;
    $('guess-input').disabled = false;
    $('unit-select').disabled = false;
    $('next-btn').disabled = true;
    $('timer-container').classList.remove('hidden');
    $('timer-display').textContent = ROUND_SECONDS;
    stopTimer();
    timerInterval = setInterval(tick, 100);
    $('guess-input').focus();
}
async function initGame() {
    if (loading) return;
    loading = true;
    stopTimer();
    globe.hide();
    game.phase = 'loading';
    $('load-status').textContent = 'Loading cities…';
    $('retry-btn').classList.add('hidden');
    $('question-section').classList.add('hidden');
    $('result-section').classList.add('hidden');
    $('summary-section').classList.add('hidden');
    $('timer-container').classList.add('hidden');
    $('current-score').textContent = '0';
    $('current-round').textContent = '1';
    $('share-status').textContent = '';
    $('share-fallback').classList.add('hidden');
    try {
        game.start(await fetchCityPairs());
        $('load-status').textContent = '';
        renderRound();
    } catch (error) {
        game.phase = 'error';
        $('load-status').textContent = 'We couldn’t load a complete game. Please try again.';
        $('retry-btn').classList.remove('hidden');
        $('retry-btn').focus();
        console.warn('Game setup failed:', error.message);
    } finally {
        loading = false;
    }
}
function submitGuess() {
    const result = game.submit($('guess-input').value, $('unit-select').value);
    if (!result) {
        if (game.phase === 'guessing') {
            $('input-error').textContent = 'Enter a distance greater than zero.';
            $('guess-input').setAttribute('aria-invalid', 'true');
            $('guess-input').focus();
        }
        return;
    }
    stopTimer();
    $('submit-btn').disabled = true;
    $('next-btn').disabled = false;
    $('guess-input').disabled = true;
    $('unit-select').disabled = true;
    const unit = UNIT_FACTORS[result.unit];
    $('user-guess').textContent = result.timedOut ? 'Time expired' : `${result.guess.toLocaleString()} ${unit.label}`;
    $('result-feedback').textContent = result.timedOut ? '⏰ Time’s up!' : getFeedbackMessage(result.points);
    $('actual-distance').textContent = `${Math.round(game.round.distanceKm * unit.factor).toLocaleString()} ${unit.label}`;
    $('round-points').textContent = result.points;
    $('current-score').textContent = game.score;
    $('question-section').classList.add('hidden');
    $('timer-container').classList.add('hidden');
    $('result-section').classList.remove('hidden');
    $('next-btn').textContent = game.index === ROUND_COUNT - 1 ? 'See Results' : 'Next Round';
    $('result-feedback').focus();
    void globe.draw(game.round.cityA, game.round.cityB);
}
function showSummary() {
    stopTimer();
    globe.hide();
    $('question-section').classList.add('hidden');
    $('result-section').classList.add('hidden');
    $('summary-section').classList.remove('hidden');
    $('final-score').textContent = game.score;
    $('emoji-grid').textContent = game.results.map(r => getEmojiForPoints(r.points)).join(' ');
    $('round-recap').textContent = game.results.map((r, i) => `Round ${i + 1}: ${r.points} points${r.timedOut ? ' (time expired)' : ''}`).join('. ');
    $('summary-heading').focus();
}
$('guess-form').addEventListener('submit', event => {
    event.preventDefault();
    submitGuess();
});
$('next-btn').addEventListener('click', () => {
    if (!game.next()) return;
    $('next-btn').disabled = true;
    if (game.phase === 'summary') showSummary();
    else renderRound();
});
$('play-again-btn').addEventListener('click', initGame);
$('retry-btn').addEventListener('click', initGame);
$('share-btn').addEventListener('click', async () => {
    if (game.phase !== 'summary') return;
    const text = `🌍 Great Circle Guesser\nScore: ${game.score}/${ROUND_COUNT * MAX_POINTS}\n${game.results.map(r => getEmojiForPoints(r.points)).join('')}`;
    try {
        await navigator.clipboard.writeText(text);
        if (game.phase === 'summary') $('share-status').textContent = 'Results copied!';
    } catch {
        if (game.phase !== 'summary') return;
        $('share-status').textContent = 'Copy your results from the box below.';
        $('share-fallback').classList.remove('hidden');
        $('share-text').value = text;
        $('share-text').focus();
        $('share-text').select();
    }
});
document.addEventListener('visibilitychange', () => {
    tick();
    globe.syncVisibility();
});
window.addEventListener('pagehide', () => { stopTimer(); globe.hide(); });
window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    tick();
    if (game.phase === 'guessing') timerInterval = setInterval(tick, 100);
    if (game.phase === 'result') void globe.draw(game.round.cityA, game.round.cityB);
});
void initGame();

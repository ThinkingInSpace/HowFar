import { calculatePoints, parseGuess, UNIT_FACTORS } from '../game.js';
import { calculateDistance } from '../questions.js';
import { GlobeView } from '../globe.js';

const $ = id => document.getElementById(id);
const a = { name: 'Lisbon, Portugal', coordinates: { lat: 38.7223, lon: -9.1393 } };
const b = { name: 'Tokyo, Japan', coordinates: { lat: 35.6762, lon: 139.6503 } };
const distance = Math.round(calculateDistance(a.coordinates.lat, a.coordinates.lon, b.coordinates.lat, b.coordinates.lon));
const globe = new GlobeView($('globeViz'), $('globe-status'));
let screen = 'welcome';

function showScreen(name, focus = true) {
    if (!['welcome', 'guess', 'reveal', 'results'].includes(name)) return;
    globe.hide();
    screen = name;
    document.querySelectorAll('.screen').forEach(el => { el.hidden = el.id !== name; });
    document.querySelectorAll('[data-screen]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.screen === name)));
    if (name === 'reveal') void globe.draw(a, b).then(() => {
        if (globe.instance && screen === 'reveal') globe.instance.backgroundColor('#071f25').height($('globeViz').clientHeight);
    });
    if (name === 'guess') {
        $('distance').value = '';
        $('guess-error').textContent = '';
        $('distance').removeAttribute('aria-invalid');
    }
    if (focus) {
        $(name).querySelector('h1')?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}
function updateResult(value, unit) {
    const guess = parseGuess(value, unit);
    if (!guess) return false;
    const points = calculatePoints(guess.km, distance);
    const error = Math.abs(guess.km - distance) / distance * 100;
    $('feedback').textContent = points >= 180 ? 'Beautifully close.' : points >= 100 ? 'Good instincts.' : 'A new perspective.';
    $('error-copy').textContent = `Your guess was ${error.toFixed(1)}% ${guess.km > distance ? 'over' : 'under'} the actual distance. ${points >= 150 ? 'That’s a well-travelled instinct.' : 'One more distance to add to your world.'}`;
    $('actual').replaceChildren(document.createTextNode(Math.round(distance * UNIT_FACTORS[unit].factor).toLocaleString() + ' '));
    const label = document.createElement('small'); label.textContent = UNIT_FACTORS[unit].label; $('actual').append(label);
    $('guess-value').textContent = `${guess.amount.toLocaleString()} ${UNIT_FACTORS[unit].label}`;
    $('points').textContent = points;
    $('reveal-score-small').textContent = points;
    return true;
}
document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.screen)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.go)));
$('preview-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!updateResult($('distance').value, $('unit').value)) {
        $('guess-error').textContent = 'Enter a distance greater than zero.';
        $('distance').setAttribute('aria-invalid', 'true');
        $('distance').focus();
        return;
    }
    showScreen('reveal');
});
$('unit').addEventListener('change', () => { $('unit-label').textContent = UNIT_FACTORS[$('unit').value].label; });
$('help-button').addEventListener('click', () => $('help').showModal());
$('help').querySelector('.close').addEventListener('click', () => $('help').close());
$('help-done').addEventListener('click', () => $('help').close());
$('share').addEventListener('click', async () => {
    const text = 'GeoRange — Sample game\nTwo cities. One guess. How far?\n842 / 1,000\n180 · 152 · 200 · 128 · 182';
    try {
        await navigator.clipboard.writeText(text);
        $('share-status').textContent = 'Sample score copied. The world is better with a little competition.';
    } catch {
        $('share-status').textContent = 'Copy the sample score below.';
        $('share-fallback').hidden = false;
        $('share-fallback').value = text;
        $('share-fallback').focus();
        $('share-fallback').select();
    }
});
document.addEventListener('visibilitychange', () => globe.syncVisibility());
window.addEventListener('pagehide', () => globe.hide());
window.addEventListener('pageshow', event => { if (event.persisted && screen === 'reveal') void globe.draw(a, b); });
updateResult('10000', 'km');
showScreen('welcome', false);

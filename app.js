let gameRounds = [];
let currentRound = 0;
let totalScore = 0;
let roundScores = [];
let globeInstance = null;
let timerInterval = null;
let timeLeft = 15;

const UNIT_FACTORS = {
    km: { factor: 1, label: 'km' },
    miles: { factor: 0.621371, label: 'mi' },
    nm: { factor: 0.539957, label: 'NM' }
};

function getFeedbackMessage(points) {
    if (points >= 185) return "🎯 Bullseye! Incredible accuracy!";
    if (points >= 150) return "🌟 Great work! You really know your geography.";
    if (points >= 100) return "👍 Good guess! Solid effort.";
    if (points >= 40)  return "✈️ A bit off course, but not terrible!";
    return "🌍 Not even close! Way off target.";
}

function getEmojiForPoints(points) {
    if (points >= 185) return "🟩";
    if (points >= 140) return "🟦";
    if (points >= 80)  return "🟨";
    if (points >= 30)  return "🟧";
    return "🟥";
}

async function initGame() {
    gameRounds = await fetchCityPairs(5);
    
    if (!gameRounds || gameRounds.length === 0) {
        const locationElem = document.getElementById('location-text');
        if (locationElem) locationElem.textContent = "Failed to load cities. Check console.";
        return;
    }

    currentRound = 0;
    totalScore = 0;
    roundScores = [];
    document.getElementById('current-score').textContent = totalScore;
    document.getElementById('summary-section').classList.add('hidden');
    renderRound();
}

function startTimer() {
    stopTimer();
    timeLeft = 15;
    document.getElementById('timer-display').textContent = timeLeft;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-display').textContent = timeLeft;
        if (timeLeft <= 0) {
            stopTimer();
            processGuess(0, true);
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

function renderRound() {
    if (currentRound >= gameRounds.length) {
        showSummary();
        return;
    }

    const round = gameRounds[currentRound];
    document.getElementById('current-round').textContent = currentRound + 1;
    document.getElementById('location-text').textContent = `${round.cityA.name} to ${round.cityB.name}`;
    document.getElementById('guess-input').value = '';

    document.getElementById('question-section').classList.remove('hidden');
    document.getElementById('result-section').classList.add('hidden');

    startTimer();
}

function calculatePoints(guessKm, actualKm) {
    const errorRatio = Math.abs(guessKm - actualKm) / actualKm;
    return Math.max(0, Math.round(200 * (1 - errorRatio)));
}

function processGuess(guessInput, isTimeout = false) {
    stopTimer();
    const selectedUnit = document.getElementById('unit-select').value;
    const unitInfo = UNIT_FACTORS[selectedUnit];
    const round = gameRounds[currentRound];

    let points = 0;
    let actualInSelectedUnit = Math.round(round.distanceKm * unitInfo.factor);

    if (isTimeout) {
        points = 0;
        document.getElementById('user-guess').textContent = "Time Expired!";
        document.getElementById('result-feedback').textContent = "⏰ Time's up!";
    } else {
        const guessInKm = guessInput / unitInfo.factor;
        points = calculatePoints(guessInKm, round.distanceKm);
        document.getElementById('user-guess').textContent = `${guessInput.toLocaleString()} ${unitInfo.label}`;
        document.getElementById('result-feedback').textContent = getFeedbackMessage(points);
    }

    totalScore += points;
    roundScores.push(points);

    document.getElementById('current-score').textContent = totalScore;
    document.getElementById('actual-distance').textContent = `${actualInSelectedUnit.toLocaleString()} ${unitInfo.label}`;
    document.getElementById('round-points').textContent = points;

    document.getElementById('question-section').classList.add('hidden');
    document.getElementById('result-section').classList.remove('hidden');

    drawGlobe(round.cityA, round.cityB);
}

// Event Listeners
document.getElementById('submit-btn').addEventListener('click', () => {
    const guessInput = parseFloat(document.getElementById('guess-input').value);
    if (isNaN(guessInput) || guessInput <= 0) return;
    processGuess(guessInput, false);
});

document.getElementById('next-btn').addEventListener('click', () => {
    currentRound++;
    renderRound();
});

document.getElementById('play-again-btn')?.addEventListener('click', () => {
    initGame();
});

document.getElementById('share-btn')?.addEventListener('click', () => {
    const emojiStr = roundScores.map(getEmojiForPoints).join('');
    const shareText = `🌍 Great Circle Guesser\nScore: ${totalScore}/1000\n${emojiStr}`;
    navigator.clipboard.writeText(shareText).then(() => {
        alert('Results copied to clipboard!');
    });
});

// Render 3D Globe with Flight Arc & Markers
function drawGlobe(cityA, cityB) {
    const container = document.getElementById('globeViz');
    container.innerHTML = ''; // Clear container

    const arcsData = [{
        startLat: cityA.coordinates.lat,
        startLng: cityA.coordinates.lon,
        endLat: cityB.coordinates.lat,
        endLng: cityB.coordinates.lon,
        color: ['#818cf8', '#c084fc']
    }];

    const labelsData = [
        { lat: cityA.coordinates.lat, lng: cityA.coordinates.lon, text: cityA.name },
        { lat: cityB.coordinates.lat, lng: cityB.coordinates.lon, text: cityB.name }
    ];

    globeInstance = Globe()
        (container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .arcsData(arcsData)
        .arcColor('color')
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(1800)
        .arcStroke(1.2)
        .labelsData(labelsData)
        .labelSize(1.6)
        .labelDotRadius(0.8)
        .labelColor(() => '#ffffff')
        .width(container.clientWidth)
        .height(320);

    // Calculate midpoint to position camera view
    const midLat = (cityA.coordinates.lat + cityB.coordinates.lat) / 2;
    const midLng = (cityA.coordinates.lon + cityB.coordinates.lon) / 2;
    globeInstance.pointOfView({ lat: midLat, lng: midLng, altitude: 2.2 }, 1000);
}

function showSummary() {
    stopTimer();
    document.getElementById('question-section').classList.add('hidden');
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('summary-section').classList.remove('hidden');
    document.getElementById('final-score').textContent = totalScore;

    const emojiGrid = roundScores.map(getEmojiForPoints).join(' ');
    document.getElementById('emoji-grid').textContent = emojiGrid;
}

initGame();

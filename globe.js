import { routeMidpoint } from './questions.js';

const SCRIPT_URL = 'https://unpkg.com/globe.gl@2.46.2/dist/globe.gl.min.js';
const SCRIPT_INTEGRITY = 'sha384-1uolMBZ25k3zJcNwCLEv49+L+m2dZudqAzsoSAJfQTzDCSBxJzrMuZ2dkp/5JKiT';
const TEXTURE_URL = 'https://unpkg.com/three-globe@2.45.2/example/img/earth-blue-marble.jpg';
let libraryPromise;
let texturePromise;

function loadLibrary() {
    if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => reject(new Error('Globe download timed out.')), 8000);
        script.src = SCRIPT_URL;
        script.integrity = SCRIPT_INTEGRITY;
        script.crossOrigin = 'anonymous';
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); reject(new Error('Globe download failed.')); };
        document.head.append(script);
    });
    return libraryPromise;
}

function loadTexture() {
    if (!texturePromise) texturePromise = new Promise(resolve => {
        const image = new Image();
        const timer = setTimeout(() => resolve(false), 5000);
        image.crossOrigin = 'anonymous';
        image.onload = () => { clearTimeout(timer); resolve(true); };
        image.onerror = () => { clearTimeout(timer); resolve(false); };
        image.src = TEXTURE_URL;
    });
    return texturePromise;
}

export class GlobeView {
    constructor(container, status) {
        this.container = container;
        this.status = status;
        this.instance = null;
        this.generation = 0;
        this.visible = false;
        this.unavailable = false;
        this.observer = new ResizeObserver(() => {
            if (this.instance && this.visible && container.clientWidth) this.instance.width(container.clientWidth);
        });
        this.observer.observe(container);
    }
    hide() {
        this.generation++;
        this.visible = false;
        this.instance?.pauseAnimation();
    }
    syncVisibility() {
        if (!this.instance) return;
        if (this.visible && !document.hidden) this.instance.resumeAnimation();
        else this.instance.pauseAnimation();
    }
    async draw(cityA, cityB) {
        const generation = ++this.generation;
        this.visible = true;
        this.status.textContent = 'Loading globe… Your score is ready above.';
        this.container.classList.remove('hidden');
        try {
            if (this.unavailable) throw new Error('Graphics unavailable.');
            const [, hasTexture] = await Promise.all([loadLibrary(), loadTexture()]);
            if (generation !== this.generation) return;
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!this.instance) {
                this.instance = new window.Globe(this.container, { animateIn: !reducedMotion, waitForGlobeReady: false });
                this.instance.height(320).arcColor('color').arcStroke(1.2)
                    .labelSize(1.6).labelDotRadius(0.8).labelColor(() => '#ffffff')
                    // Globe tooltips accept HTML; disable them for dataset-derived labels.
                    .labelLabel(() => '').arcLabel(() => '')
                    .showGraticules(true);
                if (hasTexture) this.instance.globeImageUrl(TEXTURE_URL);
                else this.instance.globeMaterial().color.set('#1e3a5f');
                this.instance.controls().enableZoom = false;
                this.container.querySelector('canvas')?.addEventListener('webglcontextlost', () => {
                    this.unavailable = true;
                    this.instance.pauseAnimation();
                    this.status.textContent = 'The globe is unavailable. Your result is saved; you can continue playing.';
                    this.container.classList.add('hidden');
                });
            }
            this.instance.width(this.container.clientWidth)
                .arcDashLength(reducedMotion ? 1 : 0.4).arcDashGap(reducedMotion ? 0 : 0.2)
                .arcDashAnimateTime(reducedMotion ? 0 : 1800)
                .arcsTransitionDuration(reducedMotion ? 0 : 1000)
                .labelsTransitionDuration(reducedMotion ? 0 : 1000)
                .arcsData([{ startLat: cityA.coordinates.lat, startLng: cityA.coordinates.lon,
                    endLat: cityB.coordinates.lat, endLng: cityB.coordinates.lon, color: ['#818cf8', '#c084fc'] }])
                .labelsData([cityA, cityB].map(c => ({ lat: c.coordinates.lat, lng: c.coordinates.lon, text: c.name })))
                .pointOfView({ ...routeMidpoint(cityA.coordinates, cityB.coordinates), altitude: 2.2 }, reducedMotion ? 0 : 1000);
            this.status.textContent = hasTexture ? '' : 'Earth imagery is unavailable; showing the route on a simple globe.';
            this.syncVisibility();
        } catch (error) {
            if (generation !== this.generation) return;
            this.unavailable = true;
            this.instance?.pauseAnimation();
            this.container.classList.add('hidden');
            this.status.textContent = 'The globe is unavailable. Your result is saved; you can continue playing.';
            console.warn('Globe unavailable:', error.message);
        }
    }
}

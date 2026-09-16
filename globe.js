import { routeMidpoint } from './questions.js?v=live3';
import { GlobeFallback } from './globe-fallback.js';

const SCRIPT_URL = new URL('./vendor/globe.gl.min.js', import.meta.url).href;
const SCRIPT_INTEGRITY = 'sha384-1uolMBZ25k3zJcNwCLEv49+L+m2dZudqAzsoSAJfQTzDCSBxJzrMuZ2dkp/5JKiT';
const TEXTURE_URL = new URL('./vendor/earth-blue-marble.jpg', import.meta.url).href;
let libraryPromise;
let texturePromise;

function loadLibrary() {
    if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => reject(new Error('Globe download timed out.')), 8000);
        script.src = SCRIPT_URL;
        script.integrity = SCRIPT_INTEGRITY;
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); reject(new Error('Globe download failed.')); };
        document.head.append(script);
    });
    return libraryPromise;
}

function loadTexture() {
    if (!texturePromise) texturePromise = new Promise(resolve => {
        const image = new Image();
        const timer = setTimeout(() => resolve(null), 5000);
        image.onload = () => { clearTimeout(timer); resolve(image); };
        image.onerror = () => { clearTimeout(timer); resolve(null); };
        image.src = TEXTURE_URL;
    });
    return texturePromise;
}

export class GlobeView {
    constructor(container, status) {
        this.container = container;
        this.status = status;
        this.instance = null;
        this.fallback = null;
        this.route = null;
        this.texture = null;
        this.generation = 0;
        this.visible = false;
        this.webglUnavailable = false;
        this.observer = new ResizeObserver(() => {
            if (this.instance && this.visible && container.clientWidth) this.instance.width(container.clientWidth).height(container.clientHeight || 320);
            if (this.fallback && this.visible && this.route) this.renderFallback();
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
    renderFallback() {
        if (!this.route) return;
        this.fallback ??= new GlobeFallback(this.container);
        const [cityA, cityB] = this.route;
        const drawn = this.fallback.draw(cityA, cityB, routeMidpoint(cityA.coordinates, cityB.coordinates), this.texture);
        this.status.textContent = drawn
            ? 'Showing the route on a simplified globe for this device.'
            : 'The globe could not be drawn on this device.';
    }
    async draw(cityA, cityB) {
        const generation = ++this.generation;
        this.route = [cityA, cityB];
        this.visible = true;
        this.status.textContent = 'Loading globe… Your result is ready.';
        this.container.classList.remove('hidden');
        try {
            if (this.webglUnavailable) {
                this.texture = await loadTexture();
                if (generation === this.generation) this.renderFallback();
                return;
            }
            const [, image] = await Promise.all([loadLibrary(), loadTexture()]);
            if (generation !== this.generation) return;
            this.texture = image;
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!this.instance) {
                this.instance = new window.Globe(this.container, { animateIn: !reducedMotion, waitForGlobeReady: false });
                this.instance.backgroundColor('#071f25').height(this.container.clientHeight || 320).arcColor('color').arcStroke(1.2)
                    .labelSize(1.6).labelDotRadius(0.8).labelColor(() => '#ffffff')
                    // Globe tooltips accept HTML; disable them for dataset-derived labels.
                    .labelLabel(() => '').arcLabel(() => '')
                    .showGraticules(true);
                if (image) this.instance.globeImageUrl(TEXTURE_URL);
                else this.instance.globeMaterial().color.set('#1e3a5f');
                this.instance.controls().enableZoom = false;
                this.container.querySelector('canvas')?.addEventListener('webglcontextlost', () => {
                    this.webglUnavailable = true;
                    this.instance?.pauseAnimation();
                    this.instance = null;
                    if (this.visible) this.renderFallback();
                });
            }
            this.instance.width(this.container.clientWidth).height(this.container.clientHeight || 320)
                .arcDashLength(reducedMotion ? 1 : 0.4).arcDashGap(reducedMotion ? 0 : 0.2)
                .arcDashAnimateTime(reducedMotion ? 0 : 1800)
                .arcsTransitionDuration(reducedMotion ? 0 : 1000)
                .labelsTransitionDuration(reducedMotion ? 0 : 1000)
                .arcsData([{ startLat: cityA.coordinates.lat, startLng: cityA.coordinates.lon,
                    endLat: cityB.coordinates.lat, endLng: cityB.coordinates.lon, color: ['#818cf8', '#c084fc'] }])
                .labelsData([cityA, cityB].map(c => ({ lat: c.coordinates.lat, lng: c.coordinates.lon, text: c.name })))
                .pointOfView({ ...routeMidpoint(cityA.coordinates, cityB.coordinates), altitude: 2.2 }, reducedMotion ? 0 : 1000);
            this.status.textContent = image ? '' : 'Earth imagery is unavailable; showing the route on a simple globe.';
            this.syncVisibility();
        } catch (error) {
            if (generation !== this.generation) return;
            this.webglUnavailable = true;
            this.instance?.pauseAnimation();
            this.instance = null;
            this.texture = await loadTexture();
            if (generation !== this.generation) return;
            this.renderFallback();
            console.warn('3D globe unavailable; using 2D renderer:', error.message);
        }
    }
}

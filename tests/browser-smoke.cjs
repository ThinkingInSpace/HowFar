const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000';
    await mkdir('test-results', { recursive: true });
    try {
        for (const fallback of [false, true]) {
            const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
            const errors = [], external = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('request', request => { if (!request.url().startsWith(base) && !/^(data|blob):/.test(request.url())) external.push(request.url()); });
            await page.addInitScript(() => {
                window.testGlobes = [];
                Object.defineProperty(window, 'Globe', { configurable: true, set(Constructor) {
                    Object.defineProperty(window, 'Globe', { configurable: true, value: new Proxy(Constructor, {
                        construct(target, args) { const globe = Reflect.construct(target, args); window.testGlobes.push(globe); return globe; }
                    }) });
                } });
            });
            if (fallback) await page.route('**/vendor/globe.gl.min.js', route => route.abort());
            await page.goto(base);
            assert.equal(await page.locator('#welcome-unit').inputValue(), 'miles');
            assert.deepEqual(await page.locator('#welcome-unit option').evaluateAll(options => options.map(o => o.value)), ['km','miles','nm']);
            await page.locator('#welcome-unit').selectOption('nm');
            await page.locator('#start-btn').click();
            assert.equal(await page.locator('#unit').inputValue(), 'nm');
            await page.locator('#unit').selectOption('miles');
            const rounds = await page.evaluate(async () => (await import('./questions.js?v=live8')).fetchCityPairs());
            const ratios = [1, .8, .6, .3, 3];
            for (let i = 0; i < 5; i++) {
                await page.locator('#distance').fill(String(rounds[i].distanceKm / 1.609344 * ratios[i]));
                await page.locator('#submit-btn').click();
                await page.locator('#globeViz canvas').waitFor();
                await page.locator('#next-btn').click();
            }
            await page.locator('#summary-globe canvas').waitFor();
            assert.equal(await page.locator('#round-recap li').count(), 5);
            assert.equal(await page.locator('#final-score').innerText(), '540');
            if (!fallback) {
                const arcs = await page.evaluate(() => window.testGlobes[1].arcsData());
                assert.equal(arcs.length, 5);
                assert.deepEqual(arcs.map(a => a.color), ['#80bd66','#75a7ee','#e6cc60','#ed9b4b','#df685e']);
                for (let i = 0; i < 5; i++) {
                    assert.equal(arcs[i].startLat, rounds[i].cityA.coordinates.lat);
                    assert.equal(arcs[i].endLng, rounds[i].cityB.coordinates.lon);
                }
                const before = await page.evaluate(() => window.testGlobes[1].pointOfView().lng);
                await page.locator('[aria-label="Rotate globe east"]').click();
                const after = await page.evaluate(() => window.testGlobes[1].pointOfView().lng);
                assert.ok(Math.abs(after - before) > 20);
            } else {
                assert.match(await page.locator('#summary-globe-status').innerText(), /simplified globe/);
                const before = await page.locator('#summary-globe canvas').evaluate(c => c.toDataURL());
                await page.locator('[aria-label="Rotate globe east"]').click();
                assert.notEqual(await page.locator('#summary-globe canvas').evaluate(c => c.toDataURL()), before);
            }
            const canvas = page.locator('#summary-globe canvas');
            const box = await canvas.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 25, { steps: 5 }); await page.mouse.up();
            await page.screenshot({ path: `test-results/summary-${fallback ? 'fallback' : 'desktop'}.png`, fullPage: true });
            await page.setViewportSize({ width: 375, height: 812 });
            await page.screenshot({ path: `test-results/summary-${fallback ? 'fallback-mobile' : 'mobile'}.png`, fullPage: true });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.locator('#play-again-btn').click();
            await page.locator('#distance').waitFor({ state: 'visible' });
            assert.equal(await page.locator('#current-score').innerText(), '0');
            assert.equal(await page.locator('#unit').inputValue(), 'miles');
            await page.goto(base + '/about.html');
            assert.equal(await page.locator('h1').innerText(), 'Privacy & credits');
            assert.deepEqual(errors, []);
            assert.deepEqual(external, []);
            console.log(`${fallback ? 'Canvas fallback' : 'WebGL'}: five routes, score tiers, rotation, mobile layout, restart, privacy page, and same-origin requests passed.`);
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

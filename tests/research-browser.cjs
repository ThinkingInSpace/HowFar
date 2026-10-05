const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless:true, channel:process.env.BROWSER_CHANNEL || 'msedge' });
    try {
        for (const origin of ['https://tools.thinkinginspace.net','https://thinkinginspace.github.io']) {
            const context=await browser.newContext(), page=await context.newPage(), events=[];
            // Exercise production origins and CSP using local build assets; never forward research requests.
            await page.route(`${origin}/HowFar/**`, async route => {
                const relative=new URL(route.request().url()).pathname.slice('/HowFar/'.length) || 'index.html';
                const file=path.resolve('dist',relative), root=path.resolve('dist')+path.sep;
                assert.ok(file.startsWith(root)); await route.fulfill({path:file});
            });
            await page.route('https://georange-research.anrhodes.workers.dev/collect', async route => {
                if (route.request().method()==='POST') events.push(route.request().postDataJSON());
                await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'}});
            });
            const errors=[];page.on('pageerror',error=>errors.push(error.message));
            await page.goto(origin+'/HowFar/');
            assert.equal(events.length,0);
            await page.locator('#start-btn').click(); await page.locator('#distance').waitFor({state:'visible'});
            for (let i=0;i<5;i++) {
                await page.locator('#distance').fill('1000');await page.locator('#submit-btn').click();
                if(i<4) await page.locator('#next-btn').click();
            }
            await page.waitForFunction(()=>document.body.dataset.screen==='reveal');
            // Completion is recorded on the fifth answer, before summary navigation.
            await page.waitForTimeout(100);
            assert.equal(events.filter(e=>e.type==='start').length,1);
            assert.equal(events.filter(e=>e.type==='round').length,5);
            assert.equal(events.filter(e=>e.type==='complete').length,1);
            assert.ok(events.every(e=>e.mode==='daily'));
            await page.locator('#research-toggle').click();
            await page.locator('#next-btn').click();await page.locator('#play-again-btn').click();
            await page.locator('#distance').fill('500');await page.locator('#submit-btn').click();
            await page.waitForTimeout(100);assert.equal(events.length,7);
            await page.reload(); assert.equal(await page.locator('#research-toggle').innerText(),'Include future games');
            await page.locator('#practice-btn').click();await page.locator('#distance').waitFor({state:'visible'});
            await page.locator('#research-toggle').click();
            await page.locator('#distance').fill('500');await page.locator('#submit-btn').click();
            await page.waitForTimeout(100);assert.equal(events.length,7);
            await page.reload();await page.locator('#practice-btn').click();await page.locator('#distance').waitFor({state:'visible'});
            await page.locator('#distance').fill('500');await page.locator('#submit-btn').click();
            await page.waitForTimeout(100);assert.deepEqual(events.slice(7).map(e=>[e.type,e.mode]),[['start','practice'],['round','practice']]);
            assert.deepEqual(errors,[]);await context.close();
        }
        console.log('Both production origins: minimal events, completion timing, opt-out persistence, and next-game opt-in passed; no live writes.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

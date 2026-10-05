import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearch } from '../research.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function fixture(origin='https://tools.thinkinginspace.net', initial=false) {
    const values=new Map(initial ? [['georange-research-opt-out','true']] : []), events=[], requests=[];
    const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
    const collector=createResearch({origin,storage,send:(_url,options)=>{events.push(JSON.parse(options.body)); requests.push(options); return Promise.resolve();}});
    return {collector,events,requests,values};
}
const round={distanceKm:1000,cityA:{coordinates:{lat:1,lon:2}},cityB:{coordinates:{lat:3,lon:4}}};

test('collection sends minimal quantized data, counts once and converts units',async()=>{
    const {collector,events,requests}=fixture(); collector.start('daily');
    collector.round(0,round,{guess:500/1.609344,unit:'miles'});
    collector.round(0,round,{guess:20,unit:'km'}); collector.complete(540); collector.complete(540); await tick();
    assert.deepEqual(events,[{type:'start',mode:'daily'},{type:'round',mode:'daily',route:['1.0000,2.0000','3.0000,4.0000'],errorTenths:-500,overflow:false},{type:'complete',mode:'daily',score:540}]);
    for (const request of requests) {assert.equal(request.credentials,'omit'); assert.equal(request.referrerPolicy,'no-referrer');}
});
test('opt-out persists, aborts pending requests and re-enables only for a new game',async()=>{
    const {collector,events,requests,values}=fixture(); collector.start('practice'); await tick();
    collector.setOptOut(true); assert.equal(values.get('georange-research-opt-out'),'true');
    collector.round(0,round,{guess:1000,unit:'km'}); collector.setOptOut(false); collector.complete(1000); await tick();
    assert.equal(events.length,1); collector.start('daily'); await tick(); assert.equal(events.length,2);
    const pending=createResearch({origin:'https://tools.thinkinginspace.net',storage:{getItem:()=>null,setItem:()=>{}},send:(_url,request)=>{requests.push(request);return new Promise(()=>{});}});
    pending.start('daily'); await tick(); pending.setOptOut(true); assert.equal(requests.at(-1).signal.aborted,true);
});
test('previews, saved opt-out and unavailable storage do not collect; outages do not interrupt play',async()=>{
    for(const f of [fixture('http://127.0.0.1:8000'),fixture(undefined,true)]) {f.collector.start('daily'); await tick(); assert.equal(f.events.length,0);}
    let sent=0; const collector=createResearch({origin:'https://tools.thinkinginspace.net',storage:{getItem(){throw Error();}},send(){sent++;}});
    collector.start('daily'); await tick(); assert.equal(sent,0);
    const outage=createResearch({origin:'https://tools.thinkinginspace.net',storage:{getItem:()=>null},send(){throw Error('offline');}});
    outage.start('daily'); await tick();
});
test('extreme route errors are flagged rather than corrupting the mean',async()=>{
    const {collector,events}=fixture(); collector.start('daily');collector.round(0,round,{guess:1e300,unit:'km'});await tick();
    assert.equal(events[1].overflow,true);assert.equal(events[1].errorTenths,10000);
});

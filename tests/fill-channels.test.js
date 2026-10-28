const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

function setup(ev) {
  ev("ACT.start({});S.cash=1e8;S.lvl=LEVELS.length;for(const g of GOALS)S.done[g.id]=0;ACT.buildPop({city:'ams'});S.pops.fra.rgen=S.pops.ams.rgen=RG.length-1;S.offers=[];S.biz=[];S.links=[{id:'fiber',a:'fra',b:'ams',kind:'df',sys:'lite',ch:[],km:450,ready:0,cut:0,mo:500}];compute()");
}

test('All fills the installed line system with one optic type and recomputes only once', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  const state = ev('JSON.stringify(S)');
  assert.deepEqual(JSON.parse(ev("JSON.stringify(chBatch(S.links[0],'zr4'))")), { n: 16, cost: 192000, spares: 0 });
  assert.equal(ev('JSON.stringify(S)'), state, 'the preview does not spend money or consume stock');
  const cash = ev('S.cash');
  ev("const originalAfter=after;window.after=()=>{window.afterCount=(window.afterCount||0)+1;originalAfter()};ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 16);
  assert.equal(ev("S.links[0].ch.every(o=>o==='zr4')"), true);
  assert.equal(ev('S.cash'), cash - 192000);
  assert.equal(ev("portsUsed('fra')"), 16);
  assert.equal(ev("portsUsed('ams')"), 16);
  assert.equal(ev('window.afterCount'), 1);
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.cash'), cash - 192000, 'a second click does not buy more');
  assert.equal(ev('window.afterCount'), 1);
  ev('S=migrate(JSON.parse(JSON.stringify(packSave(S))));compute()');
  assert.equal(ev('S.links[0].ch.length'), 16, 'all installed channels survive a save');
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('the normal add button still adds one channel, then All fills only the remaining slots', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("ACT.addCh({id:'fiber',o:'zr4'})");
  assert.equal(ev('S.links[0].ch.length'), 1);
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 15);
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 16);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('All keeps other optics and channels sold as alien waves', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("S.links[0].ch=Array(3).fill('zr8');S.biz=[{id:'sold',type:'wwave',name:'Other Carrier',city:'fra',city2:'ams',link:'fiber',bw:1,slots:5,rate:1000,reqs:[],mood:100,since:0}];compute()");
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 8);
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev("S.links[0].ch.filter(o=>o==='zr8').length"), 3);
  assert.equal(ev("S.links[0].ch.filter(o=>o==='zr4').length"), 8);
  assert.equal(ev('soldSlots(S.links[0])'), 5);
  assert.equal(ev('freeCh(S.links[0])'), 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('All respects both routers and fractional ports already used by 10G breakouts', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("S.links[0].sys='roadm';S.pops.fra.rgen=S.pops.ams.rgen=1;S.caches=Array.from({length:23},()=>({id:uid(),city:'fra',net:'cfl'})).concat(Array.from({length:22},()=>({id:uid(),city:'ams',net:'cfl'})));compute()");
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 1);
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev("portsUsed('fra')"), 24);
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 0);
  ev("S.links[0].ch=[];S.caches=S.caches.slice(0,17);ACT.buyTransit({city:'fra',net:'lvl',tier:0});compute()");
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 6, 'a remaining three-quarter slot cannot fit an optic');
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 6);
  assert.equal(ev("portsUsed('fra')"), 23.25);
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('All reuses spares first and charges regeneration and current hardware prices per channel', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("S.day=365;S.ev.tariff=S.day+10;S.links[0].regen=1;S.spares={zr4:2,zr8:5};compute()");
  const price = ev("optCost('zr4')");
  const expected = 2 * Math.round(price * 0.5) + 3 * Math.round(price * 1.5);
  ev(`S.cash=${expected}`);
  assert.deepEqual(JSON.parse(ev("JSON.stringify(chBatch(S.links[0],'zr4'))")), { n: 5, cost: expected, spares: 2 });
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 5);
  assert.equal(ev('S.spares.zr4'), 0);
  assert.equal(ev('S.spares.zr8'), 5, 'unselected spares are not consumed');
  assert.equal(ev('S.cash'), 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('All buys the maximum affordable count, including free spares, and rechecks stale previews', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 16);
  ev("S.cash=25000;ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 2);
  assert.equal(ev('S.cash'), 1000);
  ev("S.links[0].ch=[];S.cash=0;S.spares.zr4=3;compute()");
  assert.deepEqual(JSON.parse(ev("JSON.stringify(chBatch(S.links[0],'zr4'))")), { n: 3, cost: 0, spares: 3 });
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 3);
  assert.equal(ev('S.cash'), 0);
  ev("S.spares.zr4=1;S.cash=-1;ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 3);
  assert.equal(ev('S.spares.zr4'), 1);
  assert.equal(ev('S.cash'), -1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('All rejects invalid optics, incompatible systems, locked models and unreachable spans', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  const cash = ev('S.cash');
  for (const optic of ['missing', '__proto__', 'tp16']) ev(`ACT.addCh({id:'fiber',o:'${optic}',all:true})`);
  ev("ACT.addCh({id:'missing',o:'zr4',all:true});S.lvl=1;ACT.addCh({id:'fiber',o:'zr4',all:true})");
  ev("S.lvl=13;S.pops.fra.rgen=0;ACT.addCh({id:'fiber',o:'zr4',all:true})");
  ev("S.pops.fra.rgen=RG.length-1;S.links[0].km=200000;ACT.addCh({id:'fiber',o:'zr4',all:true})");
  ev("S.links[0].kind='wave';ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 0);
  assert.equal(ev('S.cash'), cash);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('All can pre-install optics and uses only the fiber pairs already lit', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("S.links[0].ready=S.day+30;ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 16);
  assert.equal(ev('dfCap(S.links[0])'), 0, 'construction still has to finish');
  ev("S.links[0].ready=S.day;S.links[0].ch=[];S.links[0].own=true;S.links[0].sys='cl';S.links[0].pairs=8;S.pops.fra.routers=S.pops.ams.routers=16;compute()");
  assert.equal(ev("chBatch(S.links[0],'zr4').n"), 1024);
  ev("ACT.addCh({id:'fiber',o:'zr4',all:true})");
  assert.equal(ev('S.links[0].ch.length'), 1024);
  assert.equal(ev('S.links[0].pairs'), 8, 'no extra pairs or line systems are purchased');
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('every transceiver has separate add and All buttons with prices on phones in all languages', () => {
  for (const lang of ['en', 'it', 'pt', 'fr', 'es']) {
    const { ev, dom, errors } = load(lang === 'en' ? {} : { lang });
    setup(ev);
    dom.window.innerWidth = 360;
    ev("selectLink('fiber')");
    const doc = dom.window.document;
    const buttons = [...doc.querySelectorAll('#panelBody [data-act="addCh"]')];
    const all = buttons.filter(b => JSON.parse(b.dataset.args).all === true);
    assert.equal(all.length, ev('Object.keys(OPT).length'), lang);
    assert.equal(buttons.length, 2 * all.length, lang);
    const button = all.find(b => JSON.parse(b.dataset.args).o === 'zr4');
    const single = button.previousElementSibling;
    assert.equal(JSON.parse(single.dataset.args).all, undefined, lang);
    assert.equal(button.disabled, false, lang);
    assert.match(button.textContent, /16/, lang);
    assert.ok(button.textContent.includes(ev("fmt$(16*optCost('zr4'))")), lang);
    assert.ok(button.title.includes(ev('OPT.zr4.n')), lang);
    const cash = ev('S.cash');
    button.focus();
    button.click();
    assert.equal(ev('S.links[0].ch.length'), 16, lang);
    assert.equal(ev('S.cash'), cash - 192000, lang);
    assert.doesNotMatch(doc.getElementById('panelBody').textContent, /link_panels\.all_channels_price/, lang);
    assert.deepEqual(errors, [], lang);
    dom.window.close();
  }
});

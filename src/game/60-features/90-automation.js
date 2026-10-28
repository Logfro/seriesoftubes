/* Optional operators use the same sales and repair actions as the player. */
const AUTO_SALES_MS=5000;
function autoSalesSeconds(now=performance.now()){if(!S||!S.autoSales)return null;
  const left=UI.autoGame===S&&autoActive()?AUTO_SALES_MS-(now-UI.autoSalesAt):AUTO_SALES_MS;
  return Math.max(1,Math.min(AUTO_SALES_MS/1000,Math.ceil(left/1000)));}
function autoAcceptLabel(){return tr('common.accept')+(S.autoSales?` <small data-auto-sales title="${esc(tr('automation.next_auto_check'))}">(${autoSalesSeconds()})</small>`:'');}
function renderAutoCountdown(now=performance.now()){const n=autoSalesSeconds(now);if(UI.autoCount===n)return;UI.autoCount=n;
  for(const el of document.querySelectorAll('[data-auto-sales]'))el.textContent=n===null?'':`(${n})`;}
function offerCustomer(o){return {id:o.id,city:o.city,city2:o.city2||null,reqs:o.reqs||[],latMax:o.latMax||null,route:BIZ_T[o.type].scenic?'scenic':BIZ_T[o.type].lat?'fast':'normal',name:o.name,type:o.type,bw:o.bw,rate:o.rate,mood:100,since:S.day,sites:o.sites||null,start:o.start,dur:o.dur,fee:o.fee,link:o.link,slots:o.slots||0,what:o.what,prov:o.prov,due:BIZ_T[o.type].cap?S.day+o.win:undefined};}
function autoOffer(o){if(!o||!own(BIZ_T,o.type)||!(o.exp>S.day)||!(o.bw>0)||o.rate<0||!bCities(o).length||!bCities(o).every(popUp)||!reqOk(o))return null;
  const T=BIZ_T[o.type],b=offerCustomer(o);if(T.event&&(!(o.start>S.day)||!(o.dur>0)))return null;
  if(o.type==='capfib'&&S.biz.some(x=>x.type==='capfib'&&capPend(x)&&!x.link&&((x.city===o.city&&x.city2===o.city2)||(x.city===o.city2&&x.city2===o.city))))return null;
  if(T.fiber){const l=o.type==='capfib'?capFibLink(b):S.links.find(x=>x.id===o.link);if(!l)return null;b.link=l.id;
    if(!fiberOk(b)||(o.type==='wwave'&&(!(o.slots>0)||freeCh(l)<o.slots))||(o.type==='dfpair'&&!pairFree(l))||
      (o.type==='pairs'&&(!l.own||S.biz.some(x=>x.link===l.id&&['pairs','capfib','dfpair'].includes(x.type)))))return null;}
  const state=S,result=R,hot=UI.hotMap,future=S.biz.some(x=>BIZ_T[x.type].event&&x.start>S.day);
  // Trial the added demand before signing; failed trials leave the live game untouched.
  try{S={...S,biz:S.biz};
    // shortcut: future events reserve capacity together; use per-date trials if separate bookings must share capacity.
    if(future){S.biz=S.biz.map(x=>BIZ_T[x.type].event&&x.start>S.day?{...x,start:S.day}:x);compute();}
    const healthy=S.biz.filter(x=>!bizWhy(x).length);if(T.event)b.start=S.day;if(T.cap)b.live=true;S.biz=S.biz.concat(b);compute();
    return !bizWhy(b).length&&healthy.every(x=>!bizWhy(x).length)?b:null;
  }finally{S=state;R=result;UI.hotMap=hot;b.start=o.start;if(T.cap)delete b.live;}}
function autoActive(){return !!(S&&UI.started&&!S.lost&&UI.speed&&$('modal').hidden&&document.visibilityState==='visible');}
function automationTick(now){if(UI.autoGame!==S){UI.autoGame=S;UI.autoSalesAt=now;}
  if(!autoActive()){UI.autoSalesAt=now;return;}
  if(S.autoRepair&&S.inc.length){purgeInc();for(const i of S.inc.slice()){if(!autoActive())break;
    if(i.type!=='ddos'&&i.until>S.day&&i.cost>0&&i.cost<=S.cash&&!(i.slow&&i.rushed))ACT.fixInc({id:i.id});}}
  if(!S.autoSales||!autoActive()){UI.autoSalesAt=now;return;}if(now-UI.autoSalesAt<AUTO_SALES_MS)return;
  UI.autoSalesAt=now;for(const o of S.offers.slice()){if(!autoActive())break;ACT.accept({id:o.id,auto:true});}}

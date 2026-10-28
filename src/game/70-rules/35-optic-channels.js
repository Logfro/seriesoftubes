/* Fill the installed line system without overselling spectrum, router ports or cash. */
function chBatch(l,o){const empty={n:0,cost:0,spares:0};if(!S||!l||l.kind!=='df'||!own(OPT,o)||S.cash<0||chWhy(l,o))return empty;
  const room=Math.max(0,Math.floor(Math.min(freeCh(l),...[l.a,l.b].map(c=>S.pops[c]?portsMax(c)-portsUsed(c):Infinity))));
  const stock=Math.max(0,spareN(o)),reuse=chCost(l,o,1),buy=chCost(l,o,0);let n=0,cost=0;
  while(n<room){const price=n<stock?reuse:buy;if(cost+price>S.cash)break;cost+=price;n++;}
  return {n,cost,spares:Math.min(n,stock)};}

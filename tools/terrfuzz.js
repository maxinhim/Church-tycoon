#!/usr/bin/env node
/* 지형 무작위 테스트: 땅 올리기·지하로 내리기·경사로·물 채우기/빼기·다리·건물·되돌리기·주 넘기기를
   무작위로 섞어 돌리며, 오류와 지형 규칙 위반(물·높이 한도·길찾기)이 생기는지 본다. 쓰는 법: node tools/terrfuzz.js */
const http=require('http'),fs=require('fs'),path=require('path');const ROOT=path.dirname(__dirname);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'};
function serve(){return new Promise(res=>{const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html');
  if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
  r.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r);});srv.listen(0,'127.0.0.1',()=>res(srv));});}
const {chromium}=require('playwright');
(async()=>{const srv=await serve(),URL='http://127.0.0.1:'+srv.address().port+'/index.html';let fail=0;const b=await chromium.launch();
for(const seed of [11,12,13,14,15,16,17,18]){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
await p.addInitScript(sd=>{let s=sd;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};window.__CT_TEST=true;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}},seed);
await p.goto(URL);await p.evaluate(()=>window.__ct.init());
const r=await p.evaluate(()=>{restart('easy');S.unlockAll=true;setGate(true);const R=Math.random,ri=n=>(R()*n)|0,bad=[];
 const ids=DEFS.filter(d=>d.kind!=='terrain'&&d.kind!=='floor'&&d.kind!=='mroom'&&d.id!=='path'&&d.kind!=='lot').map(d=>d.id);
 // 좁은 구역에 몰아서 서로 부딪히는 경우를 많이 만든다
 const X0=6,Y0=8,W=12,H=10,rx=()=>X0+ri(W),ry=()=>Y0+ri(H);let nfill=0,ndrain=0,nwater=0,deep=0;
 const chk=(op)=>{
  if(!Number.isFinite(S.money))bad.push(op+': money');
  for(const k in S.water){const a=k.split(',').map(Number);
   if(!(th(a[0],a[1])<0))bad.push(op+': 물이 0층 이상 칸에 '+k);
   if(cellSubWhy(a[0],a[1]))bad.push(op+': 물속에 '+cellSubWhy(a[0],a[1])+' '+k);
   if(groundOk(a[0],a[1]))bad.push(op+': 물 칸을 걸을 수 있음 '+k);
   for(let d=0;d<4;d++){const nx=a[0]+DIRS[d][0],ny=a[1]+DIRS[d][1];if(subCell(nx,ny)&&!isWater(nx,ny)&&!cellSubWhy(nx,ny))bad.push(op+': 물 옆 마른 지하 칸 '+nx+','+ny);}}
  for(const k in S.hgt){const v=S.hgt[k];if(v<MINH||v>MAXH-1||v!==Math.round(v))bad.push(op+': 높이 '+k+'='+v);if(v<=-8)deep++;}
  for(const k in S.slp){const a=k.split(',').map(Number);if(occ[a[1]][a[0]])bad.push(op+': 경사로 위 건물 '+k);if(th(a[0],a[1])+1>MAXH-1)bad.push(op+': 경사로 높이 '+k);}
  S.buildings.forEach(b=>{const top=bLevel(b)+bTopFloors(b);if(top>MAXH)bad.push(op+': 한도 넘은 건물 '+b.def+' '+top);
   if(b.z==null){const dm=bDims(b),h0=th(b.x,b.y);for(let j=0;j<dm.h;j++)for(let i=0;i<dm.w;i++)if(th(b.x+i,b.y+j)!==h0)bad.push(op+': 기운 건물 '+b.def);}
   if(isWaterDef(D[b.def])&&!isWater(b.x,b.y))bad.push(op+': 물 없는 물 분수');
   if(b.z==null&&ceilOver(b)<99&&bLevel(b)+bLevelsTall(b)>ceilOver(b))bad.push(op+': 다리에 박힌 건물 '+b.def);
   if(b.z==null)bTiles(b).forEach(t=>{if(piecesAt(t.x,t.y).some(q=>q.l<=bLevel(b)&&pieceTop(q)>=bLevel(b)&&!(q.l<bLevel(b)&&pieceTop(q)<=bLevel(b))))bad.push(op+': 길과 겹친 건물 '+b.def+' '+t.x+','+t.y);});});
  S.paths.forEach(q=>{if(q.l<th(q.x,q.y))bad.push(op+': 땅에 묻힌 길 '+q.x+','+q.y);if(pieceTop(q)>MAXL)bad.push(op+': 길 높이');});
  V.forEach(v=>{if(!Number.isFinite(v.x+v.y+(v.z||0)))bad.push(op+': 방문자 좌표');});
  nwater=Math.max(nwater,Object.keys(S.water).length);};
 for(let i=0;i<900&&bad.length<6;i++){const o=ri(16);let op='';if(S.money<20000)S.money+=200000;
  try{
  if(o<4){const x=rx(),y=ry(),l=R()<.12?-10:R()<.1?9:ri(9)-5;op='ter '+x+','+y+'→'+l;terApply(x,y,'ter_set',l);}
  else if(o===4){op='ramp';terApply(rx(),ry(),'ter_ramp',0,ri(4));}
  else if(o===5){op='fill';const x=rx(),y=ry();if(th(x,y)<0&&!fillWater(x,y))nfill++;}
  else if(o===6){op='drain';const ks=Object.keys(S.water);if(ks.length&&R()<.4){const a=ks[ri(ks.length)].split(',').map(Number);if(!drainWater(a[0],a[1]))ndrain++;}}
  else if(o===7||o===8){const id=R()<.2?'wfount':ids[ri(ids.length)];op='build '+id;UI.plLow=R()<.5;build(id,rx(),ry(),ri(4));UI.plLow=false;}
  else if(o===9&&S.buildings.length){const bb=S.buildings[ri(S.buildings.length)];op='dem '+bb.def;if(!lastHallWhy(bb))demolish(bb.id);}
  else if(o===10){op='piece';addPiece({x:rx(),y:ry(),l:ri(6)-3,s:ri(2),d:ri(4),k:['stone','wood','arch','brick','marble','steel'][ri(6)]});}
  else if(o===11&&S.paths.length){op='rmpiece';const pc=S.paths[ri(S.paths.length)];if(!pieceDemWhy(pc))removePiece(pc.id,.5);}
  else if(o===12){op='floor';paintFloor(rx(),ry(),FLOOR_IDS[ri(FLOOR_IDS.length)]);UI.undo=[];}
  else if(o===13){op='undo';UI.undo=[];const x=rx(),y=ry();if(!terApply(x,y,'ter_set',ri(7)-4)){const u=UI.undo.pop();if(u&&u.ter)terUndo(u);}UI.undo=[];}
  else if(o===14&&S.buildings.length){const bb=S.buildings[ri(S.buildings.length)];op='invest '+bb.def;if(hasLv(bb))for(let k=0;k<ri(12);k++)investBld(bb);}
  else if(o===15){op='run';for(let k=0;k<60;k++)update(0.1);S.dlg=null;S.over=false;if(R()<.2){save();const s2=load();s2.open=S.open;S=s2;V=[];rebuildOcc();recalc();levelTick(true);}}
  if(i%20===0){ROT=(i/20)%4;draw();ROT=0;const q=toScreen(ri(20)+5,ri(20)+5,0);surfaceTile(q[0],q[1]);pickBuilding(q[0],q[1]);pickPieceAt(q[0],q[1]);}
  }catch(e){bad.push(op+' THROW '+e.message+' '+(e.stack||'').split('\n')[1]);}
  chk(op);}
 return {bad,bld:S.buildings.length,paths:S.paths.length,ter:Object.keys(S.hgt).length,ramps:Object.keys(S.slp).length,water:Object.keys(S.water).length,maxWater:nwater,fills:nfill,drains:ndrain,deepHits:deep>0};});
console.log((r.bad.length||errs.length?'FAIL':'PASS')+' seed',seed,JSON.stringify(r),errs.slice(0,3));if(r.bad.length||errs.length)fail++;await p.close();}
await b.close();srv.close();process.exit(fail?1:0);})();

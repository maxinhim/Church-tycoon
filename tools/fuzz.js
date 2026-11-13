#!/usr/bin/env node
/* 무작위 조작 테스트: 짓기·철거·길·지형·층 올리기·주 넘기기·저장/불러오기·행사를 무작위로 반복하며
   오류·NaN·음수가 생기는지 본다. 쓰는 법: node tools/fuzz.js  (시드 6개 × 700번 조작, 1~2분) */
const http=require('http'),fs=require('fs'),path=require('path');const ROOT=path.dirname(__dirname);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'};
function serve(){return new Promise(res=>{const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html');
  if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
  r.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r);});srv.listen(0,'127.0.0.1',()=>res(srv));});}
const {chromium}=require('playwright');
(async()=>{const srv=await serve(),URL='http://127.0.0.1:'+srv.address().port+'/index.html';let fail=0;const b=await chromium.launch();
for(const seed of [1,2,3,4,5,6]){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
await p.addInitScript(sd=>{let s=sd;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};window.__CT_TEST=true;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}},seed);
await p.goto(URL);await p.evaluate(()=>window.__ct.init());
const r=await p.evaluate(()=>{restart('easy');S.unlockAll=true;setGate(true);const R=Math.random,ri=n=>(R()*n)|0,log=[],bad=[];
 const ids=DEFS.filter(d=>d.kind!=='terrain'&&d.id!=='f_erase'&&d.id!=='path').map(d=>d.id);let last='';
 const chk=(op)=>{const nums={money:S.money,mood:S.mood,rep:S.rep,mem:S.members,lvl:S.lvl,fresh:S.fresh};for(const k in nums)if(!Number.isFinite(nums[k]))bad.push(op+': '+k+'='+nums[k]);
  if(S.members<0)bad.push(op+' members<0');S.buildings.forEach(b=>{if(b.inUse<0||!Number.isFinite(b.inUse))bad.push(op+' inUse '+b.def);});
  for(const k in S.cov)if(typeof S.cov[k]==='number'&&!Number.isFinite(S.cov[k]))bad.push(op+' cov.'+k);};
 for(let i=0;i<700&&bad.length<5;i++){const o=ri(13);let op='';
  try{
  if(o<4){const id=ids[ri(ids.length)],x=ri(COLS),y=ri(ROWS),f=ri(4);op='build '+id;if(S.money<5000)S.money+=50000;build(id,x,y,f);}
  else if(o===4&&S.buildings.length){const bb=S.buildings[ri(S.buildings.length)];op='dem '+bb.def;if(!lastHallWhy(bb))demolish(bb.id);}
  else if(o===5){op='piece';addPiece({x:ri(COLS),y:ri(PZ),l:ri(3),s:ri(2),d:ri(4),k:['stone','wood','sky'][ri(3)]});}
  else if(o===6&&S.paths.length){op='rmpiece';const pc=S.paths[ri(S.paths.length)];if(!pieceDemWhy(pc))removePiece(pc.id,.5);}
  else if(o===7){op='ter';terApply(ri(COLS),ri(PZ),R()<.3?'ter_ramp':'ter_set',ri(4),ri(4));}
  else if(o===8&&S.buildings.length){const bb=S.buildings[ri(S.buildings.length)];op='floor+ '+bb.def;if(canStack(bb))addFloor(bb);}
  else if(o===9){op='run';for(let k=0;k<120;k++)update(0.1);S.dlg=null;}
  else if(o===10){op='week';S.t=WEEK-.05;update(0.1);S.dlg=null;S.over=false;if(S.money<0)S.money=20000;}
  else if(o===11){op='saveload';save();const s2=load();s2.open=S.open;S=s2;V=[];rebuildOcc();recalc();levelTick(true);}
  else if(o===12&&R()<.25){op='claim';IND.forEach(d=>{if(indReady(d.k))claimInd(d.k);});levelTick();}
  else if(o===12){op='event';const es=Object.keys(EVENTS);const e=es[ri(es.length)];Object.keys(S.ev).forEach(k=>{if(evReady(k)&&R()<.7)claimEvent(k);});(S.people||[]).slice(0,12).forEach(q=>{const z=R();if(z<.3)ppCare(q.id,z<.15?'visit':'gift');else if(z<.5){const nx=ppNexts(q),to=nx[ri(Math.max(1,nx.length))];if(to){q.lv=Math.max(q.lv,PP_TREE[to].lv);ppTrain(q.id,to);}}else if(z<.7&&q.tr){q.tr.end=evNow()-.01;peopleTick();ppAppoint(q.id);}});if(S.assoc.length&&R()<.3)asCheer(0);if(R()<.4)caresWeek();(S.cares||[]).slice().forEach(c=>{if(R()<.5)careChoose(c.id,ri(4));});if(S.assoc.length&&R()<.2){delegState().on=true;delegWeek();}if(!evBlock(e))runEvent(e);const ks=Object.keys(STAFF);hireTeam(ks[ri(ks.length)]);}
  hud(true);if(i%25===0){draw&&draw();}
  }catch(e){bad.push(op+' THROW '+e.message+' '+(e.stack||'').split('\n')[1]);}
  chk(op);}
 return {bad,n:S.buildings.length,p:S.paths.length,w:S.week};});
console.log((r.bad.length||errs.length?'FAIL':'PASS')+' seed',seed,JSON.stringify(r),errs.slice(0,3));if(r.bad.length||errs.length)fail++;await p.close();}
await b.close();srv.close();process.exit(fail?1:0);})();

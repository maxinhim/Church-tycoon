#!/usr/bin/env node
/* 대기줄 밸런스 비교: 같은 교회(성도 수 고정)에서 예배 공간을 달리 두고 몇 주를 돌려 본다.
   A 건물 1채(줄 없음) · B 건물 1채 + 줄 10칸 · C 건물 1채 + 줄 20칸 · D 건물 2채(줄 없음) · E 건물 2채 + 줄 10칸씩
   보는 값: 주당 이용 횟수, 채워 준 말씀 필요 합계, 돌아갈 때 평균 필요, 불편(붐빔·줄), 평균 줄 기다림.
   쓰는 법: node tools/queuebench.js [--def chapel] [--members 120] [--weeks 6] */
const http=require('http'),fs=require('fs'),path=require('path');const ROOT=path.dirname(__dirname);
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const DEF=arg('def','chapel'),MEM=+arg('members',120),WEEKS=+arg('weeks',6);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'};
function serve(){return new Promise(res=>{const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html');
  if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
  r.writeHead(200,{'Content-Type':TYPES[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r);});srv.listen(0,'127.0.0.1',()=>res(srv));});}
const {chromium}=require('playwright');
function run(cfg){
  restart('easy');S.dlg=null;setGate(true);S.unlockAll=true;S.money=1e7;
  S.buildings.filter(b=>b.def==='room'||b.def==='tree').forEach(b=>demolish(b.id));S.floor={};
  // 입구에서 위로 큰길
  for(let y=30;y<PZ;y++)for(let x=ENT;x<ENT+2;x++)S.floor[x+','+y]='f_block';
  const d=D[cfg.def],made=[];
  for(let i=0;i<cfg.n;i++){
    const side=i%2?1:-1,x=side>0?ENT+2+cfg.q+2:ENT-cfg.q-2-d.h,y=44-((i/2)|0)*(d.w+3);
    // 문이 큰길 쪽을 보게 (face 1 = -x, face 0 = +x)
    build(cfg.def,x,y,side>0?1:0);const b=S.buildings[S.buildings.length-1];made.push(b);
    // 입구·출구 건물: 큰길 쪽 벽 바로 옆 칸에 (입구는 가운데, 출구는 그 위 칸)
    const fy=y+((bDims(b).h/2)|0),gx=side>0?x-1:x+bDims(b).w,gd=side>0?1:0,step=side>0?-1:1;
    UI.gateFor=b.id;buildGate('g_arch',gx,fy);buildGate('x_arch',gx,fy-1);UI.gateFor=null;recalc();
    const o={x:gx+DIRS[gd][0],y:fy};let cx=o.x;UI.flast=null;
    for(let k=0;k<cfg.q;k++){paintFloor(cx,o.y,'q_rope');UI.flast={x:cx,y:o.y};cx+=step;}
    // 줄 끝(또는 문 앞)에서 큰길까지, 출구에서 큰길까지
    for(;side>0?cx>=ENT+2:cx<ENT;cx+=step)S.floor[cx+','+o.y]='f_block';
    const o2={x:gx+DIRS[gd][0],y:fy-1};for(let ex=o2.x;side>0?ex>=ENT+2:ex<ENT;ex+=step)S.floor[ex+','+o2.y]='f_block';
  }
  recalc();
  const ok=made.every(b=>usable(b)&&(cfg.q?qLen(b)===cfg.q:!b.q));
  const st={uses:0,fill:0,dep:0,depAvg:0,qw:0,qn:0,weeks:0,grip:{}};
  const fv=finishVisit;finishVisit=function(v){const b=bById(v.inside);if(b&&made.indexOf(b)>=0){st.uses++;const dd=defOf(b);for(const n in dd.fill)st.fill+=dd.fill[n]*(v.uk||1);}return fv(v);};
  const dp=depart;depart=function(v){st.dep++;st.depAvg+=NEEDS.reduce((s,n)=>s+v.needs[n],0)/4-v.annoy*5;return dp(v);};
  const en=enter;enter=function(v,b){if(v.qt>0||v.state==='queue'){st.qw+=v.qt||0;st.qn++;}return en(v,b);};
  for(let w=0;w<cfg.weeks;w++){
    S.members=cfg.mem;S.money=1e7;S.rep=60;
    for(let i=0;i<WEEK*10;i++){update(0.1);S.dlg=null;S.over=false;}
    if(w>0){for(const k in S.gripL||{})st.grip[k]=(st.grip[k]||0)+S.gripL[k];st.weeks++;}
  }
  const wk=cfg.weeks;
  return {ok,rot:+rotTime(made[0]).toFixed(1),useK:+useK(made[0]).toFixed(2),usesWk:Math.round(st.uses/wk),fillWk:Math.round(st.fill/wk),depAvg:+(st.depAvg/Math.max(1,st.dep)).toFixed(1),visitors:Math.round(st.dep/wk),
    wait:+(st.qw/Math.max(1,st.qn)).toFixed(1),crowdWk:+((st.grip.crowd||0)/Math.max(1,st.weeks)).toFixed(1),queueWk:+((st.grip.queue||0)/Math.max(1,st.weeks)).toFixed(1),cost:made.length*d.cost+made.length*cfg.q*D.q_rope.cost,upkeep:made.length*d.up};
}
(async()=>{const srv=await serve(),URL='http://127.0.0.1:'+srv.address().port+'/index.html';const b=await chromium.launch();
const cases=[['A 1채, 줄 없음',1,0],['B 1채 + 줄 10칸',1,10],['C 1채 + 줄 20칸',1,20],['D 2채, 줄 없음',2,0],['E 2채 + 줄 10칸씩',2,10]];
console.log(`건물 ${DEF}, 성도 ${MEM}명 고정, ${WEEKS}주 평균`);
console.log('| 경우 | 회전(초) | 효과배율 | 이용/주 | 채운 필요/주 | 돌아갈 때 평균 | 평균 기다림(초) | 붐빔 불편/주 | 줄 불편/주 | 지은 값 | 유지비/주 |');console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for(const c of cases){const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
  await p.addInitScript(()=>{let s=5;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};window.__CT_TEST=true;window.__CT_GATES=true;window.requestAnimationFrame=()=>0;try{localStorage.clear()}catch(e){}});
  await p.goto(URL);await p.evaluate(()=>window.__ct.init());
  const r=await p.evaluate(run,{def:DEF,n:c[1],q:c[2],mem:MEM,weeks:WEEKS});
  console.log(`| ${c[0]}${r.ok?'':' (연결 실패)'} | ${r.rot} | ${r.useK} | ${r.usesWk} | ${r.fillWk} | ${r.depAvg} | ${r.wait} | ${r.crowdWk} | ${r.queueWk} | ${r.cost} | ${r.upkeep} |`);await p.close();}
await b.close();srv.close();})();

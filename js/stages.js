'use strict';
/* ---------- 스테이지: 시작 지도와 스테이지마다의 특색 ----------
   모든 스테이지의 대예배당은 지도 한가운데(MAIN_AT, 가운데 칸 31·32)에 서 있다. 스테이지마다 저장이 따로다(stageKey).
   · 농촌(rural): 평지. 입구에서 대예배당 문 앞까지 곧은 길
   · 산촌(mount): 넓은 분지 둘레를 낮은 산이 두르고, 입구에서 한 번 굽은 좁은 협곡 길을 지나야 교회에 닿는다.
       걸어서 오는 방문자는 적게 오고 덜 정착한다(STG_WALK_*). 운전자(봉사자·부교역자)가 모는 차량이 입구에서 태워 오면 회복된다.
       이따금 산짐승(멧돼지·고라니·너구리)이 내려와 건물을 상하게 하고 방문자를 놀라게 한다 — 눌러서 쫓는다
   · 어촌(sea): 입구와 교회 사이를 큰 강이 흐른다. 다리를 놓을 수 없고, 나루에서 배로 태워 와야만 교회에 온다
   · 도시(city): 이웃 건물이 지도에 가득하다. 땅째 비싸게 사서(부지 매입) 주차장·시설 자리를 만든다.
       주차가 더 필요하고(차량이 태워 오면 줄어듦) 정착이 어렵다(신뢰도가 높을수록 회복). 이웃 민원이 들어온다
   차량 운행(산촌·어촌·도시): 정해진 노선(STAGE_ROUTE)의 한쪽 끝(입구·나루)에서 기다리는 사람(S.pq, 성도는 S.pqm)을 태워
   대예배당 문 앞(내리는 곳)에 내려 준다. 차량은 직원 화면 › 차량 탭에서 사고 운전자를 세운다(S.veh). 수치는 balance.js(VEH·STG_*·WILD_*·CITY_*) */
var STAGE_SET={
  rural:{},
  mount:{trans:'road',wild:true,walk:true},
  sea:{trans:'water',noBridge:true},
  city:{trans:'road',city:true}
};
function stageId(){return (S&&S.stage)||'rural';}
function stg(){return STAGE_SET[stageId()]||STAGE_SET.rural;}
function stageKey(id){return !id||id==='rural'?SAVE_KEY:SAVE_KEY+'-'+id;}
var SCX=31;   // 대예배당 문 열(가운데)
// 노선: 태우는 곳(입구·나루) → 내리는 곳(대예배당 문 앞). 칸 좌표(가운데 .5)
var STAGE_ROUTE={
  mount:[[31.5,53.6],[31.5,49.5],[25.5,49.5],[25.5,38.5],[31.5,38.5],[31.5,37.4]],
  sea:[[31.5,47.2],[31.5,39.8]],
  city:[[31.5,53.6],[31.5,37.4]]
};
var STAGE_PICK={mount:[31,53],sea:[31,47],city:[31,53]},STAGE_DROP={mount:[31,37],sea:[31,39],city:[31,37]};
function stageRoute(){return STAGE_ROUTE[stageId()]||null;}
function dropNode(){var d=STAGE_DROP[stageId()];return d&&stg().trans?gid(d[0],d[1]):null;}
function routeLen(R){R=R||stageRoute();var L=0;for(var i=1;i<R.length;i++)L+=Math.hypot(R[i][0]-R[i-1][0],R[i][1]-R[i-1][1]);return L||1;}
function routeAt(t){   // 0~1 → {x,y,dx,dy}
  var R=stageRoute(),L=routeLen(R),d=clamp(t,0,1)*L;
  for(var i=1;i<R.length;i++){var a=R[i-1],b=R[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=l||i===R.length-1){var k=l?Math.min(1,d/l):0;return {x:a[0]+(b[0]-a[0])*k,y:a[1]+(b[1]-a[1])*k,dx:b[0]-a[0],dy:b[1]-a[1]};}d-=l;}
  return {x:R[0][0],y:R[0][1],dx:0,dy:-1};
}
/* 작은 결정적 난수 (지도 만들기용) */
function stRng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

/* ---------- 시작 지도 ----------
   돌려주는 것: {hgt,slp,water,floor,trees:[[x,y,종류]],city:[[정의,x,y]],veh:[...]} (칸 좌표) */
function stageMap(id){
  if(id==='mount')return mountMap();
  if(id==='sea')return seaMap();
  if(id==='city')return cityMap();
  return null;
}
function rectCells(r,f){for(var y=r[1];y<=r[3];y++)for(var x=r[0];x<=r[2];x++)f(x,y);}
// 산촌(스테이지 2라 단순하게): 넓고 평평한 분지(가로 반지름 22 · 세로 14의 타원) 둘레만 낮은 계단식 산(1~3층)이 두르고,
// 입구에서 분지까지는 한 번 굽은 짧은 협곡 길(폭 3칸)로 들어온다. 분지 서·동·북에 첫 단으로 오르는 흙 경사로
var MOUNT_RX=22,MOUNT_RY=14;
var MOUNT_CANYON=[[30,50,32,53],[24,48,32,50],[24,40,26,50],[24,37,32,39],[30,36,32,36]];
function mountE(x,y){var dx=(x+.5-31.5)/MOUNT_RX,dy=(y+.5-32)/MOUNT_RY;return Math.sqrt(dx*dx+dy*dy);}
function mountMap(){
  var hgt={},slp={},fl={},cn={},rnd=stRng(11),x,y;
  MOUNT_CANYON.forEach(function(r){rectCells(r,function(x,y){cn[x+','+y]=1;fl[x+','+y]=mountE(x,y)<1?'f_block':'f_gravel';});});
  for(y=0;y<PZ;y++)for(x=0;x<COLS;x++){
    var k=x+','+y,e=mountE(x,y);if(cn[k]||e<1)continue;
    var h=1+Math.floor((e-1)*5);
    for(var j=-1;j<=1;j++)for(var i=-1;i<=1;i++)if(cn[(x+i)+','+(y+j)])h=Math.max(h,2);   // 협곡 양옆은 절벽
    hgt[k]=clamp(h,1,3);
  }
  // 분지 가장자리에서 첫 단(1층)으로 오르는 흙 경사로: 가운데에서 서·동·북으로 나가다 처음 산을 만나기 바로 앞 칸
  [[-1,0,1],[1,0,0],[0,-1,3]].forEach(function(d){var cx=31,cy=32;while(!hgt[(cx+d[0])+','+(cy+d[1])]&&cx>1&&cx<COLS-2&&cy>1)cx+=d[0],cy+=d[1];
    slp[cx+','+cy]=d[2];hgt[(cx+d[0])+','+(cy+d[1])]=1;});
  // 산에 소나무·전나무, 분지에 몇 그루
  var trees=[];for(var t=0;t<120&&trees.length<20;t++){var tx=2+Math.floor(rnd()*60),ty=2+Math.floor(rnd()*(PZ-4));if(hgt[tx+','+ty]>=1&&!cn[tx+','+ty]&&!slp[tx+','+ty]&&!trees.some(function(q){return Math.abs(q[0]-tx)<4&&Math.abs(q[1]-ty)<4;}))trees.push([tx,ty,rnd()<.6?'pine':'fir']);}
  [[20,27],[42,27],[42,38],[14,34]].forEach(function(q){trees.push([q[0],q[1],'pine']);});
  return {hgt:hgt,slp:slp,water:{},floor:fl,trees:trees,veh:[{k:'truck'}]};
}
// 어촌: 40~46행을 가로지르는 큰 강(가장자리 지하 1층, 가운데 2층). 위·아래 나루(나무 바닥)와 길
function seaMap(){
  var hgt={},water={},fl={},x,y;
  for(y=40;y<=46;y++)for(x=0;x<COLS;x++){hgt[x+','+y]=(y===40||y===46)?-1:-2;water[x+','+y]=1;}
  rectCells([30,36,32,38],function(x,y){fl[x+','+y]='f_block';});
  rectCells([30,48,32,53],function(x,y){fl[x+','+y]='f_block';});
  rectCells([29,39,33,39],function(x,y){fl[x+','+y]='f_wood';});
  rectCells([29,47,33,47],function(x,y){fl[x+','+y]='f_wood';});
  var trees=[[6,48,'tree'],[14,50,'birch'],[48,49,'tree'],[56,51,'birch'],[8,34,'tree'],[52,35,'tree'],[18,30,'birch'],[44,24,'tree'],[12,14,'pine'],[50,10,'tree'],[24,8,'birch'],[40,14,'tree']];
  return {hgt:hgt,slp:{},water:water,floor:fl,trees:trees,veh:[{k:'ferry'}]};
}
// 도시: 교회 블록(22~41 × 24~39)과 입구 길만 비우고 이웃 건물(아파트·오피스·상가·주택·빌라)이 빼곡하다. 주차 구역도 건물이 차지하고 한 칸(8×6)만 비어 있다
var CITY_DEFS=['c_apt','c_office','c_villa','c_mart','c_house'];
function cityMap(){
  var fl={},rnd=stRng(23),used={},out=[],x,y;
  rectCells([30,36,32,53],function(x,y){fl[x+','+y]='f_block';});
  var res=function(x,y){return (x>=22&&x<=41&&y>=24&&y<=39)||(x>=29&&x<=33&&y>=36)||(x>=36&&x<=43&&y>=PZ&&y<=PZ+5)||y>=ROWS-RD;};
  var fits=function(x0,y0,w,h){if(x0<0||y0<0||x0+w>COLS||y0+h>ROWS-RD)return false;for(var j=-1;j<=h;j++)for(var i=-1;i<=w;i++){var cx=x0+i,cy=y0+j,inner=i>=0&&j>=0&&i<w&&j<h;if(inner&&res(cx,cy))return false;if(used[cx+','+cy])return false;}
    // 주차 구역과 부지 경계를 넘지 않는다
    return (y0>=PZ)===(y0+h-1>=PZ);};
  for(y=1;y<ROWS-RD;y++)for(x=1;x<COLS;x++){
    if(used[x+','+y])continue;
    var order=y>=PZ?['c_mart','c_house']:CITY_DEFS.slice().sort(function(){return rnd()-.5;});
    for(var o=0;o<order.length;o++){var d=D[order[o]];if(!d)continue;var w=d.w,h=d.h;
      if(fits(x,y,w,h)){out.push([order[o],x,y]);for(var j=0;j<h;j++)for(var i=0;i<w;i++)used[(x+i)+','+(y+j)]=1;break;}}
  }
  var trees=[[23,25,'ginkgo'],[40,25,'ginkgo'],[23,38,'ginkgo'],[40,38,'ginkgo']];
  return {hgt:{},slp:{},water:{},floor:fl,trees:trees,city:out};
}
// newState 뒤에 스테이지 지도를 입힌다 (대예배당·지형·바닥·나무·이웃 건물·처음 차량)
function applyStageMap(st,id){
  st.stage=id||'rural';st.veh=[];st.pq=0;st.pqm=0;st.vid=1;
  var m=stageMap(st.stage);if(!m)return st;
  st.hgt=m.hgt;st.slp=m.slp;st.water=m.water;st.floor=m.floor;
  // 시작 나무는 스테이지 것으로 바꾼다
  st.buildings=st.buildings.filter(function(b){return b.def==='main';});var nid=2;
  (m.trees||[]).forEach(function(t){st.buildings.push({id:nid++,def:t[2]||'tree',x:t[0],y:t[1],inUse:0,uses:0});});
  (m.city||[]).forEach(function(c){st.buildings.push({id:nid++,def:c[0],x:c[1],y:c[2],face:2,inUse:0,uses:0});});
  st.nextId=nid;
  (m.veh||[]).forEach(function(v){st.veh.push({id:st.vid++,k:v.k,drv:null,ph:'load',t:0,w:0,n:0,m:0});});
  return st;
}

/* ---------- 스테이지 고르기·저장 ---------- */
function loadStage(id){
  var raw=null;try{raw=localStorage.getItem(stageKey(id));}catch(e){}
  if(!raw)return null;
  var o=load(stageKey(id));return o&&(o.stage||'rural')===id?o:null;
}
// 다른 스테이지로 옮긴다: 지금 것을 저장하고, 그 스테이지의 저장이 있으면 이어서, 없으면 새 지도로 시작한다
function enterStage(id){
  if(!STAGE_SET[id])return;
  if(stageId()===id&&S.stage)return;
  if(S&&S.stage)save();
  var o=loadStage(id),dk=(S&&S.diff)||'normal';
  S=o||newState(dk,id);S.stage=id;
  V=[];F=[];WILD.length=0;UI.tool=null;UI.ghost=null;UI.sel=null;UI.undo=[];UI.pc=null;UI.selPiece=null;UI.selFloor=null;UI.lastBuilt=null;
  if(typeof CF!=='undefined')CF.length=0;
  if(!S.cands)refreshCands();rebuildOcc();recalc();if(!o)S.lvl=null;levelTick(true);
  if(typeof syncTabs==='function')syncTabs();if(typeof renderPanel==='function')renderPanel();if(typeof homeView==='function')homeView();hud(true);save();
}

/* ---------- 차량 ---------- */
function vehKinds(){var w=stg().trans;return Object.keys(VEH).filter(function(k){return VEH[k].w===w&&!VEH[k].free;});}
function vehs(){return S.veh||(S.veh=[]);}
function drvRefs(){   // 운전할 수 있는 사람: 봉사자·직원(청빙직원 제외)과 부교역자
  var L=[];(S.people||[]).forEach(function(p){if(!p.ext&&ppClass(p)!=='saint')L.push({ref:'p'+p.id,name:p.n,lv:p.lv,sub:ppRankName(p),face:personFace(p)});});
  (S.assoc||[]).forEach(function(a){L.push({ref:'a'+asUid(a),name:a.name,lv:(a.lv||1)*5,sub:a.title||'부교역자',face:null});});
  return L;
}
function drvOf(ref){if(!ref)return null;var L=drvRefs();for(var i=0;i<L.length;i++)if(L[i].ref===ref)return L[i];return null;}
function vehRun(v){return !!(VEH[v.k]&&(VEH[v.k].free||drvOf(v.drv)));}
function vehSpd(v){var d=drvOf(v.drv);return VEH[v.k].spd*(1+(d?d.lv:0)*VEH_DRV_LV);}
function opCap(){return vehs().reduce(function(n,v){return n+(vehRun(v)?VEH[v.k].cap:0);},0);}
function vehUp(){return vehs().reduce(function(n,v){return n+(VEH[v.k].up||0);},0);}
function vehBuy(k){
  var d=VEH[k];if(!d||vehKinds().indexOf(k)<0)return '이 스테이지에서는 살 수 없어요';
  if(S.money<d.cost)return '자금이 '+fmt(d.cost-S.money)+' 모자라요';
  S.money-=d.cost;vehs().push({id:S.vid=(S.vid||1)+1,k:k,drv:null,ph:'load',t:0,w:0,n:0,m:0});addLog(d.n+'을(를) 마련했어요');save();return '';
}
function vehSell(id){var v=vehs().filter(function(q){return q.id===id;})[0];if(!v||VEH[v.k].free)return '팔 수 없어요';if(v.n)return '사람을 태우고 있어요';
  S.veh=vehs().filter(function(q){return q!==v;});S.money+=Math.floor(VEH[v.k].cost*.5);save();return '';}
// 운전자 세우기: 한 사람은 한 차량만 (다른 차량에서 옮겨 온다). ref가 없으면 운전자를 뺀다
function vehSetDrv(id,ref){
  var v=vehs().filter(function(q){return q.id===id;})[0];if(!v)return '차량이 없어요';
  if(ref&&!drvOf(ref))return '운전할 수 없는 사람이에요';
  vehs().forEach(function(q){if(ref&&q.drv===ref)q.drv=null;});v.drv=ref||null;save();return '';
}
function drvBusy(ref){return vehs().some(function(v){return v.drv===ref;});}
// 기다리는 줄: 새 방문자(성도면 member)가 입구·나루에 서면 true (그 자리에서 걸어 들어오지 않는다)
function stageQueue(member){
  var t=stg().trans;if(!t)return false;
  if(t==='road'&&opCap()<=0)return false;
  var q=(S.pq||0)+(S.pqm||0);if(q>=PQ_MAX)return t==='water';   // 나루가 꽉 차면 그냥 돌아간다(어촌)
  if(t==='road'&&q>=opCap())return false;   // 차가 한 번에 태울 수 있는 만큼만 기다리고, 나머지는 걸어 온다
  if(member)S.pqm=(S.pqm||0)+1;else S.pq=(S.pq||0)+1;return true;
}
// 내리는 곳에 태워 온 사람을 내려 준다 (돌아갈 때도 그곳에서 차를 탄다 v.ride)
function dropOff(v){
  var dn=dropNode();if(dn==null)return;
  for(var i=0;i<v.n;i++){spawnV(i<v.m,dn);V[V.length-1].ride=true;}
  v.n=0;v.m=0;
}
function vehTick(v,dt){
  if(!vehRun(v)){if(v.ph!=='back'&&!v.n){v.ph='load';v.t=0;}else{v.t=Math.max(0,v.t-dt*.2);if(v.t<=0){v.ph='load';}}return;}
  var sp=vehSpd(v)/routeLen();
  if(v.ph==='load'){v.w+=dt;if(v.w>=VEH_LOAD){var cap=VEH[v.k].cap,qm=Math.floor(S.pqm||0),qv=Math.floor(S.pq||0),take=Math.min(cap,qm+qv);
      if(take>0){var tm=Math.min(take,qm);S.pqm-=tm;S.pq-=take-tm;v.n=take;v.m=tm;v.ph='go';v.w=0;}else v.w=VEH_LOAD*.5;}}
  else if(v.ph==='go'){v.t+=sp*dt;if(v.t>=1){v.t=1;v.ph='drop';v.w=0;}}
  else if(v.ph==='drop'){v.w+=dt;if(v.w>=VEH_LOAD){dropOff(v);v.ph='back';}}
  else{v.t-=sp*dt;if(v.t<=0){v.t=0;v.ph='load';v.w=0;}}
}
// 방문자 수 배율: 산촌은 걸어서 오면 적게, 차량 정원이 찰수록 회복 · 도시는 차량이 조금 더 데려온다
function stageVisK(){
  var s=stg();
  if(s.walk)return STG_WALK_VIS+(1-STG_WALK_VIS)*Math.min(1,opCap()/STG_RIDE_FULL);
  if(s.city)return 1+.25*Math.min(1,opCap()/STG_RIDE_FULL);
  if(s.trans==='water')return STG_SEA_VIS;
  return 1;
}
// 정착 배율: 산촌에서 먼 길을 걸어 온 사람은 덜 정착 · 도시는 낯가림이 심하고 신뢰도가 높을수록 회복
function stageJoinK(v){
  var s=stg(),k=1;
  if(s.walk&&!v.ride)k*=STG_WALK_JOIN;
  if(s.trans==='water')k*=STG_SEA_JOIN;
  if(s.city)k*=CITY_JOIN*(.6+.4*clamp(trustIdx()/80,0,1));
  return k;
}
// 주차 필요 배율 (satInfo의 park): 도시는 더 필요하고, 운행 중인 차량 정원만큼 줄어든다
function stageParkK(need){
  if(!stg().city)return need;
  return Math.max(need*.4,need*CITY_PARK_K-opCap()*CITY_VAN_PARK);
}

/* ---------- 산짐승 (산촌) ---------- */
var WILD=[];
var WILD_KIND={boar:{n:'멧돼지',body:'#5b4433',dark:'#3b2b20',leg:'#2e2219',w:1},deer:{n:'고라니',body:'#b88a5a',dark:'#8a6238',leg:'#6e4e2c',w:.9},racc:{n:'너구리',body:'#8a8478',dark:'#4d4842',leg:'#3a3632',w:.7}};
function wildRaid(){
  var n=WILD_N[0]+Math.floor(Math.random()*(WILD_N[1]-WILD_N[0]+1)),T=S.buildings.filter(function(b){var d=defOf(b);return d&&d.kind!=='tree'&&d.kind!=='city';});
  if(!T.length)return;
  for(var i=0;i<n;i++){
    var side=Math.floor(Math.random()*3),x=side===0?1:side===1?COLS-2:4+Math.random()*(COLS-8),y=side===2?1:4+Math.random()*(PZ-20);
    var b=T[Math.floor(Math.random()*T.length)],dm=bDims(b),ks=Object.keys(WILD_KIND);
    WILD.push({k:ks[Math.floor(Math.random()*ks.length)],x:x+.5,y:y+.5,tb:b.id,tx:b.x+dm.w/2,ty:b.y+dm.h+.4,st:'come',t:0,ph:Math.random()*6});
  }
  var k0=WILD_KIND[WILD[WILD.length-1].k].n;
  toast('🐗 산에서 '+k0+(n>1?' 등 '+n+'마리':'')+'가 내려왔어요 · 눌러서 쫓아내요',3200);sfx('error',.35);addLog('산짐승 '+n+'마리가 내려왔어요');
}
function wildTick(dt){
  for(var i=0;i<WILD.length;i++){
    var a=WILD[i],sp=WILD_SPEED*(a.st==='flee'?2.4:1),dx=a.tx-a.x,dy=a.ty-a.y,d=Math.hypot(dx,dy);a.t+=dt;
    if(a.st==='flee'){if(d<.5||a.x<0||a.y<0||a.x>COLS||a.y>PZ){a.dead=true;continue;}}
    else if(d<.8){   // 닿았다: 건물을 상하게 하고 잠시 머물다 돌아간다
      if(!a.hit){a.hit=true;var b=bById(a.tb);if(b&&maintainable(b)){b.cond=Math.max(0,condOf(b)-WILD_DMG);}gainRep(-WILD_REP*.5);}
      if(a.t>WILD_STAY)wildFlee(a,false);continue;
    }
    if(d>.01){a.x+=dx/d*Math.min(d,sp*dt);a.y+=dy/d*Math.min(d,sp*dt);a.fx=dx;a.fy=dy;}
    // 가까운 방문자는 놀라 돌아간다
    if(a.st==='come')V.forEach(function(v){if(v.dead||v.state==='inside'||v.scared)return;if(Math.hypot(v.x-a.x,v.y-a.y)<WILD_SCARE){v.scared=true;v.angry=2.5;v.why='산짐승이 무서워요';v.annoy=(v.annoy||0)+1;v.life=Math.min(v.life,4);}});
  }
  if(WILD.some(function(a){return a.dead;}))WILD=WILD.filter(function(a){return !a.dead;});
}
function wildFlee(a,byUser){
  a.st='flee';var ex=a.x<COLS/2?-2:COLS+2;a.tx=ex;a.ty=a.y-6;a.t=0;
  if(byUser){gainRep(WILD_REP);sfx('click',.5,0);toast(WILD_KIND[a.k].n+'를 산으로 돌려보냈어요',1600);}
}
function pickWild(px,py){
  var best=null,bd=1.4*G;
  WILD.forEach(function(a){if(a.st==='flee')return;var w=toWorld(px,py,groundZ(a.x,a.y)+.4),d=Math.hypot(w[0]-a.x,w[1]-a.y);if(d<bd){bd=d;best=a;}});
  return best;
}

/* ---------- 민원 (도시) ---------- */
var CITY_CMP=[
  {t:'주차',x:'주일마다 골목에 차가 줄지어 서서 이웃들이 불편해해요',park:1},
  {t:'소음',x:'찬양 소리가 창문 너머까지 들린다는 민원이 들어왔어요'},
  {t:'전단',x:'전도지가 아파트 우편함마다 꽂혀 있다는 민원이에요'},
  {t:'쓰레기',x:'행사 뒤 쓰레기가 길가에 남았다는 민원이에요'},
  {t:'줄',x:'예배 시간 앞 인도에 사람이 몰려 지나가기 어렵대요'}
];
function cityWeek(){
  var c=S.cov||{},p=CITY_CMP_P*(1.4-clamp(trustIdx()/100,0,1))*(1+Math.max(0,1-(c.park==null?1:c.park)))*Math.min(1.5,.5+S.members/60);
  if(S.cmp&&S.week-S.cmp.w>=CITY_CMP_WEEKS)S.cmp=null;
  if(Math.random()>=p)return;
  var L=CITY_CMP.filter(function(q){return !q.park||(c.park!=null&&c.park<.9);}),q=L[Math.floor(Math.random()*L.length)];
  S.cmp={t:q.t,x:q.x,w:S.week};gainRep(-CITY_CMP_REP);S.cmpN=(S.cmpN||0)+1;
  toast('📢 민원 · '+q.x,3400);addLog('민원('+q.t+'): '+q.x);
}
// 이웃 건물 땅째 사기
function cityPrice(b){var dm=bDims(b);return Math.round(dm.w*dm.h*CITY_LAND_K);}
function cityBuy(id){
  var b=bById(id);if(!b||defOf(b).kind!=='city')return '살 수 있는 건물이 아니에요';
  var c=cityPrice(b);if(S.money<c)return '자금이 '+fmt(c-S.money)+' 모자라요';
  S.money-=c;S.buildings=S.buildings.filter(function(x){return x!==b;});S.landN=(S.landN||0)+1;
  addLog(defOf(b).name+' 부지를 샀어요 · '+fmt(c));rebuildOcc();bump();recalc();save();return '';
}

/* ---------- 매 프레임·매주 ---------- */
function stageTick(dt){
  var s=stg();if(!s.trans&&!s.wild)return;
  if(s.trans){
    vehs().forEach(function(v){vehTick(v,dt);});
    // 오래 기다리면: 강(어촌)은 돌아가고, 길(산촌·도시)은 걸어서 온다
    var gv=(S.pq||0)*PQ_GIVEUP*dt,gm=(S.pqm||0)*PQ_GIVEUP*.3*dt;S.pq=Math.max(0,(S.pq||0)-gv);S.pqm=Math.max(0,(S.pqm||0)-gm);
    if(s.trans==='road'){S.pqW=(S.pqW||0)+gv;S.pqWm=(S.pqWm||0)+gm;
      while(S.pqW>=1){S.pqW-=1;spawnV(false);}while(S.pqWm>=1){S.pqWm-=1;spawnV(true);}}
  }
  if(s.wild)wildTick(dt);
}
function stageWeek(){
  var s=stg();
  if(s.wild&&S.week>=3&&Math.random()<WILD_P)wildRaid();
  if(s.city)cityWeek();
}
// 챙길 일
function stageWarnings(w){
  var s=stg();
  if(s.wild&&WILD.some(function(a){return a.st==='come';}))w.push('🐗 산짐승 '+WILD.filter(function(a){return a.st==='come';}).length+'마리가 내려왔어요 · 눌러서 쫓아내요');
  if(s.trans){var q=Math.floor((S.pq||0)+(S.pqm||0));
    if(s.trans==='water'&&q>=6)w.push('⛵ 나루에 '+q+'명이 배를 기다려요 · 직원 › 차량에서 배를 늘리고 운전자를 세워요');
    else if(s.trans==='road'&&opCap()<=0&&(S.lvl||1)>=2)w.push('🚐 '+(s.walk?'협곡 길이 멀어 걸어 오는 사람이 적어요':'차를 가져와 주차할 곳을 찾는 사람이 많아요')+' · 직원 › 차량에서 승합차를 마련해요');
    var idle=vehs().filter(function(v){return !vehRun(v);}).length;if(idle)w.push('🚐 운전자가 없는 차량 '+idle+'대 · 봉사자나 부교역자를 운전자로 세워요');}
  if(s.city&&S.cmp)w.push('📢 민원('+S.cmp.t+') · '+S.cmp.x);
}

/* ---------- 그리기 ---------- */
// 지도에 그릴 것(정렬 목록 E에 넣는다): 차량·배, 기다리는 사람, 산짐승, 강의 고깃배
function stageEntities(E){
  var s=stg();if(!s.trans&&!s.wild)return;
  if(s.trans){
    var R=stageRoute(),wz=s.trans==='water'?waterZ():0;
    vehs().forEach(function(v,i){var p=routeAt(v.t),off=((i%3)-1)*.45,ox=p.dy?off:0,oy=p.dx?off:0,x=p.x+ox,y=p.y+oy,z=s.trans==='water'?wz:groundZ(x,y),m=rotPt(x,y);
      E.push({x0:m[0]-.5,y0:m[1]-.5,x1:m[0]+.5,y1:m[1]+.5,zb:z,zt:z+.7,f:function(){drawVeh(v,x,y,z,p);}});});
    var pk=STAGE_PICK[stageId()],q=Math.floor((S.pq||0)+(S.pqm||0));
    if(pk&&q>0){var qm=rotPt(pk[0]+.5,pk[1]+.5);E.push({x0:qm[0]-.4,y0:qm[1]-.4,x1:qm[0]+.4,y1:qm[1]+.4,zb:0,zt:.6,f:function(){drawQueue(pk[0]+.5,pk[1]+.5,q);}});}
    if(s.trans==='water')for(var k=0;k<2;k++)(function(k){var span=COLS+8,bx=k?COLS+4-((S.clock*.6+20)%span):((S.clock*.45)%span)-4,by=k?44.3:41.7,m=rotPt(bx,by);
      E.push({x0:m[0]-.5,y0:m[1]-.5,x1:m[0]+.5,y1:m[1]+.5,zb:wz,zt:wz+.6,f:function(){drawBoat(bx,by,wz,k?-1:1,0,'fish');}});})(k);
  }
  WILD.forEach(function(a){var m=rotPt(a.x,a.y),z=groundZ(a.x,a.y);E.push({x0:m[0]-.3,y0:m[1]-.3,x1:m[0]+.3,y1:m[1]+.3,zb:z,zt:z+.5,f:function(){drawWild(a);}});});
}
// 화면 위 방향(오른쪽으로 가면 1)
function scrDir(dx,dy){var a=rotPt(0,0),b=rotPt(dx,dy);return (b[0]-a[0])-(b[1]-a[1])>=0?1:-1;}
function drawVeh(v,x,y,z,p){
  var d=VEH[v.k];if(d.w==='water'){drawBoat(x,y,z,scrDir(p.dx,p.dy)*(v.ph==='back'?-1:1),v.n,v.k);return;}
  var along=Math.abs(p.dx)>Math.abs(p.dy),L=v.k==='bus'?1.5:1.1,W=.62,r=along?rrect(x-L/2,y-W/2,x+L/2,y+W/2):rrect(x-W/2,y-L/2,x+W/2,y+L/2);
  var col=v.k==='bus'?'#e8b23a':v.k==='truck'?'#7fa35a':'#f4f1ea',run=vehRun(v);
  box(r,z+.12,z+.62,col,shade(col,1.08));
  // 창문 띠
  fr('L',r,r.x0+.06,r.x1-.06,z+.4,z+.56,run?'#7fb2d6':'#9aa6ae');fr('R',r,r.y0+.06,r.y1-.06,z+.4,z+.56,shade(run?'#7fb2d6':'#9aa6ae',.85));
  fr('L',r,r.x0,r.x1,z+.2,z+.27,'#4f9a8a');fr('R',r,r.y0,r.y1,z+.2,z+.27,shade('#4f9a8a',.8));
  // 바퀴
  [[r.x0+.18,r.y1],[r.x1-.18,r.y1]].forEach(function(w){dot(w[0],w[1],z+.1,Math.max(1.2,2.2*PJ.s),'#2a2a2a');});
  // 지붕의 작은 십자가
  var cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;quad([[cx-.02,cy,z+.62],[cx+.02,cy,z+.62],[cx+.02,cy,z+.8],[cx-.02,cy,z+.8]],'#c4503a');quad([[cx-.07,cy,z+.72],[cx+.07,cy,z+.72],[cx+.07,cy,z+.75],[cx-.07,cy,z+.75]],'#c4503a');
  if(v.n)vehBadge(x,y,z+.95,v.n);
}
function drawBoat(x,y,z,dir,n,k){
  var m=rotPt(x,y),q=P(m[0],m[1],z),c=PJ.c,s=Math.max(.5,PJ.s),L=(k==='ship'?26:k==='ferry'?16:20)*s,H=(k==='ship'?7:5)*s,bob=Math.sin(S.clock*2.2+x)*1.2*s;
  c.save();c.translate(q[0],q[1]+bob);c.scale(dir<0?-1:1,1);
  c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(0,H*.4,L*.62,H*.45,0,0,6.283);c.fill();   // 물결
  c.fillStyle=k==='fish'?'#3d6f8f':k==='ferry'?'#8a5a34':'#a8643a';c.strokeStyle='rgba(28,24,20,.5)';c.lineWidth=1;
  c.beginPath();c.moveTo(-L/2,-H*.2);c.lineTo(L/2,-H*.6);c.lineTo(L*.36,H*.35);c.lineTo(-L*.4,H*.35);c.closePath();c.fill();c.stroke();
  c.fillStyle='#f3ead6';c.fillRect(-L/2+2*s,-H*.32,L-6*s,1.4*s);
  if(k==='boat'||k==='fish'){c.fillStyle='#5b4636';c.fillRect(-1*s,-H*2.6,1.6*s,H*2.4);c.fillStyle=k==='fish'?'#e9dfc8':'#fffaf0';c.beginPath();c.moveTo(.8*s,-H*2.5);c.lineTo(L*.34,-H*.7);c.lineTo(.8*s,-H*.7);c.closePath();c.fill();c.stroke();}
  if(k==='ship'){c.fillStyle='#f4f1ea';c.fillRect(-L*.18,-H*1.6,L*.34,H*1.1);c.fillStyle='#7fb2d6';c.fillRect(-L*.14,-H*1.4,L*.26,H*.38);c.fillStyle='#c4503a';c.fillRect(-L*.04,-H*2.3,2*s,H*.8);}
  if(k==='ferry'){c.fillStyle='#5b4636';c.fillRect(L*.15,-H*2.2,1.2*s,H*2);}
  // 탄 사람 머리
  for(var i=0;i<Math.min(n||0,6);i++){c.fillStyle=['#f2c9a0','#e0b48a','#c98f63'][i%3];c.beginPath();c.arc(-L*.3+i*L*.12,-H*.75,1.8*s,0,6.283);c.fill();}
  c.restore();
}
function vehBadge(x,y,z,n){var m=rotPt(x,y),q=P(m[0],m[1],z),c=PJ.c,s=Math.max(.6,PJ.s);c.font='700 '+Math.round(9*s)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';
  var t=n+'명',w=c.measureText(t).width+6*s;c.fillStyle='rgba(255,253,245,.92)';c.fillRect(q[0]-w/2,q[1]-6*s,w,12*s);c.fillStyle='#2f4a40';c.fillText(t,q[0],q[1]);}
// 입구·나루에서 기다리는 사람: 작은 사람 무리와 수
function drawQueue(x,y,n){
  var c=PJ.c,s=Math.max(.55,PJ.s);
  for(var i=0;i<Math.min(n,8);i++){var ox=(i%4-1.5)*.32,oy=Math.floor(i/4)*.32,m=rotPt(x+ox,y+oy),q=P(m[0],m[1],groundZ(x,y));
    c.fillStyle=['#c75b4a','#4a78c7','#8a5bb5','#d19a2e','#3d9b7a'][i%5];c.fillRect(q[0]-2*s,q[1]-8*s,4*s,7*s);c.fillStyle='#f2c9a0';c.beginPath();c.arc(q[0],q[1]-10*s,2.2*s,0,6.283);c.fill();}
  vehBadge(x,y,groundZ(x,y)+1.3,n);
}
function drawWild(a){
  var L=WILD_KIND[a.k],c=PJ.c,s=Math.max(.6,PJ.s)*L.w,m=rotPt(a.x,a.y),q=P(m[0],m[1],groundZ(a.x,a.y)),fl=scrDir(a.fx||1,a.fy||0)<0,step=Math.sin(S.clock*12+a.ph)*1.5;
  c.save();c.translate(q[0],q[1]);c.scale(fl?-1:1,1);
  c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.ellipse(0,0,9*s,3*s,0,0,6.283);c.fill();
  c.fillStyle=L.leg;[-5,-2,3,6].forEach(function(lx,i){c.fillRect(lx*s,-5*s+(i%2?step:-step)*.3*s,1.6*s,5*s);});
  c.fillStyle=L.body;c.beginPath();c.ellipse(0,-7*s,8*s,4.5*s,0,0,6.283);c.fill();
  c.fillStyle=L.dark;c.beginPath();c.ellipse(7*s,-8*s,3.4*s,3*s,0,0,6.283);c.fill();
  if(a.k==='boar'){c.fillStyle='#f4efe6';c.fillRect(9*s,-7*s,2.2*s,1*s);c.fillStyle=L.dark;c.fillRect(-4*s,-11.5*s,8*s,1.4*s);}
  if(a.k==='deer'){c.fillStyle=L.body;c.fillRect(6*s,-14*s,2*s,5*s);c.beginPath();c.ellipse(8*s,-14*s,2.6*s,2.2*s,0,0,6.283);c.fill();c.fillStyle='#fffaf0';c.fillRect(-8.5*s,-8*s,2*s,2*s);}
  if(a.k==='racc'){c.fillStyle='#2b2724';c.fillRect(6*s,-9*s,4*s,1.4*s);c.fillStyle=L.dark;for(var i=0;i<3;i++)c.fillRect((-11+i*1.6)*s,-8*s,1*s,3*s);}
  c.fillStyle='#111';c.fillRect(8*s,-9.2*s,1.2*s,1.2*s);
  c.restore();
  if(a.st==='come'){c.fillStyle='#d6261a';c.font='900 '+Math.round(12*Math.max(.7,PJ.s))+'px sans-serif';c.textAlign='center';c.textBaseline='bottom';c.fillText('!',q[0],q[1]-16*Math.max(.6,PJ.s));}
}
// 이웃 건물 (예전 칸 좌표, legacy 안에서): 높이·창문 띠·지붕 장식
var CITY_LOOK={c_apt:{wall:'#e6e1d7',trim:'#9aa3ad',glass:'#8fb6d9'},c_office:{wall:'#b9c7d3',trim:'#6f7f8f',glass:'#5f8fb8'},c_villa:{wall:'#e8d2bb',trim:'#a46b4a',glass:'#9cc3e3'},c_mart:{wall:'#f1ebe0',trim:'#c4503a',glass:'#9cc3e3'},c_house:{wall:'#efe6d2',trim:'#7d5440',glass:'#9cc3e3'}};
function drawCityBld(b){
  var d=D[b.def],L=CITY_LOOK[b.def]||CITY_LOOK.c_house,dm=faceDims(d,b.face),x=b.x,y=b.y,w=dm.w,h=dm.h,H=d.H;
  box(rrect(x+.02,y+.02,x+w-.02,y+h-.02),0,.04,'#bdb6aa');
  var r=rrect(x+.1,y+.1,x+w-.1,y+h-.1);
  box(r,.04,H,L.wall,b.def==='c_house'?null:shade(L.trim,1.25));
  var fl=Math.max(1,Math.round(H/.42));
  for(var f=0;f<fl;f++){var z0=.04+(f+.3)*(H-.1)/fl,z1=.04+(f+.72)*(H-.1)/fl;
    fr('L',r,r.x0+.08,r.x1-.08,z0,z1,L.glass);fr('R',r,r.y0+.08,r.y1-.08,z0,z1,shade(L.glass,.82));}
  // 기둥: 창문 띠를 몇 칸으로 나눈다
  ['L','R'].forEach(function(F){var a0=F==='L'?r.x0:r.y0,a1=F==='L'?r.x1:r.y1,n=Math.max(2,Math.round((a1-a0)/.6));for(var i=1;i<n;i++){var cx=a0+i*(a1-a0)/n;fr(F,r,cx-.025,cx+.025,.06,H-.04,F==='L'?L.wall:shade(L.wall,.8));}});
  if(b.def==='c_mart'){fr('L',r,r.x0,r.x1,H*.62,H*.8,L.trim);fr('R',r,r.y0,r.y1,H*.62,H*.8,shade(L.trim,.8));}
  if(b.def==='c_apt'){var cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;box({x0:cx-.25,y0:cy-.25,x1:cx+.25,y1:cy+.25},H,H+.3,'#c9c3b8');}
  if(b.def==='c_office'){var ax=r.x0+.3,ay=r.y0+.3;quad([[ax,ay,H],[ax+.03,ay,H],[ax+.03,ay,H+.6],[ax,ay,H+.6]],'#555');}
  if(b.def==='c_house'){var top=H+.5,mx=(r.x0+r.x1)/2,my=(r.y0+r.y1)/2,e=.06,a=[r.x0-e,r.y0-e,H],b2=[r.x1+e,r.y0-e,H],c2=[r.x1+e,r.y1+e,H],d2=[r.x0-e,r.y1+e,H],t=[mx,my,top];
    quad([a,b2,t],shade(L.trim,.8));quad([a,d2,t],shade(L.trim,.86));quad([d2,c2,t],shade(L.trim,1.04),EDGE);quad([b2,c2,t],shade(L.trim,.76),EDGE);}
}

/* ---------- 직원 화면 › 차량 탭 (차량·배가 다니는 스테이지에만) ---------- */
var VEH_IC={truck:'🛻',van:'🚐',bus:'🚌',ferry:'🛶',boat:'⛵',ship:'🚢'};
var VEH_PH={load:'태우는 중',go:'가는 중',drop:'내리는 중',back:'돌아오는 중'};
function tabShown(scr,t){if(scr==='roster'&&t==='fleet')return !!stg().trans;return true;}
function fleetHtml(){
  var s=stg(),wat=s.trans==='water',q=Math.floor((S.pq||0)+(S.pqm||0));
  var h='<div class="flt-h"><span>'+(wat?'⛵ 나루':'🚐 입구')+'에서 기다리는 사람 <b>'+q+'명</b></span><span>운행 중 정원 <b>'+opCap()+'명</b></span><span>주간 유지비 <b>'+fmt(vehUp())+'</b></span></div>';
  h+='<p class="shint">'+(wat?'강을 건너려면 배를 타야 해요. 나루에서 기다리는 사람을 태워 교회 앞 나루에 내려 줘요.':s.walk?'협곡 길은 멀어서 걸어 오는 사람이 적고 덜 정착해요. 차량이 입구에서 태워 오면 방문자가 늘어요.':'차량이 입구에서 태워 오면 주차 걱정이 줄고 방문자가 조금 늘어요.')+' 봉사자나 부교역자를 <b>운전자</b>로 세워야 움직여요.</p>';
  var L=vehs();
  h+=L.length?'<div class="flt-g">'+L.map(vehCardHtml).join('')+'</div>':'<p class="sempty">아직 차량이 없어요. 아래에서 마련해 보세요.</p>';
  h+='<div class="flt-buy">'+vehKinds().map(function(k){var d=VEH[k];return '<button class="btn'+(S.money>=d.cost?' pri':'')+'" data-act="rosvbuy" data-v="'+k+'"><i aria-hidden="true">'+VEH_IC[k]+'</i> '+d.n+' 마련 · 정원 '+d.cap+'명 · '+fmtS(d.cost)+'<small>유지비 주 '+fmtS(d.up)+'</small></button>';}).join('')+'</div>';
  if(UI.vPick){var v=L.filter(function(x){return x.id===UI.vPick;})[0];if(v)h+=drvPickHtml(v);else UI.vPick=null;}
  return h;
}
function vehCardHtml(v){
  var d=VEH[v.k],dr=drvOf(v.drv),run=vehRun(v);
  return '<div class="vcard'+(run?' run':'')+'"><div class="vc-ic" aria-hidden="true">'+VEH_IC[v.k]+'</div><div class="vc-b"><b>'+d.n+'</b><span>정원 '+d.cap+'명 · '+(run?VEH_PH[v.ph]+(v.n?' · '+v.n+'명 탑승':''):'운전자 없음 · 멈춰 있어요')+'</span>'+
    '<span class="vc-d">'+(d.free?(d.w==='water'?'마을 사공이 몰아요':'이장님이 몰아 줘요'):dr?'🧑‍✈️ '+dr.name+' <small>'+dr.sub+' · 속도 ×'+(1+dr.lv*VEH_DRV_LV).toFixed(2)+'</small>':'<em>운전자를 세워 주세요</em>')+'</span></div>'+
    '<div class="vc-a">'+(d.free?'':'<button class="btn sm'+(dr?'':' pri')+'" data-act="rosvdrv" data-v="'+v.id+'">'+(dr?'운전자 바꾸기':'운전자 세우기')+'</button><button class="btn sm" data-act="rosvsell" data-v="'+v.id+'">팔기 +'+fmtS(Math.floor(d.cost*.5))+'</button>')+'</div></div>';
}
function drvPickHtml(v){
  var L=drvRefs();
  return '<div class="vpick"><div class="vp-h"><b>'+VEH[v.k].n+' 운전자 고르기</b><button class="btn sm" data-act="rosvpick" data-v="">'+(v.drv?'운전자 빼기':'닫기')+'</button></div>'+
    (L.length?'<div class="vp-g">'+L.map(function(r){var busy=drvBusy(r.ref)&&v.drv!==r.ref;return '<button class="vp-p'+(v.drv===r.ref?' on':'')+'" data-act="rosvpick" data-v="'+r.ref+'">'+(r.face?'<img alt="" src="'+r.face+'">':'<i aria-hidden="true">⛪</i>')+'<b>'+r.name+'</b><small>'+r.sub+' · Lv '+r.lv+(busy?' · 다른 차 운전 중':'')+'</small></button>';}).join('')+'</div>':
      '<p class="sempty">운전할 사람이 없어요. 성도를 제자반까지 길러 봉사자로 세우거나 부교역자를 청빙하세요.</p>')+'</div>';
}
function fleetClick(a,v){
  if(a==='rosvbuy'){var w=vehBuy(v);scrToast(w||VEH[v].n+'을(를) 마련했어요 · 운전자를 세워 주세요',2200);sfx(w?'error':'coins',.5,0);renderScreen();hud(true);return true;}
  if(a==='rosvdrv'){UI.vPick=+v;sfx('click',.4);renderScreen();return true;}
  if(a==='rosvsell'){var w2=vehSell(+v);scrToast(w2||'차량을 팔았어요',1800);sfx(w2?'error':'coins',.5,0);renderScreen();hud(true);return true;}
  if(a==='rosvpick'){var id=UI.vPick;UI.vPick=null;if(v){var w3=vehSetDrv(id,v);scrToast(w3||(drvOf(v).name+'님이 운전을 맡았어요'),2000);sfx(w3?'error':'appoint',.5,0);}else{var vv=vehs().filter(function(x){return x.id===id;})[0];if(vv&&vv.drv){vehSetDrv(id,null);scrToast('운전자를 뺐어요',1600);}}renderScreen();return true;}
  return false;
}
// 스테이지 목표를 이룬 기록: 스테이지마다 저장이 따로라 따로 둔다 (스테이지 고르기 카드의 ✓)
function stageClears(){var o={};try{o=JSON.parse(localStorage.getItem(SAVE_KEY+'-clear')||'{}')||{};}catch(e){}if(S&&S.stageClear)for(var k in S.stageClear)o[k]=S.stageClear[k];return o;}
function stageClearSave(id){var o=stageClears();o[id]=S.week;try{localStorage.setItem(SAVE_KEY+'-clear',JSON.stringify(o));}catch(e){}}

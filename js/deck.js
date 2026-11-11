'use strict';
/* ---------- 데크 위에 짓기 ----------
   철골 계단·다리로 만든 평평한 위층 길 조각(데크)도 땅처럼 쓴다: 건물·조경·꾸밈·칸 건물·바닥 타일을 올릴 수 있다.
   · 데크 위 건물은 b.z(층)에 선다. 땅 위 건물은 b.z가 없고 그 칸의 땅 높이에 선다
   · 건물이 올라간 데크 조각은 걸을 수 없고, 철거할 수 없다(위의 것을 먼저 치운다)
   · 데크 밑의 땅은 그대로 걸어 다닐 수 있다
   · 바닥 타일은 데크 조각에 칠한다(p.f) */
var DECK={cov:{},up:null};
function isDeckPiece(p){return p.k!=='sky'&&!p.s&&p.x<COLS&&p.y<ROWS&&p.l>th(p.x,p.y);}
function deckAt(x,y){var best=null;piecesAt(x,y).forEach(function(p){if(isDeckPiece(p)&&(!best||p.l>best.l))best=p;});return best;}
// rebuildOcc 끝에서: 데크 위 건물 칸과 그 밑 데크 조각을 기록한다
function rebuildDeck(){
  DECK.cov={};DECK.up=[];for(var y=0;y<ROWS;y++)DECK.up.push(new Uint8Array(COLS));
  S.buildings.forEach(function(b){
    if(b.z==null)return;
    bTiles(b).forEach(function(t){
      if(t.y<0||t.x<0||t.y>=ROWS||t.x>=COLS)return;
      DECK.up[t.y][t.x]=1;
      piecesAt(t.x,t.y).forEach(function(p){if(p.l===b.z&&!p.s&&p.k!=='sky')DECK.cov[p.id]=b.id;});
    });
  });
}
function deckCovered(p){return !!(p&&DECK.cov[p.id]);}
// 그 칸에서 지을 수 있는 높이들: 길이 없는 평평한 땅, 또는 위에 아무것도 없는 데크
function cellLevels(x,y){
  if(x<0||y<0||x>=COLS||y>=ROWS)return [];
  var ps=piecesAt(x,y);
  if(!ps.length)return isRamp(x,y)?[]:[{l:th(x,y),deck:false}];
  var out=[];
  ps.forEach(function(p){if(isDeckPiece(p)&&!ps.some(function(q){return q!==p&&q.l>=p.l;}))out.push({l:p.l,deck:true});});
  return out;
}
/* 이 자리에 지을 때의 바닥 높이 {l, deck} 또는 {why}. 모든 칸이 같은 높이여야 하고, 가장 높은 공통 높이를 고른다 */
function placeLevel(d,x,y,face){
  var dm=faceDims(d,face),common=null,src={};
  for(var j=0;j<dm.h;j++)for(var i=0;i<dm.w;i++){
    var tx=x+i,ty=y+j;if(tx<0||ty<0||tx>=COLS||ty>=ROWS)return {why:'부지 밖이에요'};
    var wt=isWater(tx,ty)&&!piecesAt(tx,ty).length;
    if(wt&&!d.water)return {why:'물 위에는 다리와 물 분수만 놓을 수 있어요'};
    if(!wt&&d.water)return {why:'물이 찬 칸에만 놓을 수 있어요'};
    var lv=cellLevels(tx,ty);
    if(!lv.length)return {why:isRamp(tx,ty)?'흙 경사로 위에는 지을 수 없어요':'길·계단과 겹쳐요. 평평한 땅이나 데크에 지어 주세요'};
    lv.forEach(function(o){if(o.deck)src[o.l]=1;});
    var ls=lv.map(function(o){return o.l;});
    common=common==null?ls:common.filter(function(l){return ls.indexOf(l)>=0;});
  }
  if(!common||!common.length)return {why:'높이가 다른 칸에 걸쳐 지을 수 없어요'};
  var L=Math.max.apply(null,common);
  if(L+1>MAXH)return {why:'이 높이에는 지을 수 없어요'};
  return {l:L,deck:!!src[L]};
}
function plLevelZ(d,x,y,face){var p=placeLevel(d,x,y,face);if(d.water&&!p.why)return waterZ();return (p.why?th(clamp(x,0,COLS-1),clamp(y,0,ROWS-1)):p.l)*LV;}
// 건물을 이 자리의 높이에 세운다 (데크면 b.z, 땅이면 b.z 없음)
function setPlaceLevel(b,d,x,y,face){var p=placeLevel(d,x,y,face);if(!p.why&&p.deck)b.z=p.l;else delete b.z;}
// 데크 조각을 치울 수 없는 까닭
function pieceDemWhy(p){
  if(!p)return '없는 길이에요';
  if(deckCovered(p)){var b=bById(DECK.cov[p.id]);return (b?defOf(b).name+'이(가)':'건물이')+' 올라가 있어요. 위에 놓인 것을 먼저 치워 주세요';}
  return '';
}
// 화면에서 가장 위에 보이는 바닥면(높인 땅 윗면 또는 데크). 데크면 pid도 준다
function surfaceTile(px,py){
  var air=null;
  for(var z=MAXH*LV+.05;z>MINH*LV-.06;z-=.05){
    var w=toWorld(px,py,z),tx=Math.floor(w[0]),ty=Math.floor(w[1]);
    if(tx<0||ty<0||tx>=COLS||ty>=ROWS)continue;
    var dp=piecesAt(tx,ty).filter(function(p){return isDeckPiece(p)&&Math.abs(p.l*LV-z)<.055;})[0];
    if(dp)return {x:tx,y:ty,pid:dp.id};
    var gz=groundZ(w[0],w[1]);
    if(Math.abs(gz-z)<.055&&(th(tx,ty)||isRamp(tx,ty)))return {x:tx,y:ty};
    // 지면 아래로 내려간 시선은 처음 만나는 땅에서 멈춘다 (앞쪽 땅 너머의 파인 칸이 눌리지 않게)
    if(z<=0&&isWater(tx,ty)&&z<=waterZ())return {x:tx,y:ty};
    // 파인 칸 안에서 뒤쪽 흙벽에 닿으면, 벽이 아니라 지금 들여다보는 파인 칸을 고른다
    if(z<=0&&gz>=z-.055)return gz>z+.055&&air?air:{x:tx,y:ty};
    air={x:tx,y:ty};
  }
  var w0=toWorld(px,py,0);return {x:Math.floor(w0[0]),y:Math.floor(w0[1])};
}

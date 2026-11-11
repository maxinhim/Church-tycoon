'use strict';
/* ---------- 그림 조각(스프라이트) ----------
   Gemini 시트에서 tools/slice_sheet.py로 잘라 낸 assets/decor/*.png를 불러와 조경·꾸미기를 그린다.
   크기·밑변 자리·흔들림은 js/sprite-data.js(SPR_DATA, 자동 생성)에 있다.
   · 그림이 아직 안 왔거나 못 불러오면 원래의 벡터 그림으로 그린다 (게임은 그림 없이도 돌아간다)
   · 건물·꾸미기는 앞·뒤 그림과 좌우 뒤집기로 네 방향을 그린다 (울타리·생울타리는 아직 벡터)
   · 땅·바닥 타일은 질감(assets/tex)을 반복해 깐다
   · 바깥 숲 나무도 나무 그림 몇 가지를 섞어 쓴다 */
var SPR={},SPR_N=0,SPR_TOTAL=0,OUT_SPR=['tree','fir','pine','birch','tree','maple'];
function loadSprites(){
  Object.keys(SPR_DATA).forEach(function(id){
    var im=new Image();SPR_TOTAL++;
    im.onload=function(){SPR[id]=im;SPR_N++;
      // 다 오면 건축 카드의 작은 그림도 다시 그린다
      if(SPR_N===SPR_TOTAL&&typeof renderPanel==='function'&&!UI.fold&&UI.tab==='build')renderPanel();};
    im.src=SPR_DATA[id].src;
  });
}
function sprOf(id){return SPR[id]&&SPR_DATA[id]?SPR[id]:null;}
// (cx,cy): 바닥 가운데 (회전 전 좌표), n: 바닥 칸 수(너비), sid: 흔들림 위상, mir: 좌우 뒤집기
function drawSpr(id,cx,cy,n,sid,mir){
  var im=sprOf(id);if(!im)return false;
  var sd=SPR_DATA[id],c=PJ.c,s=PJ.s,p=rotPt(cx,cy),g=P(p[0],p[1],0);
  var dw=sd.fw*n*2*HW*U*s,dh=dw*sd.h/sd.w,by=g[1]+sd.by*n*HH*U*s;
  // 서 있는 것만 바닥 그림자 (납작한 화단·연못은 그림자 없이)
  if(sd.by<.4){c.fillStyle='rgba(20,40,10,.16)';c.beginPath();c.ellipse(g[0]+2*s,by-1*s,dw*.32,dw*.13,0,0,6.283);c.fill();}
  var sw=sd.sway?treeSway(sid)*s*sd.sway:0;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.translate(g[0],by);
  if(mir)c.scale(-1,1);
  if(sw)c.transform(1,0,-sw/dh,1,0,0);
  c.drawImage(im,-dw/2,-dh,dw,dh);
  c.restore();
  return true;
}
/* 방향: 화면에서 정면이 향하는 쪽 sd (0 ↘ 1 ↙ 2 ↖ 3 ↗).
   앞모습 그림은 앞면이 ↘, 뒷모습 그림은 뒷면이 ↘를 향한다.
   ↘ 앞모습 · ↙ 앞모습 뒤집기 · ↖ 뒷모습 · ↗ 뒷모습 뒤집기. 긴 것(앞뒤 같음)은 홀수일 때만 뒤집는다.
   그림의 앞면이 ↙를 향하게 그려졌으면(fl) 뒤집는 쪽이 반대.
   돌리는 것: 방향(dir)이 있는 정의, 또는 뒷모습 그림이 있는 것(건물). 크기는 바닥 너비((가로+세로)/2칸) 기준 */
function drawSprEntity(b){
  var d=D[b.def],id=d.spr||b.def,im=sprOf(id);if(!im)return false;
  // 층을 올린 건물은 그림을 쌓을 수 없어 지금처럼 코드로 그린다
  if((b.floors||1)>1)return false;
  var sd=SPR_DATA[id],turn=!!(d.dir||sd.back),dir=turn&&b.face!=null?worldToScreenDir(b.face):0,mir=false;
  if(turn){
    mir=(dir%2===1)!==!!sd.fl;
    if(dir>=2&&sd.back&&sprOf(sd.back))id=sd.back;
  }
  var dm=faceDims(d,b.face);
  return drawSpr(id,b.x+dm.w/2,b.y+dm.h/2,(dm.w+dm.h)/2,b.id||b.x*31+b.y,mir);
}
// 교회 입구 아치 (열림·닫힘). 아치는 x축을 따라 서 있어서 앞뒤 같은 긴 것처럼 뒤집는다
function drawGateSpr(){
  var id=S.open?'gate_o':'gate_c';if(!sprOf(id))return false;
  return drawSpr(id,ENT+.5,PZ,1,0,worldToScreenDir(2)%2===1);
}
/* ---------- 바닥 질감 ----------
   위에서 본 정사각형 질감을 땅 좌표에 맞춰 마름모로 눌러 반복한다 (이음새 없이 이어짐, 지도를 돌리면 함께 돈다).
   k: 질감 한 장이 덮는 칸 수. 작은 그림(건축 카드)에는 쓰지 않고 색으로 그린다 */
var TEXP={};
function texPattern(id,k){
  var im=sprOf(id);if(!im||typeof ctx==='undefined'||PJ.c!==ctx)return null;
  var p=TEXP[id];if(!p){try{p=ctx.createPattern(im,'repeat');}catch(e){p=null;}if(!p||!p.setTransform)return null;TEXP[id]=p;}
  var o=rotPt(0,0),ex=rotPt(1,0),ey=rotPt(0,1),O=P(o[0],o[1],0),X=P(ex[0],ex[1],0),Y=P(ey[0],ey[1],0),w=im.width/(k||1)/(G/U);
  p.setTransform(new DOMMatrix([(X[0]-O[0])/w,(X[1]-O[1])/w,(Y[0]-O[0])/w,(Y[1]-O[1])/w,O[0],O[1]]));
  return p;
}
// 그림이 없을 때 새 꾸미기를 단순한 상자로 그린다
function drawSprFallback(b){
  var d=D[b.def];box(rrect(b.x+.22,b.y+.22,b.x+.78,b.y+.78),0,Math.max(.2,heightOf(b.def)*.7),d.wall,d.roofc);
}
// 바깥 숲 나무 (def가 없는 나무)
function drawSprOutTree(t){
  var id=OUT_SPR[(t.id||0)%OUT_SPR.length];
  return drawSpr(id,t.x+.5,t.y+.5,1,t.id||0);
}

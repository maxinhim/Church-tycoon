'use strict';
/* ---------- 그림 조각(스프라이트) ----------
   Gemini 시트에서 tools/slice_sheet.py로 잘라 낸 assets/decor/*.png를 불러와 조경·꾸미기를 그린다.
   크기·밑변 자리·흔들림은 js/sprite-data.js(SPR_DATA, 자동 생성)에 있다.
   · 그림이 아직 안 왔거나 못 불러오면 원래의 벡터 그림으로 그린다 (게임은 그림 없이도 돌아간다)
   · 방향이 있는 것(울타리·벤치·생울타리 등)은 아직 벡터로 그린다. 네 방향 그림이 없어서다
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
  var dw=sd.fw*n*2*HW*s,dh=dw*sd.h/sd.w,by=g[1]+sd.by*n*HH*s;
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
   그림의 앞면이 ↙를 향하게 그려졌으면(fl) 뒤집는 쪽이 반대 */
function sprDir(d,b){
  if(!d.dir||b.face==null)return 0;
  return worldToScreenDir(b.face);
}
function drawSprEntity(b){
  var d=D[b.def],id=d.spr||b.def,im=sprOf(id);if(!im)return false;
  var sd=SPR_DATA[id],dir=sprDir(d,b),mir=false;
  if(d.dir){
    mir=(dir%2===1)!==!!sd.fl;
    if(dir>=2&&sd.back&&sprOf(sd.back))id=sd.back;
  }
  var dm=faceDims(d,b.face);
  return drawSpr(id,b.x+dm.w/2,b.y+dm.h/2,dm.w,b.id||b.x*31+b.y,mir);
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

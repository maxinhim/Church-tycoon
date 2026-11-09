'use strict';
/* ---------- 날씨 ----------
   날씨는 2~3일(약 70~100초)마다 바뀌고, 다음 날씨와 며칠 뒤인지 미리 알려 준다(시계의 '내일'·'2일 뒤').
   계절(올해 몇째 주)에 따라 나오는 날씨가 다르다. 겨울엔 눈, 여름엔 폭염·폭우.
   · 맑음: 방문자 조금 늘고, 야외 자리(벤치·피크닉·파라솔·야외 예배터)의 효과가 커진다
   · 흐림: 구름 그림자가 지나간다
   · 비: 방문자가 줄고 야외 자리는 쉰다. 실내 매장이 붐비고 우산이 펴진다. 길에 물웅덩이
   · 폭우·천둥: 방문자가 크게 줄고 벼락이 친다. 십자가 첨탑이 있으면 피뢰침이 되어 건물을 지킨다
   · 바람: 나무가 흔들리고 잎이 날린다. 파라솔은 접고, 놀이터는 연날리기로 붐빈다
   · 눈(겨울): 땅이 하얗게 덮이고 눈사람이 생긴다. 걸음이 느려진다. 성탄 무렵 눈이면 화이트 크리스마스
   · 폭염(여름): 편의 욕구가 빨리 떨어지고 시원한 음료가 잘 팔린다. 물가 장식(분수·연못·물길·새 물그릇)이 없으면 만족도가 떨어진다
   · 비가 그치고 개면 가끔 무지개가 뜬다 (만족·평판 조금 오름)
   · 주일에 비·눈·폭우면 출석이 줄어든다. 주차장이 넉넉하면 덜 준다 */
var WEATHER={
  sun:{n:'맑음',vis:1.1,tip:'방문자가 조금 늘고 야외 자리가 인기예요'},
  cloud:{n:'흐림',vis:1,tip:'구름이 끼었어요'},
  rain:{n:'비',vis:0.7,tip:'야외 자리는 쉬고 실내 매장이 붐벼요'},
  storm:{n:'폭우·천둥',vis:0.4,tip:'방문자가 크게 줄고 벼락이 쳐요. 십자가 첨탑이 피뢰침이 돼요'},
  wind:{n:'바람',vis:0.9,tip:'파라솔은 접고, 놀이터는 연날리기로 붐벼요'},
  snow:{n:'눈',vis:0.75,tip:'걸음이 느려지지만 아이들이 눈사람을 만들어요'},
  heat:{n:'폭염',vis:0.8,tip:'편의 욕구가 빨리 떨어지고 시원한 음료가 잘 팔려요. 물가 장식이 있으면 덜 지쳐요'}
};
// 계절별로 나올 날씨의 비율
var WX_SEASON={
  spring:{n:'봄',w:{sun:40,cloud:25,rain:20,wind:15}},
  summer:{n:'여름',w:{sun:33,cloud:14,rain:20,storm:13,heat:20}},
  autumn:{n:'가을',w:{sun:45,cloud:25,rain:12,wind:18}},
  winter:{n:'겨울',w:{sun:30,cloud:28,snow:32,wind:10}}
};
var OUTDOOR=['stage','bench','picnic','parasol','playground','market'];
function seasonKey(){var w=weekOfYear();return w>=10&&w<=22?'spring':(w<=35&&w>22?'summer':(w<=47&&w>35?'autumn':'winter'));}
function ensureWx(){
  if(!S.wx)S.wx={cur:'sun',next:'cloud',day:dayIdx(),left:3,snow:0,wet:0,bow:0,hits:0,lt:6,xmas:-1};
  return S.wx;
}
function rollWx(cur){
  var tab=WX_SEASON[seasonKey()].w;
  // 같은 날씨가 이어지기 쉽다 (그 계절에 나오는 날씨라면)
  if(tab[cur]&&Math.random()<0.35)return cur;
  var tot=0,k;for(k in tab)tot+=tab[k];
  var r=Math.random()*tot;
  for(k in tab){r-=tab[k];if(r<=0)return k;}
  return 'sun';
}
function wxNow(){return ensureWx().cur;}
function isWet(){var c=wxNow();return c==='rain'||c==='storm';}
function hasWater(){return S.buildings.some(function(b){var k=defOf(b).kind;return k==='fountain'||k==='pond'||k==='canal'||k==='birdbath';});}
// 날씨에 따라 쓸 수 없는 야외 자리
function wxOpen(d){
  var c=wxNow();
  if(OUTDOOR.indexOf(d.kind)<0)return true;
  if(c==='rain'||c==='storm'||c==='snow')return false;
  if(c==='wind'&&d.kind==='parasol')return false;
  return true;
}
// 매장 판매 배율: 비·눈엔 실내 매장, 폭염엔 음료 매장
function wxSale(d){
  var c=wxNow();
  if((c==='rain'||c==='storm'||c==='snow')&&d.kind==='bld')return 1.25;
  if(c==='heat'&&['cafe','shop','bakery','books'].indexOf(d.id)>=0)return 1.4;
  return 1;
}
// 야외 자리 효과 배율: 맑으면 더 좋고, 바람 부는 날 놀이터는 연날리기
function wxFill(d){
  var c=wxNow();
  if(c==='sun'&&OUTDOOR.indexOf(d.kind)>=0)return 1.25;
  if(c==='wind'&&d.kind==='playground')return 1.3;
  return 1;
}
// 바깥에 있는 방문자의 편의 욕구가 떨어지는 속도(초당)
function wxDrain(){var c=wxNow();return c==='heat'?0.2:(c==='rain'||c==='storm'?0.12:(c==='snow'?0.1:0));}
function wxSpeed(){return 1-0.25*ensureWx().snow;}
// 주일 출석 배율 (주차장이 넉넉하면 덜 줄어든다)
function wxAttend(){
  var c=wxNow(),pk=clamp((S.cov&&S.cov.park)||0,0,1);
  if(c==='storm')return 0.7+0.15*pk;
  if(c==='rain')return 0.85+0.12*pk;
  if(c==='snow')return 0.8+0.12*pk;
  if(c==='heat')return 0.93;
  return 1;
}
function wxSpan(){return Math.random()<0.5?2:3;}
// 날씨가 바뀔 때
function advanceWx(){
  var w=ensureWx(),prev=w.cur;
  w.cur=w.next;w.next=rollWx(w.cur);w.hits=0;w.lt=4+Math.random()*6;
  var c=w.cur;
  if((prev==='rain'||prev==='storm')&&(c==='sun'||c==='cloud')&&Math.random()<0.55){
    w.bow=26;S.tempMood+=2;S.rep=clamp(S.rep+0.5,0,100);
    toast('비가 그치고 무지개가 떴어요! 만족도와 평판이 조금 올라요',3000);
  }else if(c!==prev)toast('오늘 날씨: '+WEATHER[c].n+' · '+WEATHER[c].tip,3000);
  if(c==='heat'&&!hasWater())S.tempMood-=1.5;
  if(c==='snow'&&weekOfYear()>=51&&w.xmas!==S.week){
    w.xmas=S.week;S.rep=clamp(S.rep+2,0,100);S.tempMood+=2;
    toast('화이트 크리스마스! 눈 오는 성탄에 평판이 올라요',3200);
  }
}
// 매 갱신: 날 바뀜, 눈 쌓임, 물웅덩이, 무지개, 벼락
function wxTick(dt){
  var w=ensureWx(),di=dayIdx();
  // 날마다 하루씩 줄이고, 다 지나면 다음 날씨로 (한 날씨가 2~3일 이어진다)
  if(di!==w.day){w.day=di;if(w.left==null)w.left=1;w.left--;if(w.left<=0){advanceWx();w.left=wxSpan();}}
  var c=w.cur;
  w.snow=c==='snow'?Math.min(1,w.snow+dt/50):Math.max(0,w.snow-dt/(c==='heat'||c==='sun'?30:80));
  w.wet=(c==='rain'||c==='storm')?Math.min(1,w.wet+dt/15):Math.max(0,w.wet-dt/(c==='wind'||c==='heat'?15:45));
  if(w.bow>0)w.bow=Math.max(0,w.bow-dt);
  if(c==='storm'){w.lt-=dt;if(w.lt<=0){w.lt=7+Math.random()*9;strike();}}
}
// 벼락: 첨탑이 있으면 첨탑이 받아 내고, 없으면 건물 하나가 상한다 (하루 두 번까지)
function strike(){
  var w=ensureWx(),sp=S.buildings.filter(function(b){return b.def==='spire';});
  var t=null;thunder();
  if(sp.length){
    t=sp[(Math.random()*sp.length)|0];
    F.push({x:t.x+.5,y:t.y+.5,z:2.9,t:1.6,d:1.6,text:'피뢰침 덕분에 무사해요',col:'#bfe3ff'});
  }else{
    var ms=S.buildings.filter(maintainable);
    if(ms.length&&w.hits<2&&Math.random()<0.6){
      t=ms[(Math.random()*ms.length)|0];w.hits++;
      t.cond=Math.max(0,condOf(t)-8);
      var dm=bDims(t);F.push({x:t.x+dm.w/2,y:t.y+dm.h/2,z:bLevel(t)*LV+bHeight(t)+.2,t:1.8,d:1.8,text:'벼락! 상태 −8',col:'#ffe28a'});
      toast('벼락이 떨어져 '+defOf(t).name+'이(가) 상했어요. 십자가 첨탑을 세우면 막을 수 있어요',3200);
    }
  }
  WX.flash=1;
  if(t){var d2=bDims(t);WX.bolt={x:t.x+d2.w/2,y:t.y+d2.h/2,z:bLevel(t)*LV+bHeight(t),t:0.35};}
  else WX.bolt={x:Math.random()*COLS,y:Math.random()*PZ,z:0,t:0.35};
}
function wxIcon(k){
  var sun='<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7"/>';
  var cloud='<path d="M7 18h10.5a3.8 3.8 0 0 0 .4-7.6A5.5 5.5 0 0 0 7.3 9.2 4.4 4.4 0 0 0 7 18z"/>';
  var cl2='<path d="M7 15h10.5a3.6 3.6 0 0 0 .4-7.2A5.3 5.3 0 0 0 7.3 6.6 4.2 4.2 0 0 0 7 15z"/>';
  var m={sun:sun,cloud:cloud,
    rain:cl2+'<path d="M8.5 18l-1 2.8M12.5 18l-1 2.8M16.5 18l-1 2.8"/>',
    storm:cl2+'<path d="M12.5 15.5l-2.5 4h3l-2 3.5"/>',
    wind:'<path d="M3 9h11a2.6 2.6 0 1 0-2.6-2.6M3 13.5h15a2.8 2.8 0 1 1-2.8 2.8M3 18h7"/>',
    snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.5L12 6.6l2.4-2.1M9.6 19.5L12 17.4l2.4 2.1"/>',
    heat:sun+'<path d="M19.5 3.5v5" stroke="#d6453a"/>'};
  return '<svg class="wxi wx-'+k+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(m[k]||sun)+'</svg>';
}

/* ---------- 날씨 그리기 (화면 효과는 저장하지 않는다) ---------- */
var WX={k:{},flash:0,bolt:null,drops:[],flakes:[],leaves:[],last:''};
// 날씨가 바뀌면 효과가 몇 초에 걸쳐 스며들고 빠진다
function stepWx(rdt){
  if(!S||!S.wx)return;
  var c=S.wx.cur;
  for(var k in WEATHER){var tg=k===c?1:0,v=WX.k[k]||0;WX.k[k]=v+(tg-v)*Math.min(1,rdt*0.6);}
  WX.flash=Math.max(0,WX.flash-rdt*2.6);
  if(WX.bolt){WX.bolt.t-=rdt;if(WX.bolt.t<=0)WX.bolt=null;}
  var rain=(WX.k.rain||0)+(WX.k.storm||0)*1.6,snow=WX.k.snow||0,wind=(WX.k.wind||0)+(WX.k.storm||0)*0.6;
  var nd=Math.round(rain*110),nf=Math.round(snow*90),nl=Math.round((WX.k.wind||0)*26);
  while(WX.drops.length<nd)WX.drops.push({x:Math.random()*VW,y:Math.random()*VH,l:8+Math.random()*10,v:520+Math.random()*260});
  WX.drops.length=Math.min(WX.drops.length,nd);
  while(WX.flakes.length<nf)WX.flakes.push({x:Math.random()*VW,y:Math.random()*VH,r:1+Math.random()*2.2,v:28+Math.random()*30,p:Math.random()*6.28});
  WX.flakes.length=Math.min(WX.flakes.length,nf);
  while(WX.leaves.length<nl)WX.leaves.push({x:Math.random()*VW,y:Math.random()*VH,v:120+Math.random()*120,p:Math.random()*6.28,c:['#6aa84f','#c9a21f','#d97f9f','#8fbf5a'][(Math.random()*4)|0]});
  WX.leaves.length=Math.min(WX.leaves.length,nl);
  var wx=40+wind*160;
  WX.drops.forEach(function(d){d.y+=d.v*rdt;d.x+=wx*0.35*rdt;if(d.y>VH){d.y=-10;d.x=Math.random()*(VW+80)-80;}if(d.x>VW)d.x-=VW;});
  WX.flakes.forEach(function(f){f.y+=f.v*rdt;f.p+=rdt;f.x+=(Math.sin(f.p)*14+wind*40)*rdt;if(f.y>VH){f.y=-6;f.x=Math.random()*VW;}if(f.x>VW)f.x-=VW;if(f.x<0)f.x+=VW;});
  WX.leaves.forEach(function(l){l.x+=l.v*rdt;l.p+=rdt*5;l.y+=Math.sin(l.p)*30*rdt+12*rdt;if(l.x>VW+10){l.x=-10;l.y=Math.random()*VH;}if(l.y>VH)l.y=0;});
}
function treeSway(id){var w=(WX.k.wind||0)+(WX.k.storm||0)*1.2;return w?Math.sin(S.clock*2.6+id*1.7)*w*2.4:0;}
function wxUmbrella(){return (WX.k.rain||0)+(WX.k.storm||0)+(WX.k.snow||0)*0.8>0.45;}
// 땅: 눈 덮임 (바닥 타일·길은 치워 둔 것으로 보고, 그 위에 다시 그린다)
function drawWxGround(){
  var sn=S.wx?S.wx.snow:0;if(sn<0.02)return;
  var c=PJ.c,B=BAND,a=(0.78*sn).toFixed(3),col='rgba(246,249,252,'+a+')';
  var reg=[[-B,-B,COLS+B,PZ],[-B,ROWS,COLS+B,ROWS+B],[-B,PZ,0,ROWS-1],[COLS,PZ,COLS+B,ROWS-1]];
  reg.forEach(function(g){var r=rrect(g[0],g[1],g[2],g[3]);quad([[r.x0,r.y0,.001],[r.x1,r.y0,.001],[r.x1,r.y1,.001],[r.x0,r.y1,.001]],col);});
}
// 바닥 타일 위 물웅덩이
function drawPuddles(){
  var wet=S.wx?S.wx.wet:0;if(wet<0.05)return;
  var c=PJ.c,s=PJ.s;
  c.fillStyle='rgba(120,160,200,'+(0.45*wet).toFixed(3)+')';
  for(var k in S.floor){
    var p=k.split(','),x=+p[0],y=+p[1];if(hh(x*3+1,y*5+2)>0.35)continue;
    var r=rotPt(x+.3+hh(x,y)*.4,y+.3+hh(y,x)*.4),q=P(r[0],r[1],.012);
    c.beginPath();c.ellipse(q[0],q[1],(5+hh(x+7,y)*6)*s*wet,(2.4+hh(x,y+7)*2.6)*s*wet,0,0,6.283);c.fill();
  }
}
// 흐린 날 땅 위를 지나가는 구름 그림자
function drawCloudShadows(){
  var k=(WX.k.cloud||0)*0.9+(WX.k.rain||0)*0.6+(WX.k.storm||0)*0.5;if(k<0.03)return;
  var c=PJ.c,s=PJ.s;
  c.fillStyle='rgba(20,35,50,'+(0.13*k).toFixed(3)+')';
  for(var i=0;i<5;i++){
    var span=COLS+16,wx=((S.clock*0.35+i*13.7)%span)-8,wy=(i*7.3+3)%(ROWS-2),r=rotPt(wx,wy),q=P(r[0],r[1],0);
    c.beginPath();c.ellipse(q[0],q[1],(150+i*30)*s,(70+i*12)*s,0,0,6.283);c.fill();
  }
}
// 화면 전체: 색조, 비·눈·잎, 번개, 무지개
function drawWxOverlay(c){
  if(!S.wx)return;
  var K=WX.k,tint=[[K.cloud,'40,55,70',.1],[K.rain,'30,45,65',.18],[K.storm,'15,22,40',.32],[K.snow,'210,225,240',.1],[K.heat,'255,170,60',.1]];
  tint.forEach(function(t){if(t[0]>0.01){c.fillStyle='rgba('+t[1]+','+(t[0]*t[2]).toFixed(3)+')';c.fillRect(0,0,VW,VH);}});
  if(S.wx.bow>0)drawRainbow(c,Math.min(1,S.wx.bow/4,(26-S.wx.bow)/3));
  if(WX.drops.length){
    c.strokeStyle='rgba(200,220,240,.55)';c.lineWidth=1.1;c.beginPath();
    var sl=0.18+((K.wind||0)+(K.storm||0))*0.25;
    WX.drops.forEach(function(d){c.moveTo(d.x,d.y);c.lineTo(d.x+d.l*sl,d.y+d.l);});c.stroke();
  }
  if(WX.flakes.length){c.fillStyle='rgba(255,255,255,.9)';WX.flakes.forEach(function(f){c.beginPath();c.arc(f.x,f.y,f.r,0,6.283);c.fill();});}
  WX.leaves.forEach(function(l){c.save();c.translate(l.x,l.y);c.rotate(l.p);c.fillStyle=l.c;c.beginPath();c.ellipse(0,0,3.6,1.7,0,0,6.283);c.fill();c.restore();});
  if(WX.bolt){
    var b=WX.bolt,r=rotPt(b.x,b.y),q=P(r[0],r[1],b.z),x=q[0],y=-10;
    c.strokeStyle='rgba(255,250,210,.95)';c.lineWidth=2.4;c.beginPath();c.moveTo(x+(hh(b.x*9|0,3)-.5)*80,y);
    for(var i=1;i<=7;i++){var yy=y+(q[1]-y)*i/7;c.lineTo(x+(i<7?(hh(i,b.y*7|0)-.5)*40:0),yy);}c.stroke();
  }
  if(WX.flash>0){c.fillStyle='rgba(255,255,245,'+(WX.flash*0.55).toFixed(3)+')';c.fillRect(0,0,VW,VH);}
}
function drawRainbow(c,a){
  var cx=VW*0.62,cy=VH*0.95,R=Math.min(VW,VH*1.6)*0.62,cols=['#e8433a','#f08c2a','#f5d33c','#5cb85c','#3f8fd6','#5a4fc0','#9a5bc0'];
  c.save();c.globalAlpha=0.2*a;c.lineWidth=Math.max(5,R*0.022);
  cols.forEach(function(col,i){c.strokeStyle=col;c.beginPath();c.arc(cx,cy,R-i*c.lineWidth,Math.PI*1.08,Math.PI*1.92);c.stroke();});
  c.restore();
}
// 눈이 쌓이면 빈 잔디 몇 곳에 눈사람이 생긴다 (정렬해서 그리도록 장면 목록에 넣는다)
function snowmen(){
  if(!S.wx||S.wx.snow<0.55)return [];
  var out=[];
  for(var y=1;y<PZ-1;y++)for(var x=1;x<COLS-1;x++){
    if(hh(x*13+5,y*7+11)>0.012||th(x,y)||isRamp(x,y)||occ[y][x]||S.floor[x+','+y]||piecesAt(x,y).length)continue;
    out.push({x:x,y:y});
  }
  return out;
}
function drawSnowman(t){
  var p=rotPt(t.x+.5,t.y+.5),c=PJ.c,s=PJ.s,g=P(p[0],p[1],0),m=P(p[0],p[1],.28),h=P(p[0],p[1],.62);
  c.fillStyle='rgba(60,80,100,.2)';c.beginPath();c.ellipse(g[0],g[1],9*s,4*s,0,0,6.283);c.fill();
  c.fillStyle='#fbfdff';c.strokeStyle='rgba(120,140,160,.6)';c.lineWidth=1;
  c.beginPath();c.arc(m[0],m[1],8*s,0,6.283);c.fill();c.stroke();
  c.beginPath();c.arc(h[0],h[1],5.6*s,0,6.283);c.fill();c.stroke();
  c.fillStyle='#e8892c';c.beginPath();c.moveTo(h[0]+1*s,h[1]);c.lineTo(h[0]+6*s,h[1]+1.2*s);c.lineTo(h[0]+1*s,h[1]+1.8*s);c.fill();
  c.fillStyle='#c0392b';c.fillRect(h[0]-5*s,h[1]+4*s,10*s,2.2*s);
  c.fillStyle='#2b2b2b';c.beginPath();c.arc(h[0]-1.8*s,h[1]-1.6*s,.8*s,0,6.283);c.arc(h[0]+1.8*s,h[1]-1.6*s,.8*s,0,6.283);c.fill();
}

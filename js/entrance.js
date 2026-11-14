'use strict';
/* ---------- 교회 입구: 컨셉·안내문·꾸미기·레벨(투자) ----------
   입구는 교회의 얼굴이다. 기능이 있다:
   · 교회 이름(S.name, 최대 NAME_MAX글자)은 늘 들보 위 간판에 걸려 있다 (고르는 것이 아니다)
   · 레벨 1~ENT_MAX(100) (S.entr.lv): 건물처럼 '투자'로 한 번에 한 레벨씩 올린다. 값은 레벨이 오를수록 가파르게 비싸다(entrLvCost).
     올릴 때마다 방문자가 늘고(entrVis), 레벨이 오르면 입구도 꾸며진다 (4 문 앞 정원등 · 7 금빛 갓 · 10 금빛 첨두, render-church.js chGate)
   · 컨셉 (S.entr.st): 사서 끼운다. 'brick'은 처음부터. 사면 계속 소유(S.entr.own). 벽돌·콘크리트·돌·나무·대리석·유리·꽃 아치
   · 안내문 (S.entr.sg): 양쪽 기둥에 세로로 붙는 안내 문구 한 쌍. 사서 건다 (S.entr.sgOwn). 'm0'은 처음부터
   · 꾸미기 (S.entr.dOwn 산 것, S.entr.dOn 켠 것): 조명·깃발·화분·초롱·풍선·꽃문. 여러 개를 함께 켤 수 있다
   · 교회 문이 열려 있으면 문짝은 보이지 않는다 (안내문이 가려지지 않게)
   화면은 입구 카드의 '꾸미기' 단추가 여는 건축 패널 모양의 작은 창: 분류 칩 '컨셉 / 안내문 / 꾸미기', 그림 카드, 아래 줄에 레벨과 '투자'. 수치는 balance.js ENT_* */
var NAME_MAX=12;
function fitName(n){var a=Array.from(String(n==null?'':n).trim());return (a.slice(0,NAME_MAX).join(''))||'새빛교회';}
var ENT_STYLES=[
  {id:'brick',n:'벽돌',ic:'🧱',d:'붉은 벽돌 기둥과 나무 대문. 처음부터 있는 교회의 얼굴',
    spec:{pm:'brick',pc:'#a9543c',cap:'#d8cfc0',beam:'#5e3a1c',leaf:'#8a5a2b'},board:{bg:'#6e1f1f',fg:'#f6e7b4',fr:'#d9a94a'}},
  {id:'concrete',n:'콘크리트',ic:'🏢',d:'매끈한 회색 콘크리트 기둥과 검은 철제 대문. 도회적인 입구',
    spec:{pm:'concrete',pc:'#9ca2a8',cap:'#7d838a',beam:'#6a7077',trim:'#c9ced3',leaf:'#3a3f46',bar:'#15171b',slat:true,mat:'#454b52',band:false},board:{bg:'#15171b',fg:'#ffb21e',fr:'#c9ced3'}},
  {id:'stone',n:'돌',ic:'🪨',d:'큰 돌을 쌓은 든든한 기둥과 어두운 쇠 대문',
    spec:{pm:'stone',pc:'#b9b2a4',cap:'#8f887a',beam:'#8f887a',trim:'#d8cfc0',leaf:'#4a433a',bar:'#2f2a24'},board:{bg:'#5a554a',fg:'#f2ead0',fr:'#8f887a'}},
  {id:'wood',n:'나무',ic:'🛖',d:'따뜻한 통나무 기둥, 기와 얹은 등, 나무 대문',
    spec:{pm:'wood',pc:'#8a5a2b',cap:'#5a3a1a',beam:'#5a3a1a',leaf:'#a06f35',roof:'#8a3f30'},board:{bg:'#7a4f2a',fg:'#f6e7b4',fr:'#3a2616'}},
  {id:'marble',n:'대리석',ic:'🏛️',d:'결이 고운 흰 대리석에 금빛 띠와 금빛 대문살. 가장 화려한 입구',
    spec:{pm:'marble',pc:'#f1ede6',cap:'#ece4d2',beam:'#f1ede6',trim:'#d9a94a',leaf:'#f6f1e6',bar:'#d9a94a',mat:'#7a1f2e'},board:{bg:'#f6f1e6',fg:'#7a5a1e',fr:'#d9a94a'}},
  {id:'glass',n:'유리',ic:'🪟',d:'강철 틀에 투명한 유리문. 밝고 열린 현관',
    spec:{pm:'steel',pc:'#3d4650',cap:'#59626b',beam:'#2f5f7a',trim:'#9fd3e6',glass:true,bar:'#3d4650',mat:'#454b52'},board:{bg:'#0f2a3a',fg:'#7fe8ff',fr:'#9fd3e6'}},
  {id:'garden',n:'꽃 아치',ic:'🌸',d:'흰 기둥에 꽃이 흐드러진 정원 입구',
    spec:{pm:'plain',pc:'#e9e4da',cap:'#d8d2c4',beam:'#5a9a4f',trim:'#e57aa5',leaf:'#f1ece2',flower:true,mat:'#7a9a5a'},board:{bg:'#3f7a3a',fg:'#ffffff',fr:'#e57aa5'}}
];
// 안내문: 양쪽 기둥에 한 줄씩 세로로 쓰는 문구 (기둥마다 6글자 이내)
var ENT_SIGNS=[
  {id:'m0',a:'환영합니다',b:'어서오세요',d:'처음부터 있는 인사 문구'},
  {id:'m1',a:'주일예배',b:'오전11시',d:'예배 시간을 알려요'},
  {id:'m2',a:'함께해요',b:'사랑으로',d:'따뜻하게 맞이하는 문구'},
  {id:'m3',a:'사랑이',b:'있는교회',d:'교회의 마음을 담았어요'},
  {id:'m4',a:'말씀위에',b:'세운교회',d:'교회의 뿌리를 알려요'},
  {id:'m5',a:'누구나',b:'환영해요',d:'처음 오는 분도 편안하게'},
  {id:'m6',a:'쉼이있는',b:'예배당',d:'지친 분들을 부르는 문구'},
  {id:'m7',a:'새가족을',b:'기다려요',d:'새가족을 반기는 문구'},
  {id:'m8',a:'기도하는',b:'교회',d:'기도하는 교회라는 약속'},
  {id:'m9',a:'하나님의',b:'사랑안에',d:'가장 정성 들인 문구'}
];
// 꾸미기: 문 둘레를 꾸미는 소품. 여러 개를 함께 켤 수 있다
var ENT_DECOS=[
  {id:'lights',n:'조명',ic:'💡',d:'기둥 사이에 걸린 금빛 전구 줄'},
  {id:'flags',n:'깃발',ic:'🚩',d:'색색 깃발을 줄에 달아 잔칫집처럼'},
  {id:'planter',n:'화분',ic:'🪴',d:'기둥 아래 꽃이 핀 화분 한 쌍'},
  {id:'lantern',n:'초롱',ic:'🏮',d:'들보에 매단 붉은 초롱'},
  {id:'balloon',n:'풍선',ic:'🎈',d:'기둥 위에 둥실 뜬 풍선 다발'},
  {id:'flower',n:'꽃문',ic:'💐',d:'기둥과 들보를 타고 꽃이 흐드러진 꽃문'}
];
var ENT_STYLE_BY={},ENT_SIGN_BY={},ENT_DECO_BY={};
ENT_STYLES.forEach(function(x){ENT_STYLE_BY[x.id]=x;});ENT_SIGNS.forEach(function(x){ENT_SIGN_BY[x.id]=x;});ENT_DECOS.forEach(function(x){ENT_DECO_BY[x.id]=x;});
var ENT_SUBS=[['style','컨셉','🏛️'],['sign','안내문','🪧'],['deco','꾸미기','🎈']];

function entrFit(){
  var e=S.entr;
  if(!e)e=S.entr={lv:1,st:'brick',own:['brick'],sg:'m0',sgOwn:['m0'],dOwn:[],dOn:[]};
  S.name=fitName(S.name);
  e.lv=Math.max(1,Math.min(ENT_MAX,e.lv||1));
  if(e.st==='basic')e.st='brick';
  e.own=(e.own||['brick']).map(function(x){return x==='basic'?'brick':x;}).filter(function(x,i,a){return ENT_STYLE_BY[x]&&a.indexOf(x)===i;});
  if(e.own.indexOf('brick')<0)e.own.unshift('brick');
  if(e.own.indexOf(e.st)<0)e.st='brick';
  // 안내문: 예전 저장의 안내문(현수막 등)은 처음 문구로
  e.sgOwn=(e.sgOwn||[]).filter(function(x,i,a){return ENT_SIGN_BY[x]&&a.indexOf(x)===i;});
  if(e.sgOwn.indexOf('m0')<0)e.sgOwn.unshift('m0');
  if(!ENT_SIGN_BY[e.sg]||e.sgOwn.indexOf(e.sg)<0)e.sg='m0';
  e.dOwn=(e.dOwn||[]).filter(function(x,i,a){return ENT_DECO_BY[x]&&a.indexOf(x)===i;});
  e.dOn=(e.dOn||[]).filter(function(x,i,a){return e.dOwn.indexOf(x)>=0&&a.indexOf(x)===i;});
  delete e.ban;delete e.bans;
}
function entrVis(){
  var e=S.entr||{lv:1,sg:'m0',dOn:[]},v=1+ENT_VIS*lvM(e.lv)+(ENT_SIGN_VIS[e.sg]||0);
  (e.dOn||[]).forEach(function(id){v+=ENT_DECO_VIS[id]||0;});
  return v;
}
/* 투자: 한 번 = 한 레벨 */
function entrUpWhy(){
  var e=S.entr;if(e.lv>=ENT_MAX)return '최고 레벨이에요';
  if(S.money<entrLvCost(e.lv+1))return '자금이 부족해요';
  return '';
}
function entrUp(){
  var w=entrUpWhy();if(w)return w;
  S.money-=entrLvCost(S.entr.lv+1);S.entr.lv++;addLog('교회 입구에 투자해 Lv '+S.entr.lv+'이(가) 됐어요');recalc();save();return '';
}
function entrUpMany(n){var l0=S.entr.lv;while(n-->0&&!entrUpWhy())entrUp();return S.entr.lv-l0;}
/* 컨셉·안내문: 사면 끼운다, 가진 것은 바로 끼운다 */
function entrStyle(id){
  var e=S.entr,st=ENT_STYLE_BY[id];if(!st)return '없는 컨셉이에요';
  if(e.own.indexOf(id)<0){
    if(S.money<ENT_STYLE_COST[id])return '자금이 부족해요';
    S.money-=ENT_STYLE_COST[id];e.own.push(id);addLog('교회 입구를 '+st.n+' 컨셉으로 꾸몄어요');
  }
  e.st=id;recalc();save();return '';
}
function entrSign(id){
  var e=S.entr,sg=ENT_SIGN_BY[id];if(!sg)return '없는 안내문이에요';
  if(e.sgOwn.indexOf(id)<0){
    if(S.money<ENT_SIGN_COST[id])return '자금이 부족해요';
    S.money-=ENT_SIGN_COST[id];e.sgOwn.push(id);addLog('입구 안내문 「'+sg.a+' '+sg.b+'」을(를) 달았어요');
  }
  e.sg=id;recalc();save();return '';
}
// 꾸미기: 사면 켜고, 가진 것은 누를 때마다 켜고 끈다
function entrDeco(id){
  var e=S.entr,d=ENT_DECO_BY[id];if(!d)return '없는 꾸미기예요';
  var i=e.dOn.indexOf(id);
  if(e.dOwn.indexOf(id)<0){
    if(S.money<ENT_DECO_COST[id])return '자금이 부족해요';
    S.money-=ENT_DECO_COST[id];e.dOwn.push(id);e.dOn.push(id);addLog('입구에 '+d.n+'을(를) 달았어요');
  }else if(i>=0)e.dOn.splice(i,1);else e.dOn.push(id);
  recalc();save();return '';
}

/* ---------- 그림 ---------- */
// 입구 면(보이는 쪽 앞면)에 붙은 글씨: 면의 기울기를 따라 쓴다. fy: 면 앞쪽으로 띄운 거리, maxU: 글씨가 차지할 수 있는 폭(칸 단위, 넘으면 글자를 줄임)
function entrFront(){return rotPt(0,1)[1]-rotPt(0,0)[1]>=0?1:-1;}
function entrText(txt,x,z,px,font,col,line,prev,fy,maxU){
  var s=PJ.s;if(s<=.3&&!prev)return;
  var y=PZ+(fy||0),c=PJ.c,m=rotPt(x,y),q=P(m[0],m[1],z),m2=rotPt(x+1,y),q2=P(m2[0],m2[1],z),ax=q2[0]-q[0],ay=q2[1]-q[1],len=Math.hypot(ax,ay)||1,sz=Math.max(4.5,px*s);
  if(ax<0){ax=-ax;ay=-ay;}
  c.save();c.transform(ax/len,ay/len,0,1,q[0],q[1]);
  c.textAlign='center';c.textBaseline='middle';c.font=font+' '+sz+'px "IBM Plex Sans KR",sans-serif';
  if(maxU){var tw=c.measureText(txt).width,av=len*maxU;if(tw>av){sz=Math.max(4,sz*av/tw);c.font=font+' '+sz+'px "IBM Plex Sans KR",sans-serif';}}
  if(line){c.lineWidth=2.2;c.strokeStyle=line;c.strokeText(txt,0,0);}
  c.fillStyle=col;c.fillText(txt,0,0);c.restore();
}
// 교회 이름 간판 + 입구 방향을 따르는 십자가(얇은 상자 둘이라 입구와 같은 방향으로 선다)
function entrName(sp,prev){
  var w=EW/U,y=PZ,f=entrFront(),bd=sp.board;
  box(rrect(ENT+.26,y-.04,ENT+w-.26,y+.04),1.32,1.58,bd.fr);
  box(rrect(ENT+.28,y-.045,ENT+w-.28,y+.045),1.34,1.56,bd.bg);
  entrText(S.name,ENT+w/2,1.45,7.5,'600',bd.fg,null,prev,f*.047,w-.62);
  var cx=ENT+w/2;
  box(rrect(cx-.03,y-.025,cx+.03,y+.025),1.58,2.08,'#f4efe6','#fffbee');
  box(rrect(cx-.17,y-.025,cx+.17,y+.025),1.86,1.93,'#f4efe6','#fffbee');
}
// 안내문: 양쪽 기둥 앞면에 세로로 쓴 문구 (한 글자씩 아래로)
function entrSigns(sp,sg,prev){
  var w=EW/U,y=PZ,f=entrFront(),bd=sp.board,g=ENT_SIGN_BY[sg]||ENT_SIGN_BY.m0;
  [[ENT-.08,g.a],[ENT+w-.1,g.b]].forEach(function(p){
    var px=p[0],t=Array.from(p[1]),n=Math.max(1,t.length),z0=.2,z1=1.16;
    var yy=f>0?y+.1:y-.1-.03;
    box(rrect(px+.005,yy,px+.175,yy+.03),z0-.02,z1+.02,bd.fr);
    box(rrect(px+.015,yy,px+.165,yy+.034),z0,z1,bd.bg);
    var step=(z1-z0)/n;
    t.forEach(function(ch,i){entrText(ch,px+.09,z1-step*(i+.5),Math.min(7,step*30*.78),'700',bd.fg,null,prev,f*.1+f*.036);});
  });
}
// 꾸미기 소품
function entrDecoDraw(id,lv,prev){
  var w=EW/U,y=PZ,c=PJ.c,s=PJ.s,k=Math.max(.6,s),t=prev?0:S.clock,i,f=entrFront();
  var P2=function(x,yy,z){var m=rotPt(x,yy);return P(m[0],m[1],z);};
  var bulb=function(x,yy,z,col,r){var q=P2(x,yy,z);c.fillStyle=col;c.beginPath();c.arc(q[0],q[1],Math.max(1.3,r*k),0,6.283);c.fill();};
  var xl=ENT+.02,xr=ENT+w-.02;
  if(id==='lights'){
    // 두 기둥 머리 사이에 처진 전구 줄 + 들보 위 전구
    var a=P2(xl,y+f*.12,1.4),b=P2(xr,y+f*.12,1.4),mid=P2((xl+xr)/2,y+f*.12,1.14);
    c.strokeStyle='#3a2f20';c.lineWidth=Math.max(.6,.8*k);c.beginPath();c.moveTo(a[0],a[1]);c.quadraticCurveTo(mid[0],mid[1],b[0],b[1]);c.stroke();
    for(i=0;i<=8;i++){var u=i/8,x=xl+(xr-xl)*u,z=1.4-.26*Math.sin(Math.PI*u);bulb(x,y+f*.12,z,i%2?'#ffd23a':'#fff3b0',2.2);}
    for(i=0;i<7;i++)bulb(xl+.12+(xr-xl-.24)*i/6,y+f*.11,1.12,'#ffd23a',1.7);
  }else if(id==='flags'){
    var cols=['#ff4d6a','#ffb21e','#46b8ff','#46e08a','#b57aff'];
    var a2=P2(xl,y+f*.12,1.9),b2=P2(xr,y+f*.12,1.9);
    c.strokeStyle='#3a2f20';c.lineWidth=Math.max(.6,.8*k);c.beginPath();c.moveTo(a2[0],a2[1]);c.lineTo(b2[0],b2[1]);c.stroke();
    for(i=0;i<9;i++){var u2=(i+.5)/9,q=P2(xl+(xr-xl)*u2,y+f*.12,1.9),dx=(b2[0]-a2[0])/9*.4,dy=(b2[1]-a2[1])/9*.4,sw=Math.sin(t*3+i)*1.2*k;
      c.fillStyle=cols[i%5];c.beginPath();c.moveTo(q[0]-dx,q[1]-dy);c.lineTo(q[0]+dx,q[1]+dy);c.lineTo(q[0]+sw,q[1]+9*k);c.closePath();c.fill();}
  }else if(id==='planter'){
    [ENT-.2,ENT+w+.02].forEach(function(px){
      var yy=y+f*.22;
      box(rrect(px,yy-.08,px+.18,yy+.08),0,.2,'#b9694c','#d98a64');box(rrect(px-.01,yy-.09,px+.19,yy+.09),.2,.24,'#8c4a33','#b9694c');
      box(rrect(px+.02,yy-.05,px+.16,yy+.05),.24,.28,'#3f7a3a');
      for(var j=0;j<6;j++)bulb(px+.03+j*.025,yy+(j%2?.03:-.03),.34+(j%3)*.04,['#e57aa5','#f2c14e','#ffffff','#ff6a6a'][j%4],2);
    });
  }else if(id==='lantern'){
    for(i=0;i<3;i++){
      var lx=ENT+.3+(w-.6)*i/2,top=P2(lx,y+f*.1,1.1),bt=P2(lx,y+f*.1,.92),sw2=Math.sin(t*2+i*1.3)*1.2*k;
      c.strokeStyle='#3a2f20';c.lineWidth=Math.max(.6,.8*k);c.beginPath();c.moveTo(top[0],top[1]);c.lineTo(bt[0]+sw2,bt[1]-3*k);c.stroke();
      c.fillStyle='#e0452b';c.beginPath();c.ellipse(bt[0]+sw2,bt[1]+2*k,4.2*k,5.4*k,0,0,6.283);c.fill();
      c.fillStyle='#ffd23a';c.fillRect(bt[0]+sw2-3*k,bt[1]-3.4*k,6*k,1.4*k);c.fillRect(bt[0]+sw2-3*k,bt[1]+8*k,6*k,1.2*k);
      c.strokeStyle='#8c2414';c.lineWidth=Math.max(.5,.6*k);c.beginPath();c.moveTo(bt[0]+sw2,bt[1]-3*k);c.lineTo(bt[0]+sw2,bt[1]+8*k);c.stroke();
    }
  }else if(id==='balloon'){
    var bc=['#ff4d6a','#ffb21e','#46b8ff','#46e08a','#b57aff','#ff8ac8'];
    [[ENT-.12,0],[ENT+w-.06,3]].forEach(function(p){
      var base=P2(p[0]+.09,y,1.34);
      for(var j=0;j<6;j++){
        var ang=j*1.1+p[1],bx=base[0]+Math.cos(ang)*8*k+Math.sin(t*1.6+j+p[1])*1.2*k,by=base[1]-16*k-(j%3)*5*k-Math.abs(Math.sin(ang))*5*k+Math.sin(t*1.3+j)*1.2*k;
        c.strokeStyle='rgba(40,30,20,.55)';c.lineWidth=Math.max(.5,.6*k);c.beginPath();c.moveTo(base[0],base[1]);c.lineTo(bx,by+5*k);c.stroke();
        c.fillStyle=bc[(j+p[1])%6];c.beginPath();c.ellipse(bx,by,4.2*k,5.2*k,0,0,6.283);c.fill();
        c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(bx-1.4*k,by-1.8*k,1.2*k,1.7*k,0,0,6.283);c.fill();
      }
    });
  }else if(id==='flower'){
    var fc=['#e57aa5','#f2c14e','#ffffff','#ff8a4a','#b574d6'];
    // 들보를 따라 한 줄, 기둥 바깥 모서리를 따라 내려오는 꽃
    for(i=0;i<13;i++){bulb(ENT-.08+(w+.12)*i/12,y+f*.11,1.36+(i%2)*.05,'#3f7a3a',2.4);bulb(ENT-.08+(w+.12)*i/12,y+f*.115,1.38+(i%2)*.05,fc[i%5],2);}
    [ENT-.07,ENT+w+.08].forEach(function(px){for(var j=0;j<8;j++){bulb(px,y+f*.1,1.2-j*.14,'#3f7a3a',2.3);bulb(px,y+f*.105,1.2-j*.14,fc[(j+1)%5],1.9);}});
  }
}
// 입구 전체: 컨셉 대문 + 교회 이름 간판 + 기둥 안내문 + 꾸미기 (미리보기에도 같은 그림을 쓴다)
function entrScene(st,sg,lv,open,prev,decs){
  var d=ENT_STYLE_BY[st]||ENT_STYLE_BY.brick;
  chGate(d.spec,open,lv);
  entrSigns(d,sg,prev);
  entrName(d,prev);
  (decs||[]).forEach(function(id){entrDecoDraw(id,lv,prev);});
}
// 건축 카드에 쓰는 작은 그림 (그려 둔 것을 다시 쓴다)
var ENT_IC={};
function entrIcon(st,sg,lv,decs){
  var key=st+'|'+sg+'|'+lv+'|'+S.name+'|'+(decs||[]).join(','),u=ENT_IC[key],W=84,H=66;
  if(!u){
    var cv=document.createElement('canvas');cv.width=W*2;cv.height=H*2;
    var g=cv.getContext('2d');g.scale(2,2);
    var keep={c:PJ.c,ox:PJ.ox,oy:PJ.oy,s:PJ.s},rot=ROT;
    ROT=0;PJ.c=g;
    legacy(function(){
      var w=EW/U,s=Math.min((W-8)/((w+.5)*HW*U),(H*.88-6)/(2.2*ZH+w*HH*U*.5));
      PJ.s=s;PJ.ox=0;PJ.oy=0;var q0=P(ENT+w/2,PZ,0);PJ.ox=W/2-q0[0];PJ.oy=H*.88-q0[1];
      quad([[ENT-.45,PZ-.6,0],[ENT+w+.45,PZ-.6,0],[ENT+w+.45,PZ+.6,0],[ENT-.45,PZ+.6,0]],'#86b86f','rgba(40,80,30,.25)');
      quad([[ENT,PZ-.6,.004],[ENT+w,PZ-.6,.004],[ENT+w,PZ+.6,.004],[ENT,PZ+.6,.004]],'#d8d2c4');
      entrScene(st,sg,lv,true,true,decs);   // 미리보기는 문을 연 모습(안내문이 보이게)
    });
    ROT=rot;PJ.c=keep.c;PJ.ox=keep.ox;PJ.oy=keep.oy;PJ.s=keep.s;
    u=ENT_IC[key]=cv.toDataURL();
  }
  var im=new Image();im.src=u;im.width=54;im.height=42;im.alt='';im.setAttribute('aria-hidden','true');return im;
}

/* ---------- 창: 건축 패널과 같은 모양의 작은 창 (분류 칩 · 그림 카드 줄 · 아래 줄 정보와 투자) ---------- */
function openEntrDock(){
  if(UI.scr)closeScreen();
  if(isPlacing())endPlace();
  UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.sel=null;UI.selPiece=null;UI.choose=null;
  UI.entr={sub:(UI.entr&&UI.entr.sub)||'style'};UI.entrF=null;
  sfx('page',.35);UI.tab='build';UI.fold=false;UI.confirmNew=false;renderPanel();
}
function entrList(sub){return sub==='style'?ENT_STYLES:sub==='sign'?ENT_SIGNS:ENT_DECOS;}
function entrCards(){
  var e=S.entr,sub=UI.entr.sub;
  return entrList(sub).map(function(it){
    var own,on,cost;
    if(sub==='style'){own=e.own.indexOf(it.id)>=0;on=e.st===it.id;cost=ENT_STYLE_COST[it.id];}
    else if(sub==='sign'){own=e.sgOwn.indexOf(it.id)>=0;on=e.sg===it.id;cost=ENT_SIGN_COST[it.id];}
    else{own=e.dOwn.indexOf(it.id)>=0;on=e.dOn.indexOf(it.id)>=0;cost=ENT_DECO_COST[it.id];}
    return {it:it,own:own,on:on,cost:own?0:cost};
  });
}
function entrName2(it,sub){return sub==='sign'?it.a+' '+it.b:it.n;}
function renderEntr(){
  panel.scrollTop=0;
  panel.innerHTML='<div class="cards" id="cards"></div><div class="detail" id="detail"></div>';
  var cards=$('#cards'),e=S.entr,sub=UI.entr.sub;
  entrCards().forEach(function(c){
    var el=document.createElement('button');el.className='card ec'+(c.on?' sel':'')+(!c.own&&S.money<c.cost?' poor':'');el.dataset.act='epick';el.dataset.v=c.it.id;
    el.appendChild(entrIcon(sub==='style'?c.it.id:e.st,sub==='sign'?c.it.id:e.sg,e.lv,sub==='deco'?[c.it.id]:e.dOn));
    var vis=sub==='sign'&&ENT_SIGN_VIS[c.it.id]?'방문자 +'+Math.round(ENT_SIGN_VIS[c.it.id]*1000)/10+'%':sub==='deco'?'방문자 +'+Math.round(ENT_DECO_VIS[c.it.id]*1000)/10+'%':'';
    var nm=sub==='sign'?c.it.a:c.it.n,st=c.on?(sub==='deco'?'켜짐':'사용 중'):c.own?(sub==='deco'?'꺼짐':'보유'):fmtS(c.cost);
    el.setAttribute('aria-label',entrName2(c.it,sub)+', '+st);
    el.insertAdjacentHTML('beforeend','<span class="nm">'+nm+'</span><span class="pr">'+st+'</span><span class="ef"><i>'+(vis||'&nbsp;')+'</i></span>');
    cards.appendChild(el);
  });
  dragScroll(cards);
  cards.addEventListener('pointerover',function(ev){if(ev.pointerType!=='mouse')return;var k=ev.target.closest('.card');if(k){UI.entrF={sub:UI.entr.sub,id:k.dataset.v};renderEntrDetail();}});
  var cur=cards.querySelector('.sel');if(cur)scrollToCard(cards,cur);
  renderEntrDetail();
}
function renderEntrDetail(){
  var el=$('#detail');if(!el||!UI.entr)return;
  var e=S.entr,sub=UI.entr.sub,list=entrList(sub),f=UI.entrF&&UI.entrF.sub===sub?UI.entrF.id:(sub==='style'?e.st:sub==='sign'?e.sg:(e.dOn[0]||list[0].id)),
    it=list.filter(function(x){return x.id===f;})[0]||list[0],iw=entrUpWhy(),nxt=e.lv<ENT_MAX?entrLvCost(e.lv+1):0,
    vis=sub==='sign'&&ENT_SIGN_VIS[it.id]?' · 방문자 +'+Math.round(ENT_SIGN_VIS[it.id]*1000)/10+'%':sub==='deco'?' · 방문자 +'+Math.round(ENT_DECO_VIS[it.id]*1000)/10+'%':'';
  var btns=e.lv>=ENT_MAX?'<span class="meta">최고 레벨</span>':
    '<button class="btn'+(iw?'':' pri')+'" data-act="einvest" aria-label="입구 레벨 올리기 투자 '+fmtS(nxt)+'">투자 '+fmtS(nxt)+'</button>'+
    (e.lv<ENT_MAX-1?'<button class="btn" data-act="einvest10" aria-label="자금이 되는 만큼 최대 10레벨 투자">×10</button>':'');
  el.dataset.f='';
  el.innerHTML='<div class="tx full cinfo"><div class="cd"><b>입구 Lv '+e.lv+'/'+ENT_MAX+'</b> · 방문자 +'+Math.round((entrVis()-1)*1000)/10+'%</div><div class="ce"><b>'+entrName2(it,sub)+'</b> '+it.d+vis+'</div></div><div class="btns">'+btns+'</div>';
}
// 창에서 누른 동작. 처리했으면 true
function entrAct(a,v){
  if(a==='esub'){if(UI.entr){UI.entr.sub=v;UI.entrF=null;renderPanel();}return true;}
  if(a==='epick'&&UI.entr){
    var sub=UI.entr.sub,why=sub==='style'?entrStyle(v):sub==='sign'?entrSign(v):entrDeco(v);
    UI.entrF={sub:sub,id:v};
    if(why){toast(why,1600);sfx('error',.4);}else sfx('click',.5);
    renderPanel();hud(true);return true;
  }
  if(a==='einvest'||a==='einvest10'){
    var w=entrUpWhy();
    if(w){toast(w,1600);sfx('error',.4);return true;}
    var n=entrUpMany(a==='einvest'?1:10);
    toast('교회 입구 Lv '+S.entr.lv+(n>1?' (+'+n+')':''),1600);sfx('coins',.4,0);
    renderPanel();hud(true);return true;
  }
  return false;
}

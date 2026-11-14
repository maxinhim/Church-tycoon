'use strict';
/* ---------- 교회 입구: 컨셉·안내문·레벨(투자) ----------
   입구는 교회의 얼굴이다. 기능이 있다:
   · 레벨 1~ENT_MAX (S.entr.lv): 건물처럼 '투자'로 한 번에 한 레벨씩 올린다. 올릴 때마다 방문자가 ENT_VIS씩 늘어난다 (ministry.js refreshMods → MOD.vis).
     레벨이 오르면 입구 모습도 꾸며진다 (4 문 앞 정원등 · 7 금빛 갓 · 10 금빛 첨두, render-church.js chGate)
   · 컨셉 (S.entr.st): 사서 끼운다. 'brick'은 처음부터 있는 벽돌 대문. 사면 계속 소유(S.entr.own). 벽돌·콘크리트·돌·나무·대리석·유리·꽃
   · 안내문 (S.entr.sg): 사서 건다. 'name'(이름 간판)은 처음부터. 현수막 5종·전광판·대형 전광판·네온 십자가. 사면 계속 소유(S.entr.sgOwn), 안내문마다 방문자 ENT_SIGN_VIS
   화면은 입구 카드의 '꾸미기' 단추가 여는 건축 패널 모양의 창(렌더 entrDock): 분류 칩 '컨셉 / 안내문', 그림 카드, 아래 줄에 레벨과 '투자' 단추. 수치는 balance.js ENT_* */
var ENT_STYLES=[
  {id:'brick',n:'벽돌',ic:'🧱',d:'붉은 벽돌 기둥과 나무 대문. 처음부터 있는 교회의 얼굴',
    spec:{pm:'brick',pc:'#a9543c',cap:'#d8cfc0',beam:'#5e3a1c',leaf:'#8a5a2b'}},
  {id:'concrete',n:'콘크리트',ic:'🏢',d:'매끈한 회색 콘크리트 기둥과 검은 철제 대문. 도회적인 입구',
    spec:{pm:'concrete',pc:'#9ca2a8',cap:'#7d838a',beam:'#6a7077',trim:'#c9ced3',leaf:'#3a3f46',bar:'#15171b',slat:true,mat:'#454b52',band:false}},
  {id:'stone',n:'돌',ic:'🪨',d:'큰 돌을 쌓은 든든한 기둥과 어두운 쇠 대문',
    spec:{pm:'stone',pc:'#b9b2a4',cap:'#8f887a',beam:'#8f887a',trim:'#d8cfc0',leaf:'#4a433a',bar:'#2f2a24'}},
  {id:'wood',n:'나무',ic:'🛖',d:'따뜻한 통나무 기둥, 기와 얹은 등, 나무 대문',
    spec:{pm:'wood',pc:'#8a5a2b',cap:'#5a3a1a',beam:'#5a3a1a',leaf:'#a06f35',roof:'#8a3f30'}},
  {id:'marble',n:'대리석',ic:'🏛️',d:'결이 고운 흰 대리석에 금빛 띠와 금빛 대문살. 가장 화려한 입구',
    spec:{pm:'marble',pc:'#f1ede6',cap:'#ece4d2',beam:'#f1ede6',trim:'#d9a94a',leaf:'#f6f1e6',bar:'#d9a94a',mat:'#7a1f2e'}},
  {id:'glass',n:'유리',ic:'🪟',d:'강철 틀에 투명한 유리문. 밝고 열린 현관',
    spec:{pm:'steel',pc:'#3d4650',cap:'#59626b',beam:'#2f5f7a',trim:'#9fd3e6',glass:true,bar:'#3d4650',mat:'#454b52'}},
  {id:'garden',n:'꽃 아치',ic:'🌸',d:'흰 기둥에 꽃이 흐드러진 정원 입구',
    spec:{pm:'plain',pc:'#e9e4da',cap:'#d8d2c4',beam:'#5a9a4f',trim:'#e57aa5',leaf:'#f1ece2',flower:true,mat:'#7a9a5a'}}
];
var ENT_SIGNS=[
  {id:'name',n:'이름 간판',ic:'🪧',k:'name',d:'교회 이름을 새긴 나무 간판. 처음부터 있어요'},
  {id:'b0',n:'환영합니다',ic:'🎏',k:'banner',c:'#c4503a',d:'붉은 환영 현수막'},
  {id:'b1',n:'주일 예배 11시',ic:'🎏',k:'banner',c:'#3f5ea3',d:'예배 시간을 알리는 현수막'},
  {id:'b2',n:'함께해요 새빛',ic:'🎏',k:'banner',c:'#2f8f9d',d:'청록 현수막'},
  {id:'b3',n:'사랑이 있는 교회',ic:'🎏',k:'banner',c:'#d65a8a',d:'분홍 현수막'},
  {id:'b4',n:'말씀 위에 세운 교회',ic:'🎏',k:'banner',c:'#7a5bb5',d:'보랏빛 현수막'},
  {id:'led',n:'전광판',ic:'💡',k:'led',d:'교회 이름과 예배 안내가 돌아가며 뜨는 작은 전광판'},
  {id:'led2',n:'대형 전광판',ic:'📺',k:'led2',d:'멀리서도 보이는 큰 전광판. 이름과 안내가 색색으로 흘러요'},
  {id:'neon',n:'네온 십자가',ic:'✝️',k:'neon',d:'밤에도 환하게 빛나는 네온 십자가'}
];
var ENT_STYLE_BY={},ENT_SIGN_BY={};
ENT_STYLES.forEach(function(x){ENT_STYLE_BY[x.id]=x;});ENT_SIGNS.forEach(function(x){ENT_SIGN_BY[x.id]=x;});
var ENT_SUBS=[['style','컨셉','🏛️'],['sign','안내문','🪧']];

function entrFit(){
  var e=S.entr;
  if(!e)e=S.entr={lv:1,st:'brick',own:['brick'],sg:'name',sgOwn:['name']};
  e.lv=Math.max(1,Math.min(ENT_MAX,e.lv||1));
  // 예전 저장: 'basic' 모양과 현수막(ban/bans)을 새 이름으로
  if(e.st==='basic')e.st='brick';
  e.own=(e.own||['brick']).map(function(x){return x==='basic'?'brick':x;}).filter(function(x,i,a){return ENT_STYLE_BY[x]&&a.indexOf(x)===i;});
  if(e.own.indexOf('brick')<0)e.own.unshift('brick');
  if(e.own.indexOf(e.st)<0)e.st='brick';
  if(!e.sgOwn){e.sgOwn=['name'];(e.bans||[]).forEach(function(i){if(ENT_SIGN_BY['b'+i])e.sgOwn.push('b'+i);});if(e.sg==null)e.sg=e.ban!=null&&ENT_SIGN_BY['b'+e.ban]?'b'+e.ban:'name';}
  delete e.ban;delete e.bans;
  e.sgOwn=e.sgOwn.filter(function(x,i,a){return ENT_SIGN_BY[x]&&a.indexOf(x)===i;});
  if(e.sgOwn.indexOf('name')<0)e.sgOwn.unshift('name');
  if(!ENT_SIGN_BY[e.sg]||e.sgOwn.indexOf(e.sg)<0)e.sg='name';
}
function entrVis(){var e=S.entr||{lv:1,sg:'name'};return 1+ENT_VIS*(e.lv-1)+(ENT_SIGN_VIS[e.sg]||0);}
/* 투자: 한 번 = 한 레벨 */
function entrUpWhy(){
  var e=S.entr;if(e.lv>=ENT_MAX)return '최고 레벨이에요';
  if(S.money<ENT_LV_COST[e.lv+1])return '자금이 부족해요';
  return '';
}
function entrUp(){
  var w=entrUpWhy();if(w)return w;
  S.money-=ENT_LV_COST[S.entr.lv+1];S.entr.lv++;addLog('교회 입구에 투자해 Lv '+S.entr.lv+'이(가) 됐어요');recalc();save();return '';
}
function entrUpMany(n){var l0=S.entr.lv;while(n-->0&&!entrUpWhy())entrUp();return S.entr.lv-l0;}
/* 컨셉: 사면 끼운다, 가진 것은 바로 끼운다 */
function entrStyle(id){
  var e=S.entr,st=ENT_STYLE_BY[id];if(!st)return '없는 컨셉이에요';
  if(e.own.indexOf(id)<0){
    if(S.money<ENT_STYLE_COST[id])return '자금이 부족해요';
    S.money-=ENT_STYLE_COST[id];e.own.push(id);addLog('교회 입구를 '+st.n+' 컨셉으로 꾸몄어요');
  }
  e.st=id;recalc();save();return '';
}
/* 안내문: 사서 걸거나, 가진 것을 건다 */
function entrSign(id){
  var e=S.entr,sg=ENT_SIGN_BY[id];if(!sg)return '없는 안내문이에요';
  if(e.sgOwn.indexOf(id)<0){
    if(S.money<ENT_SIGN_COST[id])return '자금이 부족해요';
    S.money-=ENT_SIGN_COST[id];e.sgOwn.push(id);addLog('입구 안내문 「'+sg.n+'」을(를) 달았어요');
  }
  e.sg=id;recalc();save();return '';
}

/* ---------- 그림 ---------- */
// 입구 면(보이는 쪽 앞면)에 붙은 글씨: 면의 기울기를 따라 비스듬히 쓴다
function entrText(txt,x,z,px,font,col,line,prev){
  var s=PJ.s;if(s<=.3&&!prev)return;
  var y=PZ,c=PJ.c,m=rotPt(x,y),q=P(m[0],m[1],z),m2=rotPt(x+1,y),q2=P(m2[0],m2[1],z),ax=q2[0]-q[0],ay=q2[1]-q[1],len=Math.hypot(ax,ay)||1;
  if(ax<0){ax=-ax;ay=-ay;}
  c.save();c.transform(ax/len,ay/len,0,1,q[0],q[1]);
  c.textAlign='center';c.textBaseline='middle';c.font=font+' '+Math.max(5,px*s)+'px "IBM Plex Sans KR",sans-serif';
  if(line){c.lineWidth=2.2;c.strokeStyle=line;c.strokeText(txt,0,0);}
  c.fillStyle=col;c.fillText(txt,0,0);c.restore();
}
// 이름 간판: 들보 위 나무 판에 교회 이름
function entrName(prev){
  var w=EW/U,y=PZ,m=rotPt(ENT+w/2,y);
  box(rrect(ENT+.28,y-.04,ENT+w-.28,y+.04),1.32,1.56,'#5e3a1c');
  box(rrect(ENT+.3,y-.045,ENT+w-.3,y+.045),1.34,1.54,'#7a4f2a');
  entrText(S.name,ENT+w/2,1.44,8,'600','#f6e7b4','rgba(30,16,6,.85)',prev);
  cross(m[0],m[1],1.56,.6);
}
function entrBannerDraw(sg,prev){
  var w=EW/U,y=PZ;
  box(rrect(ENT+.12,y-.03,ENT+w-.12,y+.03),1.32,1.9,sg.c);
  entrText(sg.n,ENT+w/2,1.6,8,'700','#fff',null,prev);
}
// 전광판: 검은 판에 앰버색 글씨가 돌아가며 뜬다
function entrLed(prev){
  var w=EW/U,y=PZ,msg=[S.name,'주일 예배 11시','환영합니다'],t=prev?0:Math.floor(S.clock/3)%msg.length;
  box(rrect(ENT+.18,y-.045,ENT+w-.18,y+.045),1.32,1.66,'#15171b');
  box(rrect(ENT+.15,y-.05,ENT+w-.15,y+.05),1.32,1.34,CH_GOLD);box(rrect(ENT+.15,y-.05,ENT+w-.15,y+.05),1.64,1.66,CH_GOLD);
  entrText(msg[t],ENT+w/2,1.49,8,'700','#ffb21e',null,prev);
}
// 대형 전광판: 기둥 위로 올린 큰 화면. 이름 + 안내가 색색으로
function entrLed2(prev){
  var w=EW/U,y=PZ,s=PJ.s,msg=['주일 예배 11시','누구나 환영합니다','함께 예배해요'],t=prev?0:Math.floor(S.clock/3)%msg.length,hue=prev?0:Math.floor(S.clock*3)%6;
  box(rrect(ENT+.04,y-.03,ENT+.1,y+.03),1.3,1.7,'#3d4650');box(rrect(ENT+w-.1,y-.03,ENT+w-.04,y+.03),1.3,1.7,'#3d4650');
  box(rrect(ENT-.14,y-.06,ENT+w+.14,y+.06),1.7,2.34,'#15171b');
  box(rrect(ENT-.17,y-.065,ENT+w+.17,y+.065),1.7,1.74,CH_GOLD);box(rrect(ENT-.17,y-.065,ENT+w+.17,y+.065),2.3,2.34,CH_GOLD);
  var cols=['#ff4d6a','#ffb21e','#ffe94a','#46e08a','#4fc3ff','#b57aff'],i;
  for(i=0;i<9;i++){var dx=ENT-.1+(w+.2)*i/8,dm=rotPt(dx,y+.07);dot(dm[0],dm[1],2.25,Math.max(1,1.7*s),cols[(i+hue)%6]);}
  entrText(S.name,ENT+w/2,2.04,8.5,'700','#7fe8ff',null,prev);
  entrText(msg[t],ENT+w/2,1.84,6.2,'700','#ffb21e',null,prev);
}
// 네온 십자가: 들보 위에 높이 선 십자가, 번쩍임 없이 진한 분홍으로 밝게
function entrNeon(prev){
  var w=EW/U,y=PZ,c=PJ.c,s=PJ.s,m=rotPt(ENT+w/2,y),q=P(m[0],m[1],1.32),k=Math.max(.6,s);
  box(rrect(ENT+w/2-.03,y-.03,ENT+w/2+.03,y+.03),1.3,1.42,'#3d4650');
  var cx=q[0],cy=q[1]-12*k;
  [['#8a1040',5.4*k],['#ff4d8d',3.4*k],['#ffe6f0',1.4*k]].forEach(function(st){
    c.strokeStyle=st[0];c.lineWidth=st[1];c.lineCap='round';c.beginPath();c.moveTo(cx,cy-14*k);c.lineTo(cx,cy+16*k);c.moveTo(cx-9*k,cy-6*k);c.lineTo(cx+9*k,cy-6*k);c.stroke();
  });
  c.lineCap='butt';
}
// 입구 전체: 컨셉 대문 + 안내문 (st·sg 고르면 미리보기에도 같은 그림을 쓴다)
function entrScene(st,sg,lv,open,prev){
  var sp=(ENT_STYLE_BY[st]||ENT_STYLE_BY.brick).spec,g=ENT_SIGN_BY[sg]||ENT_SIGN_BY.name;
  chGate(sp,open,lv);
  if(g.k==='name')entrName(prev);
  else if(g.k==='banner')entrBannerDraw(g,prev);
  else if(g.k==='led')entrLed(prev);
  else if(g.k==='led2')entrLed2(prev);
  else if(g.k==='neon')entrNeon(prev);
}
// 건축 카드에 쓰는 작은 그림 (그려 둔 것을 다시 쓴다)
var ENT_IC={};
function entrIcon(st,sg,lv){
  var key=st+'|'+sg+'|'+lv+'|'+S.name,u=ENT_IC[key],W=84,H=66;
  if(!u){
    var cv=document.createElement('canvas');cv.width=W*2;cv.height=H*2;
    var g=cv.getContext('2d');g.scale(2,2);
    var keep={c:PJ.c,ox:PJ.ox,oy:PJ.oy,s:PJ.s},rot=ROT;
    ROT=0;PJ.c=g;
    legacy(function(){
      var w=EW/U,zt={name:1.95,banner:1.95,led:1.75,led2:2.4,neon:2.05}[(ENT_SIGN_BY[sg]||ENT_SIGN_BY.name).k]||2,s=Math.min((W-8)/((w+.5)*HW*U),(H*.88-6)/(zt*ZH+w*HH*U*.5));
      PJ.s=s;PJ.ox=0;PJ.oy=0;var q0=P(ENT+w/2,PZ,0);PJ.ox=W/2-q0[0];PJ.oy=H*.88-q0[1];
      quad([[ENT-.45,PZ-.6,0],[ENT+w+.45,PZ-.6,0],[ENT+w+.45,PZ+.6,0],[ENT-.45,PZ+.6,0]],'#86b86f','rgba(40,80,30,.25)');
      quad([[ENT,PZ-.6,.004],[ENT+w,PZ-.6,.004],[ENT+w,PZ+.6,.004],[ENT,PZ+.6,.004]],'#d8d2c4');
      entrScene(st,sg,lv,false,true);
    });
    ROT=rot;PJ.c=keep.c;PJ.ox=keep.ox;PJ.oy=keep.oy;PJ.s=keep.s;
    u=ENT_IC[key]=cv.toDataURL();
  }
  var im=new Image();im.src=u;im.width=W-8;im.height=H-6;im.alt='';im.setAttribute('aria-hidden','true');return im;
}

/* ---------- 창: 건축 패널과 같은 모양 (분류 칩 · 그림 카드 줄 · 아래 줄 정보와 투자) ---------- */
function openEntrDock(){
  if(UI.scr)closeScreen();
  if(isPlacing())endPlace();
  UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.sel=null;UI.selPiece=null;UI.choose=null;
  UI.entr={sub:(UI.entr&&UI.entr.sub)||'style'};UI.entrF=null;
  sfx('page',.35);UI.tab='build';UI.fold=false;UI.confirmNew=false;renderPanel();
}
function entrCards(){
  var e=S.entr,sub=UI.entr.sub;
  return (sub==='style'?ENT_STYLES:ENT_SIGNS).map(function(it){
    var own=sub==='style'?e.own.indexOf(it.id)>=0:e.sgOwn.indexOf(it.id)>=0,on=sub==='style'?e.st===it.id:e.sg===it.id;
    return {it:it,own:own,on:on,cost:own?0:(sub==='style'?ENT_STYLE_COST[it.id]:ENT_SIGN_COST[it.id])};
  });
}
function renderEntr(){
  panel.scrollTop=0;
  panel.innerHTML='<div class="cards" id="cards"></div><div class="detail" id="detail"></div>';
  var cards=$('#cards'),e=S.entr,sub=UI.entr.sub;
  entrCards().forEach(function(c){
    var el=document.createElement('button');el.className='card ec'+(c.on?' sel':'')+(!c.own&&S.money<c.cost?' poor':'');el.dataset.act='epick';el.dataset.v=c.it.id;
    el.appendChild(entrIcon(sub==='style'?c.it.id:e.st,sub==='sign'?c.it.id:e.sg,e.lv));
    var vis=sub==='sign'&&ENT_SIGN_VIS[c.it.id]?'방문자 +'+Math.round(ENT_SIGN_VIS[c.it.id]*100)+'%':'';
    el.setAttribute('aria-label',c.it.n+', '+(c.on?'사용 중':c.own?'보유':fmt(c.cost)));
    el.insertAdjacentHTML('beforeend','<span class="nm">'+c.it.n+'</span><span class="pr">'+(c.on?'사용 중':c.own?'보유':fmtS(c.cost))+'</span><span class="ef"><i>'+(vis||'&nbsp;')+'</i></span>');
    cards.appendChild(el);
  });
  dragScroll(cards);
  cards.addEventListener('pointerover',function(ev){if(ev.pointerType!=='mouse')return;var k=ev.target.closest('.card');if(k){UI.entrF={sub:UI.entr.sub,id:k.dataset.v};renderEntrDetail();}});
  var cur=cards.querySelector('.sel');if(cur)scrollToCard(cards,cur);
  renderEntrDetail();
}
function renderEntrDetail(){
  var el=$('#detail');if(!el||!UI.entr)return;
  var e=S.entr,sub=UI.entr.sub,list=sub==='style'?ENT_STYLES:ENT_SIGNS,f=UI.entrF&&UI.entrF.sub===sub?UI.entrF.id:(sub==='style'?e.st:e.sg),
    it=list.filter(function(x){return x.id===f;})[0]||list[0],iw=entrUpWhy(),nxt=e.lv<ENT_MAX?ENT_LV_COST[e.lv+1]:0,
    vis=sub==='sign'&&ENT_SIGN_VIS[it.id]?' · 방문자 +'+Math.round(ENT_SIGN_VIS[it.id]*100)+'%':'';
  var btns=e.lv>=ENT_MAX?'<span class="meta">최고 레벨</span>':
    '<button class="btn'+(iw?'':' pri')+'" data-act="einvest" aria-label="입구 레벨 올리기 투자 '+fmtS(nxt)+'">투자 '+fmtS(nxt)+'</button>'+
    (e.lv<ENT_MAX-1?'<button class="btn'+(iw?'':'')+'" data-act="einvest10" aria-label="자금이 되는 만큼 최대 10레벨 투자">×10</button>':'');
  el.dataset.f='';
  el.innerHTML='<div class="tx full cinfo"><div class="cd"><b>입구 Lv '+e.lv+' / '+ENT_MAX+'</b> · 방문자 +'+Math.round((entrVis()-1)*100)+'%</div><div class="ce"><b>'+it.n+'</b> '+it.d+vis+'</div></div><div class="btns">'+btns+'</div>';
}
// 창에서 누른 동작. 처리했으면 true
function entrAct(a,v){
  if(a==='esub'){if(UI.entr){UI.entr.sub=v;UI.entrF=null;renderPanel();}return true;}
  if(a==='epick'&&UI.entr){
    var why=UI.entr.sub==='style'?entrStyle(v):entrSign(v);
    UI.entrF={sub:UI.entr.sub,id:v};
    if(why){toast(why,1600);sfx('error',.4);}else sfx('click',.5);
    renderPanel();hud(true);return true;
  }
  if(a==='einvest'||a==='einvest10'){
    var w=entrUpWhy();
    if(w){toast(w,1600);sfx('error',.4);return true;}
    var l0=S.entr.lv,n=entrUpMany(a==='einvest'?1:10);
    toast('교회 입구 Lv '+S.entr.lv+(n>1?' (+'+n+')':''),1600);sfx('coins',.4,0);
    renderPanel();hud(true);return true;
  }
  return false;
}

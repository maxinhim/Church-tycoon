'use strict';
/* ---------- 교회 입구: 레벨·모양·현수막 ----------
   입구(파란 아치)는 교회의 얼굴이다. 기능이 있다:
   · 레벨 1~ENT_MAX (S.entr.lv): 올릴 때마다 방문자가 ENT_VIS씩 늘어난다 (ministry.js refreshMods → MOD.vis)
   · 모양 (S.entr.st): 사서 끼운다. 'basic'은 처음부터 있는 파란 아치. 사면 계속 소유(S.entr.own)
   · 현수막 (S.entr.ban = 목록 번호, null이면 없음): 사서 걸면 아치 위에 글씨가 뜨고 방문자가 ENT_BAN_VIS씩 늘어난다. 한 번 산 현수막은 다시 걸 수 있다(S.entr.bans)
   화면은 '꾸미기' 단추(#gpDeco, 입구 카드)나 입구를 눌러 여는 '교회 입구' 화면(screens.js, gate). 수치는 balance.js ENT_* */
var ENT_STYLES=[
  {id:'basic',n:'파란 아치',ic:'⛩️',d:'처음부터 있는 교회의 파란 아치'},
  {id:'stone',n:'돌 아치',ic:'🪨',d:'돌로 쌓은 든든한 입구'},
  {id:'wood',n:'나무 대문',ic:'🚪',d:'따뜻한 나무 대문과 기와 지붕'},
  {id:'glass',n:'유리 현관',ic:'🏢',d:'밝은 유리로 안이 보이는 현관'},
  {id:'garden',n:'꽃 아치',ic:'🌸',d:'꽃이 감긴 정원 아치'}
];
var ENT_BANNERS=[
  {n:'환영합니다',c:'#c4503a'},
  {n:'주일 예배 11시',c:'#3f5ea3'},
  {n:'함께해요 새빛',c:'#2f8f9d'},
  {n:'사랑이 있는 교회',c:'#d65a8a'},
  {n:'말씀 위에 세운 교회',c:'#7a5bb5'}
];
// 모양별 그림 색: 기둥 · 윗인방 · 문
var ENT_PAL={stone:{p:'#b9b2a4',t:'#8f887a',d:'#6f685c'},wood:{p:'#8a5a2b',t:'#5a3a1a',d:'#a06f35'},glass:{p:'#3d4650',t:'#2f5f7a',d:'#9fd3e6'},garden:{p:'#e9e4da',t:'#5a9a4f',d:'#e57aa5'}};
function entrFit(){
  var e=S.entr;
  if(!e)e=S.entr={lv:1,st:'basic',own:['basic'],ban:null,bans:[]};
  e.lv=Math.max(1,Math.min(ENT_MAX,e.lv||1));
  e.own=(e.own||['basic']).filter(function(x){return ENT_STYLES.some(function(s){return s.id===x;});});
  if(e.own.indexOf('basic')<0)e.own.unshift('basic');
  if(e.own.indexOf(e.st)<0)e.st='basic';
  e.bans=(e.bans||[]).filter(function(i){return i>=0&&i<ENT_BANNERS.length;});
  if(e.ban!=null&&(e.ban<0||e.ban>=ENT_BANNERS.length))e.ban=null;
}
function entrVis(){var e=S.entr||{lv:1,ban:null};return 1+ENT_VIS*(e.lv-1)+(e.ban!=null?ENT_BAN_VIS:0);}
function entrStyled(){return !!S.entr&&S.entr.st!=='basic';}
function entrBanner(){return !!S.entr&&S.entr.ban!=null?ENT_BANNERS[S.entr.ban]:null;}
/* 레벨업 */
function entrUpWhy(){
  var e=S.entr;if(e.lv>=ENT_MAX)return '최고 레벨이에요';
  if(S.money<ENT_LV_COST[e.lv+1])return '자금이 부족해요';
  return '';
}
function entrUp(){
  var w=entrUpWhy();if(w)return w;
  S.money-=ENT_LV_COST[S.entr.lv+1];S.entr.lv++;addLog('교회 입구를 Lv '+S.entr.lv+'로 올렸어요');recalc();save();return '';
}
/* 모양: 사면 끼운다, 가진 것은 바로 끼운다 */
function entrStyle(id){
  var e=S.entr,st=ENT_STYLES.filter(function(s){return s.id===id;})[0];if(!st)return '없는 모양이에요';
  if(e.own.indexOf(id)<0){
    if(S.money<ENT_STYLE_COST[id])return '자금이 부족해요';
    S.money-=ENT_STYLE_COST[id];e.own.push(id);addLog('교회 입구를 '+st.n+'(으)로 꾸몄어요');
  }
  e.st=id;recalc();save();return '';
}
/* 현수막: 사서 걸거나, 가진 것을 걸거나 뗀다 */
function entrBanner_(i){
  var e=S.entr,b=ENT_BANNERS[i];if(!b)return '없는 현수막이에요';
  if(e.bans.indexOf(i)<0){
    if(S.money<ENT_BANNER_COST[i])return '자금이 부족해요';
    S.money-=ENT_BANNER_COST[i];e.bans.push(i);addLog('현수막 「'+b.n+'」을(를) 샀어요');
  }
  e.ban=i;recalc();save();return '';
}
function entrBannerOff(){S.entr.ban=null;recalc();save();}

/* 그림: 파란 아치와 같은 짜임에 모양별 색을 넣는다 */
function drawArchStyled(){
  var y=PZ,p=ENT_PAL[S.entr.st]||ENT_PAL.stone,open=S.open;
  chGate(p,open);
  var w=EW/U;
  if(S.entr.st==='wood'){box(rrect(ENT-.12,y-.12,ENT+w+.12,y+.12),1.3,1.38,p.t);box(rrect(ENT+.1,y-.1,ENT+w-.1,y+.1),1.38,1.5,shade(p.t,.8));}
  if(S.entr.st==='glass'){box(rrect(ENT+.1,y-.01,ENT+w-.1,y+.01),1.3,1.36,'#9fd3e6');}
  if(S.entr.st==='garden'){for(var k=0;k<11;k++){var fx=ENT+.12+k*(w-.24)/10;dot(fx,y+.08,1.3+(k%2)*.05,Math.max(1.4,2.2*PJ.s),['#e57aa5','#f2c14e','#ffffff'][k%3]);}}
  var m=rotPt(ENT+w/2,y);
  if(S.entr.st!=='glass')cross(m[0],m[1],1.3,.7);
}
// 현수막: 윗인방 위에 걸린 천, 글씨는 화면 글씨로
function drawEntrBanner(){
  var b=entrBanner();if(!b)return;
  var y=PZ,c=PJ.c,s=PJ.s;
  box(rrect(ENT+.12,y-.03,ENT+EW/U-.12,y+.03),1.32,1.9,b.c);
  if(s>.42){var q=P(rotPt(ENT+EW/U/2,y)[0],rotPt(ENT+EW/U/2,y)[1],1.6);c.font='700 '+(Math.max(7,8*s))+'px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='#fff';c.fillText(b.n,q[0],q[1]);}
}
/* 화면 */
function entrHtml(){
  var e=S.entr,up=entrUpWhy(),nxt=e.lv<ENT_MAX?ENT_LV_COST[e.lv+1]:0,ban=e.ban!=null?ENT_BANNERS[e.ban].n:'없음';
  var h='<p class="shint">교회 입구는 방문자를 맞는 얼굴이에요. 레벨·모양·현수막을 꾸밀수록 방문자가 늘어요. 현재 방문자 <b>+'+Math.round((entrVis()-1)*100)+'%</b>.</p>';
  if(UI.scrTab==='sty'){
    return h+'<div class="entg">'+ENT_STYLES.map(function(s){var own=e.own.indexOf(s.id)>=0,on=e.st===s.id;
      return '<div class="entc'+(on?' on':'')+'"><span class="enti">'+s.ic+'</span><b>'+s.n+'</b><small>'+s.d+'</small>'+
        (on?'<em>끼움</em>':'<button class="btn'+(own?'':' pri')+'" data-act="entst" data-v="'+s.id+'"'+(!own&&S.money<ENT_STYLE_COST[s.id]?' disabled':'')+'>'+(own?'끼우기':'사기 · '+fmt(ENT_STYLE_COST[s.id]))+'</button>')+'</div>';}).join('')+'</div>';
  }
  if(UI.scrTab==='ban'){
    return h+'<div class="entg">'+ENT_BANNERS.map(function(b,i){var own=e.bans.indexOf(i)>=0,on=e.ban===i;
      return '<div class="entc'+(on?' on':'')+'"><span class="banp" style="--c:'+b.c+'">'+b.n+'</span>'+
        (on?'<button class="btn" data-act="entbanoff">떼기</button>':'<button class="btn'+(own?'':' pri')+'" data-act="entban" data-v="'+i+'"'+(!own&&S.money<ENT_BANNER_COST[i]?' disabled':'')+'>'+(own?'걸기':'사기 · '+fmt(ENT_BANNER_COST[i]))+'</button>')+'</div>';}).join('')+'</div>';
  }
  return h+'<div class="sbulk entlv"><span>교회 입구 <b>Lv '+e.lv+'</b> / '+ENT_MAX+' · 모양 '+ENT_STYLES.filter(function(s){return s.id===e.st;})[0].n+' · 현수막 '+ban+'</span>'+
    (e.lv>=ENT_MAX?'<em>최고 레벨이에요</em>':'<button class="btn pri" data-act="entup" '+(up?'disabled':'')+' title="'+up+'">레벨 올리기 · '+fmt(nxt)+'</button>')+'</div>'+
    (up&&e.lv<ENT_MAX?'<p class="snote">'+up+'</p>':'');
}
function entrClick(a,v){
  if(UI.scr!=='gate')return false;var why='';
  if(a==='entup'){why=entrUp();}
  else if(a==='entst'){why=entrStyle(v);}
  else if(a==='entban'){why=entrBanner_(+v);}
  else if(a==='entbanoff'){entrBannerOff();}
  else return false;
  if(why){scrToast(why,2000);sfx('error',.4);}else sfx('click',.5);
  renderScreen();hud(true);return true;
}

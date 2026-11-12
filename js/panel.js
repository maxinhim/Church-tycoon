'use strict';
/* ---------- 하단 패널 ---------- */
var panel;
// 건축 카드에 미리 보여 줄 효과 두 가지 (지을 때 건물 위에 뜨는 글씨와 같은 말)
function effTags(d){
  var t=[];
  if(d.seats)t.push('좌석 +'+d.seats);
  if(d.fcap)t.push('교제 +'+d.fcap);
  if(d.kcap)t.push('돌봄 +'+d.kcap);
  if(d.ccap)t.push('편의 +'+d.ccap);
  if(d.park)t.push('주차 +'+d.park);
  if(d.vis)t.push('방문자 +'+Math.round(d.vis*100)+'%');
  if(d.rep&&t.length<2)t.push('평판 ↑');
  if(d.beauty&&t.length<2)t.push(d.beauty>=1?'분위기 +'+d.beauty:'분위기 ↑');
  if(d.cat==='club'&&t.length<2)t.push('외로움 ↓');
  if(d.fill&&t.length<2){var bn=null;for(var n in d.fill)if(!bn||d.fill[n]>d.fill[bn])bn=n;t.push(NK[bn]+' +'+d.fill[bn]);}
  if(d.income&&t.length<2)t.push('판매 ~'+d.income*SHOP_K);
  return t.slice(0,2);
}
function effText(d){
  var p=[];
  if(d.seats)p.push('좌석 +'+d.seats);
  if(d.park)p.push('주차 +'+d.park);
  if(d.fcap)p.push('교제 수용 +'+d.fcap);
  if(d.kcap)p.push('돌봄 수용 +'+d.kcap);
  if(d.ccap)p.push('편의 수용 +'+d.ccap);
  if(d.fill){for(var n in d.fill)p.push('방문자 '+NK[n]+' +'+d.fill[n]);}
  if(d.beauty)p.push('분위기 +'+d.beauty);
  if(d.vis)p.push('방문자 +'+Math.round(d.vis*100)+'%');
  if(d.income)p.push('한 번 팔 때 약 '+d.income*SHOP_K);
  if(gripeFixes(d).length)p.push(gripeFixes(d).join('·')+'을(를) 풀어 줘요');
  p.push('유지비 '+d.up+'/주');
  return p.join(' · ');
}
/* 기능 패널: 동그란 버튼(건축·행사·현황)과 상단 메뉴 버튼으로 연다.
   '행사' 버튼 안에는 행사·사역자 두 탭이 있다 */
var GROUP_TITLE={build:'건축',minis:'행사',status:'현황',menu:'메뉴'};
var SUBTABS={minis:[['events','행사'],['staff','사역자']],status:[['status','현황'],['finance','재정']]};
// 건축 › 소모임의 하위 묶음: 제목 줄 빈자리에 칩으로 (창 높이가 늘지 않게)
var CLUB_SUBS=[['sport','운동'],['hobby','취미'],['music','음악']];
function tabGroup(t){return (t==='staff'||t==='events')?'minis':(t==='finance'?'status':t);}
function openGroup(g){
  UI.lastBuilt=null;
  // 지도에서 짓는 중에 건축 버튼을 누르면 짓기를 그만두고 목록으로
  if(g==='build'&&isPlacing()){endPlace();return;}
  if(!UI.fold&&tabGroup(UI.tab)===g){closeDock();return;}
  // 건축이 아닌 패널로 옮기면 짓던 것(미리보기)은 취소한다
  if(g!=='build'){UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];}
  UI.sel=null;UI.selPiece=null;UI.selTile=null;
  sfx('page',.35);
  // 건축 버튼으로 새로 열면 늘 분류 목록부터
  if(g==='build')UI.bstep='cat';
  UI.tab=g==='minis'?(UI.minisTab||'events'):(g==='status'?(UI.statusTab||'status'):g);UI.fold=false;UI.confirmNew=false;
  renderPanel();
}
// 닫으면 짓던 것도 함께 취소한다 (미리보기만 지도에 남지 않게)
function closeDock(){
  UI.fold=true;UI.tool=null;UI.ghost=null;UI.pc=null;UI.undo=[];UI.sel=null;UI.selPiece=null;UI.confirmNew=false;UI.lastBuilt=null;
  renderPanel();
}
function renderPanel(){
  panel=$('#panel');
  var dock=$('#dock');
  // 지도에서 짓는 동안은 패널을 닫고 아래 작은 띠만 보인다
  dock.hidden=UI.fold||isPlacing();rcptSide();syncTabs();renderPbar();renderSelCard();
  if(dock.hidden)return;
  var t=UI.tab,g=tabGroup(t);
  $('#dtitle').textContent=GROUP_TITLE[g];
  var cs=UI.csub||'sport';
  $('#subtabs').innerHTML=SUBTABS[g]?SUBTABS[g].map(function(s){return '<button role="tab" data-act="subtab" data-v="'+s[0]+'" aria-selected="'+(t===s[0])+'" class="'+(t===s[0]?'on':'')+'">'+s[1]+'</button>';}).join(''):
    (t==='build'&&UI.bstep!=='cat'&&UI.cat==='club'&&UI.tool!=='demolish'?CLUB_SUBS.map(function(s){return '<button role="tab" data-act="csub" data-v="'+s[0]+'" aria-selected="'+(cs===s[0])+'" class="'+(cs===s[0]?'on':'')+'">'+s[1]+'</button>';}).join(''):'');
  panel.className=(t==='build')?'build':'scroll';
  if(t==='build')renderBuild();else if(t==='finance')renderFinance();else if(t==='staff')renderStaff();else if(t==='events')renderEvents();else if(t==='status')renderStatus();else renderMenu();
}
/* 건축 목록 순서: 지금 지을 수 있는 것(잠금이 풀렸고 자금이 되는 것)을 앞에, 각각 싼 것부터.
   지우기 같은 도구(값 0)는 맨 뒤. 분류를 열 때만 정렬한다 (자금이 바뀌어도 누르는 도중 카드가 움직이지 않게) */
function buildOrder(cat){
  var can=function(d){return !isLocked(d.id)&&S.money>=d.cost;};
  var cs=UI.csub||'sport';
  return DEFS.filter(function(d){return d.cat===cat&&(cat!=='club'||d.sub===cs);}).map(function(d,i){return {d:d,i:i};}).sort(function(a,b){
    var ta=a.d.cost?0:1,tb=b.d.cost?0:1;if(ta!==tb)return ta-tb;
    var ca=can(a.d)?0:1,cb=can(b.d)?0:1;if(ca!==cb)return ca-cb;
    return a.d.cost-b.d.cost||a.i-b.i;
  }).map(function(o){return o.d;});
}
/* 건축 패널은 두 단계: ① 분류 목록(타일) → ② 고른 분류의 건물 카드 한 줄(가로로 끌어 넘김, ‹ 뒤로로 ①).
   짓다가 취소하면 ②로 돌아오고, 직전에 고른 카드가 보이게 그 자리로 넘겨 둔다 (UI.lastPick[분류]) */
function catIcon(cat){var d=DEFS.filter(function(x){return x.cat===cat&&(cat!=='club'||x.sub===(UI.csub||'sport'));})[0];return d?iconCanvas(d):null;}
function renderBuild(){
  panel.scrollTop=0;
  if(UI.bstep==='cat'){
    panel.innerHTML='<div class="btiles" id="btiles"></div>';
    var bt=$('#btiles');
    CATS.concat([['__dem','철거']]).forEach(function(c){
      var el=document.createElement('button');el.className='btile'+(c[0]==='__dem'?' warn':'');
      el.dataset.act=c[0]==='__dem'?'dem':'cat';if(c[0]!=='__dem')el.dataset.v=c[0];
      var ic=c[0]==='__dem'?null:catIcon(c[0]);
      if(ic)el.appendChild(ic);else el.insertAdjacentHTML('beforeend','<span class="bic" aria-hidden="true">'+(c[0]==='__dem'?'⚒':'')+'</span>');
      el.insertAdjacentHTML('beforeend','<span class="nm">'+c[1]+'</span>');
      bt.appendChild(el);
    });
    renderDetail();return;
  }
  var cname=UI.tool==='demolish'?'철거':((CATS.filter(function(c){return c[0]===UI.cat;})[0]||[,''])[1]);
  panel.innerHTML='<div class="bnav"><button class="bback" data-act="bback" aria-label="분류 목록으로">‹ 뒤로</button><b>'+cname+'</b></div><div class="cards" id="cards"></div><div class="detail" id="detail"></div>';
  var cards=$('#cards');
  if(UI.tool==='demolish'){cards.innerHTML='<p class="hint">철거할 건물을 지도에서 누르세요. 건축비의 절반이 돌아옵니다.</p>';}
  else{
    buildOrder(UI.cat).forEach(function(d){
      var el=document.createElement('button');el.className='card';el.dataset.act='pick';el.dataset.v=d.id;
      el.appendChild(iconCanvas(d));
      var lk=isLocked(d.id);if(lk)el.classList.add('lock');
      var tg=effTags(d);
      el.setAttribute('aria-label',d.name+', '+(lk?'잠김':fmt(d.cost))+'. '+effText(d));
      el.insertAdjacentHTML('beforeend','<span class="nm">'+d.name+'</span><span class="pr">'+(lk?lockLabel(d.id,true):fmt(d.cost)+(d.up?'<small> · 주 '+d.up+'</small>':''))+'</span>'+
        '<span class="ef">'+(tg.length?tg.map(function(x){return '<i>'+x+'</i>';}).join(''):'<i>'+(d.short||'')+'</i>')+'</span>');
      cards.appendChild(el);
    });
    dragScroll(cards);
    // 직전에 고른 카드가 보이게 (가운데 쯤으로)
    var lp=UI.lastPick&&UI.lastPick[UI.cat],le=lp&&cards.querySelector('[data-v="'+lp+'"]');
    if(le){le.classList.add('last');cards.scrollLeft=Math.max(0,le.offsetLeft-cards.offsetLeft-(cards.clientWidth-le.offsetWidth)/2);}
  }
  refreshCards();renderDetail();
}
// 마우스로도 가로로 끌어 넘긴다 (손가락은 기본 가로 스크롤). 끌었으면 그 클릭은 고르기로 치지 않는다
function dragScroll(el){
  var down=null,moved=false;
  el.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse'||e.button!==0)return;down={x:e.clientX,s:el.scrollLeft};moved=false;});
  el.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-down.x;if(Math.abs(dx)>5)moved=true;if(moved){el.scrollLeft=down.s-dx;el.classList.add('dragging');}});
  var up=function(){down=null;el.classList.remove('dragging');};
  el.addEventListener('pointerup',up);el.addEventListener('pointerleave',up);
  el.addEventListener('click',function(e){if(moved){e.stopPropagation();e.preventDefault();moved=false;}},true);
}
function refreshCards(){
  var cs=document.querySelectorAll('#cards .card');
  for(var i=0;i<cs.length;i++){var d=D[cs[i].dataset.v];if(!d)continue;cs[i].classList.toggle('poor',S.money<d.cost||isLocked(d.id));cs[i].classList.toggle('sel',UI.tool===d.id);}
}
function segBtns(act,val,items,off){
  return '<div class="seg">'+items.map(function(it){var on=String(val)===String(it[0]);return '<button class="btn'+(on?' on':'')+'" data-act="'+act+'" data-v="'+it[0]+'" aria-pressed="'+on+'"'+(off?' disabled':'')+'>'+it[1]+'</button>';}).join('')+'</div>';
}
function bad(t){return '<span style="color:var(--bad)">'+t+'</span>';}
function renderDetail(){
  renderSelCard();
  if(isPlacing()){renderPbar();return;}
  var el=$('#detail');if(!el)return;
  var h='<div class="tx">'+(UI.tool==='demolish'?'철거할 건물이나 길을 누르면 지도 위 카드에 철거 버튼이 나와요.':'지을 것을 고르면 지도에 미리보기가 놓여요. 지은 건물을 누르면 지도 위 작은 카드에서 옮기기·돌리기, 입구·출구, 철거를 할 수 있어요.')+'</div>';
  el.innerHTML=h;
}
function stars(n){return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);}
function meter(v){var p=Math.round(clamp(v,0,1)*100);return '<div class="bar"><i style="width:'+p+'%;background:'+(p<30?'var(--bad)':p<60?'var(--gold)':'var(--good)')+'"></i></div>';}
function srow(title,meta,desc,btns,extra){
  return '<div class="srow"><div class="tx"><b>'+title+'</b> <span class="meta">'+meta+'</span><p>'+desc+'</p>'+(extra||'')+'</div><div class="btns">'+btns+'</div></div>';
}
function renderStaff(){
  var h='<div class="staff"><div class="sec">목양</div>';
  h+=srow('목양 수용력',S.members+' / '+Math.round(MOD.cap)+'명','담임목사·부교역자·직분자·돌봄팀이 함께 돌볼 수 있는 성도 수예요. 넘으면 그만큼 성도가 떠나요.','',meter(MOD.cap/Math.max(1,S.members)));
  h+='<div class="sec">부교역자 · '+S.assoc.length+' / '+assocSlots()+'명</div>';
  if(!S.assoc.length)h+='<p class="hint">아직 함께 사역하는 부교역자가 없어요. 성도 50명마다 한 명씩 더 청빙할 수 있어요.</p>';
  S.assoc.forEach(function(a,i){
    h+=srow(a.name+' '+a.title,FIELDS[a.field].name+' '+stars(a.skill)+' · 사례비 주 '+a.pay,FIELDS[a.field].desc+' (별마다), 목양 수용력 +35','<button class="btn" data-act="dismiss" data-v="'+i+'">사임</button>');
  });
  h+='<p class="hint">청빙 후보 · 6주마다 새 후보가 찾아와요. 청빙 비용은 사례비 4주치예요.</p>';
  S.cands.forEach(function(c,i){
    var full=S.assoc.length>=assocSlots();
    h+=srow(c.name+' '+c.title+' 후보',FIELDS[c.field].name+' '+stars(c.skill)+' · 사례비 주 '+c.pay,FIELDS[c.field].desc+' (별마다)',
      '<button class="btn pri" data-act="hireA" data-v="'+i+'"'+(full||S.money<c.fee?' disabled':'')+'>'+(full?'자리 없음':'청빙 '+fmt(c.fee))+'</button>');
  });
  h+='<div class="btns"><button class="btn" data-act="searchA"'+(S.money<100?' disabled':'')+'>다른 후보 찾기 · 100</button></div>';
  h+='<div class="sec">직분자 임명 · 모두 '+offTotal()+'명</div>';
  Object.keys(OFFICE).forEach(function(k){
    var o=OFFICE[k],mx=officeMax(k),lk=o.goal>S.goal;
    // 임직식 비용은 청빙 버튼처럼 버튼 안에 ('임명 300')
    h+=srow(o.name,S.off[k]+' / '+mx+'명 · 성도 '+o.per+'명마다 한 명',o.desc,
      lk?'<button class="btn" disabled>'+lockText(o.goal)+'</button>':'<button class="btn pri" data-act="appoint" data-v="'+k+'"'+(S.off[k]>=mx||S.money<o.cost?' disabled':'')+'>임명 '+fmt(o.cost)+'</button>');
  });
  h+='<div class="sec">사역팀 · 주 '+fmt(teamPay())+'</div>';
  Object.keys(STAFF).forEach(function(k){
    var t=STAFF[k],lv=S.staff[k]||0,lk=(t.goal||0)>S.goal,next=t.costs[lv];
    var btn=lk?'<button class="btn" disabled>'+lockText(t.goal)+'</button>':
      (lv>0?'<button class="btn" data-act="fire" data-v="'+k+'" aria-label="'+t.name+' 축소">−</button>':'')+
      (lv<3?'<button class="btn pri" data-act="hire" data-v="'+k+'"'+(S.money<next?' disabled':'')+'>'+fmt(next)+'</button>':'<button class="btn" disabled>최대</button>');
    h+=srow(t.name,'단계 '+lv+'/3 · 주 '+t.week*lv,t.desc,btn,'<div class="pips">'+[0,1,2].map(function(i){return '<i class="'+(i<lv?'on':'')+'"></i>';}).join('')+'</div>');
  });
  h+='</div>';
  panel.innerHTML=h;
}
function renderEvents(){
  var act=activeEvents().filter(function(id){return !EVENTS[id].hidden;});
  var h='<div class="staff"><p class="hint">행사는 자금을 쓰고, 한 번 열면 정해진 주가 지나야 다시 열 수 있어요. 오래 열지 않으면 공동체가 침체돼요. 올해 '+weekOfYear()+'주째예요.</p>';
  if(act.length)h+='<div class="qev">'+act.map(function(id){return '<span>진행 중 · '+EVENTS[id].name+' '+S.ev[id].left+'주</span>';}).join('')+'</div>';
  Object.keys(EVENTS).forEach(function(id){
    var e=EVENTS[id];if(e.hidden)return;
    // 값은 청빙 버튼처럼 버튼 안에 ('열기 300')
    var why=evBlock(id),c=evCost(e),meta=(e.season?e.season[0]+'~'+e.season[1]+'주':'')+(e.cd?(e.season?' · ':'')+'열면 '+e.cd+'주 뒤 다시':'');
    h+=srow(e.name,meta,e.desc+(why?'<br>'+bad(why):''),'<button class="btn pri" data-act="runEv" data-v="'+id+'"'+(why?' disabled':'')+'>열기 '+fmt(c)+'</button>');
  });
  h+='</div>';
  panel.innerHTML=h;
}

/* 성도 만족도: 항목을 누르면 무엇으로 계산됐는지 펼쳐 보인다 (calcMood·refreshMods와 같은 식) */
var MOOD_ROWS=[['all','전체'],['spirit','영성'],['seat','좌석'],['past','목양'],['fel','교제 공간'],['park','주차'],['care','돌봄'],['comf','편의']];
// 그 수용을 가장 많이 채우는 건물 셋 (같은 종류는 합친다)
function topCap(key){
  var t={};S.buildings.forEach(function(b){var d=defOf(b),v=(d[key]||0)*condFactor(b);if(v>0)t[d.name]=(t[d.name]||0)+v;});
  var L=Object.keys(t).sort(function(a,b){return t[b]-t[a];}).slice(0,3);
  return L.length?L.map(function(n){return n+' '+Math.round(t[n]);}).join(', '):'아직 없어요';
}
function sgn(v){v=Math.round(v*10)/10;return (v<0?'−':'+')+Math.abs(v);}
function moodWhy(k){
  var m=Math.max(1,S.members),c=S.cov||{},L=[];
  // 항목 한 줄: (기본 + 건물 자리 × 0.6) ÷ 필요(바닥과 성도 × 비율 × 기대치 중 큰 쪽)
  var cap=function(k,unit){var i=satInfo(k),s=SAT[k];
    L.push(unit+' '+(i.base?'기본 '+i.base+' + ':'')+(k==='past'?'':'건물 ')+Math.round(i.have)+' ÷ 필요 '+Math.round(i.need)+' → '+Math.round(i.v*100)+'%');
    L.push('필요 = 최소 '+s.f+', 또는 성도 '+m+'명 × '+s.r+(s.e?ek:'')+(k==='past'?'':' · 건물 자리는 '+Math.round(BLD_SAT*100)+'%만 쳐요'));};
  var w=MW[k],E=c.E||1,ek=E>1.005?' × 기대치 '+E.toFixed(2)+' (성도 수·교회 Lv)':'';
  if(k==='all'){
    var it=c.items!=null?c.items:0;
    L.push('항목 점수 '+Math.round(MOOD_ITEMS*it)+' / '+MOOD_ITEMS+' = '+MOOD_ROWS.filter(function(r){return MW[r[0]];}).map(function(r){return r[1]+' '+Math.round(MW[r[0]]*100)+'%';}).join(' · ')+'를 섞은 값('+Math.round(it*100)+'%) × '+MOOD_ITEMS);
    L.push('항목만으로는 '+MOOD_ITEMS+'까지예요. 나머지는 꾸밈·사역팀·행사 보너스로 채우는데, 좋은 보너스는 합쳐서 +'+BONUS_MAX+'까지만 쳐요 (지금 '+sgn(c.bonusRaw||0)+' → '+sgn(c.bonus||0)+')');
    L.push('꾸밈 '+sgn(beautyBonus())+' = 아름다움 '+(Math.round(A.beauty*10)/10)+' × '+BEAUTY_K+' + 새로 꾸민 것 '+(Math.round((S.fresh||0)*10)/10)+' × '+FRESH_K+' (최대 +8)');
    L.push('새로 꾸민 효과는 한 주에 '+Math.round((1-FRESH_DECAY)*100)+'%씩 익숙해져요. 정원·장식·바닥을 계속 더하거나 바꾸면 유지돼요');
    (MOD.parts||[]).forEach(function(p){L.push(p[0]+' '+sgn(p[1]));});
    L.push('0~100 사이로 잘라요. '+MOOD_LEAVE+' 아래면 떠나는 성도가 늘고, '+MOOD_GAIN+' 위면 소개로 새 성도가 와요');
  }else if(k==='spirit'){
    var sp=spiritParts(),nm={w:'말씀',p:'기도',r:'찬양'},pc=function(v){return Math.round(v*100)+'%';};
    var sw=SPIRIT_W;L.push('말씀 '+pc(sw.w)+' · 기도 '+pc(sw.p)+' · 찬양 '+pc(sw.r)+' · 성례 '+pc(sw.s)+'를 섞은 값');
    ['w','p','r'].forEach(function(q){L.push(nm[q]+' '+pc(sp[q])+' = 자리 '+Math.round(sp.cap[q])+' (기본 포함, 건물은 '+Math.round(BLD_SAT*100)+'%만) ÷ 필요 '+Math.round(sp.need[q]));});
    L.push('성례 '+pc(sp.s)+' = 성찬식 '+pc(sp.sac.communion)+' · 세례식 '+pc(sp.sac.baptism)+' · 수련회 '+pc(sp.sac.retreat)+' · 절기 예배 '+pc(sp.sac.fest)+' (연 지 오래될수록 줄어요)');
    L.push('말씀: 성경공부방·선교관·소그룹실·북카페·교육팀 / 기도: 기도실·새벽기도실·중보기도팀·권사 / 찬양: 찬양실·야외 예배터·합창실·찬양팀');
    L.push('필요는 성도 '+m+'명에 맞춰'+ek+' 늘어요 (말씀 × '+SPIRIT_NEED.w.r+', 기도 × '+SPIRIT_NEED.p.r+', 찬양 × '+SPIRIT_NEED.r.r+', 최소 '+SPIRIT_NEED.w.f+'·'+SPIRIT_NEED.p.f+'·'+SPIRIT_NEED.r.f+')');
  }else if(k==='seat'){cap('seat','좌석');L.push('좌석이 많은 곳: '+topCap('seats'));L.push('모자라면 남는 성도만큼 매주 떠나요. 예배당·예배실 칸·층 올리기로 늘려요');}
  else if(k==='fel'){cap('fel','교제 수용');L.push('교제 수용이 큰 곳: '+topCap('fcap'));L.push('교제실·소그룹실·카페·식당으로 늘려요');}
  else if(k==='care'){cap('care','돌봄 수용');L.push('돌봄 수용이 큰 곳: '+topCap('kcap'));L.push('돌봄실·어린이부실·유아방·경로 쉼터로 늘려요');}
  else if(k==='comf'){cap('comf','편의 수용');L.push('편의 수용이 큰 곳: '+topCap('ccap'));L.push('화장실·편의실·휴게실·벤치·식수대·쓰레기통으로 늘려요');}
  else if(k==='park'){cap('park','주차 자리');L.push('주차 자리가 많은 곳: '+topCap('park'));L.push('주차 구역에 주차장·주차 타워·자전거 거치대를 지어요');}
  else if(k==='past'){
    cap('past','돌볼 수 있는 성도');
    var st=S.staff,o=S.off,as=S.assoc.reduce(function(t,a){return t+35+(a.field==='visit'?12*a.skill:0);},0);
    L.push('담임 목사 25'+(st.care?' + 돌봄팀 '+8*st.care:'')+(as?' + 부교역자 '+as:'')+(o.deacon?' + 집사 '+6*o.deacon:'')+(o.kwonsa?' + 권사 '+10*o.kwonsa:'')+(o.elder?' + 장로 '+18*o.elder:''));
    L.push('행사 › 사역자 탭에서 부교역자 청빙·직분자 임명·돌봄팀으로 늘려요');
  }
  if(w)L.unshift('만족도 비중 '+Math.round(w*100)+'%');
  return L.map(function(t){return '<li>'+t+'</li>';}).join('');
}
function renderStatus(){
  var c=S.cov||{};
  var h=statusSummary()+'<div class="sec">성도 만족도 <small>· 항목을 누르면 계산 방식</small></div><div class="cov">';
  MOOD_ROWS.forEach(function(r){
    var v=r[0]==='all'?Math.round(S.mood):Math.round((c[r[0]]==null?1:c[r[0]])*100),open=UI.mexp===r[0];
    var col=r[0]==='all'?'':';background:'+(v<50?'var(--bad)':v<80?'var(--gold)':'var(--good)');
    h+='<button class="covb'+(open?' open':'')+'" data-act="mexp" data-v="'+r[0]+'" aria-expanded="'+open+'"><span>'+r[1]+'</span><div class="bar"><i style="width:'+v+'%'+col+'"></i></div><span class="v">'+v+'%</span></button>'+
      (open?'<ul class="rwhy">'+moodWhy(r[0])+'</ul>':'');
  });
  h+='</div><div class="sec">이번 주</div><div class="legend"><span>지금 교회 마당에 '+V.length+'명</span><span>이번 주 방문 '+S.visitsWeek+'</span><span>새 성도 '+S.joinedWeek+'</span></div>';
  h+='<div class="legend" style="margin-top:6px">'+NEEDS.map(function(n){return '<span><i style="background:'+NC[n]+'"></i>'+NK[n]+'</span>';}).join('')+'<span>머리 위 점은 방문자가 찾는 것</span></div>';
  var rp=needRepair(),rc=rp.reduce(function(t,b){return t+repairCost(b);},0);
  if(rp.length)h+='<div class="btns"><button class="btn pri" data-act="repairAll"'+(S.money<rc?' disabled':'')+'>낡은 건물 '+rp.length+'곳 모두 수리 · '+fmt(rc)+'</button></div>';
  h+='<div class="sec">주간 수입과 지출</div>'+chart();
  h+='<div class="sec">소식</div><ul class="log">'+(S.log.length?S.log.map(function(l){return '<li>'+(Math.floor(l.w/52)+1)+'년차 '+(l.w%52+1)+'주 · '+l.msg+'</li>';}).join(''):'<li>아직 소식이 없어요. 한 주가 지나면 기록됩니다.</li>')+'</ul>';
  panel.innerHTML=h;
}
function chart(){
  var hs=S.hist;
  if(!hs.length)return '<p class="hint" style="padding:2px 0">첫 주일이 지나면 표시됩니다.</p>';
  var W=300,H=96,pad=18,mx=1;
  hs.forEach(function(x){mx=Math.max(mx,x.inc,x.exp);});
  var bw=(W-pad)/Math.max(hs.length,6),svg='<svg viewBox="0 0 '+W+' '+(H+14)+'" width="100%" role="img" aria-label="주간 수입과 지출 막대그래프">';
  svg+='<line x1="'+pad+'" y1="'+H+'" x2="'+W+'" y2="'+H+'" stroke="var(--line)"/><text x="0" y="10" font-size="9">'+fmt(mx)+'</text><text x="0" y="'+H+'" font-size="9">0</text>';
  hs.forEach(function(x,i){
    var x0=pad+i*bw+bw*0.1,w=bw*0.38,hi=x.inc/mx*(H-14),he=x.exp/mx*(H-14);
    svg+='<rect x="'+x0.toFixed(1)+'" y="'+(H-hi).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+hi.toFixed(1)+'" fill="var(--accent)"/>';
    svg+='<rect x="'+(x0+w+1).toFixed(1)+'" y="'+(H-he).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+he.toFixed(1)+'" fill="var(--muted)" opacity=".55"/>';
  });
  svg+='<text x="'+pad+'" y="'+(H+11)+'" font-size="9">파랑 수입 · 회색 지출 (최근 '+hs.length+'주)</text></svg>';
  return svg;
}
function renderMenu(){
  panel.innerHTML='<div class="field"><label for="churchName">교회 이름</label><input id="churchName" maxlength="14" value="'+S.name.replace(/"/g,'&quot;')+'"></div>'+
    (UI.confirmNew?'<div class="sec">난이도를 고르면 처음부터 시작해요 (지금 진행은 사라져요)</div><div class="diffs">'+Object.keys(DIFF).map(function(k){return '<button class="btn'+(k==='normal'?' pri':'')+'" data-act="newgame" data-v="'+k+'"><b>'+DIFF[k].name+'</b><small>'+DIFF[k].desc+'</small></button>';}).join('')+'<button class="btn" data-act="newgame">취소</button></div>':
      '<div class="btns"><button class="btn" data-act="newgame">새로 시작</button></div>')+'<p class="hint">지금 난이도: '+curDiff().name+'</p>'+
    '<div class="sec">조작법</div><ul class="how"><li>한 손가락으로 끌기: 지도 이동</li><li>두 손가락 벌리기·오므리기: 확대·축소 (PC는 마우스 휠)</li><li>오른쪽 회전 버튼: 90°씩 시점 회전</li><li>교회 문: 처음엔 닫혀 있고 입구(파란 아치)에 자물쇠가 떠 있어요. 입구를 누르면 문 열기·닫기 카드가 떠요. 닫으면 방문자가 오지 않고 주일 헌금이 크게 줄어요</li><li>방문자는 바닥 타일·길·계단·다리 위로만 걸어요. 새 건물은 입구까지 바닥을 깔거나, 건물을 눌러 \'입구까지 길 잇기\'를 쓰세요</li><li>도로 위 4줄은 주차 구역이에요. 주차장·주차 타워는 그곳에만, 그곳엔 주차장만 지을 수 있어요</li><li>매장(카페·식당·빵집·서점·나눔장터 등)은 방문자가 물건을 사면 수익이 생겨요 (건물 위 금색 숫자)</li><li>오른쪽 위 시계: 한 주는 48초(하루 약 7초), 주일이 끝나면 주간 정산 영수증이 떠요. 현황 › 재정에서 내역과 대출을 볼 수 있어요. 톱니바퀴에서 일시정지할 수 있어요 (빨리 감기 2~8배속은 테스트 모드에서만)</li><li>날씨: 날씨는 한 주에 한 번 바뀌고 비·눈은 2~3일만 와요. 시계에 오늘 날씨와 다음 날씨가 보이고, 누르면 효과를 알려 줘요. 비엔 야외 자리가 쉬고 실내 매장이 붐벼요. 폭우엔 벼락이 치니 십자가 첨탑(피뢰침)을 세우세요. 겨울엔 눈, 여름엔 폭염(물가 장식이 있으면 덜 지쳐요). 비가 그치면 무지개가 뜨기도 해요. 주일에 비·눈이 오면 출석이 줄어요(주차장이 넉넉하면 덜 줄어요)</li><li>대출: 신용 한도 안에서 빌리고, 매주 주일 정산 때 원금과 이자를 나눠 갚아요. 남은 원금은 언제든 한 번에 갚을 수 있어요</li><li>건축 목록의 카드에는 지으면 늘어나는 효과와 주간 유지비가 적혀 있어요</li><li>카드를 고르면 목록이 닫히고 지도에 미리보기가 놓입니다. 끌거나 지도를 눌러 옮기고, 둘레 화살표로 건물이 바라볼 방향(정면·출입구)을 고르면 건물이 그쪽으로 돌아가요. 왼쪽 위 초록 ✓로 짓고, 오른쪽 위 빨간 ✕로 그만둡니다 (PC: Enter·Esc·R)</li><li>조경은 짓고 나면 옆자리에 미리보기가 다시 놓여 ✓만 눌러 이어 지을 수 있어요. 큰 건물은 지은 주 안에 목록에서 전액 되돌릴 수 있어요</li><li>길: 시작할 곳을 누르고 화살표로 방향, 아래 띠에서 종류·경사·높이를 고른 뒤 ✓로 한 칸씩 잇습니다. 철골 계단 밑과 다리 아래로도 사람이 다닙니다</li><li>연결 다리: 같은 역할 건물의 위층 벽끼리 이으면, 한 건물이 차면 방문자가 다리를 건너 옆 건물로 갑니다</li><li>건물 쌓기: 지은 건물을 누르고 층 올리기(최대 10층). 칸 건물은 같은 칸을 다시 눌러 올립니다</li><li>지형: 땅 높이로 땅을 올리고 내리며, 흙 경사로·철골 계단으로 오르내려요. 높인 땅이나 철골 데크(높은 평지 길) 위에도 건물·조경·바닥을 지을 수 있어요. 위에 무언가 놓인 데크는 먼저 치워야 철거돼요</li><li>바닥: 지도를 눌러 시작할 칸을 고르고, 화살표로 깔아 나갈 방향을 정한 뒤 ✓를 누를 때마다 한 칸씩 깔아요</li><li>오른쪽 아래 동그란 버튼: 건축 · 행사(행사·사역자) · 현황. 같은 버튼을 다시 누르면 닫힙니다. 교회 이름·새로 시작은 위쪽 톱니바퀴 메뉴</li><li>행사 버튼: 행사 탭에서 특별행사·절기 행사를, 사역자 탭에서 부교역자 청빙·직분자 임명·사역팀을 다룹니다</li><li>건물은 시간이 지나면 낡아요. 낡아 갈수록 거미줄(80% 이하) → 하얀 연기(70% 이하) → 검은 연기(60% 이하)가 보이고 효율이 90% → 75% → 55%로 떨어져요. 빨간 ? 표시는 입구·출구에 닿는 길이 없다는 뜻이에요</li><li>방문자는 머무는 동안 화장실·쉴 자리·마실 것·쓰레기통을 찾고, 다니는 길이 삭막하면 아쉬워해요. 못 찾으면 정착하기 어렵고, 지난주 불편이 많으면 성도 만족도도 내려가요. 현황 › 챙길 일에 무엇을 지으면 되는지 보여요</li><li>교회 문은 예배 공간(작은 예배실·예배당·예배실 칸 등)이 있어야 열 수 있어요. 성도 만족도에서 가장 큰 영성은 말씀·기도·찬양 공간과 성찬식·세례식 같은 성례로 채워지고, 성례는 시간이 지나면 줄어요. 새로 꾸민 효과도 몇 주가 지나면 익숙해져서, 계속 가꿔야 해요</li><li>지은 건물을 누르면 입구·출구를 ◀ ▶로 옮깁니다. 방문자는 입구로 들어가 출구로 나옵니다</li></ul>'+
    '<div class="sec">만든 방식과 참고 자료</div>'+
    '<p class="hint" style="padding:0 0 4px">그래픽과 시스템은 모두 이 페이지의 코드로 새로 그렸고, 외부 이미지·소리·소스를 가져오지 않았습니다. 개발 중 참고한 공개 자료입니다.</p>'+
    '<ul class="refs"><li><a href="https://kenney.nl/assets/isometric-landscape" target="_blank" rel="noopener">Kenney 아이소메트릭 에셋 (CC0)</a> · 나중에 그림을 바꿀 때 쓸 후보</li>'+
    '<li><a href="https://opengameart.org/" target="_blank" rel="noopener">OpenGameArt</a> · CC0 에셋 모음 (라이선스 확인 필요)</li>'+
    '<li><a href="https://www.openrct2.org/about" target="_blank" rel="noopener">OpenRCT2</a> · 장르의 운영 구조를 이해하는 참고</li>'+
    '<li><a href="https://unity.com/blog/outlier-mars-attracts-interview" target="_blank" rel="noopener">욕구 기반 방문자 AI 개발 인터뷰</a> · 방문자 행동 설계 참고</li></ul>';
  var inp=$('#churchName');
  inp.addEventListener('input',function(){S.name=inp.value.trim()||'새빛교회';$('#cname').textContent=S.name;});
  inp.addEventListener('change',save);
}

function renderFinance(){
  var h='<div class="staff">';
  h+='<div class="qnums"><div><span>자금</span><b class="'+(S.money<0?'neg':'')+'">'+fmt(S.money)+'</b></div><div><span>빚</span><b>'+fmt(debt())+'</b></div><div><span>신용 한도</span><b>'+fmt(creditLimit())+'</b></div><div><span>이번 주 매장</span><b class="pos">+'+fmt(S.weekShop)+'</b></div></div>';
  h+='<div class="sec">지난 주일 정산</div>'+(S.rcpt?'<div class="rcpt">'+rcptHtml(S.rcpt,true)+'</div>':'<p class="hint">첫 주일이 지나면 정산 내역이 보여요. 헌금은 출석(좌석 안의 성도)과 만족도에 따라 들어와요.</p>');
  h+='<div class="sec">받은 대출</div>';
  if(!S.loans.length)h+='<p class="hint">받은 대출이 없어요.</p>';
  S.loans.forEach(function(l,i){
    var L=LOANS[l.k];
    h+=srow(L.name,'남은 원금 '+fmt(l.bal)+' · 주 '+fmt(l.pay)+' · '+l.left+'주 남음','매주 주일 정산 때 원금과 이자를 갚아요 (주 이율 '+(L.rate*100).toFixed(1)+'%)',
      '<button class="btn" data-act="repay" data-v="'+i+'"'+(S.money<l.bal?' disabled':'')+'>모두 갚기 '+fmt(Math.ceil(l.bal))+'</button>');
  });
  h+='<div class="sec">대출 받기</div><p class="hint" style="padding-top:0">빚 합계는 신용 한도까지예요. 성도와 평판이 늘면 한도가 올라가요.</p>';
  Object.keys(LOANS).forEach(function(k){
    var L=LOANS[k],why=loanBlock(k),pay=loanPayment(L.amt,L.rate,L.weeks);
    h+=srow(L.name+' '+fmt(L.amt),L.weeks+'주 동안 주 '+fmt(pay)+' · 모두 '+fmt(pay*L.weeks),L.desc+(why?'<br>'+bad(why):''),'<button class="btn pri" data-act="borrow" data-v="'+k+'"'+(why?' disabled':'')+'>빌리기</button>');
  });
  h+='</div>';
  panel.innerHTML=h;
}

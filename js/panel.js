'use strict';
/* ---------- 하단 패널 ---------- */
var panel;
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
  if(d.income)p.push('이용당 +'+d.income);
  p.push('유지비 '+d.up+'/주');
  return p.join(' · ');
}
function renderPanel(){
  panel=$('#panel');
  $('#dock').classList.toggle('fold',UI.fold);
  panel.hidden=UI.fold;
  if(UI.fold)return;
  var t=UI.tab;
  panel.className=(t==='build')?'build':'scroll';
  if(t==='build')renderBuild();else if(t==='staff')renderStaff();else if(t==='status')renderStatus();else renderMenu();
}
function renderBuild(){
  var chips=CATS.map(function(c){return '<button class="chip'+(UI.cat===c[0]&&UI.tool!=='demolish'?' on':'')+'" data-act="cat" data-v="'+c[0]+'">'+c[1]+'</button>';}).join('')+
    '<button class="chip warn'+(UI.tool==='demolish'?' on':'')+'" data-act="dem">철거</button>';
  panel.innerHTML='<div class="chips">'+chips+'</div><div class="cards" id="cards"></div><div class="detail" id="detail"></div>';
  var cards=$('#cards');
  if(UI.tool==='demolish'){cards.innerHTML='<p class="hint">철거할 건물을 지도에서 누르세요. 건축비의 절반이 돌아옵니다.</p>';}
  else{
    DEFS.filter(function(d){return d.cat===UI.cat;}).forEach(function(d){
      var el=document.createElement('button');el.className='card';el.dataset.act='pick';el.dataset.v=d.id;
      el.appendChild(iconCanvas(d));
      el.insertAdjacentHTML('beforeend','<span class="nm">'+d.name+'</span><span class="pr">'+fmt(d.cost)+'</span>');
      cards.appendChild(el);
    });
  }
  refreshCards();renderDetail();
}
function refreshCards(){
  var cs=document.querySelectorAll('#cards .card');
  for(var i=0;i<cs.length;i++){var d=D[cs[i].dataset.v];cs[i].classList.toggle('poor',S.money<d.cost);cs[i].classList.toggle('sel',UI.tool===d.id);}
}
function renderDetail(){
  var el=$('#detail');if(!el)return;
  var h='';
  if(UI.tool==='mroom'){
    var p=UI.ghost?tilePlan(UI.ghost.x,UI.ghost.y):null,line;
    if(!p)line='빈 땅을 누르면 칸이 생기고, 이어 붙이면 하나의 예배실이 됩니다. 지은 칸을 다시 누르면 2층이 올라갑니다';
    else if(!p.ok)line='<span style="color:var(--bad)">'+p.why+'</span>';
    else if(S.money<p.cost)line='<span style="color:var(--bad)">자금이 부족해요</span>';
    else line=(p.kind==='floor'?'이 칸을 누르면 2층을 올려요 · ':'이 칸을 누르면 칸을 지어요 · ')+fmt(p.cost);
    h='<div class="tx"><b>예배실 칸 '+fmt(D.mroom.cost)+' · 2층 '+fmt(MROOM.floorCost)+'</b><br>'+line+'</div><div class="btns">'+(UI.undo.length?'<button class="btn" data-act="undo">되돌리기</button>':'')+'<button class="btn pri" data-act="cancel">완료</button></div>';
  }else if(UI.tool&&D[UI.tool]){
    var d=D[UI.tool];
    if(UI.ghost){
      var ok=canPlace(d,UI.ghost.x,UI.ghost.y),afford=S.money>=d.cost;
      var why=!ok?'<span style="color:var(--bad)">이곳에는 지을 수 없어요. 건물을 끌어서 옮겨 보세요</span>':(!afford?'<span style="color:var(--bad)">자금이 부족해요</span>':effText(d));
      h='<div class="tx"><b>'+d.name+' · '+fmt(d.cost)+'</b><br>'+why+'</div><div class="btns"><button class="btn" data-act="cancel">취소</button><button class="btn pri" data-act="confirm"'+((ok&&afford)?'':' disabled')+'>짓기</button></div>';
    }else{
      h='<div class="tx"><b>'+d.name+' · '+fmt(d.cost)+'</b> ('+d.w+'×'+d.h+')<br>'+d.desc+'. 지도를 눌러 위치를 고르세요</div>';
    }
  }else if(UI.sel&&bById(UI.sel)){
    var b=bById(UI.sel),bd=defOf(b),st=isRoom(b)&&UI.selTile&&tileOf(b,UI.selTile.x,UI.selTile.y);
    var tileBtn=st?'<button class="btn" data-act="demtile">'+(st.f>1?'2층':'이 칸')+' 철거 +'+fmt((st.f>1?MROOM.floorCost:D.mroom.cost)*0.5)+'</button>':'';
    h='<div class="tx"><b>'+bd.name+'</b> · 이용 '+(b.uses||0)+'회'+(bd.cap?' · 지금 '+b.inUse+'/'+bd.cap+'명':'')+'<br>'+effText(bd)+'</div><div class="btns">'+tileBtn+'<button class="btn bad" data-act="demolish">'+(isRoom(b)?'전체 ':'')+'철거 +'+fmt(bd.cost*0.5)+'</button></div>';
  }else{
    h='<div class="tx">'+(UI.tool==='demolish'?'철거할 건물을 눌러보세요.':'건물을 고른 뒤 지도를 눌러 지으세요. 지도는 끌어서 옮기고 두 손가락으로 확대합니다.')+'</div>';
  }
  el.innerHTML=h;
}
function renderStaff(){
  var h='<div class="staff">';
  Object.keys(STAFF).forEach(function(k){
    var s=STAFF[k],lv=S.staff[k],next=s.costs[lv];
    h+='<div class="srow"><div class="tx"><b>'+s.name+'</b> <span style="color:var(--muted);font-size:12px">단계 '+lv+'/3 · 주 '+s.week*lv+'</span><p>'+s.desc+'</p><div class="pips">'+[0,1,2].map(function(i){return '<i class="'+(i<lv?'on':'')+'"></i>';}).join('')+'</div></div>'+
      '<div class="btns">'+(lv>0?'<button class="btn" data-act="fire" data-v="'+k+'" aria-label="'+s.name+' 축소">−</button>':'')+
      (lv<3?'<button class="btn pri" data-act="hire" data-v="'+k+'"'+(S.money<next?' disabled':'')+'>'+fmt(next)+'</button>':'<button class="btn" disabled>최대</button>')+'</div></div>';
  });
  h+='</div>';
  panel.innerHTML=h;
}
function renderStatus(){
  var c=S.cov||{},rows=[['좌석',c.seat],['교제 공간',c.fel],['돌봄',c.care],['편의',c.comf],['주차',c.park]];
  var h='<div class="sec">성도 만족도</div><div class="cov"><span>전체</span><div class="bar"><i style="width:'+Math.round(S.mood)+'%"></i></div><span class="v">'+Math.round(S.mood)+'%</span>';
  rows.forEach(function(r){var v=Math.round((r[1]||0)*100);h+='<span>'+r[0]+'</span><div class="bar"><i style="width:'+v+'%;background:'+(v<60?'var(--bad)':'var(--good)')+'"></i></div><span class="v">'+v+'%</span>';});
  h+='</div><div class="sec">이번 주</div><div class="legend"><span>지금 부지에 '+V.length+'명</span><span>이번 주 방문 '+S.visitsWeek+'</span><span>새 성도 '+S.joinedWeek+'</span></div>';
  h+='<div class="legend" style="margin-top:6px">'+NEEDS.map(function(n){return '<span><i style="background:'+NC[n]+'"></i>'+NK[n]+'</span>';}).join('')+'<span>머리 위 점은 방문자가 찾는 것</span></div>';
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
    '<div class="btns"><button class="btn'+(UI.confirmNew?' bad':'')+'" data-act="newgame">'+(UI.confirmNew?'정말 처음부터 시작할까요? 한 번 더 누르세요':'새로 시작')+'</button></div>'+
    '<div class="sec">조작법</div><ul class="how"><li>한 손가락으로 끌기: 지도 이동</li><li>두 손가락 벌리기·오므리기: 확대·축소 (PC는 마우스 휠)</li><li>오른쪽 회전 버튼: 90°씩 시점 회전</li><li>건물을 고르면 미리보기가 놓입니다. 미리보기를 끌거나 지도를 눌러 옮긴 뒤 짓기를 누르세요</li></ul>'+
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

'use strict';
/* ---------- 사역팀과 섬김이 슬롯 ----------
   사역팀마다 슬롯이 TEAM_MAX(6)칸 있고(왼쪽 3 · 오른쪽 3 육각형), 섬김 갈래 성도(섬김이·사역팀장·사역부장·사역간사)를 배치한다.
   · S.servants[팀] = 배치한 사람 id 목록. 팀의 단계 S.staff[팀] = 배치한 사람 수(teamSync가 맞춘다)이고 효과가 생긴다
   · 넣고 빼고 다른 팀으로 옮기는 데 값이 들지 않고, 사례비도 없다. 한 사람은 한 팀만
   · 효과는 단계 효과 배수(TEAM_K × TEAM_CURVE[단계], 단계가 오를수록 늘어나는 폭이 줄어듦)에 비례한다 (balance.js)
   · 건물·행사처럼 교회 Level로 열린다(goal: LV_TIER 단계). 행사 화면의 '사역팀' 탭에서 다룬다 */
var tP=function(v){return Math.round(v*100)+'%';},tN=function(v){return String(Math.round(v*10)/10);};
var STAFF={
  evang:{name:'전도팀',ic:'📣',col:'#d98a3a',goal:0,d:'거리에서 이웃을 만나 교회를 알려요',
    fx:function(u){return ['방문자 +'+tP(.2*u),'정착률 +'+tP(.1*u)];}},
  praise:{name:'찬양팀',ic:'🎵',col:'#c9627a',goal:0,d:'예배를 찬양으로 채워요',
    fx:function(u){return ['헌금 +'+tP(.12*u),'말씀 효과 +'+tP(.06*u),'찬양 자리 +'+tN(10*u),'만족 +'+tN(u)];}},
  care:{name:'돌봄팀',ic:'🤲',col:'#4f9a83',goal:0,d:'성도 가정을 살펴요',
    fx:function(u){return ['돌봄 효과 +'+tP(.15*u),'목양 수용력 +'+tN(8*u),'만족 +'+tN(.5*u)];}},
  newcomer:{name:'새가족팀',ic:'🌱',col:'#6fa86a',goal:1,d:'새로 온 성도가 자리 잡게 도와요',
    fx:function(u){return ['정착률 +'+tP(.12*u),'이탈 −'+tP(.05*u)];}},
  edu:{name:'교육팀',ic:'📚',col:'#5a74b8',goal:1,d:'말씀과 신앙 교육을 맡아요',
    fx:function(u){return ['돌봄 효과 +'+tP(.12*u),'가족 방문자 +'+tP(.06*u),'말씀 자리 +'+tN(8*u)];}},
  prayer:{name:'중보기도팀',ic:'🙏',col:'#8b6fd6',goal:1,d:'교회와 성도를 위해 기도해요',
    fx:function(u){return ['만족 +'+tN(u),'이탈 −'+tP(.04*u),'기도 자리 +'+tN(8*u)];}},
  admin:{name:'관리팀',ic:'🔧',col:'#7a8a99',goal:2,d:'건물과 살림을 돌봐요',
    fx:function(u){return ['건물 노후 −'+tP(Math.min(.8,.2*u)),'운영비 −'+tP(.04*u)];}},
  media:{name:'미디어팀',ic:'🎬',col:'#2f8f9d',goal:2,d:'교회 소식을 세상에 알려요',
    fx:function(u){return ['방문자 +'+tP(.12*u),'신뢰 +'+tN(.2*u)+'/주'];}},
  mission:{name:'선교팀',ic:'🌍',col:'#b0763f',goal:3,d:'이웃과 세상을 섬겨요',
    fx:function(u){return ['신뢰 +'+tN(.5*u)+'/주','지역 봉사 보상 +'+tP(.5*u)];}}
};
// 단계 → 효과 배수
function teamUnits(lv){return TEAM_K*TEAM_CURVE[Math.max(0,Math.min(TEAM_MAX,lv))];}
// 모든 팀의 지금 효과 배수 {evang: 2, …} — 효과를 계산하는 곳(refreshMods·spirit 등)이 읽는다
function teamEff(){var o={};for(var k in STAFF)o[k]=teamUnits((S.staff&&S.staff[k])||0);return o;}
function teamFx(k,lv){return STAFF[k].fx(teamUnits(lv));}
/* 섬김이 슬롯 */
function teamServants(k){S.servants=S.servants||{};return S.servants[k]||(S.servants[k]=[]);}
function teamEligible(p){return !!p&&ppTrack(p)==='C';}   // 섬김 갈래(섬김이·사역팀장·사역부장·사역간사)
function teamOf(pid){for(var q in STAFF)if(teamServants(q).indexOf(pid)>=0)return q;return '';}
// 아직 어느 팀에도 없는 섬김이 (호감 Lv 높은 사람부터)
function teamFree(){return (S.people||[]).filter(function(p){return teamEligible(p)&&!teamOf(p.id);}).sort(function(a,b){return b.lv-a.lv||a.id-b.id;});}
function teamServeWhy(k,pid){
  var p=ppById(pid),L=teamServants(k);
  if(!STAFF[k]||!p)return '찾을 수 없어요';
  if(!featOk('teams'))return '사역팀은 '+featWhy('teams');
  if(!tierOk(STAFF[k].goal||0))return lockText(STAFF[k].goal)+' 꾸릴 수 있어요';
  if(!teamEligible(p))return '섬김 갈래(섬김이·사역팀장·사역부장·사역간사)만 팀에 설 수 있어요';
  if(L.length>=TEAM_MAX)return '팀 자리가 가득 찼어요 (최대 '+TEAM_MAX+'명)';
  if(teamOf(pid))return '이미 다른 사역팀이에요';
  return '';
}
function teamServe(k,pid){var w=teamServeWhy(k,pid);if(w)return w;teamServants(k).push(pid);teamSync();recalc();save();return '';}
function teamUnserve(k,pid){S.servants[k]=teamServants(k).filter(function(i){return i!==pid;});teamSync();recalc();save();}
// 팀의 단계 = 배치한 사람 수. 떠났거나 자격을 잃은 사람·겹친 사람은 빼고 맞춘다 (recalc 때)
function teamSync(){
  S.servants=S.servants||{};S.staff=S.staff||{};var seen={};
  for(var k in STAFF){
    S.servants[k]=teamServants(k).filter(function(i){var p=ppById(i);if(!p||!teamEligible(p)||seen[i])return false;seen[i]=1;return true;}).slice(0,TEAM_MAX);
    S.staff[k]=S.servants[k].length;
  }
}
// ⚡ 자동 배정: 열린 팀 가운데 사람이 가장 적은 팀부터 한 명씩, 호감 Lv 높은 섬김이를 채운다. 배치한 수
function teamAuto(){
  var n=0;
  teamFree().forEach(function(p){
    var open=Object.keys(STAFF).filter(function(k){return !teamServeWhy(k,p.id);}).sort(function(a,b){return teamServants(a).length-teamServants(b).length;});
    if(open.length){teamServants(open[0]).push(p.id);n++;}
  });
  if(n){teamSync();recalc();save();}
  return n;
}
// 모든 팀에서 섬김이를 뺀다. 뺀 사람 수
function teamReset(){var n=0;for(var k in STAFF){n+=teamServants(k).length;S.servants[k]=[];}if(n){teamSync();recalc();save();}return n;}
// 사역팀이 열리는 단계 (교회 Lv − 1). 표는 balance.js TEAM_LV
for(var tmk in TEAM_LV)if(STAFF[tmk])STAFF[tmk].goal=TEAM_LV[tmk]-1;
// 봇·도구용: 팀 k에 섬김이를 한 명 더(d=1, 가장 호감 Lv 높은 자유 섬김이) 두거나 마지막 한 명을 뺀다. 안 되면 까닭
function teamAdd(k,d){
  var t=STAFF[k];if(!t)return '없는 사역팀이에요';
  if(d>0){
    if(!featOk('teams'))return '사역팀은 '+featWhy('teams');
    if(!tierOk(t.goal||0))return lockText(t.goal)+' 꾸릴 수 있어요';
    var p=teamFree()[0];if(!p)return '배치할 섬김이가 없어요. 성도를 섬김 갈래로 길러 주세요';
    return teamServe(k,p.id);
  }
  var L=teamServants(k);if(!L.length)return '배치한 섬김이가 없어요';
  teamUnserve(k,L[L.length-1]);return '';
}

/* ---------- 사역팀 탭 (행사 화면) ---------- */
// 육각형 슬롯: 비어 있으면 점선 테두리, 차 있으면 얼굴이 가득
function hexSlot(k,pid){
  var p=pid&&ppById(pid);
  if(!p)return '<button class="hex empty" data-act="tmslot" data-v="'+k+'" aria-label="'+STAFF[k].name+' 빈 슬롯 — 섬김이 배치"><svg viewBox="0 0 52 60" aria-hidden="true"><polygon points="26,2 50,16 50,44 26,58 2,44 2,16"/></svg><b>＋</b></button>';
  return '<button class="hex full" data-act="tmfree" data-v="'+k+':'+p.id+'" aria-label="'+p.n+' 빼기" title="'+p.n+' · 누르면 빼요"><i><img alt="" src="'+personFace(p)+'"></i></button>';
}
function teamCardHtml(k){
  var t=STAFF[k],L=teamServants(k),lv=L.length,lk=!tierOk(t.goal||0),cls=lk?'lock':(lv?'run':'wait'),side=function(a){var h='';for(var i=a;i<a+3;i++)h+=hexSlot(k,L[i]);return h;};
  if(lk)return '<div class="evc teamc '+cls+'"><button class="tmi" data-act="tmopen" data-v="'+k+'" aria-label="'+t.name+' 정보"><span class="evr">'+ringSvg(0)+'<span class="evi" style="--c:'+t.col+'">'+t.ic+'</span><span class="evlk" aria-hidden="true">🔒</span></span><span class="evn">'+t.name+'</span></button><span class="evp">Lv '+LV_TIER[t.goal]+' 후</span></div>';
  return '<div class="evc teamc tm6 '+cls+'"><div class="tmh l">'+side(0)+'</div>'+
    '<button class="tmi" data-act="tmopen" data-v="'+k+'" aria-label="'+t.name+' 정보">'+
    '<span class="evr">'+ringSvg(lv/TEAM_MAX)+'<span class="evi" style="--c:'+t.col+'">'+t.ic+'</span></span><span class="evn">'+t.name+'</span><span class="evp">'+lv+' / '+TEAM_MAX+'</span></button>'+
    '<div class="tmh r">'+side(3)+'</div></div>';
}
function teamsHtml(){
  var fr=teamFree().length,used=Object.keys(STAFF).reduce(function(n,k){return n+teamServants(k).length;},0);
  return '<div class="sbulk tbar"><span class="tinfo">섬김이 '+used+'명 배치 · 대기 '+fr+'명 · 빈 칸을 누르면 섬김이를 세워요 · 목양 수용력 '+S.members+' / '+Math.round(MOD.cap)+'명</span>'+
    '<button class="btn" data-act="tmreset"'+(used?'':' disabled')+'>모두 빼기</button><button class="btn pri" data-act="tmauto"'+(fr?'':' disabled')+'>⚡ 자동 배정</button></div>'+
    '<div class="tmg6">'+Object.keys(STAFF).map(teamCardHtml).join('')+'</div>';
}
function teamDlgHtml(k){
  var t=STAFF[k],lv=teamServants(k).length,lk=!tierOk(t.goal||0);
  var rows=[['단계',lv+' / '+TEAM_MAX],['지금 효과',lv?teamFx(k,lv).join('<br>'):'아직 없어요']];
  if(lv<TEAM_MAX)rows.push(['다음 단계 (섬김이 '+(lv+1)+'명)',teamFx(k,lv+1).join('<br>')]);
  return '<div class="sdlg" role="dialog" aria-label="'+t.name+'"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big" data-team="'+k+'">'+ringSvg(lv/TEAM_MAX)+'<span class="evi" style="--c:'+t.col+'">'+t.ic+'</span></span>'+
    '<div class="sdt"><h3>'+t.name+(lk?'':' <span class="rchip t0">'+(lv?'섬김이 '+lv+'명':'미배치')+'</span>')+'</h3><p>'+t.d+'</p></div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    (lk?'<p class="swhy">'+lockText(t.goal)+' 꾸릴 수 있어요</p>':'')+'</div>';
}
// 빈 슬롯을 눌렀을 때: 배치할 섬김이 고르기
function teamPickHtml(k){
  var t=STAFF[k],L=teamFree(),why=teamServants(k).length>=TEAM_MAX?'팀 자리가 가득 찼어요':'';
  return '<div class="sdlg tmpick" role="dialog" aria-label="'+t.name+' 섬김이 배치"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big">'+ringSvg(teamServants(k).length/TEAM_MAX)+'<span class="evi" style="--c:'+t.col+'">'+t.ic+'</span></span><div class="sdt"><h3>'+t.name+' 섬김이 배치</h3><p>호감 Lv 높은 순 · 한 사람은 한 팀만</p></div></div>'+
    (L.length&&!why?'<div class="lp-g tm-lp">'+L.map(function(p){return '<button class="lp" data-act="tmpick" data-v="'+k+':'+p.id+'" aria-label="'+p.n+' '+ppRankName(p)+' 호감 Lv '+p.lv+'"><img alt="" src="'+personFace(p)+'"><span>'+p.n+'</span><small>♥'+p.lv+'</small></button>';}).join('')+'</div>':
      '<p class="sempty">'+(why||'배치할 섬김이가 없어요. 성도를 길러 섬김 갈래(섬김이·사역팀장…)로 세워 주세요.')+'</p>')+'</div>';
}
function scrTeamClick(a,v){
  if(a==='tmopen'){UI.scrSel={t:'tm',id:v};sfx('click',.4);renderScreen();return true;}
  if(a==='tmslot'){UI.scrSel={t:'tms',id:v};sfx('click',.4);renderScreen();return true;}
  if(a==='tmpick'||a==='tmfree'){
    var kv=String(v).split(':'),w=a==='tmpick'?teamServe(kv[0],+kv[1]):(teamUnserve(kv[0],+kv[1]),'');
    if(w){scrToast(w,2200);sfx('error',.4);}else{sfx(a==='tmpick'?'join':'click',.5,0);UI.scrSel=null;}
    renderScreen();hud(true);return true;
  }
  if(a==='tmauto'){var n=teamAuto();if(n){sfx('join',.5,0);scrToast('섬김이 '+n+'명을 팀에 배정했어요',2000);}else{sfx('error',.4);scrToast('배정할 섬김이나 열린 팀이 없어요',2000);}renderScreen();hud(true);return true;}
  if(a==='tmreset'){var n2=teamReset();if(n2){scrToast('섬김이 '+n2+'명을 모두 뺐어요',2000);sfx('click',.5);}renderScreen();hud(true);return true;}
  return false;
}

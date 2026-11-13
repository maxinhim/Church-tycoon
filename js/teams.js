'use strict';
/* ---------- 사역팀과 달란트 ----------
   사역 경험 지표 레벨 1당 달란트 1개(TALENT_PER_LV). 달란트를 사역팀에 넣으면 그 팀의 단계(0~TEAM_MAX)가 오르고 효과가 생긴다.
   · 넣고 빼고 다른 팀으로 옮기는 데 값이 들지 않고, 사례비도 없다. 한정된 달란트를 어떤 팀에 얼마나 쓸지가 선택이다
   · 효과는 단계 효과 배수(TEAM_K × TEAM_CURVE[단계], 단계가 오를수록 늘어나는 폭이 줄어듦)에 비례한다 (balance.js)
   · S.staff[팀] = 그 팀에 넣은 달란트 수. 달란트가 모자라게 되면(옛 저장) 가장 높은 팀부터 줄인다 (fitTalents)
   · 건물·행사처럼 교회 Level로 열린다(goal: LV_TIER 단계). 행사 화면의 '사역팀' 탭(원형 카드)에서 다룬다 */
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
/* 달란트 */
function talentTotal(){return TALENT_PER_LV*ilState().xp.lv;}
function talentUsed(){var t=0;for(var k in STAFF)t+=(S.staff&&S.staff[k])||0;return t;}
function talentFree(){return talentTotal()-talentUsed();}
// 달란트가 모자라면(옛 저장 등) 가장 높은 팀부터 줄인다. 줄였으면 true
function fitTalents(){
  if(S.il&&S.il.xp&&S.il.xp.fresh)return false;   // 아직 지표 레벨을 맞추기 전
  var over=talentUsed()-talentTotal(),moved=false;
  while(over>0){
    var best=null;for(var k in STAFF)if((S.staff[k]||0)>0&&(!best||S.staff[k]>S.staff[best]))best=k;
    if(!best)break;S.staff[best]--;over--;moved=true;
  }
  if(moved)addLog('달란트가 모자라 사역팀 단계를 조정했어요');
  return moved;
}
// 팀에 달란트를 하나 넣거나(d=1) 뺀다(d=−1). 안 되면 까닭
function teamAdd(k,d){
  var t=STAFF[k];if(!t)return '없는 사역팀이에요';
  var lv=S.staff[k]||0;
  if(d>0){
    if(!tierOk(t.goal||0))return lockText(t.goal)+' 꾸릴 수 있어요';
    if(lv>=TEAM_MAX)return '이미 최대 단계예요';
    if(talentFree()<=0)return '남은 달란트가 없어요. 다른 팀에서 달란트를 빼 오세요';
    S.staff[k]=lv+1;
  }else{
    if(lv<=0)return '넣어 둔 달란트가 없어요';
    S.staff[k]=lv-1;
  }
  recalc();save();return '';
}
// 모든 팀에서 달란트를 뺀다. 뺀 개수
function teamReset(){var n=0;for(var k in STAFF){n+=S.staff[k]||0;S.staff[k]=0;}if(n){recalc();save();}return n;}

/* ---------- 사역팀 탭 (행사 화면) ---------- */
// 황금 보석 (filled=false면 빈 자리)
function gemSvg(filled,cls){
  var id='g'+(gemSvg.n=(gemSvg.n||0)+1);
  if(!filled)return '<svg class="gem e '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 6-8 12L4 9z" fill="rgba(0,0,0,.06)" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 2" stroke-linejoin="round"/></svg>';
  return '<svg class="gem f '+(cls||'')+'" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset=".5" stop-color="#f6c427"/><stop offset="1" stop-color="#c98a0a"/></linearGradient></defs>'+
    '<path d="M12 2.5l8.5 6.3L12 21.5 3.5 8.8z" fill="url(#'+id+')" stroke="#9a6406" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.5 8.8h17M8.2 8.8L12 2.5l3.8 6.3M8.2 8.8L12 21.5l3.8-12.7" fill="none" stroke="#fff6c2" stroke-opacity=".8" stroke-width=".8" stroke-linejoin="round"/></svg>';
}
function teamCardHtml(k){
  var t=STAFF[k],lv=S.staff[k]||0,lk=!tierOk(t.goal||0),gems='';
  for(var i=1;i<=TEAM_MAX;i++)gems+=gemSvg(i<=lv);
  var cls=lk?'lock':(lv?'run':'wait'),canAdd=!teamAddWhy(k),canSub=lv>0;
  return '<div class="evc teamc '+cls+'"><button class="tmi" data-act="tmopen" data-v="'+k+'" aria-label="'+t.name+' 정보">'+
    '<span class="evr">'+ringSvg(lv/TEAM_MAX)+'<span class="evi" style="--c:'+t.col+'">'+t.ic+'</span>'+(lk?'<span class="evlk" aria-hidden="true">🔒</span>':'')+'</span>'+
    '<span class="evn">'+t.name+'</span></button>'+
    (lk?'<span class="evp">Lv '+LV_TIER[t.goal]+' 후</span>':'<div class="tgems" role="img" aria-label="달란트 '+lv+' / '+TEAM_MAX+'">'+gems+'</div>'+
    '<div class="tpm"><button class="tb" data-act="tmsub" data-v="'+k+'"'+(canSub?'':' disabled')+' aria-label="'+t.name+' 달란트 빼기">−</button><button class="tb pl" data-act="tmadd" data-v="'+k+'"'+(canAdd?'':' disabled')+' aria-label="'+t.name+' 달란트 넣기">+</button></div>')+'</div>';
}
function teamsHtml(){
  var tot=talentTotal(),used=talentUsed(),free=tot-used;
  return '<div class="sbulk tbar"><span class="tpurse'+(free>0?' has':'')+'" role="img" aria-label="남은 달란트 '+free+'개">'+gemSvg(true,'big')+'<b>×'+free+'</b><small>/ '+tot+'</small></span>'+
    '<span class="tinfo">달란트 · 사역 경험 Lv 1당 1개 · 목양 수용력 '+S.members+' / '+Math.round(MOD.cap)+'명</span>'+
    '<button class="btn" data-act="tmreset"'+(used?'':' disabled')+'>모두 빼기</button></div>'+
    '<div class="evg tmg">'+Object.keys(STAFF).map(teamCardHtml).join('')+'</div>';
}
function teamDlgHtml(k){
  var t=STAFF[k],lv=S.staff[k]||0,lk=!tierOk(t.goal||0),free=talentFree();
  var addWhy=teamAddWhy(k),subWhy=lv<=0?'넣어 둔 달란트가 없어요':'';
  var rows=[['단계',lv+' / '+TEAM_MAX],['지금 효과',lv?teamFx(k,lv).join('<br>'):'아직 없어요']];
  if(lv<TEAM_MAX)rows.push(['다음 단계 (Lv '+(lv+1)+')',teamFx(k,lv+1).join('<br>')]);
  rows.push(['남은 달란트',free+' / '+talentTotal()]);
  return '<div class="sdlg" role="dialog" aria-label="'+t.name+'"><button class="sx" data-act="evclose" aria-label="닫기">✕</button>'+
    '<div class="sdh"><span class="evr big" data-team="'+k+'">'+ringSvg(lv/TEAM_MAX)+'<span class="evi" style="--c:'+t.col+'">'+t.ic+'</span></span>'+
    '<div class="sdt"><h3>'+t.name+(lk?'':' <span class="rchip t0">'+(lv?'Lv '+lv:'미배치')+'</span>')+'</h3><p>'+t.d+'</p></div></div>'+
    '<dl class="sdr">'+rows.map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+r[1]+'</dd></div>';}).join('')+'</dl>'+
    (addWhy&&!lk&&lv<TEAM_MAX?'<p class="swhy">'+addWhy+'</p>':(lk?'<p class="swhy">'+lockText(t.goal)+' 꾸릴 수 있어요</p>':''))+
    '<div class="sdb two"><button class="btn" data-act="tmsub" data-v="'+k+'"'+(subWhy?' disabled':'')+'>달란트 빼기</button>'+
    '<button class="btn pri" data-act="tmadd" data-v="'+k+'"'+(addWhy?' disabled':'')+'>달란트 넣기</button></div></div>';
}
function teamAddWhy(k){
  var t=STAFF[k],lv=S.staff[k]||0;
  if(!tierOk(t.goal||0))return lockText(t.goal)+' 꾸릴 수 있어요';
  if(lv>=TEAM_MAX)return '이미 최대 단계예요';
  if(talentFree()<=0)return '남은 달란트가 없어요. 다른 팀에서 달란트를 빼 오세요';
  return '';
}
function scrTeamClick(a,v){
  if(a==='tmopen'){UI.scrSel={t:'tm',id:v};sfx('click',.4);renderScreen();return true;}
  if(a==='tmadd'||a==='tmsub'){
    var w=teamAdd(v,a==='tmadd'?1:-1);
    if(w){scrToast(w,2200);sfx('error',.4);}
    else{sfx(a==='tmadd'?'coins':'click',.5,0);}
    renderScreen();hud(true);return true;
  }
  if(a==='tmreset'){var n=teamReset();if(n){scrToast('달란트 '+n+'개를 모두 뺐어요',2000);sfx('click',.5);}renderScreen();hud(true);return true;}
  return false;
}

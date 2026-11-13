'use strict';
/* ---------- 저장 ---------- */
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function load(){
  try{
    var raw=localStorage.getItem(SAVE_KEY);
    if(raw){var o=JSON.parse(raw),n=newState();
      // 옛 저장에는 '마지막으로 새로 한 주'가 없다: 지금 주로 맞춰 곧바로 매너리즘에 걸리지 않게
      if(o.lastNew===undefined)o.lastNew=o.week||0;
      // Level 곡선이 바뀌기 전 저장: 새 곡선으로 한 번 다시 맞춘다 (이때만 내려갈 수 있다)
      if(o.lvc===undefined){o.lvl=null;o.lvc=2;}
      // 현황 지표·퀘스트가 생기기 전 저장: 목표·첫 걸음을 마친 만큼 퀘스트로 옮기고 Level은 새 기준으로 다시 맞춘다
      if(o.lvc<3){migrateQuests(o);o.lvl=null;o.lvc=3;}
      for(var k in n){if(o[k]===undefined)o[k]=n[k];}
      o.buildings=o.buildings.filter(function(b){return D[b.def]&&(!isRoomDef(b.def)||(b.tiles&&b.tiles.length));});o.buildings.forEach(function(b){b.inUse=0;});
      ['staff','off'].forEach(function(k2){for(var q in n[k2])if(o[k2][q]===undefined)o[k2][q]=n[k2][q];});
      return o;}
  }catch(e){}
  return newState();
}

// 예전 저장의 첫 걸음(step)·목표(goal) 개수만큼 퀘스트를 마친 것으로 옮긴다 (보상은 이미 받았으니 사역 경험만 쌓아 준다)
function migrateQuests(o){
  o.qd=o.qd||{};o.qb=o.qb||{};o.qxp=o.qxp||0;
  var st=o.step===undefined?((o.week||0)>1?6:0):o.step,gl=o.goal||0;
  for(var i=1;i<=6;i++)if(i<=st&&QID['f'+i]){o.qd['f'+i]=1;o.qxp+=QID['f'+i].xp;}
  for(var j=1;j<=7;j++)if(j<=gl&&QID['g'+j]){o.qd['g'+j]=1;o.qxp+=QID['g'+j].xp;}
  delete o.step;delete o.stepW;delete o.goal;
}

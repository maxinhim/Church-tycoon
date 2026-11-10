'use strict';
/* ---------- 저장 ---------- */
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function load(){
  try{
    var raw=localStorage.getItem(SAVE_KEY);
    if(raw){var o=JSON.parse(raw),n=newState();
      // 옛 저장에는 '마지막으로 새로 한 주'가 없다: 지금 주로 맞춰 곧바로 매너리즘에 걸리지 않게
      if(o.lastNew===undefined)o.lastNew=o.week||0;
      for(var k in n){if(o[k]===undefined)o[k]=n[k];}
      o.buildings=o.buildings.filter(function(b){return D[b.def]&&(!isRoomDef(b.def)||(b.tiles&&b.tiles.length));});o.buildings.forEach(function(b){b.inUse=0;});
      ['staff','off'].forEach(function(k2){for(var q in n[k2])if(o[k2][q]===undefined)o[k2][q]=n[k2][q];});
      return o;}
  }catch(e){}
  return newState();
}

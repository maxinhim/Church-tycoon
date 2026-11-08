'use strict';
/* ---------- 저장 ---------- */
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
function load(){
  try{
    var raw=localStorage.getItem(SAVE_KEY);
    if(raw){var o=JSON.parse(raw),n=newState();for(var k in n){if(o[k]===undefined)o[k]=n[k];}
      o.buildings=o.buildings.filter(function(b){return D[b.def]&&(b.def!=='mroom'||(b.tiles&&b.tiles.length));});o.buildings.forEach(function(b){b.inUse=0;});return o;}
  }catch(e){}
  return newState();
}

'use strict';
/* ---------- 효과와 빠른 현황 ----------
   · 떠오르는 글씨 (F 목록, 실제 시간 기준) — 건축 효과는 화면을 가려서 띄우지 않는다
   · 목표 달성 축하 카드와 종이 꽃가루 (CF 목록, 화면 좌표)
   · 현황 패널 맨 위의 한눈 요약(만족·수지·챙길 일)
   · 목회 고민거리 선택 카드(#dlg) */
var REDUCED=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
function stepFx(rdt){
  for(var i=0;i<F.length;i++){var f=F[i];if(f.delay>0)f.delay-=rdt;else f.t-=rdt;}
  F=F.filter(function(f){return f.t>0;});
  for(var j=0;j<CF.length;j++){var p=CF[j];p.vy+=420*rdt;p.vx*=0.995;p.x+=p.vx*rdt;p.y+=p.vy*rdt;p.r+=p.vr*rdt;p.life-=rdt;}
  CF=CF.filter(function(p){return p.life>0&&p.y<VH+40;});
}
function drawFx(c){
  F.forEach(function(f){
    if(f.delay>0)return;
    var dur=f.d||1.6,k=1-f.t/dur,p=rotPt(f.x,f.y),q=P(p[0],p[1],(f.z==null?1.1:f.z)+k*(f.big?1.5:.9));
    var a=f.t<0.6?f.t/0.6:(k<0.1?k/0.1:1);
    var size=f.big?Math.max(14,16*cam.z):Math.max(11,13*cam.z);
    c.globalAlpha=clamp(a,0,1);c.font='800 '+size+'px "IBM Plex Sans KR",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=f.big?4:3;c.strokeStyle='rgba(15,25,35,.85)';c.strokeText(f.text,q[0],q[1]);
    c.fillStyle=f.col||'#fff';c.fillText(f.text,q[0],q[1]);c.globalAlpha=1;
  });
  CF.forEach(function(p){
    c.save();c.translate(p.x,p.y);c.rotate(p.r);c.globalAlpha=clamp(p.life,0,1);c.fillStyle=p.col;c.fillRect(-p.w/2,-p.h/2,p.w,p.h);c.restore();
  });
}

/* ---------- 목표 달성 축하 ---------- */
var CF=[],celeTimer=0;
function celebrate(g,lines){
  var el=$('#cele');if(!el)return;
  sfx('bell',.85,0);setTimeout(function(){sfx('join',.7,0);},300);
  el.innerHTML='<div class="cbox" role="status"><div class="ckick">목표 달성</div><h2>'+g.n+'</h2><ul>'+lines.map(function(l){return '<li>'+l+'</li>';}).join('')+'</ul><p class="chint">눌러서 닫기</p></div>';
  el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  clearTimeout(celeTimer);celeTimer=setTimeout(function(){el.hidden=true;},7000);
  if(!REDUCED.matches){
    var cols=['#ffd23f','#ff6b6b','#4ecdc4','#7aa0ff','#ffffff','#c77dff','#8bd450'];
    for(var i=0;i<160;i++){
      var fromLeft=i%2===0;
      CF.push({x:fromLeft?-10:VW+10,y:VH*0.55+Math.random()*VH*0.3,vx:(fromLeft?1:-1)*(260+Math.random()*420),vy:-(380+Math.random()*420),
        r:Math.random()*6,vr:(Math.random()-.5)*14,w:5+Math.random()*6,h:3+Math.random()*4,col:cols[i%cols.length],life:2.6+Math.random()*1.4});
    }
  }
  toast('목표 달성 · '+g.n,3000);
}

/* ---------- 현황 한눈 요약 ---------- */
function warnings(){
  var w=[],c=S.cov||{};
  if(S.wish)w.push(wishLine());
  if(S.money<0)w.push('자금이 마이너스예요. -1,500 아래로 내려가면 문을 닫아요');
  else if(lastNet(S)<0)w.push('지난주 적자 '+fmt(lastNet(S)));
  if(S.open&&!hallsReach())w.push('예배 공간에 닿는 길이 없어요. 길을 이어 주세요');
  if(S.members>A.seats)w.push('좌석이 부족해 성도가 떠나요');
  if(c.spirit!=null&&c.spirit<0.45)w.push('영성이 낮아요 ('+Math.round(c.spirit*100)+'%). 성찬식·세례식을 열고 기도실·성경공부방·찬양실을 갖춰요');
  if(S.members>MOD.cap)w.push('목양이 벅차요. 부교역자·직분자를 세우세요');
  if(staleWeeks()>0)w.push('매너리즘: 새로 한 일 없이 '+(S.week-(S.lastNew||0))+'주째예요. 새 건물·꾸미기나 다른 행사를 해 보세요');
  var rp=needRepair().length;if(rp)w.push('수리가 필요한 건물 '+rp+'곳');
  var un=S.buildings.filter(function(b){return needsDoor(b)&&!usable(b);});if(un.length)w.push('이용할 수 없는 건물: '+defOf(un[0]).name+(un.length>1?' 외 '+(un.length-1)+'곳':'')+' · 건물을 눌러 길을 이어 주세요');
  if(c.park<0.7&&!isLocked('lot'))w.push('주차가 모자라 방문자가 줄어요');
  // 방문자가 실제로 겪은 불편 (무엇을 지으면 되는지까지)
  gripeList().slice(0,5).forEach(function(g){w.push(g.t);});
  if(S.gripPen>=0.5)w.push('지난주 불편 때문에 성도 만족도 −'+S.gripPen);
  return w;
}
function qbar(label,v){
  var p=Math.round(clamp(v,0,1)*100);
  return '<span>'+label+'</span><div class="bar"><i style="width:'+p+'%;background:'+(p<60?'var(--bad)':p<90?'var(--gold)':'var(--good)')+'"></i></div><span class="v">'+p+'%</span>';
}
function statusSummary(){
  var c=S.cov||{},net=lastNet(S),w=warnings(),act=activeEvents().filter(function(id){return !EVENTS[id].hidden;});
  return '<div class="qnums"><div><span>만족도</span><b>'+Math.round(S.mood)+'%</b></div><div><span>지난주 수지</span><b class="'+(net<0?'neg':'pos')+'">'+(net>=0?'+':'')+fmt(net)+'</b></div>'+
    '<div><span>이번 주 방문</span><b>'+S.visitsWeek+'</b></div><div><span>새 성도</span><b>'+S.joinedWeek+'</b></div></div>'+
    (act.length?'<div class="qev">'+act.map(function(id){return '<span>'+EVENTS[id].name+' · '+evLeftText(id)+'</span>';}).join('')+'</div>':'')+
    '<div class="sec">챙길 일</div>'+(w.length?'<ul class="qwarn">'+w.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>':'<p class="qok">지금은 특별히 챙길 일이 없어요</p>');
}

/* ---------- 목회 고민거리 카드 ---------- */
function showDlg(){
  var el=$('#dlg');if(!el)return;
  var d=S.dlg?dlgById(S.dlg):null;
  if(!d){el.hidden=true;return;}
  el.hidden=false;
  el.innerHTML='<div class="box" role="dialog" aria-modal="true" aria-labelledby="dlgT"><div class="ckick">목회 고민</div><h2 id="dlgT">'+d.t+'</h2><p>'+d.x+'</p><div class="dopts">'+
    d.o.map(function(o,i){var off=o.ok&&!o.ok();return '<button class="btn'+(i===0?' pri':'')+'" data-act="dlg" data-v="'+i+'"'+(off?' disabled':'')+'><b>'+o.l+'</b><small>'+o.d+'</small></button>';}).join('')+
    '</div><p class="chint">고르는 동안 시간이 멈춰요</p></div>';
}

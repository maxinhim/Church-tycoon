'use strict';
/* ---------- 바닥 타일 ----------
   땅 칸에 칠하는 바닥(보도블록·벽돌·자갈·나무·꽃잔디). 걸어 다닐 수 있고 분위기 점수를 조금 올린다.
   S.floor = {"x,y": 정의 id} */
function isFloorDef(id){return !!D[id]&&D[id].kind==='floor';}
function paintFloor(x,y,id){
  if(x<0||y<0||x>=COLS||y>=ROWS-1)return '부지 밖이에요';
  if(occ[y][x])return '건물이 있어요';
  var k=x+','+y,prev=S.floor[k]||null;
  if(id==='f_erase'){
    if(!prev)return '지울 바닥이 없어요';
    delete S.floor[k];S.money+=Math.floor(D[prev].cost*0.5);
  }else{
    if(prev===id)return '이미 같은 바닥이에요';
    if(S.money<D[id].cost)return '자금이 부족해요';
    S.money-=D[id].cost;S.floor[k]=id;
  }
  if(UI.undo)UI.undo.push({x:x,y:y,prev:prev,id:id});
  recalc();save();return '';
}
function floorUndo(){
  var u=UI.undo.pop();if(!u)return false;
  var k=u.x+','+u.y;
  if(u.id==='f_erase'){S.floor[k]=u.prev;S.money-=Math.floor(D[u.prev].cost*0.5);}
  else{if(u.prev)S.floor[k]=u.prev;else delete S.floor[k];S.money+=D[u.id].cost;}
  recalc();save();return true;
}
function floorLine(c,ax,ay,bx,by){var a=rotPt(ax,ay),b=rotPt(bx,by),p=P(a[0],a[1],.006),q=P(b[0],b[1],.006);c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);}
function drawFloorTile(id,x,y){
  var d=D[id],r=rrect(x,y,x+1,y+1),c=PJ.c,i;
  quad([[r.x0,r.y0,.005],[r.x1,r.y0,.005],[r.x1,r.y1,.005],[r.x0,r.y1,.005]],d.wall,'rgba(0,0,0,.1)');
  c.strokeStyle='rgba(40,30,20,.22)';c.lineWidth=Math.max(.5,.8*PJ.s);c.beginPath();
  if(d.pat==='grid'){floorLine(c,x+.5,y,x+.5,y+1);floorLine(c,x,y+.5,x+1,y+.5);}
  else if(d.pat==='brick'){
    for(i=1;i<4;i++)floorLine(c,x,y+i/4,x+1,y+i/4);
    for(i=0;i<4;i++){var o=i%2?.25:.5;floorLine(c,x+o,y+i/4,x+o,y+(i+1)/4);if(o===.25)floorLine(c,x+.75,y+i/4,x+.75,y+(i+1)/4);}
  }else if(d.pat==='plank'){for(i=1;i<5;i++)floorLine(c,x+i/5,y,x+i/5,y+1);}
  c.stroke();
  if(d.pat==='dots'||d.pat==='flower'){
    for(i=0;i<(d.pat==='dots'?14:9);i++){
      var p=rotPt(x+.08+hh(x*31+i,y*17)*.84,y+.08+hh(y*13+i,x*7+i)*.84);
      dot(p[0],p[1],.01,Math.max(.6,(d.pat==='dots'?1.3:1.8)*PJ.s),d.pat==='dots'?(i%2?'#a59a87':'#d8cfbf'):(i%3?d.roofc:'#ffffff'));
    }
  }
}
function drawFloors(){
  for(var k in S.floor){var p=k.split(','),id=S.floor[k];if(D[id])drawFloorTile(id,+p[0],+p[1]);}
}

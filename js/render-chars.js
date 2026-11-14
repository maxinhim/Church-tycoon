'use strict';
/* ---------- 캐릭터 픽셀 그림 (코드로 그린다 — 외부 그림 없음) ----------
   2.5등신 귀요미 비율, 가로 CHR_W × 세로 CHR_H 칸의 작은 격자에 사각형을 찍어 그린다.
   · 보는 쪽 view: 'f' 앞모습(화면 오른쪽 아래를 봄) · 'b' 뒷모습(왼쪽 위를 봄). flip으로 좌우를 뒤집어 네 방향을 만든다
   · 자세 pose: 'stand' 서기 · 'walk' 걷기(4프레임) · 'look' 두리번(2프레임) · 'sit' 앉기 · 'preach' 설교(목사, 2프레임)
   · 종류는 CHR_SPECS의 색·소품으로 나눈다 (kind 'pastor' 가운·스톨·성경책 / 'visitor' 가디건·청바지·어깨 가방)
   chrDraw(c,cx,fy,k,sp,view,pose,fr,flip): 발밑 가운데 (cx,fy)에 한 칸 = k픽셀로 그린다 */
var CHR_W=16,CHR_H=23,CHR_LINE='#2b2433';
var CHR_SPECS={
  pastor:{kind:'pastor',skin:'#f2cfa6',skinS:'#d9aa80',hair:'#2b2b33',hairS:'#7c7c86',robe:'#2a2a33',robeS:'#18181e',stole:'#7a4fb0',stoleS:'#5d3a8c',gold:'#e8b93a',shoe:'#121216',bible:'#7a1f28'},
  visitor:{kind:'visitor',skin:'#f6d6b2',skinS:'#e0b48c',hair:'#6b4226',hairS:'#4e2f1a',top:'#7fb8e6',topS:'#5c98cf',inner:'#ffffff',bottom:'#48689a',bottomS:'#36507a',shoe:'#f4efe6',bag:'#9a6532',bagS:'#6f4420'}
};
// 한 장면을 이루는 사각형 목록 [x,y,w,h,색] (격자 칸 단위, 뒤에 넣은 것이 위에 그려진다)
function chrOps(sp,view,pose,fr){
  var o=[],R=function(x,y,w,h,c){o.push([x,y,w,h,c]);},front=view!=='b',pas=sp.kind==='pastor';
  fr=fr||0;
  var walk=pose==='walk',dy=walk&&fr%2===1?-1:0,sit=pose==='sit'?3:0,ld=pose==='look'?(fr%2?1:-1):0;
  var liftL=walk&&fr===1,liftR=walk&&fr===3,aL=walk?(fr===1?1:fr===3?-1:0):0,aR=-aL,by=dy+sit;
  // --- 다리·신발
  if(pas){
    R(5,22,2,1,sp.shoe);R(9,22,2,1,sp.shoe);
    if(liftL)R(4,22,2,1,sp.shoe);if(liftR)R(10,22,2,1,sp.shoe);
  }else if(sit){
    R(5,21,2,1,sp.bottom);R(9,21,2,1,sp.bottomS);R(4,22,3,1,sp.shoe);R(9,22,3,1,sp.shoe);
  }else{
    var y0=18+dy;
    R(5,y0,2,(liftL?3:4)-dy,sp.bottom);R(9,y0,2,(liftR?3:4)-dy,sp.bottomS);
    R(front?4:5,liftL?21:22,3,1,sp.shoe);R(front?9:8,liftR?21:22,3,1,sp.shoe);
  }
  // --- 몸
  if(pas){
    var sw=liftL?-1:liftR?1:0;
    R(4,11+by,8,7,sp.robe);R(3,18+by,10,4-by,sp.robe);R(3+sw,21,10,1,sp.robeS);
    R(11,11+by,1,7,sp.robeS);R(12,18+by,1,3-by,sp.robeS);
    if(front){
      R(6,11+by,4,1,'#ffffff');
      R(5,12+by,1,8,sp.stole);R(10,12+by,1,8,sp.stoleS);R(5,19+by,1,1,sp.gold);R(10,19+by,1,1,sp.gold);
      R(8,13+by,1,4,sp.gold);R(7,14+by,3,1,sp.gold);
      // 왼손의 성경책, 오른팔(설교할 때는 들어 올린다)
      R(2,12+by,2,5,sp.robe);R(1,14+by,3,4,sp.bible);R(1,17+by,3,1,'#f1ece2');R(2,15+by,1,2,sp.gold);R(3,16+by,1,1,sp.skin);
      if(pose==='preach'){var up=fr%2;R(12,10+by,2,3,sp.robeS);R(13,8+by-up,2,3,sp.robe);R(14,6+by-up,1,2,sp.skin);}
      else{R(12,12+by+aR,2,5,sp.robeS);R(12,17+by+aR,2,1,sp.skin);}
    }else{
      R(5,11+by,6,1,sp.stole);R(6,12+by,4,1,sp.stole);R(7,13+by,2,1,sp.stoleS);
      R(2,12+by+aL,2,5,sp.robe);R(2,17+by+aL,2,1,sp.skin);R(12,12+by+aR,2,5,sp.robeS);R(12,17+by+aR,2,1,sp.skin);
    }
  }else{
    R(3,11+by+aL,1,5,sp.top);R(3,16+by+aL,1,1,sp.skin);
    R(12,11+by+aR,1,5,sp.topS);R(12,16+by+aR,1,1,sp.skin);
    R(4,11+by,8,7,sp.top);R(11,11+by,1,7,sp.topS);R(4,17+by,8,1,sp.topS);
    var i;
    if(front){
      R(7,11+by,2,6,sp.inner);
      for(i=0;i<6;i++)R(4+i,11+by+i,1,1,sp.bagS);
      R(10,15+by,3,3,sp.bag);R(10,15+by,3,1,sp.bagS);R(11,16+by,1,1,sp.gold||'#e8c86a');
    }else{
      for(i=0;i<6;i++)R(11-i,11+by+i,1,1,sp.bagS);
      R(3,15+by,3,3,sp.bag);R(3,15+by,3,1,sp.bagS);
    }
  }
  // --- 머리
  var hy=by;
  if(front){
    R(7,10+hy,2,1,sp.skinS);
    R(3,4+hy,10,6,sp.skin);R(4,10+hy,8,1,sp.skinS);
    R(4,0+hy,8,1,sp.hair);R(3,1+hy,10,3,sp.hair);R(3,4+hy,10,1,sp.hair);
    if(pas){R(2,3+hy,1,2,sp.hair);R(13,3+hy,1,2,sp.hair);R(2,5+hy,1,2,sp.hairS);R(13,5+hy,1,2,sp.hairS);R(3,5+hy,1,1,sp.hair);R(9,4+hy,4,1,sp.skin);R(9,3+hy,1,1,sp.hairS);}
    else{R(2,3+hy,1,7,sp.hair);R(13,3+hy,1,7,sp.hair);R(3,5+hy,2,2,sp.hair);R(12,5+hy,1,1,sp.hair);R(5,1+hy,3,1,sp.hairS);}
    R(6+ld,6+hy,1,2,CHR_LINE);R(10+ld,6+hy,1,2,CHR_LINE);
    R(5+ld,8+hy,1,1,'#f0a79c');R(11+ld,8+hy,1,1,'#f0a79c');
    R(8+ld,9+hy,1,1,'#b5655a');
    if(pas)R(7+ld,9+hy,3,1,'#b5655a');   // 온화한 미소
  }else{
    R(6,10+hy,4,1,sp.skinS);
    R(4,0+hy,8,1,sp.hair);R(3,1+hy,10,pas?8:9,sp.hair);R(2,3+hy,1,pas?4:7,sp.hair);R(13,3+hy,1,pas?4:7,sp.hair);
    R(4,pas?8+hy:9+hy,8,1,sp.hairS);R(5,2+hy,4,1,sp.hairS);
    if(pas){R(3,9+hy,10,1,sp.skin);R(2,7+hy,1,2,sp.skin);R(13,7+hy,1,2,sp.skin);}
  }
  return o;
}
function chrDraw(c,cx,fy,k,sp,view,pose,fr,flip){
  var ops=chrOps(sp,view,pose,fr),x0=cx-CHR_W*k/2,y0=fy-CHR_H*k,i,p;
  // 발밑 그림자
  c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(cx,fy-.2*k,5.2*k,1.7*k,0,0,6.283);c.fill();
  var put=function(gx,gy,w,h,ox,oy){
    var ax=flip?CHR_W-gx-w:gx,xa=Math.round(x0+ax*k+ox),xb=Math.round(x0+(ax+w)*k+ox),ya=Math.round(y0+gy*k+oy),yb=Math.round(y0+(gy+h)*k+oy);
    c.fillRect(xa,ya,Math.max(1,xb-xa),Math.max(1,yb-ya));
  };
  // 바깥선: 모든 조각을 한 칸보다 가늘게 사방으로 번지게 찍고, 그 위에 색을 올린다
  var t=Math.max(1,Math.min(k,k*.6+.4));
  c.fillStyle=CHR_LINE;
  for(i=0;i<ops.length;i++){p=ops[i];put(p[0],p[1],p[2],p[3],-t,0);put(p[0],p[1],p[2],p[3],t,0);put(p[0],p[1],p[2],p[3],0,-t);put(p[0],p[1],p[2],p[3],0,t);}
  for(i=0;i<ops.length;i++){p=ops[i];c.fillStyle=p[4];put(p[0],p[1],p[2],p[3],0,0);}
}

/* ---------- 게임 속 사람 그리기 ----------
   방문객: 옷 색(tint·pant)과 머리색을 사람마다 바꾼 'visitor' 틀. 걷는 방향(화면 좌우·위아래)에 따라 앞·뒷모습과 좌우를 고른다 */
var CHR_HAIRS=['#6b4226','#2b2b33','#a8742f','#8a3b2a','#c9a24a','#4a3a30'],CHR_VIS={};
function chrVisSpec(tint,pant,ph){
  var hi=((ph||0)*10|0)%CHR_HAIRS.length,k=tint+pant+hi;
  if(!CHR_VIS[k]){var b=CHR_SPECS.visitor,h=CHR_HAIRS[hi];
    CHR_VIS[k]={kind:'visitor',skin:b.skin,skinS:b.skinS,hair:h,hairS:shade(h,.75),top:tint,topS:shade(tint,.78),inner:'#ffffff',bottom:pant,bottomS:shade(pant,.8),shoe:b.shoe,bag:b.bag,bagS:b.bagS};}
  return CHR_VIS[k];
}
// 발밑 (x,y)에 사람 한 명: 한 칸 = 확대 s에 비례하는 픽셀. 반환: 머리 위 화면 좌표
function chrPerson(c,x,y,s,sp,view,pose,fr,flip,ring){
  var k=Math.max(.55,.78*s);
  if(ring){c.strokeStyle=ring;c.lineWidth=Math.max(1.2,1.8*s);c.beginPath();c.ellipse(x,y,6*k,2.6*k,0,0,6.283);c.stroke();}
  chrDraw(c,x,y,k,sp,view,pose,fr,flip);
  return [x,y-CHR_H*k];
}

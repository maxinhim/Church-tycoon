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
    if(sp.outfit==='dress'||sp.shorts){R(5,20,2,liftL?1:2,sp.skin);R(9,20,2,liftR?1:2,sp.skinS);}
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
    var of=sp.outfit||'cardigan',i;
    R(3,11+by+aL,1,5,sp.sleeve||sp.top);R(3,16+by+aL,1,1,sp.skin);
    R(12,11+by+aR,1,5,sp.sleeveS||sp.topS);R(12,16+by+aR,1,1,sp.skin);
    R(4,11+by,8,7,sp.top);R(11,11+by,1,7,sp.topS);R(4,17+by,8,1,sp.topS);
    if(of==='dress'&&!sit){R(3,17+by,10,2,sp.top);R(12,17+by,1,2,sp.topS);R(3,19+by,10,1,sp.topS);}
    if(sp.stripe)for(i=12;i<17;i+=2)R(4,i+by,8,1,sp.stripe);
    if(of==='vest'){R(4,11+by,2,7,sp.vest);R(10,11+by,2,7,sp.vestS||sp.vest);}
    if(front){
      if(of==='cardigan')R(7,11+by,2,6,sp.inner||'#ffffff');
      if(of==='hoodie'){R(5,11+by,6,1,sp.topS);R(6,15+by,4,2,sp.topS);R(7,12+by,1,2,'#ffffff');R(9,12+by,1,2,'#ffffff');}
      if(of==='suit'){R(7,11+by,2,3,'#ffffff');R(6,11+by,1,2,sp.topS);R(9,11+by,1,2,sp.topS);if(sp.tie)R(8,12+by,1,4,sp.tie);if(sp.collar)R(6,11+by,4,1,'#ffffff');}
      if(of==='apron'){R(5,12+by,6,6,sp.apron);R(5,11+by,1,1,sp.apron);R(10,11+by,1,1,sp.apron);R(7,14+by,2,2,sp.apronS||'#ffffff');}
      if(of==='vest'&&sp.badge)R(5,13+by,1,2,sp.badge);
      if(of==='track'){R(8,11+by,1,7,'#ffffff');R(6,11+by,4,1,sp.topS);if(sp.badge)R(7,13+by,1,2,sp.badge);}
      if(sp.sash)for(i=0;i<6;i++)R(10-i,11+by+i,2,1,sp.sash);
      if(sp.bag){for(i=0;i<6;i++)R(4+i,11+by+i,1,1,sp.bagS);
        R(10,15+by,3,3,sp.bag);R(10,15+by,3,1,sp.bagS);R(11,16+by,1,1,sp.gold||'#e8c86a');}
    }else{
      if(of==='apron'){R(5,11+by,1,3,sp.apron);R(10,11+by,1,3,sp.apron);R(4,14+by,8,1,sp.apron);R(7,14+by,2,2,sp.apron);}
      if(of==='hoodie')R(5,11+by,6,2,sp.topS);
      if(of==='track')R(5,13+by,6,1,'#ffffff');
      if(sp.sash)for(i=0;i<6;i++)R(4+i,11+by+i,2,1,sp.sash);
      if(sp.bag){for(i=0;i<6;i++)R(11-i,11+by+i,1,1,sp.bagS);
        R(3,15+by,3,3,sp.bag);R(3,15+by,3,1,sp.bagS);}
    }
  }
  // --- 머리
  var hy=by,hs=sp.hairStyle||(pas?'part':'bob'),H=sp.hair,HS=sp.hairS,shortS=hs==='part'||hs==='short'||hs==='bun'||hs==='pony'||hs==='cap';
  if(front){
    R(7,10+hy,2,1,sp.skinS);
    R(3,4+hy,10,6,sp.skin);R(4,10+hy,8,1,sp.skinS);
    R(4,0+hy,8,1,H);R(3,1+hy,10,3,H);R(3,4+hy,10,1,H);
    if(shortS){R(2,3+hy,1,2,H);R(13,3+hy,1,2,H);R(2,5+hy,1,2,hs==='part'?HS:H);R(13,5+hy,1,2,hs==='part'?HS:H);}
    if(hs==='part'){R(3,5+hy,1,1,H);R(9,4+hy,4,1,sp.skin);R(9,3+hy,1,1,HS);}
    else if(hs==='short'){R(5,4+hy,6,1,sp.skin);R(5,1+hy,3,1,HS);}
    else if(hs==='bob'){R(2,3+hy,1,7,H);R(13,3+hy,1,7,H);R(3,5+hy,2,2,H);R(12,5+hy,1,1,H);R(5,1+hy,3,1,HS);}
    else if(hs==='long'){R(2,3+hy,1,11,H);R(13,3+hy,1,11,H);R(3,5+hy,1,3,H);R(12,5+hy,1,3,H);R(3,10+hy,1,3,HS);R(12,10+hy,1,3,HS);R(8,4+hy,5,1,sp.skin);R(5,1+hy,3,1,HS);}
    else if(hs==='bun'){R(6,-2+hy,4,2,H);R(7,-2+hy,2,1,HS);R(3,5+hy,1,1,H);R(12,5+hy,1,1,H);if(sp.pin)R(9,-1+hy,1,1,sp.pin);}
    else if(hs==='pony'){R(13,2+hy,2,2,H);R(14,4+hy,1,5,H);R(3,5+hy,2,1,H);R(5,1+hy,3,1,HS);if(sp.pin)R(13,3+hy,1,1,sp.pin);}
    else if(hs==='afro'){R(4,-2+hy,8,1,H);R(3,-1+hy,10,1,H);R(2,0+hy,12,4,H);R(1,1+hy,1,5,H);R(14,1+hy,1,5,H);R(2,4+hy,1,3,H);R(13,4+hy,1,3,H);R(5,0+hy,3,1,HS);}
    else if(hs==='cap'){R(4,0+hy,8,1,sp.cap);R(3,1+hy,10,3,sp.cap);R(3,4+hy,11,1,sp.capS);R(13,4+hy,2,1,sp.capS);R(7,1+hy,2,2,'#ffffff');}
    if(sp.band)R(3,2+hy,10,1,sp.band);
    R(6+ld,6+hy,1,2,CHR_LINE);R(10+ld,6+hy,1,2,CHR_LINE);
    R(5+ld,8+hy,1,1,sp.blush||'#f0a79c');R(11+ld,8+hy,1,1,sp.blush||'#f0a79c');
    R(8+ld,9+hy,1,1,sp.lip||'#b5655a');
    if(pas||sp.smile)R(7+ld,9+hy,3,1,sp.lip||'#b5655a');
    if(sp.beard){R(5+ld,9+hy,2,1,H);R(10+ld,9+hy,2,1,H);R(6+ld,10+hy,5,1,H);}
    if(sp.glasses){R(5+ld,6+hy,3,1,'#3a3a44');R(9+ld,6+hy,3,1,'#3a3a44');}
  }else{
    R(6,10+hy,4,1,sp.skinS);
    var hl=shortS?8:9;
    R(4,0+hy,8,1,H);R(3,1+hy,10,hl,H);R(2,3+hy,1,shortS?4:7,H);R(13,3+hy,1,shortS?4:7,H);
    R(4,hl+hy,8,1,HS);R(5,2+hy,4,1,HS);
    if(shortS){R(3,9+hy,10,1,sp.skin);R(2,7+hy,1,2,sp.skin);R(13,7+hy,1,2,sp.skin);}
    if(hs==='long'){R(2,10+hy,12,3,H);R(3,13+hy,10,1,HS);}
    else if(hs==='bun'){R(6,-2+hy,4,2,H);if(sp.pin)R(6,-1+hy,1,1,sp.pin);}
    else if(hs==='pony'){R(7,2+hy,2,2,sp.pin||HS);R(7,4+hy,2,8,H);R(7,11+hy,2,1,HS);}
    else if(hs==='afro'){R(4,-2+hy,8,1,H);R(3,-1+hy,10,1,H);R(2,0+hy,12,4,H);R(1,1+hy,1,6,H);R(14,1+hy,1,6,H);}
    else if(hs==='cap'){R(4,0+hy,8,1,sp.cap);R(3,1+hy,10,3,sp.cap);R(3,4+hy,10,1,sp.capS);}
    if(sp.band)R(3,2+hy,10,1,sp.band);
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
   방문객은 CHR_VISITORS의 여섯 사람 가운데 하나로 나온다(사람마다 고정: v.ph로 고른다 — 난수를 더 쓰지 않는다).
   건물 담당자는 기능(분류)마다 한 사람으로 고정한다(CHR_STAFF). 대예배당은 담임목사 */
function chrMk(o){var b={kind:'visitor',skin:'#f6d6b2',skinS:'#e0b48c',shoe:'#f4efe6',inner:'#ffffff'},k;for(k in o)b[k]=o[k];
  if(!b.hairS)b.hairS=shade(b.hair,.72);if(!b.topS)b.topS=shade(b.top,.78);if(!b.bottomS)b.bottomS=shade(b.bottom,.8);
  if(b.bag&&!b.bagS)b.bagS=shade(b.bag,.72);if(b.cap&&!b.capS)b.capS=shade(b.cap,.75);if(b.vest&&!b.vestS)b.vestS=shade(b.vest,.8);return b;}
var CHR_VISITORS=null,CHR_STAFF=null,CHR_VIS={};
function chrInit(){
  if(CHR_VISITORS)return;
  CHR_VISITORS=[
    CHR_SPECS.visitor,                                                                                              // 단발 · 하늘색 가디건 · 어깨 가방
    chrMk({skin:'#8a5a3c',skinS:'#6f452c',blush:'#a5644a',lip:'#5a2f24',hair:'#1d1a1c',hairStyle:'afro',outfit:'hoodie',top:'#f2b632',bottom:'#3b4252',shoe:'#e8e4da'}),   // 아프로 · 노란 후드
    chrMk({skin:'#fbe3cf',skinS:'#e8c2a6',hair:'#e3b54a',hairStyle:'pony',pin:'#d6453a',outfit:'dress',top:'#d6504a',bottom:'#d6504a',shoe:'#7a3b2a',smile:1}),          // 금발 묶음머리 · 빨간 원피스
    chrMk({skin:'#c48a5c',skinS:'#a56e44',blush:'#c9775a',lip:'#7a3f30',hair:'#22201f',hairStyle:'short',beard:1,outfit:'tee',top:'#2f9e8a',bottom:'#c9b38a',shoe:'#5b4a3a',bag:'#4a5560'}),  // 짧은 머리·수염 · 청록 셔츠
    chrMk({skin:'#f2cfa6',skinS:'#d9aa80',hair:'#c9c9d0',hairStyle:'short',glasses:1,outfit:'vest',top:'#f1ece2',vest:'#8a5a3a',bottom:'#5b5148',shoe:'#3a2f28'}),       // 흰머리 어르신 · 갈색 조끼
    chrMk({skin:'#e0aa7c',skinS:'#c48c60',hair:'#3a2a22',hairStyle:'cap',cap:'#d6453a',outfit:'tee',top:'#f4efe6',stripe:'#3f6fe0',bottom:'#3f6fe0',shorts:1,shoe:'#f2c14e'})  // 빨간 모자 · 줄무늬 티 · 반바지
  ];
  CHR_STAFF={
    worship:chrMk({hair:'#2b2b33',hairStyle:'short',outfit:'suit',collar:1,top:'#27314f',bottom:'#1f2740',shoe:'#121216',smile:1}),                                    // 부교역자: 남색 정장·흰 칼라
    fellow:chrMk({hair:'#5a3a26',hairStyle:'bun',pin:'#e8b93a',outfit:'vest',top:'#f6efe0',vest:'#3f8a5a',badge:'#f2c230',bottom:'#5b4a3a',shoe:'#3a2f28',smile:1}),    // 리더·집사: 초록 조끼·이름표
    shop:chrMk({skin:'#e9bd94',skinS:'#cf9f76',hair:'#3a2a22',hairStyle:'cap',cap:'#c4503a',outfit:'apron',top:'#ffffff',apron:'#c4503a',apronS:'#f6e3b0',bottom:'#3d4650',shoe:'#22252b'}),  // 매장 직원: 빨간 모자·앞치마
    care:chrMk({hair:'#6b4226',hairStyle:'pony',pin:'#f29cc0',outfit:'apron',top:'#fff6d6',apron:'#f29cc0',apronS:'#ffffff',bottom:'#7a8fb5',shoe:'#ffffff',smile:1}),  // 돌봄 교사: 분홍 앞치마
    comfort:chrMk({skin:'#c99a6e',skinS:'#ab7d54',blush:'#c9775a',hair:'#22201f',hairStyle:'bob',outfit:'cardigan',top:'#3f6fe0',inner:'#ffffff',sash:'#f2c230',bottom:'#2f3550',shoe:'#22252b',smile:1}),  // 안내 봉사자: 파란 재킷·노란 띠
    club:chrMk({skin:'#9a6a48',skinS:'#7d5236',blush:'#a5644a',lip:'#5a2f24',hair:'#1d1a1c',hairStyle:'short',band:'#f4efe6',outfit:'track',top:'#e8762c',badge:'#f2c230',bottom:'#2b2f36',shoe:'#ffffff'})   // 강사·코치: 주황 운동복·머리띠
  };
}
function chrVisSpec(ph){chrInit();return CHR_VISITORS[(((ph||0)*977)|0)%CHR_VISITORS.length];}
function chrStaffSpec(cat){chrInit();return CHR_STAFF[cat]||CHR_STAFF.fellow;}
// 발밑 (x,y)에 사람 한 명: 한 칸 = 확대 s에 비례하는 픽셀. 반환: 머리 위 화면 좌표
function chrPerson(c,x,y,s,sp,view,pose,fr,flip,ring){
  var k=Math.max(typeof ctx!=='undefined'&&c===ctx?.55:.2,.78*s);
  if(ring){c.strokeStyle=ring;c.lineWidth=Math.max(1.2,1.8*s);c.beginPath();c.ellipse(x,y,6*k,2.6*k,0,0,6.283);c.stroke();}
  chrDraw(c,x,y,k,sp,view,pose,fr,flip);
  return [x,y-CHR_H*k];
}
/* ---------- 카드·초상화용 그림 ----------
   chrCandSpec(seed,g,t): 씨앗 값으로 사람마다 다른 생김새(피부·머리 모양과 색)를, 갈래 t로 옷차림을 정한다
     A 직분자: 정장(넥타이)·단정한 가디건 / B 리더: 가디건·후드에 가방 / C 섬김이: 앞치마 / assoc 부교역자: 남색 정장에 흰 칼라
   chrArtUrl(sp,k): 그 사람을 한 칸 k픽셀로 그린 그림(data URL, 한 번 그리면 간직해 둔다). 나중에 생성 이미지로 바꿀 자리 */
var CHR_SKINS=[['#f6d6b2','#e0b48c'],['#fbe3cf','#e8c2a6'],['#e9bd94','#cf9f76'],['#c99a6e','#ab7d54'],['#8a5a3c','#6f452c']];
var CHR_HAIRC=['#2b2b33','#3a2a22','#6b4226','#1d1a1c','#a8742f','#8a8a92','#5a3a26'];
function chrRnd(seed,k){var x=Math.sin(seed*12.9898+k*78.233)*43758.5453;return x-Math.floor(x);}
function chrCandSpec(seed,g,t){
  var pk=function(k,a){return a[Math.floor(chrRnd(seed,k)*a.length)%a.length];},sk=pk(1,CHR_SKINS),f=g==='f',dark=sk[0]==='#8a5a3c';
  var o={skin:sk[0],skinS:sk[1],hair:pk(2,CHR_HAIRC),hairStyle:f?pk(3,['bob','long','pony','bun']):pk(3,['short','part','short','afro']),smile:chrRnd(seed,4)<.6?1:0,shoe:'#2b2b33'};
  if(dark){o.blush='#a5644a';o.lip='#5a2f24';}
  if(!f&&chrRnd(seed,5)<.18)o.beard=1;if(f&&(o.hairStyle==='pony'||o.hairStyle==='bun'))o.pin=pk(7,['#e8b93a','#d6453a','#f29cc0','#3f6fe0']);
  if(t==='assoc'){o.outfit='suit';o.collar=1;o.top='#27314f';o.bottom='#1f2740';o.shoe='#121216';}
  else if(t==='A'){if(f){o.outfit='cardigan';o.top=pk(8,['#7a4fb0','#3f5ea3','#8a3b4a']);o.inner='#ffffff';o.bottom='#3d3d46';}else{o.outfit='suit';o.top=pk(8,['#4a4a55','#5b4a3a','#2f3e5c']);o.tie=pk(9,['#c4503a','#3f6fe0','#e8b93a']);o.bottom='#2b2f36';}o.badge='#f2c230';}
  else if(t==='B'){o.outfit=chrRnd(seed,8)<.5?'cardigan':'hoodie';o.top=pk(9,['#7fb8e6','#f2b632','#6fa86a','#e57a95','#2f9e8a']);o.inner='#ffffff';o.bottom=pk(10,['#48689a','#5b5148','#3b4252']);o.bag='#9a6532';o.shoe='#f4efe6';}
  else{o.outfit='apron';o.top='#ffffff';o.apron=pk(8,['#c4503a','#3f8a5a','#e8762c','#4a78c7']);o.apronS='#f6e3b0';o.bottom='#3d4650';if(chrRnd(seed,9)<.5){o.hairStyle='cap';o.cap=o.apron;}}
  return chrMk(o);
}
var CHR_ART={};
function chrArtUrl(sp,k){
  var key=JSON.stringify(sp)+k;if(CHR_ART[key])return CHR_ART[key];
  var cv=document.createElement('canvas');cv.width=(CHR_W+2)*k;cv.height=(CHR_H+4)*k;
  chrDraw(cv.getContext('2d'),cv.width/2,cv.height-k,k,sp,'f','stand',0,false);
  return (CHR_ART[key]=cv.toDataURL());
}
chrInit();

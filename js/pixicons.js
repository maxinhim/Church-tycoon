'use strict';
/* ---------- 픽셀 아이콘 (코드로 그린다 — 외부 그림 없음) ----------
   아래 기능 버튼(건축·행사·성도·봉사자·현황)의 그림. 16×16칸 글자 지도를 SVG 사각형으로 바꾼다.
   빈 칸 가운데 색 칸과 맞닿은 칸에는 짙은 갈색 바깥선을 둘러 스티커 같은 픽셀 그림으로 보이게 한다 */
var PIX_PAL={r:'#e0624a',R:'#b8442f',w:'#fff6e0',W:'#ecd9b0',b:'#6fb6e6',d:'#9a6532',g:'#7cc276',G:'#4f9a55',y:'#f6c544',o:'#f09a4a',h:'#6b4226',s:'#f6d6b2',k:'#4a3322',p:'#f0a79c',m:'#b5655a',B:'#5c98cf',c:'#fffdf6',v:'#b98bd6'};
var PIX={
  build:['.......y........','......yyy.......','.......y........','......rrrr......','.....rrrrrr.....','....rrrrrrrr....','...rrrrrrrrrr...','..RRRRRRRRRRRR..','..wwwwwwwwwwww..','..wwbbwwwwddww..','..wwbbwwwwddww..','..wwwwwwwwddww..','..WWWWWWWWddWW..','.gggggggggggggg.','................','................'],
  minis:['................','...kk......kk...','..rrrrrrrrrrrr..','..rrrrrrrrrrrr..','..RRRRRRRRRRRR..','..wwwwwwwwwwww..','..wwwppwwppwww..','..wwpppppppwww..'.slice(0,16),'..wwppppppppww..','..wwwppppppwww..','..wwwwppppwwww..','..wwwwwppwwwww..','..WWWWWWWWWWWW..','................','................','................'],
  people:['................','.....hhhhhh.....','....hhhhhhhh....','....hssssssh....','....ssksskss....','....spssssps....','.....ssmmss.....','......ssss......','....BbbccbbB....','...BbbbccbbbB...','..BbbbbbbbbbbB..','..BbbbbbbbbbbB..','..BbbbbbbbbbbB..','................','................','................'],
  officers:['................','...rrr....rrr...','..rrrrr..rrrrr..','.rrcrrrrrrrrrrr.','.rrccrrrrrrrrrr.','.rrrrrrrrrrrrrr.','.RrrrrrrrrrrrrR.','..RrrrrrrrrrrR..','...RrrrrrrrrR...','....RrrrrrrR....','.....RrrrrR.....','......RrrR......','.......RR.......','................','................','................'],
  status:['................','............oo..','............oo..','.......yy...oo..','.......yy...oo..','.......yy...oo..','..gg...yy...oo..','..gg...yy...oo..','..gg...yy...oo..','..gG...yY...oO..'.replace('Y','y').replace('O','o'),'..GG...yy...oo..','.dddddddddddddd.','................','................','................','................']
};
PIX.roster=PIX.people.map(function(r){return r.replace(/[Bb]/g,'o');});   // 직원: 성도 그림의 옷을 주황으로
function pixSvg(rows){
  var n=rows.length,h='<svg class="pix" viewBox="-1 -1 '+(n+2)+' '+(n+2)+'" shape-rendering="crispEdges" aria-hidden="true">',x,y,at=function(x,y){var r=rows[y];var c=r&&r.charAt(x);return c&&c!=='.'?c:'';};
  // 바깥선
  for(y=-1;y<=n;y++)for(x=-1;x<=n;x++){if(at(x,y))continue;if(at(x-1,y)||at(x+1,y)||at(x,y-1)||at(x,y+1))h+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="#4a3322"/>';}
  // 색 칸 (가로로 이어진 같은 색은 한 사각형으로)
  for(y=0;y<n;y++)for(x=0;x<n;){var c=at(x,y);if(!c){x++;continue;}var x0=x;while(at(x,y)===c)x++;h+='<rect x="'+x0+'" y="'+y+'" width="'+(x-x0)+'" height="1" fill="'+(PIX_PAL[c]||'#000')+'"/>';}
  return h+'</svg>';
}
(function(){
  if(typeof document==='undefined')return;
  Object.keys(PIX).forEach(function(k){
    var fc=document.querySelector('#fab [data-fab="'+k+'"] .fc'),old=fc&&fc.querySelector('svg');
    if(old){var t=document.createElement('template');t.innerHTML=pixSvg(PIX[k]);fc.replaceChild(t.content.firstChild,old);}
  });
})();

/* Gemini 아이콘(21~29번 시트, assets/ui)을 글자 앞에 붙이는 작은 그림 */
function aic(n,cls){return '<img class="'+(cls||'aic')+'" alt="" src="assets/ui/'+n+'.png">';}

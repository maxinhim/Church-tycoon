'use strict';
/* ---------- 소리 (배경 음악·효과음) ----------
   음원은 모두 CC0 (OpenGameArt). 출처는 README, 원본과 변환 방법은 docs/audio.md.
   · 배경 음악: 맑은 날·비·눈마다 다른 곡. 날씨가 바뀌면 2초 동안 서로 겹쳐 넘어간다. 비가 오면 빗소리를 얇게 깐다
   · 효과음: Web Audio로 겹쳐 낸다. 같은 소리가 너무 잦으면 건너뛴다(minGap). 벼락은 잡음으로 직접 만든다
   · 모바일은 사용자가 처음 화면을 눌러야 소리를 낼 수 있어서 첫 터치 때 켠다 (그 전엔 조용히 무시)
   · 설정(톱니바퀴)에서 음악·효과음을 따로 끈다. 선택은 이 기기에만 저장 */
var SND={sfx:true,music:true,ctx:null,buf:{},unlocked:false,last:{},cur:'',el:{},amb:null,vol:.6,mvol:.15};
var SFX_LIST=['build','place','floor','coin','coins','bell','join','gate_open','gate_close','demolish','error','page','click'];
var BGM_FILE={sun:'bgm_sun',rain:'bgm_rain',snow:'bgm_snow'},SND_KEY='church-tycoon-sound';
(function(){try{var v=JSON.parse(localStorage.getItem(SND_KEY)||'{}');if(v.sfx===false)SND.sfx=false;if(v.music===false)SND.music=false;}catch(e){}})();
function saveSnd(){try{localStorage.setItem(SND_KEY,JSON.stringify({sfx:SND.sfx,music:SND.music}));}catch(e){}}
function audioUnlock(){
  if(SND.unlocked){if(SND.ctx&&SND.ctx.state==='suspended')SND.ctx.resume();return;}
  SND.unlocked=true;
  try{SND.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){SND.ctx=null;}
  if(SND.ctx)SFX_LIST.forEach(function(n){
    fetch('assets/audio/sfx_'+n+'.mp3').then(function(r){return r.arrayBuffer();})
      .then(function(a){return SND.ctx.decodeAudioData(a);}).then(function(b){SND.buf[n]=b;}).catch(function(){});
  });
}
// name: 효과음 이름, vol: 0~1, minGap: 같은 소리 사이 최소 간격(ms)
function sfx(name,vol,minGap){
  if(!SND.sfx||!SND.ctx||!SND.buf[name]||document.hidden)return;
  var now=performance.now();if(now-(SND.last[name]||0)<(minGap==null?60:minGap))return;SND.last[name]=now;
  try{
    var s=SND.ctx.createBufferSource(),g=SND.ctx.createGain();
    s.buffer=SND.buf[name];s.playbackRate.value=.94+Math.random()*.12;
    g.gain.value=SND.vol*(vol==null?1:vol);s.connect(g);g.connect(SND.ctx.destination);s.start();
  }catch(e){}
}
// 벼락: 낮게 깔리는 잡음을 길게 줄여 천둥처럼
function thunder(){
  if(!SND.sfx||!SND.ctx||document.hidden)return;
  try{
    var c=SND.ctx,len=c.sampleRate*2.2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0),v=0;
    for(var i=0;i<len;i++){v=v*.97+(Math.random()*2-1)*.03;d[i]=v*Math.pow(1-i/len,2.2)*(i<c.sampleRate*.05?i/(c.sampleRate*.05):1)*6;}
    var s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=b;f.type='lowpass';f.frequency.value=380;g.gain.value=SND.vol*.9;
    s.connect(f);f.connect(g);g.connect(c.destination);s.start();
  }catch(e){}
}
function musicKind(){var w=S&&S.wx?S.wx.cur:'sun';return (w==='rain'||w==='storm')?'rain':(w==='snow'?'snow':'sun');}
function sndEl(key,file){
  if(!SND.el[key]){var a=new Audio('assets/audio/'+file+'.mp3');a.loop=true;a.volume=0;a.preload='auto';SND.el[key]=a;}
  return SND.el[key];
}
// 매 프레임: 지금 날씨의 곡은 키우고 나머지는 줄인다. 다 줄어든 곡은 멈춘다
function stepAudio(dt){
  if(!SND.unlocked)return;
  var want=SND.music&&!document.hidden?musicKind():'',rain=want==='rain'&&SND.sfx;
  ['sun','rain','snow'].forEach(function(k){
    var on=k===want,a=on?sndEl(k,BGM_FILE[k]):SND.el[k];if(!a)return;
    var tv=on?SND.mvol:0,nv=a.volume+(tv>a.volume?1:-1)*Math.min(Math.abs(tv-a.volume),dt*SND.mvol/2);
    a.volume=Math.max(0,Math.min(1,nv));
    if(on&&a.paused){var p=a.play();if(p&&p.catch)p.catch(function(){});}
    if(!on&&a.volume<=.001&&!a.paused)a.pause();
  });
  var am=rain?sndEl('amb','amb_rain'):SND.el.amb;
  if(am){var at=rain?SND.mvol*.55:0;am.volume=Math.max(0,Math.min(1,am.volume+(at>am.volume?1:-1)*Math.min(Math.abs(at-am.volume),dt*.2)));
    if(rain&&am.paused){var q=am.play();if(q&&q.catch)q.catch(function(){});}if(!rain&&am.volume<=.001&&!am.paused)am.pause();}
  SND.cur=want;
}
function renderSndBtns(){
  var m=$('#bMusic'),f=$('#bSfx');if(!m||!f)return;
  m.classList.toggle('on',SND.music);m.setAttribute('aria-pressed',String(SND.music));
  f.classList.toggle('on',SND.sfx);f.setAttribute('aria-pressed',String(SND.sfx));
}
function setupAudio(){
  // 첫 터치·클릭·키 입력에서 소리를 켠다 (브라우저 자동 재생 제한)
  ['pointerdown','keydown'].forEach(function(t){document.addEventListener(t,audioUnlock,true);});
  document.addEventListener('visibilitychange',function(){if(document.hidden)Object.keys(SND.el).forEach(function(k){SND.el[k].pause();SND.el[k].volume=0;});});
  var m=$('#bMusic'),f=$('#bSfx');
  if(m)m.addEventListener('click',function(){SND.music=!SND.music;saveSnd();renderSndBtns();});
  if(f)f.addEventListener('click',function(){SND.sfx=!SND.sfx;saveSnd();renderSndBtns();if(SND.sfx)sfx('click',.6,0);});
  renderSndBtns();
}

'use strict';
/* 지도 32×32 칸. 맨 아래 줄은 도로, 그 위 4줄(PZ~ROWS-2)은 주차 구역, 나머지가 교회 부지.
   도로·주차 구역·부지는 울타리로 나뉘고, 주차 구역에서 부지로 들어오는 곳(ENT 열)에 교회 입구가 있다.
   지도 밖 BAND 칸까지 잔디를 그린다. 한 주는 현실 시간 WEEK초(4분, 하루 약 34초) */
var COLS=32, ROWS=32, ENT=15, PZ=27, BAND=12, WEEK=240, SAVE_KEY='church-tycoon-iso-v3';
var HW=32, HH=16, ZH=30;
var $=function(s){return document.querySelector(s);};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
var fmt=function(n){return Math.round(n).toLocaleString('ko-KR');};
var NEEDS=['word','fel','care','comf'];
var NK={word:'말씀',fel:'교제',care:'돌봄',comf:'편의'};
var NC={word:'#3f6fe0',fel:'#e8892c',care:'#d9467a',comf:'#1c9c8c'};
var CATS=[['worship','예배'],['fellow','교제'],['shop','매장'],['care','돌봄'],['comfort','편의'],['path','길'],['garden','조경'],['deco','꾸미기'],['floor','바닥']];
// 구역: 'road' 도로 줄, 'park' 주차 구역, 'church' 교회 부지
function zoneOf(y){return y>=ROWS-1?'road':(y>=PZ?'park':'church');}
var DAYS=['월요일','화요일','수요일','목요일','금요일','토요일','주일'];

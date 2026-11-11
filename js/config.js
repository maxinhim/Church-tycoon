'use strict';
/* 지도 64×64 칸 (예전 한 칸을 가로세로 G=2로 쪼갰다). 맨 아래 RD줄은 도로, 그 위 8줄(PZ~ROWS-RD-1)은 주차 구역, 나머지가 교회 부지.
   건물·꾸미기 그림은 예전 크기 그대로라, 예전 칸 단위로 그리는 그림은 legacy()(render-core.js) 안에서 그린다.
   교회 입구는 ENT부터 EW칸 너비다.
   도로·주차 구역·부지는 울타리로 나뉘고, 주차 구역에서 부지로 들어오는 곳(ENT 열)에 교회 입구가 있다.
   지도 밖 BAND 칸까지 잔디를 그린다. 한 주는 현실 시간 WEEK초(48초, 하루 약 7초) */
var G=2, COLS=64, ROWS=64, ENT=30, EW=2, PZ=54, RD=2, BAND=24, WEEK=48, SAVE_KEY='church-tycoon-iso-v4';
var HW=16, HH=8, ZH=30;
function isEnt(x){return x>=ENT&&x<ENT+EW;}
function entC(){return ENT+EW/2;}
var $=function(s){return document.querySelector(s);};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
var fmt=function(n){return Math.round(n).toLocaleString('ko-KR');};
var NEEDS=['word','fel','care','comf'];
var NK={word:'말씀',fel:'교제',care:'돌봄',comf:'편의'};
var NC={word:'#3f6fe0',fel:'#e8892c',care:'#d9467a',comf:'#1c9c8c'};
var CATS=[['worship','예배'],['fellow','교제'],['club','소모임'],['shop','매장'],['care','돌봄'],['comfort','편의'],['park','주차'],['path','길·지형'],['garden','조경'],['deco','꾸미기'],['floor','바닥']];
// 구역: 'road' 도로 줄, 'park' 주차 구역, 'church' 교회 부지
function zoneOf(y){return y>=ROWS-RD?'road':(y>=PZ?'park':'church');}
var DAYS=['월요일','화요일','수요일','목요일','금요일','토요일','주일'];

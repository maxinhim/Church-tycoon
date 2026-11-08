'use strict';
/* ---------- 카메라 ---------- */
function toScreen(rx,ry,z){return [cam.ox+(rx-ry)*HW*cam.z, cam.oy+(rx+ry)*HH*cam.z-(z||0)*ZH*cam.z];}
function toRot(px,py,z){var u=(px-cam.ox)/(HW*cam.z),v=(py-cam.oy+(z||0)*ZH*cam.z)/(HH*cam.z);return [(u+v)/2,(v-u)/2];}
function toWorld(px,py,z){var r=toRot(px,py,z);return unrot(r[0],r[1]);}
function viewCenter(){var r=$('#mid').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}
function centerOn(wx,wy){var c=viewCenter(),r=rotPt(wx,wy);cam.ox=c[0]-(r[0]-r[1])*HW*cam.z;cam.oy=c[1]-(r[0]+r[1])*HH*cam.z;clampCam();}
function zoomAt(px,py,nz){
  nz=clamp(nz,ZMIN,ZMAX);
  var u=(px-cam.ox)/(HW*cam.z),v=(py-cam.oy)/(HH*cam.z);
  cam.z=nz;cam.ox=px-u*HW*nz;cam.oy=py-v*HH*nz;clampCam();
}
function clampCam(){
  var m=toScreen(RX()/2,RY()/2,0),dx=0,dy=0;
  if(m[0]<0)dx=-m[0];else if(m[0]>VW)dx=VW-m[0];
  if(m[1]<0)dy=-m[1];else if(m[1]>VH)dy=VH-m[1];
  cam.ox+=dx;cam.oy+=dy;
}
function fitZoom(){var r=$('#mid').getBoundingClientRect();return Math.min(r.width/((COLS+ROWS)*HW),(r.height+60)/((COLS+ROWS)*HH+30));}
function rotateView(){
  var c=viewCenter(),w=toWorld(c[0],c[1],0);
  ROT=(ROT+1)%4;centerOn(w[0],w[1]);toast(['남쪽','서쪽','북쪽','동쪽'][ROT]+'에서 보는 시점',1200);
}
function homeView(){
  var f=fitZoom();cam.z=clamp(f*1.75,ZMIN,ZMAX);
  var b=S.buildings.filter(function(b){return D[b.def].kind==='bld';})[0];
  if(b){var d=D[b.def];centerOn(b.x+d.w/2,b.y+d.h/2+1.5);}else centerOn(COLS/2,ROWS/2);
}

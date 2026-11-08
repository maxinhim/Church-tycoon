// 스모크 테스트 (검증 전용 — 게임 코드에 포함하지 않음)
// 실행: 저장소 루트에서 `node tests/smoke.js`
// 필요: Node.js, Playwright (전역 설치: npm i -g playwright && npx playwright install chromium)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }
  catch (e2) { console.error('Playwright가 필요합니다: npm i -g playwright (검증용, 게임에는 포함되지 않음)'); process.exit(2); }
}

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function check(cond, msg) { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; }

/* ---------- 정적 검사 ---------- */
function staticChecks() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
  const missing = srcs.filter(s => !fs.existsSync(path.join(ROOT, s)));
  const unlisted = files.filter(f => !srcs.includes(f));
  check(missing.length === 0, 'index.html의 스크립트 파일이 모두 존재' + (missing.length ? ': ' + missing.join(', ') : ''));
  check(unlisted.length === 0, 'js/의 모든 파일이 index.html에 등록됨' + (unlisted.length ? ': ' + unlisted.join(', ') : ''));

  // 전역(최상위) 선언 이름 중복 검사. 클래식 스크립트는 전역 스코프를 공유하므로 중복되면 조용히 덮어쓴다.
  const decl = new Map();
  const noStrict = [];
  for (const src of srcs) {
    const lines = fs.readFileSync(path.join(ROOT, src), 'utf8').split('\n');
    if (lines[0].trim() !== "'use strict';") noStrict.push(src);
    lines.forEach((line, i) => {
      const add = name => { if (!decl.has(name)) decl.set(name, []); decl.get(name).push(src + ':' + (i + 1)); };
      for (const m of line.matchAll(/(?:^|;\s*|\}\s*)function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
        if (m.index === 0 || /^[;}]/.test(line.slice(m.index).trim())) add(m[1]);
      }
      const v = line.match(/^(?:var|let|const)\s+(.*)$/);
      if (v) declNames(v[1]).forEach(add);
    });
  }
  const dups = [...decl].filter(([, locs]) => locs.length > 1);
  check(dups.length === 0, '전역 이름 중복 없음' + (dups.length ? ':\n    ' + dups.map(([n, l]) => n + ' — ' + l.join(', ')).join('\n    ') : ''));
  check(noStrict.length === 0, "모든 js 파일이 'use strict'로 시작" + (noStrict.length ? ': ' + noStrict.join(', ') : ''));
  return srcs;
}
// `a=1, b={x:1,y:2}, c` 에서 최상위 이름(a, b, c)만 뽑는다. 첫 번째 `;`까지만 본다.
function declNames(text) {
  const names = []; let depth = 0, quote = null, start = 0;
  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && c === ',') { parts.push(text.slice(start, i)); start = i + 1; }
    else if (depth === 0 && c === ';') { parts.push(text.slice(start, i)); start = -1; break; }
  }
  if (start >= 0) parts.push(text.slice(start));
  for (const p of parts) { const m = p.match(/^\s*([A-Za-z_$][\w$]*)/); if (m) names.push(m[1]); }
  return names;
}

/* ---------- 정적 파일 서버 ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

/* ---------- 브라우저 검사 ---------- */
function watchErrors(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/fonts\./.test(r.url())) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  return errs;
}

async function playChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.goto(url);
  await page.waitForTimeout(800);
  const state = () => page.evaluate(() => JSON.stringify(S));
  const overlay = () => page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');

  check(!(await overlay()), '가로: 회전 안내 화면이 숨겨짐');
  let a = await state(); await page.waitForTimeout(1500);
  check(a !== await state(), '가로: 게임이 진행됨');

  await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(300);
  check(await overlay(), '세로: 회전 안내 화면이 보임');
  a = await state(); await page.waitForTimeout(1500);
  check(a === await state(), '세로: 게임이 멈춤');
  const blocked = await page.evaluate(() => !!document.elementFromPoint(195, 400).closest('#rotate'));
  check(blocked, '세로: 터치가 안내 화면에 막힘');

  await page.setViewportSize({ width: 800, height: 380 }); await page.waitForTimeout(300);
  a = await state(); await page.waitForTimeout(1500);
  check(!(await overlay()) && a !== await state(), '가로 복귀: 게임이 이어짐');

  for (const t of ['staff', 'status', 'menu', 'build', 'fold', 'fold']) await page.click(`.tabs [data-tab="${t}"]`);
  for (const b of ['#bRot', '#bIn', '#bOut', '#bHome']) await page.click(b);
  for (const s of ['0', '2', '4', '1']) await page.click(`.sp [data-sp="${s}"]`);
  await page.waitForTimeout(300);

  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300);
  check(!(await overlay()), '데스크톱 1280×720: 정상 표시');

  check(errs.length === 0, '콘솔·페이지·네트워크 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

// 난수를 고정하고 rAF를 막은 뒤, 건물을 짓고 시뮬레이션을 돌려 최종 상태를 반환한다.
async function seededRun(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 12345;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const out = await page.evaluate(() => {
    const c = window.__ct; c.init();
    let built = 0;
    c.DEFS.slice(0, 6).forEach(d => {
      for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) if (c.canPlace(d, x, y)) { c.build(d.id, x, y); built++; return; }
    });
    for (let i = 0; i < 4000; i++) c.update(0.1);
    c.draw();
    return { S: JSON.stringify(c.S), built, visitors: c.V.length };
  });
  await ctx.close();
  return { ...out, errs };
}

// 직접 짓는 예배실: 칸 연결·2층·분리·병합·방문자 이용·회전 그리기
async function modularChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 777;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 99999;
    const rooms = () => S.buildings.filter(b => b.def === 'mroom');
    // 왼쪽부터 5칸이 비어 있는 줄을 찾는다
    let X = -1, Y = -1;
    for (let y = 1; y < ROWS - 2 && X < 0; y++) for (let x = 0; x + 5 <= COLS; x++) {
      let free = true; for (let i = 0; i < 5; i++) if (occ[y][x + i]) free = false;
      if (free) { X = x; Y = y; break; }
    }
    const o = {};
    placeTile(X, Y); placeTile(X + 1, Y); placeTile(X + 2, Y);
    o.merged = rooms().length === 1 && rooms()[0].tiles.length === 3;
    placeTile(X + 1, Y);
    // 계단·다리로 잇지 않은 2층은 좌석에 들어가지 않는다
    // 위층은 1층 출입구만 있어도 바로 좌석에 들어간다
    o.floor = tileOf(rooms()[0], X + 1, Y).f === 2 && defOf(rooms()[0]).seats === D.mroom.per.seats * 4;
    for (let k = 0; k < 3; k++) placeTile(X + 1, Y);
    o.maxFloor = tileOf(rooms()[0], X + 1, Y).f === 5 && !tilePlan(X + 1, Y).ok;
    for (let k = 0; k < 4; k++) removeTile(X + 1, Y, 1);
    o.floorDown = tileOf(rooms()[0], X + 1, Y).f === 1;
    removeTile(X + 1, Y, 1);
    o.split = rooms().length === 2;
    placeTile(X + 1, Y);
    o.rejoined = rooms().length === 1 && rooms()[0].tiles.length === 3;
    const before = S.money; placeTile(X + 4, Y); placeTile(X + 3, Y);
    o.joinTwo = rooms().length === 1 && rooms()[0].tiles.length === 5 && S.money === before - 2 * D.mroom.cost;
    o.occ = [0, 1, 2, 3, 4].every(i => occ[Y][X + i] === rooms()[0].id);
    // 방문자는 가까운 곳부터 가므로, 입구 근처의 기본 예배실을 치워 이 예배실을 쓰게 한다
    S.buildings.filter(b => b.def === 'room').forEach(b => demolish(b.id));
    for (let i = 0; i < 4000; i++) update(0.1);
    o.used = rooms()[0].uses > 0;
    save();
    const loaded = load().buildings.filter(b => b.def === 'mroom').map(b => JSON.stringify(b.tiles));
    o.saveLoad = JSON.stringify(loaded) === JSON.stringify(rooms().map(b => JSON.stringify(b.tiles)));
    for (let k = 0; k < 4; k++) { window.__ct.setRot(k); draw(); }
    window.__ct.setRot(0);
    return o;
  });
  check(r.merged, '예배실 칸: 이어 지은 3칸이 하나의 예배실로 합쳐짐');
  check(r.floor, '예배실 칸: 2층을 올리면 1층 출입구만으로 2층 좌석까지 쓰임');
  check(r.maxFloor, '예배실 칸: 5층까지 쌓이고 그 위로는 못 올림');
  check(r.floorDown, '예배실 칸: 위층부터 철거됨');
  check(r.split, '예배실 칸: 가운데 칸을 지우면 두 예배실로 나뉨');
  check(r.rejoined && r.joinTwo, '예배실 칸: 다시 이으면 하나로 합쳐짐');
  check(r.occ, '예배실 칸: 점유 지도에 모든 칸이 등록됨');
  check(r.used, '예배실 칸: 방문자가 실제로 이용함');
  check(r.saveLoad, '예배실 칸: 저장 후 불러와도 칸·층이 유지됨');
  check(errs.length === 0, '예배실 칸: 4방향 회전 그리기 포함 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

// 길·계단·다리, 문(입구·출구), 높이 있는 길찾기, 정면 방향
async function pathChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 4242;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 99999;
    const o = {};
    const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS - 1 && !occ[y][x] && !piecesAt(x, y).length;
    const starter = S.buildings.find(b => b.def === 'room');
    o.defaultDoor = !!(starter.door && starter.acc && starter.acc.ok);
    // 3칸 예배실 + 가운데 앞쪽으로 계단 자리
    let X = -1, Y = -1;
    for (let y = 1; y < ROWS - 5 && X < 0; y++) for (let x = 0; x + 3 <= COLS; x++) {
      if ([0, 1, 2].every(i => free(x + i, y)) && [1, 2, 3].every(k => free(x + 1, y + k))) { X = x; Y = y; break; }
    }
    o.found = X >= 0;
    placeTile(X, Y); placeTile(X + 1, Y); placeTile(X + 2, Y); placeTile(X + 1, Y);
    const room = S.buildings.find(b => b.def === 'mroom');
    o.unconnected = room.acc.ok && defOf(room).seats === D.mroom.per.seats * 4;
    // 땅에서 방 쪽(-y)으로 오르막 1칸, 이어서 평지 다리 1칸
    UI.pc = newCursor(); UI.pc.x = X + 1; UI.pc.y = Y + 2; UI.pc.l = 0; UI.pc.dir = 3; UI.pc.slope = 1;
    const b1 = pcBuild(); UI.pc.slope = 0; const b2 = pcBuild();
    o.built = b1 === '' && b2 === '' && S.paths.length === 2 && S.paths[0].s === 1 && S.paths[1].l === 1 && UI.pc.l === 1;
    o.undo = pcUndo() && S.paths.length === 1 && UI.pc.l === 1 && UI.pc.y === Y + 1;
    pcBuild();
    o.noOverlap = pieceFits({ x: X + 1, y: Y + 1, l: 1, s: 0, d: 0, k: 'stone' }) !== '' && pieceFits({ x: X, y: Y, l: 0, s: 0, d: 0, k: 'stone' }) !== '';
    o.bridgeOverPath = pieceFits({ x: X + 1, y: Y + 1, l: 0, s: 0, d: 0, k: 'stone' }) === '';
    o.ground = groundOk(X + 1, Y + 1) && groundOk(X + 1, Y + 2);
    // 2층 입구를 다리 쪽으로
    room.door.ent = { x: X + 1, y: Y, d: 2, l: 1 }; recalc();
    o.connected = room.acc.ok && room.door.ent.l === 1;
    const dn = doorNode(room.door.ent), path = navPath(gateNode(), m => m === dn);
    o.navUp = !!path && path.some(w => w.z >= LV - 0.01);
    // 방문자가 실제로 계단을 올라 2층 입구로 들어간다
    S.buildings.filter(b => b.def === 'room').forEach(b => demolish(b.id));
    let maxZ = 0;
    for (let i = 0; i < 4000; i++) { update(0.1); V.forEach(v => { if ((v.z || 0) > maxZ) maxZ = v.z; }); }
    o.climbed = maxZ >= LV - 0.01 && room.uses > 0;
    for (let k = 0; k < 4; k++) { window.__ct.setRot(k); draw(); }
    window.__ct.setRot(0);
    // 계단을 철거하면 2층 입구에 닿을 수 없어 이용 불가
    removePiece(S.paths.find(p => p.s === 1).id, 1);
    o.cutOff = !room.acc.ent && !usable(room);
    // 문은 둘레를 따라 옮겨도 항상 올바른 자리
    const n = doorSpots(room).length; let ok = true;
    for (let i = 0; i < n + 2; i++) { cycleDoor(room, 'ent', 1); if (!validSpot(room, room.door.ent)) ok = false; }
    o.cycle = ok && n > 0;
    // 정면 방향: 예배당(3×2)을 오른쪽(+x)을 향해 지으면 2×3을 차지하고 출입구도 그쪽
    let fb = null;
    for (let y = 0; y < ROWS - 4 && !fb; y++) for (let x = 0; x < COLS - 3; x++) {
      if (canPlace(D.chapel, x, y, 0) && free(x + 2, y + 1)) { build('chapel', x, y, 0); fb = S.buildings[S.buildings.length - 1]; break; }
    }
    o.facing = !!fb && fb.face === 0 && bDims(fb).w === 2 && bDims(fb).h === 3 && fb.door.ent.d === 0 &&
      [0, 1].every(i => [0, 1, 2].every(j => occ[fb.y + j][fb.x + i] === fb.id));
    // 모든 방문 건물에 입구·출구가 있다
    o.allDoors = S.buildings.every(b => !defOf(b).fill || (b.door && validSpot(b, b.door.ent) && validSpot(b, b.door.ext)));
    return o;
  });
  check(r.found, '길: 시험할 빈 자리를 찾음');
  check(r.defaultDoor, '문: 기본 예배실에 출입구가 있고 이용 가능');
  check(r.unconnected, '길: 1층 출입구만 있어도 2층 좌석이 들어감');
  check(r.built, '길: 오르막·평지를 이어 지으면 높이가 올라가며 이어짐');
  check(r.undo, '길: 되돌리기로 마지막 조각과 커서가 돌아옴');
  check(r.noOverlap && r.bridgeOverPath, '길: 같은 높이 겹치기·건물 위 금지, 다리 아래 길은 허용');
  check(r.ground, '길: 다리 아래와 철골 계단 밑 땅으로 걸어 다닐 수 있음');
  check(r.connected, '길: 2층에 단 입구도 다리와 이으면 이용 가능');
  check(r.navUp, '길찾기: 입구 아치에서 계단을 올라 2층 입구까지 경로가 있음');
  check(r.climbed, '방문자: 실제로 계단을 올라 2층 입구로 이용함');
  check(r.cutOff, '문: 계단을 철거하면 2층 입구에 닿지 못해 이용 불가');
  check(r.cycle, '문: 둘레를 따라 옮겨도 항상 올바른 자리');
  check(r.facing, '방향: 정면을 고르면 건물 자리와 출입구가 그쪽을 향함');
  check(r.allDoors, '문: 방문자가 쓰는 모든 건물에 입구·출구가 있음');
  check(errs.length === 0, '길: 4방향 회전 그리기 포함 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

// 건물 쌓기, 역할별 칸, 연결 다리 이동, 바닥 타일, 새 건물 전부 짓고 그리기
async function stackChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 99;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 999999;
    const o = {};
    const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS - 1 && !occ[y][x] && !piecesAt(x, y).length;
    // 완성품 건물 층 올리기
    let cell = null;
    for (let y = 0; y < ROWS - 3 && !cell; y++) for (let x = 0; x < COLS - 2; x++) if (canPlace(D.cell, x, y, 2)) { build('cell', x, y, 2); cell = S.buildings[S.buildings.length - 1]; break; }
    for (let k = 0; k < 4; k++) addFloor(cell);
    o.stack = cell.floors === 5 && defOf(cell).fcap === D.cell.fcap * 5 && addFloor(cell) !== '' && removeFloor(cell, .5) && cell.floors === 4;
    o.noStackGarden = !canStack({ def: 'tree' });
    // 역할이 다른 칸은 합쳐지지도, 쌓이지도 않는다
    let X = -1, Y = -1;
    for (let y = 1; y < ROWS - 3 && X < 0; y++) for (let x = 0; x + 5 <= COLS; x++) {
      if ([0, 1, 2, 3, 4].every(i => free(x + i, y) && free(x + i, y + 1))) { X = x; Y = y; break; }
    }
    placeTile(X, Y, 'mfel'); placeTile(X + 1, Y, 'mcare');
    o.roles = S.buildings.filter(b => b.def === 'mfel').length === 1 && S.buildings.filter(b => b.def === 'mcare').length === 1 && !tilePlan(X + 1, Y, 'mfel').ok;
    removeTile(X + 1, Y, 1);
    // 교제실 두 채(2층)를 한 칸 띄우고 연결 다리로 잇는다
    placeTile(X + 2, Y, 'mfel'); placeTile(X, Y, 'mfel'); placeTile(X + 2, Y, 'mfel');
    const A = S.buildings.find(b => b.def === 'mfel' && b.tiles.some(t => t.x === X)), B = S.buildings.find(b => b.def === 'mfel' && b.tiles.some(t => t.x === X + 2));
    UI.pc = newCursor(); UI.pc.x = X + 1; UI.pc.y = Y; UI.pc.l = 1; UI.pc.dir = 0; UI.pc.k = 'sky';
    o.skyBuilt = pcBuild() === '' && S.paths.some(p => p.k === 'sky');
    o.linked = A.links.indexOf(B.id) >= 0 && B.links.indexOf(A.id) >= 0;
    o.skyNotNav = !NAV.reach[1000 + S.paths.find(p => p.k === 'sky').id];
    // A가 꽉 차면 다리를 건너 B로
    A.inUse = defOf(A).cap;
    spawnV(); const v = V[V.length - 1]; v.target = A.id; arrive(v);
    o.xferStart = v.state === 'xfer' && B.inUse === 1;
    let maxZ = 0; for (let i = 0; i < 60 && v.state === 'xfer'; i++) { stepV(v, 0.1); maxZ = Math.max(maxZ, v.z); }
    o.xferDone = v.state === 'inside' && v.inside === B.id && maxZ >= LV - 0.01;
    A.inUse = 0;
    // 역할이 다른 건물을 이으면 연결되지 않고 경고 표시
    placeTile(X + 2, Y + 1, 'mcomf'); placeTile(X + 2, Y + 1, 'mcomf'); placeTile(X, Y + 1, 'mcare'); placeTile(X, Y + 1, 'mcare');
    UI.pc = newCursor(); UI.pc.x = X + 1; UI.pc.y = Y + 1; UI.pc.l = 1; UI.pc.dir = 0; UI.pc.k = 'sky'; pcBuild();
    const sk2 = S.paths.find(p => p.k === 'sky' && p.y === Y + 1);
    o.badLink = !!sk2 && !!NAV.badSky[sk2.id];
    o.skyRules = pieceFits({ x: X + 1, y: Y + 3, l: 0, s: 0, d: 0, k: 'sky' }) !== '' && pieceFits({ x: X + 1, y: Y + 3, l: 1, s: 1, d: 0, k: 'sky' }) !== '';
    // 바닥 타일
    let fx = -1, fy = -1;
    for (let y = 0; y < ROWS - 1 && fx < 0; y++) for (let x = 0; x < COLS; x++) if (free(x, y)) { fx = x; fy = y; break; }
    const b0 = agg().beauty, m0 = S.money;
    UI.undo = [];
    o.floorPaint = paintFloor(fx, fy, 'f_clover') === '' && S.floor[fx + ',' + fy] === 'f_clover' && agg().beauty > b0 && S.money === m0 - D.f_clover.cost && groundOk(fx, fy);
    o.floorUndo = floorUndo() && !S.floor[fx + ',' + fy] && S.money === m0;
    paintFloor(fx, fy, 'f_brick');
    o.floorErase = paintFloor(fx, fy, 'f_erase') === '' && !S.floor[fx + ',' + fy];
    o.floorBlocked = paintFloor(cell.x, cell.y, 'f_brick') !== '';
    paintFloor(fx, fy, 'f_wood');
    // 새로 넣은 건물·요소를 모두 지어 본다
    const want = DEFS.filter(d => d.kind !== 'mroom' && d.kind !== 'path' && d.kind !== 'floor');
    const missing = [];
    want.forEach(d => {
      if (S.buildings.some(b => b.def === d.id)) return;
      let done = false;
      for (let y = 0; y < ROWS - 1 && !done; y++) for (let x = 0; x < COLS && !done; x++) if (canPlace(d, x, y, 2)) { done = build(d.id, x, y, 2); }
      if (!done) missing.push(d.id);
    });
    o.allBuilt = missing.length === 0 ? '' : missing.join(',');
    o.allDoors = S.buildings.every(b => !defOf(b).fill || (b.door && validSpot(b, b.door.ent)));
    for (let i = 0; i < 1500; i++) update(0.1);
    for (let k = 0; k < 4; k++) { window.__ct.setRot(k); draw(); }
    window.__ct.setRot(0);
    // 카드 아이콘: 모든 분류의 건축 패널을 그려 본다
    CATS.forEach(c => { UI.cat = c[0]; UI.tool = null; renderBuild(); });
    o.cats = CATS.length;
    return o;
  });
  check(r.stack, '쌓기: 완성품 건물을 5층까지 올리고 수용 인원이 층수만큼 늘며, 위층 철거 가능');
  check(r.noStackGarden, '쌓기: 조경 요소는 층을 올릴 수 없음');
  check(r.roles, '칸 건물: 역할이 다른 칸은 합쳐지지도 쌓이지도 않음');
  check(r.skyBuilt && r.linked, '연결 다리: 같은 역할 건물의 2층끼리 이으면 서로 연결됨');
  check(r.skyNotNav, '연결 다리: 바깥 길찾기에는 들어가지 않음');
  check(r.xferStart && r.xferDone, '연결 다리: 건물이 꽉 차면 방문자가 다리를 건너 옆 건물로 감');
  check(r.badLink, '연결 다리: 역할이 다른 건물을 이으면 연결되지 않고 경고');
  check(r.skyRules, '연결 다리: 땅 높이·경사로는 지을 수 없음');
  check(r.floorPaint && r.floorUndo && r.floorErase && r.floorBlocked, '바닥: 칠하기·되돌리기·지우기, 건물 위 금지, 분위기 반영, 걸을 수 있음');
  check(r.allBuilt === '', '새 건물·요소: 모두 지을 수 있음' + (r.allBuilt ? ': ' + r.allBuilt : ''));
  check(r.allDoors, '문: 새 건물에도 모두 입구·출구가 있음');
  check(errs.length === 0, '새 건물·요소: 시뮬레이션·4방향 그리기·패널 ' + r.cats + '개 분류 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

(async () => {
  const srcs = staticChecks();
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch();
  try {
    await playChecks(browser, url);
    await modularChecks(browser, url);
    await pathChecks(browser, url);
    await stackChecks(browser, url);
    const r1 = await seededRun(browser, url);
    const r2 = await seededRun(browser, url);
    check(r1.built > 0, `시드 실행: 건물 ${r1.built}개 건설됨`);
    check(r1.errs.length === 0 && r2.errs.length === 0, '시드 실행: 오류 없음' + ([...r1.errs, ...r2.errs].length ? ':\n    ' + [...r1.errs, ...r2.errs].join('\n    ') : ''));
    check(r1.S === r2.S, '시드 실행: 같은 시드면 결과가 같음 (결정성)');
    check(!/null|NaN/.test(r1.S.match(/"money":[^,]*/)?.[0] || ''), '시드 실행: 자금 값이 정상');
  } catch (e) {
    check(false, '테스트 실행 중 예외: ' + e.message);
  } finally {
    await browser.close(); srv.close();
  }
  console.log(failures ? `\n실패 ${failures}건` : `\n모두 통과 (스크립트 ${srcs.length}개)`);
  process.exit(failures ? 1 : 0);
})();

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

  // 동그란 기능 버튼·하위 탭·메뉴·닫기
  await page.click('#fab [data-fab="minis"]'); await page.click('#subtabs [data-v="staff"]');
  await page.click('#fab [data-fab="status"]'); await page.click('#bGear'); await page.click('#bMenu');
  await page.click('#fab [data-fab="build"]'); await page.click('#dock [data-act="close"]');
  await page.click('#fab [data-fab="build"]'); await page.click('#fab [data-fab="build"]');
  for (const b of ['#bRot', '#bIn', '#bOut', '#bHome']) await page.click(b);
  // 톱니바퀴를 열어 배속을 바꾸고, 1×가 아니면 톱니바퀴에 표시가 붙는다
  await page.click('#bGear');
  for (const s of ['0', '2', '4']) await page.click(`.sp [data-sp="${s}"]`);
  const badge = await page.evaluate(() => !document.getElementById('spBadge').hidden && document.getElementById('spBadge').textContent === '4×');
  await page.click('.sp [data-sp="1"]');
  const badgeOff = await page.evaluate(() => document.getElementById('spBadge').hidden);
  await page.mouse.click(300, 200);
  const gearClosed = await page.evaluate(() => document.getElementById('gearMenu').hidden);
  check(badge && badgeOff && gearClosed, '톱니바퀴: 배속을 바꾸면 표시가 붙고, 바깥을 누르면 닫힘');
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
      for (let y = 0; y < ROWS - 1; y++) for (let x = 0; x < COLS; x++) if (c.canPlace(d, x, y)) { c.build(d.id, x, y); built++; return; }
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
    window.__ct.init(); S.money = 99999; S.goal = GOALS.length; S.dlg = null;
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
    // 방문자는 바닥·길 위로만 다니므로 입구까지 길을 잇고, 교회 문을 연다
    o.unlinked = !usable(rooms()[0]);
    o.linkOk = linkDoor(rooms()[0]) === '' && usable(rooms()[0]);
    S.open = true;
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
  check(r.unlinked && r.linkOk, '길 잇기: 바닥이 없으면 이용 불가, \'입구까지 길 잇기\'로 보도블록을 깔면 이용 가능');
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
    window.__ct.init(); S.money = 99999; S.goal = GOALS.length; S.dlg = null;
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
    // 잔디 칸에서 이미 닿는 바닥까지 보도블록을 깐다
    const connect = (x, y) => { const t = walkSearch(x, y, {}); (t || []).forEach(q => { S.floor[q.x + ',' + q.y] = 'f_block'; }); recalc(); return !!t; };
    S.open = true; linkDoor(room);
    o.unconnected = room.acc.ok && defOf(room).seats === D.mroom.per.seats * 4;
    // 땅에서 방 쪽(-y)으로 오르막 1칸, 이어서 평지 다리 1칸
    UI.pc = newCursor(); UI.pc.x = X + 1; UI.pc.y = Y + 2; UI.pc.l = 0; UI.pc.dir = 3; UI.pc.slope = 1;
    const b1 = pcBuild(); UI.pc.slope = 0; const b2 = pcBuild();
    o.built = b1 === '' && b2 === '' && S.paths.length === 2 && S.paths[0].s === 1 && S.paths[1].l === 1 && UI.pc.l === 1;
    o.undo = pcUndo() && S.paths.length === 1 && UI.pc.l === 1 && UI.pc.y === Y + 1;
    pcBuild();
    o.noOverlap = pieceFits({ x: X + 1, y: Y + 1, l: 1, s: 0, d: 0, k: 'stone' }) !== '' && pieceFits({ x: X, y: Y, l: 0, s: 0, d: 0, k: 'stone' }) !== '';
    o.bridgeOverPath = pieceFits({ x: X + 1, y: Y + 1, l: 0, s: 0, d: 0, k: 'stone' }) === '';
    // 다리·계단 밑 칸도 바닥을 깔면 걸을 수 있다 (잔디는 못 걷는다)
    let grassNo = false;
    for (let y = 0; y < PZ && !grassNo; y++) for (let x = 0; x < COLS; x++) if (!occ[y][x] && !S.floor[x + ',' + y] && !piecesAt(x, y).length) { grassNo = !groundOk(x, y); break; }
    paintFloor(X + 1, Y + 1, 'f_block'); paintFloor(X + 1, Y + 2, 'f_block');
    o.ground = grassNo && groundOk(X + 1, Y + 1) && groundOk(X + 1, Y + 2);
    connect(X + 1, Y + 3);
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
    window.__ct.init(); S.money = 999999; S.goal = GOALS.length; S.dlg = null;
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
    o.skyNotNav = !NAV.reach[PN + S.paths.find(p => p.k === 'sky').id];
    // A가 꽉 차면 다리를 건너 B로
    linkDoor(A); linkDoor(B);
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

// 구역·울타리·교회 문, 바닥 위로만 걷기, 매장 수익, 대출, 주일 정산, 시계
async function rulesChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 31337;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.goal = GOALS.length; S.dlg = null;
    const o = {};
    // 구역: 주차장은 주차 구역에만, 주차 구역엔 주차장만, 입구 보도는 비움
    o.zones = canPlace(D.lot, 1, PZ, 2) && !canPlace(D.lot, 1, 5, 2) && !canPlace(D.wc, 1, PZ, 2) && !canPlace(D.lots, ENT - 1, PZ, 2) &&
      tilePlan(3, PZ).ok === false && paintFloor(3, PZ, 'f_block') !== '' && pieceFits({ x: 3, y: PZ, l: 0, s: 0, d: 0, k: 'stone' }) !== '';
    // 걷기: 잔디는 못 걷고, 주차 구역은 걷고, 도로 줄은 입구 열만
    o.walk = !groundOk(2, 5) && groundOk(2, PZ + 1) && !groundOk(2, ROWS - 1) && groundOk(ENT, ROWS - 1) && groundOk(ENT, PZ - 1);
    // 시작은 문이 닫혀 있다: 방문자가 오지 않고, 주차 구역에서 부지로 들어오는 길이 막힌다
    const starter = S.buildings.find(b => b.def === 'room');
    o.closedStart = S.open === false && usable(starter);
    for (let i = 0; i < WEEK * 5; i++) update(0.1);
    const g = gid(ENT, PZ - 1);
    o.closedNoVisit = V.length === 0 && !navPath(gid(ENT, PZ), m => m === g);
    // 문 카드는 평소엔 숨어 있고, 교회 입구를 누르면 뜬다
    const popHidden = document.getElementById('gatePop').hidden;
    const gp = rotPt(ENT + .5, PZ), gs = toScreen(gp[0], gp[1], .7);
    onTap(gs[0], gs[1]); syncGate();
    o.gatePop = popHidden && !document.getElementById('gatePop').hidden && /닫혀/.test(document.getElementById('gpT').textContent);
    document.getElementById('gpBtn').click();
    o.opened = S.open === true && !!navPath(gid(ENT, PZ), m => m === g) && document.getElementById('gatePop').hidden;
    for (let i = 0; i < 200; i++) update(0.1);
    o.visitors = V.length > 0;
    // 다시 입구를 눌러 카드에서 닫는다
    openGatePop(); const btnTxt = document.getElementById('gpBtn').textContent; document.getElementById('gpBtn').click();
    o.closeTwice = /닫기/.test(btnTxt) && S.open === false;
    S.open = true;
    // 매장: 지갑의 돈으로 사고, 수익이 쌓이며 건물 위에 금액이 뜬다
    S.money = 50000;
    let shopB = null;
    for (let y = 0; y < PZ - 2 && !shopB; y++) for (let x = 0; x < COLS - 2; x++) if (canPlace(D.bakery, x, y, 2)) { build('bakery', x, y, 2); shopB = S.buildings[S.buildings.length - 1]; break; }
    spawnV(false); const v = V[V.length - 1]; v.wallet = 30; enter(v, shopB);
    const m0 = S.money, ws0 = S.weekShop; finishVisit(v);
    o.shop = S.money > m0 && S.weekShop > ws0 && v.wallet < 30 && F.some(f => /^\+\d+$/.test(f.text));
    o.shopCat = DEFS.filter(d => d.cat === 'shop').length >= 7 && ['market', 'bakery', 'bookstore'].every(id => D[id] && D[id].income > 0);
    // 대출: 한도 안에서 빌리고, 주일마다 갚고, 한 번에 갚을 수 있음
    const lim = creditLimit(), m1 = S.money;
    o.borrow = borrow('small') === '' && S.money === m1 + 3000 && S.loans.length === 1;
    o.bigLocked = (S.goal = 0, loanBlock('big') !== ''); S.goal = GOALS.length;
    S.members = 6; S.rep = 10; o.limit = loanBlock('mid') !== '' || debt() + 8000 <= creditLimit();
    const bal0 = S.loans[0].bal, mm = S.money;
    S.t = WEEK - 0.05; update(0.1);
    o.repayWeekly = S.loans[0].bal < bal0 && S.rcpt && S.rcpt.loan === S.loans[0].pay;
    o.receipt = !!S.rcpt && !document.getElementById('rcpt').hidden && /주일 정산/.test(document.getElementById('rcpt').textContent);
    S.money = 99999; o.repayAll = repayLoan(0) === '' && S.loans.length === 0;
    // 문을 닫은 주일은 온라인 헌금만
    S.open = false; S.t = WEEK - 0.05; update(0.1);
    o.closedSunday = S.rcpt.closed && S.rcpt.offering === 0 && S.rcpt.online > 0;
    S.open = true;
    // 시계: 오른쪽 위, 한 주는 48초, 주일 칸 강조
    S.t = WEEK * 6.5 / 7; hud(true);
    const ck = document.getElementById('clock').getBoundingClientRect();
    o.clock = WEEK === 240 && ck.left > innerWidth / 2 && ck.top < 60 && document.querySelector('#ckDays .sun').classList.contains('now') && isSunday();
    // 재정 탭
    openGroup('status'); document.querySelector('#subtabs [data-v="finance"]').click();
    o.finance = UI.tab === 'finance' && /대출 받기/.test(document.getElementById('panel').textContent);
    // 날씨: 계절별로 다른 날씨, 하루마다 바뀜, 효과
    const roll = (wk) => { S.week = wk - 1; const seen = new Set(); for (let i = 0; i < 400; i++) seen.add(rollWx('sun')); return seen; };
    const summer = roll(30), winter = roll(3);
    o.wxSeason = summer.has('heat') && summer.has('storm') && !summer.has('snow') && winter.has('snow') && !winter.has('heat');
    S.week = 10; S.wx.next = 'rain'; advanceWx();
    o.wxAdvance = S.wx.cur === 'rain' && !!WEATHER[S.wx.next];
    o.wxRain = !wxOpen(D.bench) && !wxOpen(D.parasol) && wxOpen(D.wc) && wxSale(D.cafe) > 1 && WEATHER.rain.vis < 1 && wxAttend() < 1 && wxDrain() > 0;
    S.wx.cur = 'wind'; o.wxWind = !wxOpen(D.parasol) && wxOpen(D.bench) && wxFill(D.playground) > 1;
    S.wx.cur = 'sun'; o.wxSun = wxFill(D.bench) > 1 && WEATHER.sun.vis > 1;
    let bow = false; for (let i = 0; i < 40 && !bow; i++) { S.wx.cur = 'rain'; S.wx.next = 'sun'; advanceWx(); bow = S.wx.bow > 0; }
    o.wxRainbow = bow;
    // 폭우: 벼락이 건물을 상하게 하고, 첨탑이 있으면 막아 준다
    S.wx.cur = 'storm'; S.buildings.forEach(b => { if (maintainable(b)) b.cond = 100; });
    let hit = false; for (let i = 0; i < 20 && !hit; i++) { S.wx.hits = 0; strike(); hit = S.buildings.some(b => maintainable(b) && condOf(b) < 100); }
    S.buildings.forEach(b => { if (maintainable(b)) b.cond = 100; });
    for (let y = 0; y < PZ && !S.buildings.some(b => b.def === 'spire'); y++) for (let x = 0; x < COLS; x++) if (canPlace(D.spire, x, y, 2)) { build('spire', x, y, 2); break; }
    for (let i = 0; i < 10; i++) { S.wx.hits = 0; strike(); }
    o.wxStorm = hit && S.buildings.every(b => !maintainable(b) || condOf(b) === 100);
    // 눈: 쌓이면 눈사람이 생기고 걸음이 느려진다
    S.wx.cur = 'snow'; S.wx.day = dayIdx(); for (let i = 0; i < 70; i++) wxTick(1);
    o.wxSnow = S.wx.snow > 0.9 && snowmen().length > 0 && wxSpeed() < 1;
    // 주일 폭우: 출석이 줄고 영수증에 날씨
    S.members = 20; S.wx.cur = 'storm'; S.t = WEEK - 0.05; S.wx.day = 6; update(0.1);
    o.wxSunday = S.rcpt.wx === 'storm' && S.rcpt.wxLost > 0 && /폭우/.test(document.getElementById('rcpt').textContent);
    hud(true);
    o.wxClock = new RegExp(WEATHER[S.wx.cur].n).test(document.getElementById('wxNow').textContent) && /내일|월요일/.test(document.getElementById('wxNext').textContent);
    // 날씨마다 그려 보기 (비·눈 효과, 우산, 번개, 무지개)
    for (let i = 0; i < 20; i++) spawnV(false);
    Object.keys(WEATHER).forEach(k => { S.wx.cur = k; WX.k = {}; WX.k[k] = 1; S.wx.wet = 1; S.wx.bow = 10; stepWx(0.5); WX.flash = 1; WX.bolt = { x: 5, y: 5, z: 1, t: .3 }; draw(); });
    // 꾸미기 요소
    o.deco = DEFS.filter(d => d.cat === 'deco').length >= 15 && DEFS.filter(d => d.cat === 'garden').length >= 15;
    for (let k = 0; k < 4; k++) { window.__ct.setRot(k); draw(); }
    window.__ct.setRot(0);
    return o;
  });
  check(r.zones, '구역: 주차장은 주차 구역에만, 주차 구역엔 주차장만, 입구 보도는 비움');
  check(r.walk, '걷기: 잔디는 못 걷고, 주차 구역은 포장, 도로는 출입구 열만');
  check(r.closedStart && r.closedNoVisit, '교회 문: 닫힌 채 시작, 방문자가 오지 않고 부지로 못 들어옴 (건물 이용 표시는 그대로)');
  check(r.opened && r.visitors, '교회 문: 입구 버튼으로 열면 방문자가 들어옴');
  check(r.gatePop, '교회 문: 카드는 평소엔 숨어 있고 교회 입구를 누르면 뜸');
  check(r.closeTwice, '교회 문: 입구 카드에서 닫기');
  check(r.shop && r.shopCat, '매장: 방문자가 지갑의 돈으로 사 가고 수익·금액 글씨가 뜸, 매장 분류 7종 이상');
  check(r.borrow && r.bigLocked && r.limit, '대출: 한도 안에서 빌림, 건축 대출은 목표 2개 후');
  check(r.repayWeekly && r.repayAll, '대출: 주일 정산 때 원리금 상환, 남은 원금 한 번에 갚기');
  check(r.receipt, '주일 정산: 영수증 카드가 뜸');
  check(r.closedSunday, '주일 정산: 문을 닫은 주일엔 온라인 헌금만');
  check(r.clock, '시계: 오른쪽 위, 한 주 240초, 주일 강조');
  check(r.finance, '재정 탭: 현황 버튼 안에 대출·정산 내역');
  check(r.wxSeason, '날씨: 여름엔 폭염·폭우, 겨울엔 눈 (계절별)');
  check(r.wxAdvance && r.wxClock, '날씨: 하루마다 바뀌고 시계에 오늘·내일 날씨');
  check(r.wxRain && r.wxWind && r.wxSun, '날씨: 비엔 야외 자리 쉼·실내 매장 붐빔, 바람엔 파라솔 접고 연날리기, 맑으면 야외 자리 인기');
  check(r.wxRainbow, '날씨: 비가 그치면 무지개가 뜰 수 있음');
  check(r.wxStorm, '날씨: 벼락이 건물을 상하게 하고, 십자가 첨탑이 피뢰침이 됨');
  check(r.wxSnow, '날씨: 눈이 쌓이면 눈사람, 걸음이 느려짐');
  check(r.wxSunday, '날씨: 주일 폭우면 출석이 줄고 영수증에 표시');
  check(r.deco, '꾸미기: 조경·꾸미기 요소 각 15종 이상');
  check(errs.length === 0, '구역·재정: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

// 목회 운영: 목표 보상·잠금 해제, 사역팀·부교역자·직분자, 행사, 고민 카드, 부지, 노후·수리, 난이도, 균형
async function ministryChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 2024;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init();
    const o = {};
    o.normalStart = S.diff === 'normal' && S.money === DIFF.normal.money;
    o.locked = isLocked('chapel') && hireTeam('admin') !== '' && appoint('deacon') !== '';
    // 목표 달성: 후원금·평판·잠금 해제·축하 카드
    const m0 = S.money, r0 = S.rep; S.members = 12; recalc(); checkGoal();
    o.goal = S.goal === 1 && S.money === m0 + GOALS[0].r && S.rep >= r0 + GOALS[0].rep - 0.001 && !isLocked('chapel') && !document.getElementById('cele').hidden && CF.length > 0;
    // 부지: 산 땅 밖에는 못 짓고, 사면 넓어진다
    S.money = 99999;
    // 부지 사기는 없앴다: 지도 어디에나(도로 줄 제외) 지을 수 있다
    o.anywhere = canPlace(D.room, 2, 2, 2) && !canPlace(D.room, 2, ROWS - 2, 2) && typeof buyLand === 'undefined';
    o.noStamina = S.stam === undefined && typeof restWeek === 'undefined';
    // 사역팀·부교역자·직분자
    const cap0 = MOD.cap;
    o.team = hireTeam('evang') === '' && S.staff.evang === 1 && MOD.vis > 1;
    refreshCands(); const fee = S.cands[0].fee, mA = S.money;
    o.assoc = hireAssoc(0) === '' && S.assoc.length === 1 && S.money === mA - fee && MOD.cap >= cap0 + 35 && assocPay() > 0;
    o.assocLimit = hireAssoc(0) !== '';
    S.members = 16; recalc();
    o.office = appoint('deacon') === '' && S.off.deacon === 1 && appoint('deacon') === '' && appoint('deacon') !== '';
    // 행사: 비용·체력·재개 대기, 절기 제한
    S.members = 20; recalc();
    const mm = S.money;
    o.event = runEvent('street') === '' && S.money === mm - EVENTS.street.cost && evBlock('street') !== '' && MOD.vis > 1.3;
    S.week = 2; o.season = evBlock('christmas') !== '';
    // 고민 카드: 선택하면 효과가 나고 닫힌다
    S.dlg = 'illness'; showDlg(); const mz = S.money;
    o.dlgShown = !document.getElementById('dlg').hidden;
    o.dlg = chooseDlg(0) === '' && S.dlg === null && S.money === mz - 300;
    // 노후와 수리
    const room = S.buildings.find(b => b.def === 'room'); room.cond = 20; recalc();
    const seatsWorn = A.seats;
    o.worn = condFactor(room) < 1 && needRepair().indexOf(room) >= 0;
    o.repair = repair(room) === '' && room.cond === 100 && A.seats > seatsWorn;
    // 사역자·행사·현황 패널이 그려진다
    ['staff', 'events', 'status', 'menu'].forEach(t => { UI.tab = t; UI.fold = false; renderPanel(); });
    o.panels = document.getElementById('panel').textContent.length > 0;
    // 난이도: 테스트로 새로 시작하면 자금 50,000
    restart('easy'); o.easy = S.diff === 'easy' && S.money === 50000;
    restart('normal');
    // 균형: 아무것도 하지 않으면 1년 동안 저절로 커지지 않고, 초반에 바로 파산하지도 않는다
    let minMoney = S.money;
    S.open = true; for (let w = 0; w < 30; w++) { if (S.dlg) chooseDlg(dlgById(S.dlg).o.length - 1); for (let i = 0; i < WEEK * 2; i++) update(0.5); minMoney = Math.min(minMoney, S.money); }
    o.passive = S.members < 25 && minMoney > 0 && !S.over;
    // 지도 밖도 잔디색으로 칠해진다
    draw(); const px = document.getElementById('cv').getContext('2d').getImageData(3, 3, 1, 1).data;
    o.lawn = px[1] > px[0] && px[1] > px[2] && px[1] > 120;
    return o;
  });
  check(r.normalStart, '난이도: 기본은 보통(자금 6,000)으로 시작');
  check(r.locked, '목표: 처음엔 예배당·관리팀·집사 임명이 잠겨 있음');
  check(r.goal, '목표: 달성하면 후원금·평판·잠금 해제와 축하 카드·꽃가루');
  check(r.anywhere, '부지: 처음부터 지도 전체에 지을 수 있음 (도로 줄 제외)');
  check(r.noStamina, '목회자 체력: 없앤 기능이 남아 있지 않음');
  check(r.team, '사역팀: 꾸리면 효과가 반영됨');
  check(r.assoc && r.assocLimit, '부교역자: 청빙 비용·사례비·목양 수용력, 자리 수 제한');
  check(r.office, '직분자: 성도 8명마다 집사 한 명까지 임명');
  check(r.event && r.season, '행사: 비용을 쓰고 효과가 나며, 다시 열기 대기와 절기 제한이 있음');
  check(r.dlgShown && r.dlg, '목회 고민: 카드가 뜨고, 고르면 효과가 나고 닫힘');
  check(r.worn && r.repair, '노후: 낡으면 좌석이 줄고, 수리하면 돌아옴');
  check(r.panels, '패널: 사역자·행사·현황·메뉴 탭이 그려짐');
  check(r.easy, '난이도: 테스트 난이도로 새로 시작하면 자금 50,000');
  check(r.passive, '균형: 손대지 않으면 30주 동안 저절로 커지지 않고 초반 파산도 없음');
  check(r.lawn, '지도 밖: 빈 공간이 잔디색으로 채워짐');
  // 화면 조작: 동그란 기능 버튼으로 패널 열고 닫기, 건물을 지으면 수치 글씨
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; S.dlg = null; showDlg(); S.money = 99999; UI.cat = 'worship'; closeDock(); });
  const closedAtStart = await page.evaluate(() => document.getElementById('dock').hidden);
  await page.click('#fab [data-fab="status"]');
  const quick = await page.evaluate(() => !document.getElementById('dock').hidden && /만족도/.test(document.getElementById('panel').textContent) && /챙길 일/.test(document.getElementById('panel').textContent) && document.querySelector('#fab [data-fab="status"]').classList.contains('on'));
  await page.click('#fab [data-fab="status"]');
  const toggled = await page.evaluate(() => document.getElementById('dock').hidden);
  await page.click('#fab [data-fab="minis"]');
  const minis = await page.evaluate(() => UI.tab === 'events' && /행사/.test(document.getElementById('subtabs').textContent) && /사역자/.test(document.getElementById('subtabs').textContent));
  await page.click('#subtabs [data-v="staff"]');
  const staffTab = await page.evaluate(() => UI.tab === 'staff' && /부교역자/.test(document.getElementById('panel').textContent));
  await page.click('#fab [data-fab="build"]');
  await page.click('#cards [data-v="room"]');
  // 고르면 패널이 닫히고, 미리보기 둘레에 ✓·✕와 방향 화살표 4개 (건물은 안내 띠 없음)
  const onMap = await page.evaluate(() => { syncPlace(); const pl = document.getElementById('place'); return document.getElementById('dock').hidden && !pl.hidden && document.getElementById('pbar').hidden && [...pl.querySelectorAll('.parr')].filter(e => !e.hidden).length === 4 && !!pl.querySelector('[data-pl="ok"]') && !!pl.querySelector('[data-pl="no"]'); });
  const btnPos = await page.evaluate(() => { syncPlace(); const r = s => document.querySelector(s).getBoundingClientRect(); const ok = r('#place [data-pl="ok"]'), no = r('#place [data-pl="no"]'); const bx = plBox(); return ok.left < no.left && ok.bottom <= bx.t + 4 && no.bottom <= bx.t + 4; });
  const effCard = await page.evaluate(() => /좌석 \+24/.test(document.querySelector('#cards [data-v="room"]').textContent));
  await page.click('#fab [data-fab="minis"]');
  const cancelled = await page.evaluate(() => UI.tool === null && UI.ghost === null && document.getElementById('place').hidden);
  await page.click('#fab [data-fab="build"]'); await page.click('#cards [data-v="room"]');
  const placed = await page.evaluate(() => { for (let y = 18; y < ROWS - 1; y++) for (let x = 6; x < COLS - 6; x++) if (canPlace(D.room, x, y, UI.face)) { UI.ghost = { x, y }; renderDetail(); return true; } return false; });
  // 화살표로 정면 방향 바꾸기
  const faced = await page.evaluate(() => { syncPlace(); const el = [...document.querySelectorAll('#place .parr')].find(e => +e.dataset.v !== UI.face); const want = +el.dataset.v; el.click(); syncPlace(); return UI.face === want && el.classList.contains('on'); });
  const barQuiet = await page.evaluate(() => { renderPbar(); return document.getElementById('pbar').hidden; });
  const blockedTip = await page.evaluate(() => { const g = { ...UI.ghost }; UI.ghost = { x: S.buildings[0].x, y: S.buildings[0].y }; syncPlace(); const ok = document.querySelector('#place [data-pl="ok"]'); const off = ok.classList.contains('off'); plLock = 0; ok.click(); const t = document.getElementById('toast'); const said = !t.hidden && t.textContent.length > 0; UI.ghost = g; syncPlace(); return off && said; });
  const m0 = await page.evaluate(() => S.money);
  if (placed) await page.click('#place [data-pl="ok"]');
  const fx = await page.evaluate(() => !F.some(f => /^(좌석|교제 공간|돌봄 공간|편의 공간|주차|분위기|방문자) \+/.test(f.text)));
  const backToList = await page.evaluate(() => { syncSelCard(); return document.getElementById('dock').hidden && UI.tool === null && !document.getElementById('selCard').hidden && !!document.querySelector('#selCard [data-act="undoLast"]'); });
  await page.click('#selCard [data-act="undoLast"]');
  await page.click('#fab [data-fab="build"]');
  const refunded = await page.evaluate(m => S.money === m && !S.buildings.some(b => b.def === 'room' && b.id === (UI.lastBuilt || {}).bid), m0);
  // 조경: 짓고 나면 옆자리로 미리보기가 옮겨져 이어 짓기, 되돌리면 전액 환불
  await page.click('#dock [data-v="garden"]'); await page.click('#cards [data-v="tree"]');
  const repeat = await page.evaluate(() => {
    const n0 = S.buildings.length, mA = S.money;
    for (let y = 18; y < ROWS - 1; y++) for (let x = 6; x < COLS - 8; x++) if (canPlace(D.tree, x, y, 2) && canPlace(D.tree, x + 1, y, 2)) { UI.ghost = { x, y }; break; }
    const g0 = { ...UI.ghost }; plLock = 0; plOk();
    const moved = UI.tool === 'tree' && (UI.ghost.x !== g0.x || UI.ghost.y !== g0.y) && S.buildings.length === n0 + 1;
    const noArrows = [...document.querySelectorAll('#place .parr')].every(e => e.hidden);
    syncPlace(); const und = document.querySelector('#place [data-pl="undo"]'); const undoOnMap = !und.hidden && document.getElementById('pbar').hidden; und.click();
    return moved && noArrows && undoOnMap && S.buildings.length === n0 && S.money === mA;
  });
  await page.click('#place [data-pl="no"]');
  const ended = await page.evaluate(() => UI.tool === null && !document.getElementById('dock').hidden);
  // 지은 것 옮기기·돌리기: 무료, 원래 자리는 비고, 방향이 바뀌고, 취소하면 그대로
  const moved = await page.evaluate(() => {
    const free = (w, h) => { for (let y = 16; y < PZ - 2; y++) for (let x = 2; x < COLS - 4; x++) if (canPlace(D.bench, x, y, 2) && canPlace(D.bench, x, y, 0)) return { x, y }; return null; };
    const a = free(); S.money += 1000; build('bench', a.x, a.y, 2); const b = S.buildings[S.buildings.length - 1];
    UI.fold = true; UI.sel = b.id; renderPanel();
    const btn = document.querySelector('#selCard [data-act="move"]'); if (!btn) return 'no button';
    btn.click(); if (!(movingId() === b.id && document.getElementById('dock').hidden && UI.ghost.x === b.x)) return 'no mode';
    // 제자리·같은 방향도 자기 자신과 겹친다고 하지 않는다
    if (placeWhy(D.bench, b.x, b.y, 2)) return 'self overlap';
    document.querySelector('#place [data-pl="no"]').click();
    if (b.x !== a.x || movingId() || occ[a.y][a.x] !== b.id || UI.sel !== b.id || document.getElementById('selCard').hidden) return 'cancel broke';
    document.querySelector('#selCard [data-act="move"]').click();
    let t = null; for (let y = 16; y < PZ - 2 && !t; y++) for (let x = 2; x < COLS - 4; x++) if (Math.abs(x - a.x) + Math.abs(y - a.y) > 3 && canPlace(D.bench, x, y, 0)) { t = { x, y }; break; }
    const m0 = S.money; UI.ghost = { x: t.x, y: t.y }; UI.face = 0; plLock = 0; syncPlace();
    document.querySelector('#place [data-pl="ok"]').click();
    return S.money === m0 && b.x === t.x && b.y === t.y && b.face === 0 && occ[a.y][a.x] !== b.id && occ[t.y][t.x] === b.id && UI.sel === b.id && !movingId() && document.getElementById('dock').hidden && !!document.querySelector('#selCard [data-act="move"]') ? 'ok' : 'move broke';
  });
  const roomNoMove = await page.evaluate(() => { let r = S.buildings.find(b => isRoom(b)); if (!r) { S.money += 1000; for (let y = 16; y < PZ - 2 && !r; y++) for (let x = 2; x < COLS - 2 && !r; x++) if (tilePlan(x, y, 'mroom').ok && placeTile(x, y, 'mroom')) r = roomAt(x, y, 'mroom'); } UI.fold = true; UI.sel = r.id; renderPanel(); const none = !document.getElementById('selCard').hidden && !document.querySelector('#selCard [data-act="move"]'); UI.sel = null; renderPanel(); return none; });
  // 지은 것을 지도에서 누르면: 패널 대신 작은 카드, 철거는 두 번 눌러야
  const card = await page.evaluate(() => {
    const b = S.buildings.find(x => x.def === 'room'); UI.fold = false; UI.tab = 'status'; renderPanel();
    const dm = bDims(b), m = rotPt(b.x + dm.w / 2, b.y + dm.h / 2), q = toScreen(m[0], m[1], .3); onTap(q[0], q[1]);
    if (UI.sel !== b.id) return 'not picked';
    syncSelCard(); const el = document.getElementById('selCard');
    if (!document.getElementById('dock').hidden || el.hidden) return 'dock or no card';
    const r = el.getBoundingClientRect(); if (r.width > 320 || r.height > 120) return 'too big ' + Math.round(r.width) + 'x' + Math.round(r.height);
    el.querySelector('[data-act="scmore"]').click();
    const n0 = S.buildings.length; el.querySelector('[data-act="scdem"]').click();
    if (S.buildings.length !== n0 || !/정말/.test(el.textContent)) return 'one tap demolished';
    closeSelCard(); return el.hidden ? 'ok' : 'not closed';
  });
  await page.click('#fab [data-fab="build"]');
  // 길: 지도 위 ✓로 한 칸씩
  await page.click('#dock [data-v="path"]'); await page.click('#cards [data-v="path"]');
  const pathOk = await page.evaluate(() => { const n = S.paths.length; plLock = 0; const okBtn = document.querySelector('#place [data-pl="ok"]'); syncPlace(); if (okBtn.classList.contains('off')) { UI.pc.x = 4; UI.pc.y = ROWS - 4; UI.pc.l = 0; syncPlace(); } plOk(); return S.paths.length === n + 1 && !!document.querySelector('#pbar [data-act="pkind"]'); });
  await page.keyboard.press('Escape');
  const escEnds = await page.evaluate(() => UI.tool === null);
  // 바닥: 화살표 = 깔아 나갈 방향, ✓마다 한 칸 칠하고 나아감. 지도를 누르면 자리만 옮김
  await page.click('#dock [data-v="floor"]'); await page.click('#cards [data-v="f_brick"]');
  const floorDir = await page.evaluate(() => {
    let sx = -1, sy = -1;
    for (let y = 2; y < PZ - 4 && sx < 0; y++) for (let x = 2; x < COLS - 6; x++) if ([0, 1, 2, 3].every(i => !occ[y][x + i] && !S.floor[(x + i) + ',' + y])) { sx = x; sy = y; break; }
    UI.ghost = { x: sx, y: sy }; renderDetail(); syncPlace();
    const arrows = [...document.querySelectorAll('#place .parr')].filter(e => !e.hidden).length === 4;
    plDir(0); plLock = 0; plOk(); plLock = 0; plOk(); plLock = 0; plOk();
    return arrows && S.floor[sx + ',' + sy] === 'f_brick' && S.floor[(sx + 2) + ',' + sy] === 'f_brick' && UI.ghost.x === sx + 3 && UI.ghost.y === sy;
  });
  const floorTap = await page.evaluate(() => { const n = Object.keys(S.floor).length; const g = UI.ghost; const p = rotPt(g.x + .5, g.y + 3.5), q = toScreen(p[0], p[1], 0); onTap(q[0], q[1]); return Object.keys(S.floor).length === n && UI.ghost.x === g.x && UI.ghost.y === g.y + 3; });
  await page.keyboard.press('Escape');
  // 건물 방향: 화살표로 정면을 바꾸면 그림이 실제로 돈다 (벤치·정사각형 예배실·쌍등·버스 정류장)
  const rotates = await page.evaluate(() => {
    const cv2 = document.createElement('canvas'); cv2.width = 200; cv2.height = 200; const g2 = cv2.getContext('2d');
    const keep = { c: PJ.c, ox: PJ.ox, oy: PJ.oy, s: PJ.s };
    const shot = (id, f) => { g2.clearRect(0, 0, 200, 200); PJ.c = g2; PJ.ox = 100; PJ.oy = 60; PJ.s = 1.4; const b = { x: 0, y: 0, def: id, id: 3, face: f }; ensureDoors(b); drawEntity(b, 0); return cv2.toDataURL(); };
    const out = ['bench', 'room', 'lamp2', 'busstop', 'picnic'].every(id => new Set([0, 1, 2, 3].map(f => shot(id, f))).size >= 2 && shot(id, 0) !== shot(id, 2));
    PJ.c = keep.c; PJ.ox = keep.ox; PJ.oy = keep.oy; PJ.s = keep.s;
    return out;
  });
  const smallBtns = await page.evaluate(() => { startPlace('bench'); syncPlace(); const r = document.querySelector('#place [data-pl="ok"]').getBoundingClientRect(); const a = document.querySelector('#place .parr').getBoundingClientRect(); endPlace(); return r.width <= 40 && a.width <= 34; });
  check(closedAtStart && quick && toggled, '기능 버튼: 현황 버튼으로 요약·챙길 일이 열리고, 다시 누르면 닫힘');
  check(minis && staffTab, '기능 버튼: 행사 버튼 안에 행사·사역자 탭');
  check(onMap, '지도에서 짓기: 고르면 패널이 닫히고 미리보기 둘레에 ✓·✕·방향 화살표 4개, 건물은 안내 띠 없음');
  check(btnPos, '지도에서 짓기: ✓는 왼쪽 위, ✕는 오른쪽 위 (미리보기보다 위)');
  check(effCard, '건축 카드: 지으면 생기는 효과("좌석 +24")를 미리 보여 줌');
  check(cancelled, '기능 버튼: 짓다가 다른 패널로 옮기면 미리보기가 사라짐');
  check(faced, '지도에서 짓기: 화살표를 누르면 정면 방향이 바뀜');
  check(placed && fx && barQuiet, '건축 효과: 지을 때 효과 글씨·안내 띠를 띄우지 않음 (효과는 건축 카드에서만)');
  check(card === 'ok', '지은 것 누르기: 패널 대신 건물 위 작은 카드, 철거는 두 번 눌러야 (' + card + ')');
  check(moved === 'ok', '옮기기·돌리기: 지은 것을 무료로 다른 자리·방향으로 옮김, 취소하면 그대로 (' + moved + ')');
  check(roomNoMove, '옮기기·돌리기: 칸 건물에는 옮기기 버튼이 없음');
  check(blockedTip, '지도에서 짓기: 못 짓는 자리에서 회색 ✓를 누르면 이유를 알려 줌');
  check(backToList && refunded, '지도에서 짓기: 큰 건물은 지은 뒤 패널 없이 건물 위 카드, 그 주에는 카드에서 전액 되돌리기');
  check(repeat, '지도에서 짓기: 조경은 옆자리로 이어 짓기, 방향 화살표 없음, 되돌리면 전액 환불');
  check(ended, '지도에서 짓기: ✕로 그만두면 목록으로 돌아옴');
  check(pathOk && escEnds, '지도에서 짓기: 길은 ✓로 한 칸씩 잇고 띠에서 종류를 고름, Esc로 끝냄');
  check(floorDir && floorTap, '지도에서 짓기: 바닥은 화살표 방향으로 ✓마다 한 칸씩 깔리고, 지도를 누르면 자리만 옮김');
  check(rotates, '건물 방향: 화살표로 정면을 바꾸면 벤치·예배실·쌍등·정류장·피크닉 테이블 그림이 돎');
  check(smallBtns, '지도에서 짓기: ✓·✕ 38px, 화살표 32px로 작아짐');
  check(errs.length === 0, '목회 운영: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
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
    await ministryChecks(browser, url);
    await rulesChecks(browser, url);
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

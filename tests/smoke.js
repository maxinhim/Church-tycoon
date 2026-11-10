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
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.mp3': 'audio/mpeg' };
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
  // 보통 모드에서는 빨리 감기(2×~8×)가 숨겨지고 일시정지·1×만 보인다
  await page.click('#bGear');
  const fastHidden = await page.evaluate(() => S.diff !== 'easy' && [2, 4, 8].every(v => document.querySelector('.sp [data-sp="' + v + '"]').hidden) && !document.querySelector('.sp [data-sp="0"]').hidden);
  await page.evaluate(() => { S.diff = 'easy'; syncSpeed(); });
  for (const s of ['0', '2', '4']) await page.click(`.sp [data-sp="${s}"]`);
  const badge = await page.evaluate(() => !document.getElementById('spBadge').hidden && document.getElementById('spBadge').textContent === '4×');
  // 음악 버튼은 게임 속도를 바꾸지 않는다
  const sndSafe = await page.evaluate(() => { document.getElementById('bMusic').click(); document.getElementById('bMusic').click(); return UI.speed === 4; });
  check(fastHidden && sndSafe, '게임 속도: 보통 모드는 일시정지·1×만, 테스트 모드는 8×까지, 소리 버튼은 속도와 무관');
  await page.click('.sp [data-sp="1"]');
  const badgeOff = await page.evaluate(() => { const h = document.getElementById('spBadge').hidden; S.diff = 'normal'; syncSpeed(); return h; });
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
    for (let k = 0; k < 8; k++) placeTile(X + 1, Y);
    o.maxFloor = tileOf(rooms()[0], X + 1, Y).f === 10 && !tilePlan(X + 1, Y).ok;
    for (let k = 0; k < 9; k++) removeTile(X + 1, Y, 1);
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
  check(r.maxFloor, '예배실 칸: 10층까지 쌓이고 그 위로는 못 올림');
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
    for (let k = 0; k < 9; k++) addFloor(cell);
    o.stack = cell.floors === 10 && defOf(cell).fcap === D.cell.fcap * 10 && addFloor(cell) !== '' && removeFloor(cell, .5) && cell.floors === 9;
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
  check(r.stack, '쌓기: 완성품 건물을 10층까지 올리고 수용 인원이 층수만큼 늘며, 위층 철거 가능');
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
    const m0 = S.money, ws0 = S.weekShop, wsu0 = S.weekSup || 0; finishVisit(v);
    o.shop = S.money > m0 && S.weekShop > ws0 && v.wallet < 30 && F.some(f => /^\+\d+$/.test(f.text));
    // 재료비는 판 순간 나가고, 정산 때 자금 변동 = 영수증의 '정산 때' 금액 (합계에 주중 순수익이 들어 있어도 설명이 맞음)
    o.shopSup = S.weekSup > wsu0 && S.money - m0 === (S.weekShop - ws0) - (S.weekSup - wsu0) && S.weekSup - wsu0 === Math.round((S.weekShop - ws0) * SHOP_COST);
    // 주일 정산 때 무작위 사건(감사 헌금·수리비)이 끼지 않게
    { S.evtLeft = 2; S.evt = null; const ms = S.money, wi = S.weekInc, wsup = S.weekSup; weekEnd(); const r = S.rcpt;
      o.settle = S.money - ms === r.settle && r.pre === Math.round(wi - wsup) && r.net === r.settle + r.pre && /정산 때 자금/.test(rcptHtml(r, false)); }
    o.shopCat = DEFS.filter(d => d.cat === 'shop').length >= 7 && ['market', 'bakery', 'bookstore'].every(id => D[id] && D[id].income > 0);
    // 대출: 한도 안에서 빌리고, 주일마다 갚고, 한 번에 갚을 수 있음
    const lim = creditLimit(), m1 = S.money;
    o.borrow = borrow('small') === '' && S.money === m1 + LOANS.small.amt && S.loans.length === 1;
    o.bigLocked = (S.goal = 0, loanBlock('big') !== ''); S.goal = GOALS.length;
    S.members = 6; S.rep = 10; o.limit = loanBlock('mid') !== '' || debt() + LOANS.mid.amt <= creditLimit();
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
    o.clock = WEEK === 48 && ck.left > innerWidth / 2 && ck.top < 60 && document.querySelector('#ckDays .sun').classList.contains('now') && isSunday();
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
    o.wxClock = new RegExp(WEATHER[S.wx.cur].n).test(document.getElementById('wxNow').textContent) && /내일|일 뒤|다음 주/.test(document.getElementById('wxNext').textContent);
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
  check(r.shopSup && r.settle, '재정: 매장 재료비는 팔 때 바로 나가고, 영수증에 정산 때 자금 변동을 따로 보여 줌');
  check(r.borrow && r.bigLocked && r.limit, '대출: 한도 안에서 빌림, 건축 대출은 목표 2개 후');
  check(r.repayWeekly && r.repayAll, '대출: 주일 정산 때 원리금 상환, 남은 원금 한 번에 갚기');
  check(r.receipt, '주일 정산: 영수증 카드가 뜸');
  check(r.closedSunday, '주일 정산: 문을 닫은 주일엔 온라인 헌금만');
  check(r.clock, '시계: 오른쪽 위, 한 주 48초, 주일 강조');
  check(r.finance, '재정 탭: 현황 버튼 안에 대출·정산 내역');
  check(r.wxSeason, '날씨: 여름엔 폭염·폭우, 겨울엔 눈 (계절별)');
  check(r.wxAdvance && r.wxClock, '날씨: 차례가 되면 다음 날씨로 바뀌고 시계에 오늘·다음 날씨');
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
    // 주중(월요일)에도 조건을 채우면 바로 달성된다 (주일 정산을 기다리지 않음)
    const m0 = S.money, r0 = S.rep, wk0 = S.week; S.t = 1; S.members = 12; recalc(); S.goalAcc = 0; update(0.6);
    o.goalMid = S.goal === 1 && S.week === wk0;
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
    // 노후는 천천히(한 주 기본 0.8), 수리비는 낡은 만큼 건물 값의 10%까지
    room.cond = 50; o.repair = o.repair && repairCost(room) === Math.round(D.room.cost * 0.05);
    room.cond = 100; room.weekUses = 0; const md = MOD.decay; MOD.decay = 1; decayWeek(); MOD.decay = md; o.repair = o.repair && Math.abs(room.cond - 99.2) < 1e-9; room.cond = 100;
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
  check(r.goalMid, '목표: 주일을 기다리지 않고 주중에 바로 달성');
  check(r.anywhere, '부지: 처음부터 지도 전체에 지을 수 있음 (도로 줄 제외)');
  check(r.noStamina, '목회자 체력: 없앤 기능이 남아 있지 않음');
  check(r.team, '사역팀: 꾸리면 효과가 반영됨');
  check(r.assoc && r.assocLimit, '부교역자: 청빙 비용·사례비·목양 수용력, 자리 수 제한');
  check(r.office, '직분자: 성도 8명마다 집사 한 명까지 임명');
  check(r.event && r.season, '행사: 비용을 쓰고 효과가 나며, 다시 열기 대기와 절기 제한이 있음');
  check(r.dlgShown && r.dlg, '목회 고민: 카드가 뜨고, 고르면 효과가 나고 닫힘');
  check(r.worn && r.repair, '노후: 낡으면 좌석이 줄고, 수리하면 돌아옴 (한 주 기본 0.8씩 낡고, 수리비는 건물 값의 10%까지)');
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
  // 길·바닥을 깔 때: 바닥은 아래 띠 없이 ✓ 옆 값만, 길은 안내 문장 없이 이름·값·고르는 버튼만
  const quietLine = await page.evaluate(() => { const keep = { tool: UI.tool, ghost: UI.ghost };
    startPlace('f_block'); renderPbar(); syncPlace(); const pr = document.querySelector('#place .ppr');
    const fl = document.getElementById('pbar').hidden && !pr.hidden && /\d/.test(pr.textContent);
    startPlace('path'); renderPbar(); const t = document.getElementById('pbar').innerText;
    const pa = !document.getElementById('pbar').hidden && !/지도를 눌러|✓로/.test(t) && !!document.querySelector('#pbar [data-act="pkind"]');
    startPlace(keep.tool); UI.ghost = keep.ghost; renderDetail(); return fl && pa; });
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
    UI.fdir = 0; const g0 = { ...UI.ghost }; plLock = 0; plOk();
    const moved = UI.tool === 'tree' && UI.ghost.x === g0.x + 1 && UI.ghost.y === g0.y && S.buildings.length === n0 + 1;
    syncPlace(); const arrows = [...document.querySelectorAll('#place .parr')].filter(e => !e.hidden).length === 4 && document.querySelector('#place .parr.on').dataset.v === '0';
    syncPlace(); const und = document.querySelector('#place [data-pl="undo"]'); const undoOnMap = !und.hidden && document.getElementById('pbar').hidden; und.click();
    return moved && arrows && undoOnMap && S.buildings.length === n0 && S.money === mA;
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
  check(quietLine, '길·바닥 깔기: 안내 문구 박스 없음 (바닥은 ✓ 옆 값만, 길은 고르는 버튼만)');
  check(placed && fx && barQuiet, '건축 효과: 지을 때 효과 글씨·안내 띠를 띄우지 않음 (효과는 건축 카드에서만)');
  check(card === 'ok', '지은 것 누르기: 패널 대신 건물 위 작은 카드, 철거는 두 번 눌러야 (' + card + ')');
  check(moved === 'ok', '옮기기·돌리기: 지은 것을 무료로 다른 자리·방향으로 옮김, 취소하면 그대로 (' + moved + ')');
  check(roomNoMove, '옮기기·돌리기: 칸 건물에는 옮기기 버튼이 없음');
  check(blockedTip, '지도에서 짓기: 못 짓는 자리에서 회색 ✓를 누르면 이유를 알려 줌');
  check(backToList && refunded, '지도에서 짓기: 큰 건물은 지은 뒤 패널 없이 건물 위 카드, 그 주에는 카드에서 전액 되돌리기');
  check(repeat, '지도에서 짓기: 조경은 길처럼 화살표 쪽으로 한 칸씩 이어 짓기, 되돌리면 전액 환불');
  check(ended, '지도에서 짓기: ✕로 그만두면 목록으로 돌아옴');
  check(pathOk && escEnds, '지도에서 짓기: 길은 ✓로 한 칸씩 잇고 띠에서 종류를 고름, Esc로 끝냄');
  check(floorDir && floorTap, '지도에서 짓기: 바닥은 화살표 방향으로 ✓마다 한 칸씩 깔리고, 지도를 누르면 자리만 옮김');
  check(rotates, '건물 방향: 화살표로 정면을 바꾸면 벤치·예배실·쌍등·정류장·피크닉 테이블 그림이 돎');
  // 꾸미기 이어 짓기: 울타리는 짓는 방향을 따라 눕고, 벤치는 화살표가 정면이고 옆으로 늘어서고, 파라솔은 화살표 없이 입구 쪽을 봄
  const decoLine = await page.evaluate(() => {
    const spot = id => { for (let y = 14; y < PZ - 3; y++) for (let x = 3; x < COLS - 6; x++) { let ok = true; for (let i = 0; i < 4; i++) for (let j = -1; j < 2; j++) if (!canPlace(D[id], x + i, y + j, 2)) ok = false; if (ok) return { x, y }; } return null; };
    S.money += 5000; startPlace('fence_w'); let p = spot('fence_w'); UI.ghost = { ...p };
    plDir(2); if (UI.face !== 0) return 'fence face ' + UI.face; plDir(0); if (UI.face !== 2) return 'fence face2';
    plLock = 0; plOk(); plLock = 0; plOk();
    const f2 = S.buildings.slice(-2); if (!(f2[0].def === 'fence_w' && f2[1].x === f2[0].x + 1 && f2[1].face === 2)) return 'fence line';
    endPlace(); startPlace('bench'); p = spot('bench'); UI.ghost = { ...p }; syncPlace();
    if (arrowMode(D.bench) !== 'face') return 'bench mode'; plDir(2); plLock = 0; plOk();
    const bn = S.buildings[S.buildings.length - 1]; if (bn.face !== 2 || (UI.ghost.x === p.x && UI.ghost.y === p.y)) return 'bench';
    endPlace(); startPlace('parasol'); p = spot('parasol'); UI.ghost = { ...p }; syncPlace();
    const noArr = arrowMode(D.parasol) === 'line'; plLock = 0; plOk(); const pa = S.buildings[S.buildings.length - 1];
    endPlace(); if (!noArr || pa.face !== gateFace(D.parasol, pa.x, pa.y)) return 'parasol';
    if (turnable(D.tree) || !turnable(D.fence_w) || !turnable(D.bench)) return 'turnable';
    return 'ok';
  });
  check(decoLine === 'ok', '꾸미기 이어 짓기: 울타리는 짓는 방향대로, 벤치는 정면 화살표, 방향 없는 것은 입구 쪽 자동 (' + decoLine + ')');
  check(smallBtns, '지도에서 짓기: ✓·✕ 38px, 화살표 32px로 작아짐');
  // 그림 조각: 모두 불러와 쓰고, 그림이 없으면 벡터로 그린다
  await page.waitForFunction(() => SPR_N === SPR_TOTAL, null, { timeout: 8000 }).catch(() => {});
  const sprites = await page.evaluate(() => {
    if (SPR_TOTAL < 20 || SPR_N !== SPR_TOTAL) return 'loaded ' + SPR_N + '/' + SPR_TOTAL;
    // 모든 조각은 정의가 쓰거나(def.spr 포함) 앞모습의 뒷모습이어야 한다
    const used = new Set(); DEFS.forEach(d => { if (SPR_DATA[d.spr || d.id]) used.add(d.spr || d.id); });
    Object.values(SPR_DATA).forEach(v => { if (v.back) { if (!SPR_DATA[v.back]) used.add('MISSING ' + v.back); used.add(v.back); } });
    const miss = Object.keys(SPR_DATA).filter(id => !used.has(id) && !SPR_DATA[id].tex && !/^gate_/.test(id)); if (miss.length) return 'unused ' + miss;
    if ([...used].some(u => /^MISSING/.test(u))) return 'back missing';
    // 방향: 앞(↘)·뒤집은 앞(↙)·뒷(↖)·뒤집은 뒷(↗). 방향 없는 것은 뒤집지 않는다
    const calls = []; const real = drawSpr; window.drawSpr = function (id, cx, cy, n, sid, mir) { calls.push([id, !!mir]); return true; };
    const probe = (def, face) => { calls.length = 0; ROT = 0; drawSprEntity({ x: 5, y: 20, def, id: 4, face }); return calls[0]; };
    const dirs = [0, 1, 2, 3].map(sd => probe('bench', screenToWorldDir(sd)));
    const treeA = probe('tree', 0), treeB = probe('tree', 3), longA = probe('gate', screenToWorldDir(0)), longB = probe('gate', screenToWorldDir(1));
    window.drawSpr = real;
    const okDir = JSON.stringify(dirs) === JSON.stringify([['bench', false], ['bench', true], ['bench_b', false], ['bench_b', true]]) && !treeA[1] && !treeB[1] && longA[1] === false && longB[1] === true;
    if (!okDir) return 'dir ' + JSON.stringify(dirs) + JSON.stringify([treeA, treeB, longA, longB]);
    const t = { x: 5, y: 20, def: 'cherry', id: 3, face: 2 };
    if (!drawSprEntity(t)) return 'not drawn';
    const keep = SPR.cherry; delete SPR.cherry; let ok = !drawSprEntity(t); try { drawEntity(t); } catch (e) { ok = false; } SPR.cherry = keep;
    return ok ? 'ok' : 'no fallback';
  });
  // 소리: 첫 터치에 켜지고 효과음을 모두 불러오며, 날씨에 따라 곡이 바뀌고, 끄기 버튼이 저장된다
  await page.mouse.click(400, 200);
  await page.waitForFunction(() => SND.unlocked && Object.keys(SND.buf).length === SFX_LIST.length, null, { timeout: 8000 }).catch(() => {});
  const audio = await page.evaluate(() => {
    if (!SND.unlocked) return 'not unlocked';
    if (Object.keys(SND.buf).length !== SFX_LIST.length) return 'sfx ' + Object.keys(SND.buf).length + '/' + SFX_LIST.length;
    const keep = S.wx.cur, out = [];
    ['sun', 'rain', 'storm', 'snow'].forEach(w => { S.wx.cur = w; stepAudio(0.1); out.push(SND.cur); });
    S.wx.cur = keep;
    if (out.join() !== 'sun,,,snow') return 'kind ' + out;
    if (SND.el.rain || !SND.el.amb) return 'rain should have no music, only rain sound';
    S.wx.cur = 'storm'; SND.thT = 0.01; stepAudio(0.1); const thunderSet = SND.thT > 10; S.wx.cur = keep; stepAudio(0.1);
    if (!thunderSet) return 'no thunder';
    sfx('build'); sfx('coin'); thunder();
    document.getElementById('bMusic').click();
    const saved = JSON.parse(localStorage.getItem(SND_KEY) || '{}').music === false && !SND.music;
    stepAudio(0.1); document.getElementById('bMusic').click();
    return saved && SND.cur === '' ? 'ok' : 'toggle';
  });
  check(audio === 'ok', '소리: 첫 터치에 켜짐, 효과음 모두 불러옴, 맑음·눈은 다른 곡·비는 음악 없이 천둥, 음악 끄기 저장 (' + audio + ')');
  // 건축 분류 칩이 모두 패널 안에 보인다 (가로로 숨지 않음)
  const chipsVisible = await page.evaluate(() => { UI.fold = false; UI.tab = 'build'; UI.tool = null; renderPanel(); const c = document.querySelector('#panel .chips'); if (!c) return false; const r = c.getBoundingClientRect(); const ok = [...c.children].length === CATS.length + 1 && [...c.children].every(x => { const q = x.getBoundingClientRect(); return q.width > 0 && q.left >= r.left - 1 && q.right <= r.right + 1; }); UI.fold = true; renderPanel(); return ok; });
  check(chipsVisible, '건축 분류: 바닥·꾸미기·철거까지 모든 칩이 패널 안에 보임');
  check(sprites === 'ok', '그림 조각: 조경·꾸미기 그림을 모두 불러와 그리고, 없으면 벡터 그림으로 (' + sprites + ')');
  check(errs.length === 0, '목회 운영: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

/* ---------- 지형: 땅 높이·흙 경사로 ---------- */
async function terrainChecks(browser, url) {
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
    window.__ct.init(); S.money = 999999; S.goal = GOALS.length; S.dlg = null; S.open = true;
    S.buildings = S.buildings.filter(b => b.def !== 'tree'); rebuildOcc(); recalc();
    const o = {};
    // (18..21, 8..11) 높이 2 고원, 앞쪽(+y)에서 흙 경사로 두 칸으로 오른다: (19,13) 0→1, (19,12) 1→2
    for (let x = 18; x < 22; x++) for (let y = 8; y < 12; y++) terApply(x, y, 'ter_set', 2);
    terApply(19, 12, 'ter_set', 1);
    o.ramp1 = terApply(19, 12, 'ter_ramp', 0, 3) === '';
    o.ramp2 = terApply(19, 13, 'ter_ramp', 0, 3) === '';
    const m0 = S.money; o.rampBad = terApply(17, 9, 'ter_ramp', 0, 0) !== '';
    // 화살표 쪽 땅이 낮으면 한 층 높여 주고 값을 합산한다
    const m1 = S.money; o.rampAuto = terApply(25, 5, 'ter_ramp', 0, 3) === '' && th(25, 4) === 1 && tslope(25, 5) === 3 && m1 - S.money === TER_RAMP + TER_UP;
    o.rampUndo = (terUndo(UI.undo.pop()), th(25, 4) === 0 && !isRamp(25, 5) && S.money === m1);
    // 고원 위에 기도실, 문 앞 바닥
    o.levelBad = levelWhy(D.pray, 19, 12, 2) !== '' && levelWhy(D.chapel, 17, 8, 2) !== '';
    o.built = build('pray', 19, 9, 2);
    const pr = S.buildings.find(b => b.def === 'pray');
    o.onTop = !!pr && bLevel(pr) === 2;
    [[19, 10], [19, 11]].forEach(t => paintFloor(t[0], t[1], 'f_block'));
    // 경사로 아래에서 기존 바닥까지
    const t = walkSearch(19, 14, {}); (t || []).forEach(q => { S.floor[q.x + ',' + q.y] = 'f_block'; }); recalc();
    o.reach = !!(pr.acc && pr.acc.ok);
    const path = navPath(gateNode(), m => m === doorNode(pr.door.ent));
    o.climb = !!path && Math.abs(path[path.length - 1].z - 2 * LV) < .01;
    // 경사로를 없애면(평지로) 절벽이라 못 오른다
    UI.undo = [];
    terApply(19, 12, 'ter_set', 1);
    o.cliff = !pr.acc.ok;
    o.undo = (terUndo(UI.undo.pop()), pr.acc.ok);
    // 땅을 높이면 위의 건물이 함께 오른다 (여러 칸 건물은 모든 칸이 함께)
    o.bldUp = build('chapel', 4, 4, 2) && terApply(5, 5, 'ter_set', 3) === '' && (() => { const c = S.buildings.find(b => b.def === 'chapel'); return bLevel(c) === 3 && bTiles(c).every(q => th(q.x, q.y) === 3); })();
    // 합쳐 10층 제한
    o.cap = terPlan(5, 5, 'ter_set', 9).why !== '';
    // 철골 계단으로 고원 옆면에 오르기: (22,9) 땅에서 -x 방향으로? 고원 동쪽(+x) 밖 (22,9) l=0 → (22,9)→(21,9) 계단은 x를 따라 오른다
    o.stair = addPiece({ x: 23, y: 9, l: 0, s: 1, d: 1, k: 'stone' }) === '' && addPiece({ x: 22, y: 9, l: 1, s: 1, d: 1, k: 'stone' }) === '';
    paintFloor(24, 9, 'f_block'); paintFloor(21, 9, 'f_block');
    const reach = (NAV.all = true, navReach(gid(24, 9))); NAV.all = false;
    o.stairUp = !!reach[gid(21, 9)];
    o.dbg = [o.stair, o.stairUp, JSON.stringify(piecesAt(23,9)), JSON.stringify(piecesAt(22,9)), groundOk(21,9), groundOk(24,9)].join(' ');
    // 땅에 놓인 길은 땅과 함께 움직인다
    addPiece({ x: 26, y: 3, l: 0, s: 0, d: 0, k: 'stone' });
    terApply(26, 3, 'ter_set', 1);
    o.pieceMoved = piecesAt(26, 3)[0].l === 1;
    // 화면에서 높인 땅을 누르면 그 칸이 잡힌다
    const m = rotPt(20.5, 8.5), q = toScreen(m[0], m[1], 2 * LV), g = groundTile(q[0], q[1]);
    o.pick = g.x === 20 && g.y === 8;
    draw(); ROT = 1; draw(); ROT = 0;
    // 저장 후 다시 불러와도 높이 유지
    save(); const L = load(); o.saved = L.hgt['20,8'] === 2 && L.slp['19,12'] === 3;
    // 노후 단계: 80·70·60% 이하에서 거미줄·하얀 연기·검은 연기, 효율 90·75·55%
    const pb = S.buildings.find(b => b.def === 'pray');
    o.wear = [[90, 0, 1], [80, 1, .9], [70, 2, .75], [60, 3, .55]].every(t => { pb.cond = t[0]; return wearStage(pb) === t[1] && condFactor(pb) === t[2]; });
    pb.cond = 50; draw(); pb.cond = 100;
    // 주차 분류
    o.park = ['lot', 'lots', 'parktower', 'bikerack'].every(id => D[id].cat === 'park') && CATS.some(c => c[0] === 'park');
    // 날씨는 2~3일씩 이어진다
    // 날씨는 월요일에만 정해지고, 비는 2~3일 뒤 그친다
    let changes = 0; const adv = window.advanceWx; window.advanceWx = function () { changes++; adv(); };
    S.wx.day = 6; S.wx.next = 'rain'; const seq = [];
    for (let d = 0; d < 21; d++) { S.t = (d % 7) * WEEK / 7 + .01; wxTick(.01); seq.push(S.wx.cur); }
    window.advanceWx = adv;
    const rainDays = seq.slice(0, 7).filter(k => k === 'rain').length;
    o.wxSlow = changes === 3 && rainDays >= 2 && rainDays <= 3 && seq[0] === 'rain' && seq[6] !== 'rain';
    // 재정 항목 설명
    S.t = WEEK - .001; weekEnd(); o.why = ['offering', 'opex', 'supply', 'pay'].every(k => rcptWhy(S.rcpt, k).indexOf('<li>') === 0);
    return o;
  });
  check(r.ramp1 && r.ramp2 && r.rampBad, '지형: 흙 경사로 (두 층 이상 높은 쪽으로는 못 냄)');
  check(r.rampAuto && r.rampUndo, '지형: 경사로 쪽 땅이 낮으면 한 층 높여 주고 값 합산, 되돌리기 가능');
  check(r.levelBad, '지형: 높이가 다른 칸·경사로에 걸쳐서는 못 지음');
  check(r.built && r.onTop, '지형: 높인 땅 위에 건물을 지음');
  check(r.reach && r.climb, '지형: 방문자가 경사로로 고원 위 건물에 닿음');
  check(r.cliff && r.undo, '지형: 경사로가 없으면 절벽이라 못 오르고, 되돌리면 다시 닿음');
  check(r.bldUp, '지형: 땅을 높이면 건물(모든 칸)이 함께 오름');
  check(r.cap, '지형: 땅 높이와 건물 층수를 합쳐 10층 제한');
  check(r.stair && r.stairUp, '지형: 철골 계단으로 높인 땅에 오름' + (r.stair && r.stairUp ? '' : ' ' + r.dbg));
  check(r.pieceMoved, '지형: 땅에 놓인 길이 땅과 함께 움직임');
  check(r.pick, '지형: 화면에서 높인 땅의 윗면을 누르면 그 칸이 잡힘');
  check(r.saved, '지형: 저장·불러오기 후에도 높이 유지');
  check(r.wear, '노후: 단계마다 표시가 바뀌고 효율이 90·75·55%로 떨어짐');
  check(r.park, '주차: 주차장·소형 주차장·주차 타워·자전거 거치대가 주차 분류에');
  check(r.wxSlow, '날씨: 한 주에 한 번 정해지고, 비는 2~3일 뒤 그침');
  check(r.why, '재정: 항목마다 계산 방식 설명이 있음');
  check(errs.length === 0, '지형: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

/* ---------- 데크 위에 짓기 ---------- */
async function deckChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
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
    window.__ct.init(); S.money = 999999; S.goal = GOALS.length; S.dlg = null; S.open = true;
    S.buildings = S.buildings.filter(b => b.def !== 'tree'); rebuildOcc(); recalc();
    const o = {};
    // 높이 1 데크 4x3 (x 20..23, y 6..8), 앞쪽(+y)에서 철골 계단으로 오른다
    for (let x = 20; x < 24; x++) for (let y = 6; y < 9; y++) addPiece({ x: x, y: y, l: 1, s: 0, d: 0, k: 'stone' });
    addPiece({ x: 21, y: 9, l: 0, s: 1, d: 3, k: 'stone' });
    // 계단 아래에서 기존 바닥까지
    const t = walkSearch(21, 10, {}); (t || []).forEach(q => { S.floor[q.x + ',' + q.y] = 'f_block'; }); paintFloor(21, 10, 'f_block'); recalc();
    o.level = placeLevel(D.chapel, 20, 6, 2).l === 1 && placeLevel(D.chapel, 20, 6, 2).deck;
    o.half = !!placeLevel(D.chapel, 22, 6, 2).why;
    o.built = build('cafe', 22, 6, 2);
    const cafe = S.buildings.find(b => b.def === 'cafe');
    o.onDeck = !!cafe && cafe.z === 1 && bLevel(cafe) === 1;
    o.reach = !!(cafe.acc && cafe.acc.ok);
    o.covered = deckCovered(piecesAt(22, 6)[0]) && !nodeOk(PN + piecesAt(22, 6)[0].id);
    o.noDem = pieceDemWhy(piecesAt(22, 6)[0]) !== '' && !removePiece(piecesAt(22, 6)[0].id, .5);
    // 데크 아래 땅은 그대로 걸을 수 있다
    paintFloor(22, 7, 'f_block'); o.under = groundOk(22, 7) || !!S.floor['22,7'];
    // 나무·칸 건물·바닥 타일도 데크 위에
    o.tree = build('tree', 20, 8, 2) && S.buildings.find(b => b.def === 'tree' && b.x === 20).z === 1;
    o.room = placeTile(20, 6, 'mroom') && roomAt(20, 6).z === 1;
    const dp = piecesAt(21, 6)[0]; o.tile = paintFloor(21, 6, 'f_brick', dp.id) === '' && dp.f === 'f_brick' && floorUndo() && !dp.f;
    // 땅 높이 + 층수 10층 제한 (데크 높이 1 → 9층까지)
    build('pray', 23, 8, 2); const pr = S.buildings.find(b => b.def === 'pray' && b.z === 1);
    for (let k = 0; k < 12; k++) addFloor(pr);
    o.cap = !!pr && (pr.floors || 1) === 9;
    // 옮기기: 데크에서 땅으로 옮기면 z가 사라진다
    const tr = S.buildings.find(b => b.def === 'tree' && b.x === 20);
    setPlaceLevel(tr, D.tree, 5, 3, 2); tr.x = 5; tr.y = 3; rebuildOcc(); o.moved = tr.z == null;
    draw(); ROT = 2; draw(); ROT = 0;
    save(); const L = load(); o.saved = L.buildings.some(b => b.def === 'cafe' && b.z === 1);
    // 바닥 타일을 누르면 카드가 뜨고 바로 바꾼다 (걷어낸 반값을 뺀 값)
    S.floor['8,4'] = 'f_block'; recalc(); UI.fold = true; UI.tool = null;
    const fm = rotPt(8.5, 4.5), fq = toScreen(fm[0], fm[1], 0); onTap(fq[0], fq[1]);
    const card = !document.getElementById('selCard').hidden && !!document.querySelector('#selCard [data-act="fswap"][data-v="f_wood"]');
    const m2 = S.money; document.querySelector('#selCard [data-act="fswap"][data-v="f_wood"]').click();
    o.fcard = card && S.floor['8,4'] === 'f_wood' && m2 - S.money === D.f_wood.cost - Math.floor(D.f_block.cost * .5);
    // 바꾸면 바닥 깔기로 넘어가 화살표 쪽 다음 칸에서 이어 바꾼다 (기존 바닥 위는 걷어낸 반값을 뺀 값)
    o.fchain = isPlacing() && UI.tool === 'f_wood' && !!UI.ghost && Math.abs(UI.ghost.x - 8) + Math.abs(UI.ghost.y - 4) === 1;
    S.floor[UI.ghost.x + ',' + UI.ghost.y] = 'f_block'; const m4 = S.money; plOk();
    o.fchain = o.fchain && S.money === m4 - (D.f_wood.cost - Math.floor(D.f_block.cost * .5));
    endPlace(); UI.fold = true;
    const m3 = S.money; o.ferase = floorSwap(8, 4, 'f_erase') === '' && !S.floor['8,4'] && S.money - m3 === Math.floor(D.f_wood.cost * .5);
    // 빈 땅을 누르면 바닥·땅 높이기·경사로 카드, 높이기를 누르면 바로 한 층
    closeSelCard(); const em = rotPt(6.5, 2.5), eq = toScreen(em[0], em[1], 0); onTap(eq[0], eq[1]);
    const gcard = !document.getElementById('selCard').hidden && !!document.querySelector('#selCard [data-act="gter"]') && !!document.querySelector('#selCard [data-act="gramp"]') && !!document.querySelector('#selCard [data-act="fswap"]');
    document.querySelector('#selCard [data-act="gter"]').click();
    o.gcard = gcard && th(6, 2) === 1;
    // 카드가 열린 채 빈 땅을 누르면 닫기만 한다
    const om = rotPt(9.5, 2.5), oq = toScreen(om[0], om[1], 0); onTap(oq[0], oq[1]); o.gclose = document.getElementById('selCard').hidden;
    document.querySelector('#selCard') && closeSelCard();
    // 건축 목록: 지금 지을 수 있는 것부터 싼 순서
    S.money = 1000; const ord = buildOrder('worship'), can = d => !isLocked(d.id) && S.money >= d.cost;
    const k = ord.findIndex(d => !can(d)); o.order = ord.slice(0, k < 0 ? ord.length : k).every((d, i, a) => !i || a[i - 1].cost <= d.cost) && (k < 0 || ord.slice(k).every(d => !can(d)));
    S.money = 999999;
    // 방문자: 새 건물에 끌리고, 발길이 적은 바닥을 골라 둘러본다
    o.novel = novelty(cafe) > novelty(Object.assign({}, cafe, { bw: S.week - 20, uses: 50 }));
    recalc(); const W = NAV.walk; W.forEach(n => { TRAF[n] = 50; }); const fresh = W[W.length - 1]; delete TRAF[fresh];
    let hits = 0; for (let i = 0; i < 60; i++) if (wanderGoal({ x: 15, y: 20, node: gateNode() }) === fresh) hits++;
    o.wander = W.length > 5 && hits > 0;
    return o;
  });
  check(r.level && r.half, '데크: 데크 위 높이를 고르고, 데크 밖으로 걸치면 못 지음');
  check(r.built && r.onDeck, '데크: 데크 위에 건물을 지음');
  check(r.reach, '데크: 방문자가 계단·데크로 데크 위 건물에 닿음');
  check(r.covered && r.noDem, '데크: 건물 밑 데크는 걸을 수 없고, 철거하려 하면 막고 이유를 알려 줌');
  check(r.under, '데크: 데크 아래 땅에 바닥을 깔 수 있음');
  check(r.tree && r.room && r.tile, '데크: 나무·칸 건물·바닥 타일도 데크 위에');
  check(r.cap, '데크: 데크 높이와 층수를 합쳐 10층 제한');
  check(r.moved && r.saved, '데크: 땅으로 옮기면 데크 높이가 풀리고, 저장 후에도 유지');
  check(r.fchain, '바닥: 카드에서 바꾸면 화살표가 떠서 다음 칸을 이어 바꿈 (걷어낸 반값을 뺀 값)');
  check(r.fcard && r.ferase, '바닥: 타일을 누르면 카드에서 바로 바꾸고(걷어낸 반값을 뺀 값) 걷어낼 수 있음');
  check(r.order, '건축 목록: 지금 지을 수 있는 것부터 싼 순서로');
  check(r.gcard && r.gclose, '빈 땅: 누르면 바닥·땅 높이기·경사로 카드, 카드가 열려 있으면 닫기만');
  check(r.novel && r.wander, '방문자: 새 건물에 끌리고, 발길이 적은 바닥으로 둘러봄');
  check(errs.length === 0, '데크: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

// 방문자 불편·만족도 설명·길 잇기 바닥 고르기·가격
async function gripeChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 7;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.dlg = null; S.open = true;
    const o = {};
    // 예배 공간: 문이 열린 동안 마지막 예배 공간은 철거 못 하고, 없으면 문을 못 연다
    S.open = true; const hall = S.buildings.find(b => isHall(b)); UI.sel = hall.id;
    o.hall = !!hall && lastHallWhy(hall) !== '' && gateWhy() === '';
    { const bt = document.createElement('button'); bt.dataset.act = 'demolish'; document.body.appendChild(bt); onPanel({ target: bt }); bt.remove(); }
    o.hall = o.hall && !!bById(hall.id);
    S.open = false; o.hall = o.hall && gateWhy() === '' && lastHallWhy(hall) === '';
    const keepB = S.buildings.slice(); S.buildings = S.buildings.filter(b => !isHall(b)); rebuildOcc(); recalc();
    setGate(true); o.hall = o.hall && !S.open && /예배 공간/.test(gateWhy());
    S.buildings = keepB; rebuildOcc(); recalc(); setGate(true); o.hall = o.hall && S.open; UI.sel = null;
    // 가격: 기능 건물 1.5배, 꾸미기는 그대로, 초기 자금 두 배
    // 새 교회: 만족도 항목이 모두 50% 안팎에서 시작하고, 전체도 45~55
    { const c = S.cov; o.start50 = ['seat', 'spirit', 'past', 'fel', 'park', 'care', 'comf'].every(k => c[k] >= 0.4 && c[k] <= 0.6) && S.mood >= 40 && S.mood <= 58 && BLD_SAT === 0.6 && MOOD_LEAVE === 45 && MOOD_GAIN === 50;
      o.start50d = ['seat', 'spirit', 'past', 'fel', 'park', 'care', 'comf'].map(k => k + Math.round(c[k] * 100)).join(' ') + ' mood' + Math.round(S.mood); }
    o.price = S.money === 20000 && DIFF.hard.money === 14000 && D.wc.cost === 720 && D.chapel.cost === 5600 && D.bench.cost === 160 && D.tree.cost === 110 && D.f_block.cost === 15 && MROOM.floorCost === 1000 && GOALS[0].r === 800 && LOANS.big.amt === 40000;
    // 편의 소품: 벤치·쓰레기통·식수대 등은 편의 분류, 값은 그대로, 꾸미기처럼 이어 놓기
    o.props = ['bench', 'picnic', 'parasol', 'swing', 'sunbed', 'drinkfount', 'bin', 'gazebo'].every(id => D[id].cat === 'comfort' && D[id].prop && isDecoCat(D[id])) && D.bin.cost === 50 && D.gazebo.cost === 900 && !isDecoCat(D.wc);
    S.money = 999999; S.goal = GOALS.length; recalc();
    const put = id => { for (let y = PZ - 3; y > 0; y--) for (let x = 2; x < COLS - 3; x++) if (canPlace(D[id], x, y, 2)) { build(id, x, y, 2); const nb = S.buildings[S.buildings.length - 1]; recalc(); return nb; } return null; };
    // 길 잇기: 고른 바닥으로 깔고 값은 칸 수 × 그 바닥 값
    const cafe = put('cafe'); const lp = linkPlan(cafe), m0 = S.money;
    UI.sel = cafe.id; UI.fold = true; renderSelCard();
    document.querySelector('#selCard [data-act="link"]').click();
    const row = [...document.querySelectorAll('#selCard [data-act="linkf"]')].map(b => b.dataset.v);
    document.querySelector('#selCard [data-act="linkf"][data-v="f_brick"]').click();
    o.link = lp.tiles.length > 0 && row.length === FLOOR_IDS.length && usable(cafe) && m0 - S.money === lp.tiles.length * D.f_brick.cost && lp.tiles.every(t => S.floor[t.x + ',' + t.y] === 'f_brick');
    UI.sel = null; closeSelCard && closeSelCard();
    // 화장실: 급한데 없으면 불편 + 일찍 돌아감, 있으면 찾아간다
    S.grip = {}; spawnV(false); const v = V[V.length - 1]; v.urge = 'wc'; v.life = 50;
    o.noWc = urgeGo(v) === false && S.grip.wc === 1 && v.life <= 3 && v.annoy === 1 && !v.urge;
    // 문 앞에서 길을 이을 수 있는 자리를 찾을 때까지 (못 이으면 철거하고 다음 자리)
    let wc = null;
    for (let y = PZ - 3; y > 0 && !wc; y--) for (let x = 2; x < COLS - 3 && !wc; x++) if (canPlace(D.wc, x, y, 2)) {
      build('wc', x, y, 2); const nb = S.buildings[S.buildings.length - 1]; recalc(); linkDoor(nb); recalc();
      if (usable(nb)) wc = nb; else { demolish(nb.id); recalc(); } }
    spawnV(false); const v2 = V[V.length - 1]; v2.urge = 'wc';
    o.goWc = usable(wc) && urgeGo(v2) === true && v2.target === wc.id;
    enter(v2, wc); finishVisit(v2); o.goWc = o.goWc && !v2.urge && v2.wcT > 1e8;
    // 쓰레기: 매장에서 사고 쓰레기통이 없으면 떠날 때 불편
    spawnV(false); const v3 = V[V.length - 1]; v3.wallet = 30; enter(v3, cafe); finishVisit(v3);
    // 먹을 것을 사면 절반쯤은 쓰레기가 생긴다
    let tr = 0; for (let i = 0; i < 40; i++) { const t = { trash: false }; gripeBought(t, cafe); if (t.trash) tr++; }
    v3.trash = true; depart(v3); o.trash = tr > 8 && tr < 32 && S.grip.bin === 1;
    // 다리: 오래 걸으면 쉴 자리를 찾는다
    spawnV(false); const v4 = V[V.length - 1]; gripeTick(v4, .1, 99); o.legs = v4.urge === 'seat' || v4.urge === 'drink';
    // 주일 정산: 불편 비율만큼 다음 주 만족도가 내려가고, 챙길 일에 무엇을 지을지 보인다
    S.grip = { wc: 6, seat: 4 }; S.gripN = 20; gripeWeek(); recalc();
    o.pen = S.gripPen === 4.6 && MOD.parts.some(p => /불편/.test(p[0]) && p[1] === -4.6);
    o.warn = warnings().some(t => /화장실을 못 찾은 방문자 6명 → 화장실/.test(t)) && warnings().some(t => /쉴 곳/.test(t));
    // 배고픔·외로움: 맞는 건물을 찾아가고, 없으면 불편
    o.ids = new Set(DEFS.map(d => d.id)).size === DEFS.length;
    S.grip = {}; spawnV(false); const v5 = V[V.length - 1]; v5.urge = 'lonely';
    o.lonely0 = urgeGo(v5) === false && S.grip.lonely === 1;
    let club = null;
    for (let y = PZ - 3; y > 0 && !club; y--) for (let x = 2; x < COLS - 3 && !club; x++) if (canPlace(D.boardgame, x, y, 2)) {
      build('boardgame', x, y, 2); const nb = S.buildings[S.buildings.length - 1]; recalc(); linkDoor(nb); recalc();
      if (usable(nb)) club = nb; else { demolish(nb.id); recalc(); } }
    spawnV(false); const v6 = V[V.length - 1]; v6.urge = 'lonely';
    o.lonely1 = !!club && urgeGo(v6) === true && v6.target === club.id && v6.want === 'fel';
    enter(v6, club); finishVisit(v6); o.lonely1 = o.lonely1 && !v6.urge && v6.lonT > 1e8;
    spawnV(false); const v7 = V[V.length - 1]; v7.urge = 'food'; const fb = urgeGo(v7);
    o.food = fb === true && GRIPES.food.ids.indexOf(bById(v7.target).def) >= 0;
    // 고루 쓰기: 같은 욕구를 채우는 두 건물 중 이번 주에 덜 쓰인 쪽을 고른다
    const pick = () => { let a = 0; for (let i = 0; i < 12; i++) { spawnV(false); const w = V[V.length - 1]; w.wallet = 0; w.urge = ''; w.wcT = w.foodT = w.lonT = 1e9; NEEDS.forEach(n => { w.needs[n] = 99; }); w.needs.fel = 0; decide(w); if (w.target === cafe.id) a++; V.pop(); } return a; };
    club.weekUses = 60; cafe.weekUses = 0; club.inUse = cafe.inUse = 0; const toCafe = pick();
    club.weekUses = 0; cafe.weekUses = 60; const toCafe2 = pick(); club.weekUses = cafe.weekUses = 0;
    o.spread = toCafe >= 9 && toCafe2 <= 3 && NEED_OK >= 85 && WAIT_T < 5 && CROWD_ANNOY > 1 && GRIPE_W.crowd >= 1;
    o.fixes = gripeFixes(D.boardgame).includes('외로움') && gripeFixes(D.cell).includes('외로움') && gripeFixes(D.bakery).includes('배고픔') && gripeFixes(D.cafe).includes('목마름') && /외로움/.test(effText(D.futsal));
    // 소모임 분류: 제목 줄에 운동·취미·음악 칩, 고른 묶음만 목록에
    o.club = CATS.some(c => c[0] === 'club') && D.gym.cat === 'club' && D.gym.sub === 'sport' && OUTDOOR.indexOf('court') >= 0 && PRICY_CATS.indexOf('club') >= 0;
    UI.tab = 'build'; UI.fold = false; UI.cat = 'club'; UI.csub = 'sport'; UI.tool = null; renderPanel();
    const subs = [...document.querySelectorAll('#subtabs [data-act="csub"]')].map(b => b.dataset.v).join();
    const sport = [...document.querySelectorAll('#cards .card')].map(c => c.dataset.v);
    document.querySelector('#subtabs [data-act="csub"][data-v="music"]').click();
    const music = [...document.querySelectorAll('#cards .card')].map(c => c.dataset.v);
    o.club = o.club && subs === 'sport,hobby,music' && sport.includes('futsal') && sport.includes('gym') && !sport.includes('choir') && music.length === 3 && music.includes('choir');
    UI.cat = 'worship'; renderPanel(); o.club = o.club && !document.querySelector('#subtabs [data-act="csub"]');
    UI.fold = true; renderPanel();
    // 만족도 항목을 누르면 계산 방식이 펼쳐진다
    UI.tab = 'status'; UI.statusTab = 'status'; UI.fold = false; renderPanel(); renderStatus();
    const rows = document.querySelectorAll('#panel .covb').length;
    document.querySelector('#panel .covb[data-v="seat"]').click();
    const seat = document.querySelector('#panel ul.rwhy'); const st = seat ? seat.textContent : '';
    document.querySelector('#panel .covb[data-v="all"]').click();
    const al = (document.querySelector('#panel ul.rwhy') || {}).textContent || '';
    o.mood = rows === 8 && /좌석 건물 \d+ ÷ 필요/.test(st) && /비중 20%/.test(st) && /항목 점수/.test(al) && /불편/.test(al) && /익숙해져요/.test(al);
    ['past', 'fel', 'care', 'comf', 'park', 'spirit'].forEach(k => { o.mood = o.mood && moodWhy(k).indexOf('<li>') === 0; });
    o.mood = o.mood && /성례/.test(moodWhy('spirit')) && /비중 25%/.test(moodWhy('spirit'));
    // 영성: 성찬식을 열면 성례가 차고, 8주가 지나면 사라진다
    S.evW = {}; const s0 = spiritParts().s; S.week = 20; S.evW.communion = 20; const s1 = spiritParts(); S.week = 28; const s2 = spiritParts();
    o.spirit = s0 === 0 && s1.sac.communion === 1 && s1.s > 0.5 && s2.sac.communion === 0 && Math.abs(Object.values(MW).reduce((a, b) => a + b, 0) - 1) < 1e-9;
    S.evW = {}; S.ev = {}; S.money = 99999; runEvent('communion'); o.spirit = o.spirit && S.evW.communion === S.week;
    // 기대치: 300명이면 필요 1.6배
    const lv0 = S.lvl; S.lvl = 1; o.expect = Math.abs(expectK(300) - 1.6) < 1e-9 && expectK(0) === 1;
    S.lvl = 31; o.expect = o.expect && Math.abs(expectK(0) - 1.45) < 1e-9; S.lvl = lv0;
    // 보너스 넘침 막기: 항목이 모두 100%여도 항목 점수는 85, 나머지는 보너스로
    recalc(); o.expect = o.expect && MOOD_ITEMS === 85 && S.cov.items <= 1 && Math.abs(S.mood - Math.min(100, Math.max(0, MOOD_ITEMS * S.cov.items + S.cov.bonus + S.cov.malus))) < 1e-6;
    // 익숙해짐: 꾸밈을 새로 지으면 fresh가 쌓이고, 주마다 15%씩 줄어든다
    S.fresh = 0; let fl = null; for (let y = 2; y < PZ - 2 && !fl; y++) for (let x = 2; x < COLS - 2 && !fl; x++) if (canPlace(D.fountain, x, y, 2)) { build('fountain', x, y, 2); fl = 1; }
    const f1 = S.fresh; S.evtLeft = 2; weekEnd(); o.fresh = f1 === D.fountain.beauty && Math.abs(S.fresh - f1 * 0.85) < 1e-9;
    // 평판: 100에서 저절로 내려온다
    S.rep = 100; S.evtLeft = 2; weekEnd(); o.rep = S.rep < 97;
    // 평판은 높을수록 덜 오르고(행사·주간 효과 모두), 좋은 보너스는 합쳐서 +15까지만
    S.rep = 20; gainRep(6); const lowGain = S.rep - 20; S.rep = 90; gainRep(6); const hiGain = S.rep - 90; S.rep = 50; gainRep(-3);
    o.rep = o.rep && lowGain === 6 && hiGain < 1.5 && hiGain > 0 && S.rep === 47 && REP_MOOD0 === 50;
    S.tempMood = 40; recalc(); o.bonusCap = S.cov.bonus === BONUS_MAX && S.cov.bonusRaw > BONUS_MAX && Math.abs(S.mood - Math.min(100, MOOD_ITEMS * S.cov.items + BONUS_MAX + S.cov.malus)) < 1e-6;
    S.tempMood = -10; recalc(); o.bonusCap = o.bonusCap && S.cov.malus <= -10; S.tempMood = 0; recalc();
    // 성도들의 바람: 생기면 챙길 일 맨 위에 뜨고, 들어주면 보상·놓치면 벌점
    S.money = 99999; S.wish = null; S.wishNext = S.week; S.wishOk = S.wishFail = 0; S.wishLeft = 0; S.wishMood = 0; S.evtLeft = 2; wishWeek();
    const w1 = S.wish; o.wish = !!w1 && warnings()[0].indexOf('성도들의 바람') === 0 && w1.due === S.week + WISH_DUE;
    if (w1) { const rp0 = S.rep; if (w1.t === 'event') { S.ev[w1.id] = { cd: 0, left: 0 }; S.newSinceBap = 9; runEvent(w1.id); }
      else { let done = false; for (let y = 1; y < ROWS && !done; y++) for (let x = 1; x < COLS - 5 && !done; x++) if (canPlace(D[w1.id], x, y, 2)) done = build(w1.id, x, y, 2); }
      wishTick(); o.wish = o.wish && !S.wish && S.wishOk === 1 && S.wishMood === WISH_GOOD && S.wishLeft === WISH_FX_WEEKS && MOD.parts.some(p => /바람을 들어줌/.test(p[0]) && p[1] === WISH_GOOD) && S.wishNext > S.week; }
    S.wishNext = S.week; wishWeek(); const w2 = S.wish; if (w2) { S.week = w2.due + 1; wishWeek(); }
    o.wish = o.wish && !!w2 && S.wishFail === 1 && S.wishMood === WISH_BAD && MOD.parts.some(p => /바람을 놓침/.test(p[0])); S.wish = null; S.wishLeft = 0; S.wishMood = 0;
    // 매너리즘: 새로 한 일이 없으면 내려가고, 새로 지으면 풀린다
    S.lastNew = S.week - (STALE_AFTER + 3); recalc(); const st1 = stalePen(), stPart = MOD.parts.some(p => /매너리즘/.test(p[0]) && p[1] === -st1);
    S.lastNew = S.week - 99; const stMax = stalePen();
    { let done = false; for (let y = 1; y < PZ - 2 && !done; y++) for (let x = 1; x < COLS - 2 && !done; x++) if (canPlace(D.flower, x, y, 2)) done = build('flower', x, y, 2); }
    o.stale = st1 === 3 * STALE_STEP && stPart && stMax === STALE_MAX && stalePen() === 0 && S.lastNew === S.week;
    S.buildings.forEach(b => { b.bw = -1; });   // 뒤의 검사가 '이번 주에 지은 건물'에 흔들리지 않게
    // 교회 Level: 점수 기준으로 오르고, 돈을 써도 내려가지 않으며, 최대 100
    o.level = levelOf(0) === 1 && levelOf(lvNeed(2)) === 2 && levelOf(lvNeed(37)) === 37 && levelOf(1e12) === 100 && lvNeed(2) < lvNeed(3);
    for (let L = 2; L < 100; L++) if (levelOf(lvNeed(L) - 1) !== L - 1) o.level = false;
    S.lvl = 1; S.money = 1e6; levelTick(); const up = S.lvl, shown = !document.getElementById('lvup').hidden && document.getElementById('lvN').textContent === String(up);
    S.money = 0; levelTick(); o.level = o.level && up > 5 && shown && S.lvl === up && document.getElementById('clvl').textContent === 'Lv ' + up;
    document.getElementById('lvup').click(); o.level = o.level && document.getElementById('lvup').hidden;
    // 새는 길 막기: 대출·'짓고 되돌리기'로는 점수가 오르지 않고, 바닥을 깔고 되돌리면 꾸밈 효과도 되돌아간다
    S.money = 30000; S.loans = []; const sc0 = scoreParts(); S.goal = GOALS.length; S.rep = 90; S.members = 200; borrow('small'); const sc1 = scoreParts();
    o.leak = S.loans.length === 1 && Math.abs(sc1.money - sc0.money) < 1e-6; S.loans = [];
    const av0 = assetValue(); let nb2 = null; for (let y = 2; y < PZ - 3 && !nb2; y++) for (let x = 2; x < COLS - 3 && !nb2; x++) if (canPlace(D.cafe, x, y, 2)) { build('cafe', x, y, 2); nb2 = S.buildings[S.buildings.length - 1]; }
    o.leak = o.leak && assetValue() === av0; S.week++; o.leak = o.leak && assetValue() === av0 + D.cafe.cost; S.week--; demolish(nb2.id);
    let fc = null; for (let y = 2; y < PZ - 3 && !fc; y++) for (let x = 2; x < COLS - 3 && !fc; x++) if (!floorWhy(x, y, 'f_clover')) fc = [x, y];
    UI.undo = []; const fr0 = S.fresh, mo0 = S.money; paintFloor(fc[0], fc[1], 'f_clover'); const frUp = S.fresh > fr0; floorUndo();
    o.leak = o.leak && frUp && Math.abs(S.fresh - fr0) < 1e-9 && S.money === mo0 && levelOf(NaN) === 1;
    // 문이 열린 동안 마지막 예배 공간은 되돌리기로도 못 없앤다
    { const hs = S.buildings.filter(isHall); S.open = true; o.leak = o.leak && (hs.length !== 1 || !canUnbuild({ bid: hs[0].id, w: S.week, cost: 0 })); }
    return o;
  });
  check(r.start50, '새 교회: 만족도 항목이 50% 안팎에서 시작, 건물 효과는 60%만, 이탈 45·소개 50 기준 (' + r.start50d + ')');
  check(r.price, '가격: 초기 자금 20,000, 기능 건물·칸 위층·목표 보상·대출 2배, 꾸미기·바닥은 그대로');
  check(r.props, '편의 소품: 벤치·피크닉·파라솔·그네·선베드·식수대·쓰레기통·정자는 편의 분류, 값 그대로, 이어 놓기');
  check(r.link, '길 잇기: 카드에서 바닥 종류를 골라 그 바닥으로 깔고, 값은 칸 수 × 그 바닥 값');
  check(r.noWc && r.goWc, '불편: 화장실이 급하면 찾아가고, 없으면 불편을 겪고 일찍 돌아감');
  check(r.trash && r.legs, '불편: 매장에서 산 뒤 쓰레기통이 없으면 불편, 오래 걸으면 쉴 자리·마실 것을 찾음');
  check(r.pen && r.warn, '불편: 지난주 불편 비율만큼 만족도가 내려가고, 챙길 일에 지을 것이 보임');
  check(r.mood, '현황: 만족도 항목을 누르면 계산 방식이 펼쳐짐 (영성 포함 8줄)');
  check(r.spirit, '영성: 성찬식 등 성례를 열면 오르고 시간이 지나면 줄어듦, 만족도 비중 합 1');
  check(r.expect && r.fresh, '만족도: 성도 수·교회 Level만큼 기대치가 오르고, 항목은 85까지(나머지는 보너스), 새로 꾸민 효과는 익숙해짐');
  check(r.rep, '평판: 100에서 저절로 내려오고, 높을수록 덜 오름');
  check(r.bonusCap, '만족도: 좋은 보너스는 합쳐서 +15까지만, 나쁜 것은 그대로 깎음');
  check(r.wish, '성도들의 바람: 챙길 일 맨 위에 뜨고, 들어주면 만족·평판 보상, 기한을 넘기면 벌점');
  check(r.stale, '매너리즘: 새로 한 일이 없으면 만족도가 내려가고, 새로 지으면 풀림');
  check(r.leak, '새는 길: 대출·짓고 되돌리기로 Level이 오르지 않고, 바닥 되돌리기는 꾸밈 효과도 되돌림, 마지막 예배 공간은 되돌리기로도 못 없앰');
  check(r.level, '교회 Level: 점수로 오르고(최대 100) 내려가지 않음, 오르면 큰 배지가 뜨고 이름 옆에 보임');
  check(r.ids, '건물 정의: id가 겹치지 않음');
  check(r.hall, '예배 공간: 없으면 문을 못 열고, 문이 열린 동안 마지막 예배 공간은 철거 못 함');
  check(r.lonely0 && r.lonely1 && r.food, '불편: 외로운 방문자는 소모임을, 배고픈 방문자는 먹을 곳을 찾아가고, 없으면 불편');
  check(r.spread, '방문자: 이번 주에 덜 쓰인 건물을 골라 고루 쓰고, 꽉 차서 오래 기다리면 크게 불만');
  check(r.fixes, '불편: 건물 설명에 무엇을 풀어 주는지 보임 (외로움·배고픔·목마름)');
  check(r.club, '소모임: 운동·취미·음악 칩이 제목 줄에, 고른 묶음만 목록에 (체육관은 운동으로)');
  check(errs.length === 0, '불편: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
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
    await terrainChecks(browser, url);
    await deckChecks(browser, url);
    await gripeChecks(browser, url);
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

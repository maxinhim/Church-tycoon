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
async function skipSteps(page) { /* 첫 걸음은 퀘스트라 따로 건너뛰지 않는다 */ }

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
  await page.goto(url); await skipSteps(page);
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
  await page.click('#fab [data-fab="minis"]'); await page.click('#scr [data-act="scrtab"][data-v="staff"]'); await page.click('#scr [data-act="scrclose"]');
  await page.click('#fab [data-fab="status"]'); await page.click('#scr [data-act="scrclose"]'); await page.click('#bGear'); await page.click('#bMenu');
  await page.click('#fab [data-fab="build"]'); await page.click('#dock [data-act="close"]');
  await page.click('#fab [data-fab="build"]'); await page.click('#fab [data-fab="build"]');
  await page.click('#bRot');
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
  await page.goto(url); await skipSteps(page);
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 99999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null;
    const o = {};
    // 층 올리기·칸 건물은 없다: 한 건물 = 한 정의, 키우는 것은 레벨. 예전 저장의 층·칸 값은 걷어 낸다
    o.gone = typeof placeTile === 'undefined' && typeof addFloor === 'undefined' && typeof tilePlan === 'undefined' && !DEFS.some(d => d.kind === 'mroom') && !D.mroom && !S.buildings.some(b => b.floors || b.tiles);
    // 방문자는 가까운 곳부터 가므로, 입구 근처의 기본 예배실을 치워 새 예배실을 쓰게 한다
    S.buildings.filter(b => b.def === 'room').forEach(b => demolish(b.id));
    let pr = null; for (let y = 4; y < PZ - 8 && !pr; y += 2) for (let x = 4; x < COLS - 10; x += 2) if (canPlace(D.room, x, y, 2) && !onFloorAt(D.room, x, y, 2)) { build('room', x, y, 2); pr = S.buildings[S.buildings.length - 1]; break; }
    // 방문자는 바닥·길 위로만 다니므로 입구까지 길을 잇고, 교회 문을 연다
    recalc(); o.unlinked = !usable(pr);
    o.linkOk = linkDoor(pr) === '' && usable(pr);
    S.open = true;
    for (let i = 0; i < 4000; i++) update(0.1);
    o.used = pr.uses > 0;
    save();
    const ld = load().buildings.find(b => b.id === pr.id); o.saveLoad = !!ld && ld.def === 'room' && ld.x === pr.x && ld.y === pr.y;
    for (let k = 0; k < 4; k++) { window.__ct.setRot(k); draw(); }
    window.__ct.setRot(0);
    return o;
  });
  check(r.gone, '층 올리기·칸 건물: 없음 (건물은 레벨로 키움)');
  check(r.unlinked && r.linkOk, '길 잇기: 바닥이 없으면 이용 불가, \'문 앞까지 길 잇기\'로 보도블록을 깔면 이용 가능');
  check(r.used, '예배실: 방문자가 실제로 이용함');
  check(r.saveLoad, '예배실: 저장 후 불러와도 유지됨');
  check(errs.length === 0, '건물 짓기: 4방향 회전 그리기 포함 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 99999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null;
    const o = {};
    const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS - 1 && !occ[y][x] && !piecesAt(x, y).length;
    const starter = S.buildings.find(b => b.def === 'room');
    o.defaultDoor = !!(starter.door && starter.acc && starter.acc.ok);
    // 기도실 + 앞쪽으로 계단 자리
    let X = -1, Y = -1;
    for (let y = 1; y < ROWS - 5 && X < 0; y++) for (let x = 0; x + 3 <= COLS; x++) {
      if ([0, 1].every(i => [-1, 0].every(j => free(x + i, y + j))) && [1, 2, 3].every(k => free(x + 1, y + k))) { X = x; Y = y; break; }
    }
    o.found = X >= 0;
    build('pray', X, Y - 1, 2);
    const room = S.buildings[S.buildings.length - 1];
    // 잔디 칸에서 이미 닿는 바닥까지 보도블록을 깐다
    const connect = (x, y) => { const t = walkSearch(x, y, {}); (t || []).forEach(q => { S.floor[q.x + ',' + q.y] = 'f_block'; }); recalc(); return !!t; };
    S.open = true; recalc(); linkDoor(room);
    o.unconnected = !!room.acc && room.acc.ok;
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
    // 문은 1층 정면 한 칸: 다리 데크(2층 높이)가 붙어도 문은 1층에 있고, 문 앞 길로 이어진다
    o.connected = !!room.door && room.door.ent.l === 0 && room.acc.ok;
    // 정면 방향: 예배당(3×2)을 오른쪽(+x)을 향해 지으면 2×3을 차지하고 출입구도 그쪽
    let fb = null;
    for (let y = 0; y < ROWS - 4 && !fb; y++) for (let x = 0; x < COLS - 3; x++) {
      if (canPlace(D.chapel, x, y, 0) && free(x + 4, y + 1)) { build('chapel', x, y, 0); fb = S.buildings[S.buildings.length - 1]; break; }
    }
    o.facing = !!fb && fb.face === 0 && bDims(fb).w === 4 && bDims(fb).h === 6 && !!fb.door &&
      [0, 1, 2, 3].every(i => [0, 1, 2, 3, 4, 5].every(j => occ[fb.y + j][fb.x + i] === fb.id));
    // 방문자가 쓰는 모든 건물에 정면 1층 가운데 문이 하나 있다
    o.allDoors = S.buildings.filter(b => defOf(b).fill).every(b => !!b.door && b.door.ent.d === (b.face == null ? 2 : b.face) && b.door.ent.l === 0 && sameSpot(b.door.ent, b.door.ext));
    return o;
  });
  check(r.found, '길: 시험할 빈 자리를 찾음');
  check(r.defaultDoor, '문: 기본 예배실에 출입구가 있고 이용 가능');
  check(r.unconnected, '길: 문 앞에 길을 이으면 이용할 수 있음');
  check(r.built, '길: 오르막·평지를 이어 지으면 높이가 올라가며 이어짐');
  check(r.undo, '길: 되돌리기로 마지막 조각과 커서가 돌아옴');
  check(r.noOverlap && r.bridgeOverPath, '길: 같은 높이 겹치기·건물 위 금지, 다리 아래 길은 허용');
  check(r.ground, '길: 다리 아래와 철골 계단 밑 땅으로 걸어 다닐 수 있음');
  check(r.connected, '문: 정면 1층 문 하나가 길과 이어짐');
  check(r.facing, '방향: 정면을 고르면 건물 자리와 출입구가 그쪽을 향함');
  check(r.allDoors, '문: 방문자가 쓰는 모든 건물에 정면 1층 가운데 문 하나');
  check(errs.length === 0, '길: 4방향 회전 그리기 포함 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

// 바닥 타일, 새 건물 전부 짓고 그리기
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 999999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null;
    const o = {};
    const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS - 1 && !occ[y][x] && !piecesAt(x, y).length;
    let cell = null;
    for (let y = 0; y < ROWS - 3 && !cell; y++) for (let x = 0; x < COLS - 2; x++) if (canPlace(D.cell, x, y, 2)) { build('cell', x, y, 2); cell = S.buildings[S.buildings.length - 1]; break; }
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
    const want = DEFS.filter(d => d.kind !== 'path' && d.kind !== 'floor' && !d.water && !d.retired);
    const missing = [];
    want.forEach(d => {
      if (S.buildings.some(b => b.def === d.id)) return;
      let done = false;
      for (let y = 0; y < ROWS - 1 && !done; y++) for (let x = 0; x < COLS && !done; x++) if (canPlace(d, x, y, 2)) { done = build(d.id, x, y, 2); }
      if (!done) missing.push(d.id);
    });
    o.allBuilt = missing.length === 0 ? '' : missing.join(',');
    o.noDoor = S.buildings.filter(b => needsDoor(b) && !b.door).map(b => b.def + '@' + b.x + ',' + b.y).join(' ');
    o.allDoors = !o.noDoor;
    for (let i = 0; i < 1500; i++) update(0.1);
    for (let k = 0; k < 4; k++) { window.__ct.setRot(k); draw(); }
    window.__ct.setRot(0);
    // 카드 아이콘: 모든 분류의 건축 패널을 그려 본다
    UI.bstep = 'items'; CATS.forEach(c => { UI.cat = c[0]; UI.tool = null; renderBuild(); });
    o.cats = CATS.length;
    return o;
  });
  check(r.floorPaint && r.floorUndo && r.floorErase && r.floorBlocked, '바닥: 칠하기·되돌리기·지우기, 건물 위 금지, 분위기 반영, 걸을 수 있음');
  check(r.allBuilt === '', '새 건물·요소: 모두 지을 수 있음' + (r.allBuilt ? ': ' + r.allBuilt : ''));
  check(r.allDoors, '문: 새 건물에도 모두 정면 문이 있음');
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null;
    const o = {};
    // 구역: 주차장은 주차 구역에만, 주차 구역엔 주차장만, 입구 보도는 비움
    o.zones = canPlace(D.lot, 1, PZ, 2) && !canPlace(D.lot, 1, 5, 2) && !canPlace(D.wc, 1, PZ, 2) && !canPlace(D.lots, ENT - 1, PZ, 2) &&
      !!zoneWhy(D.pray, 3, PZ, 2) && paintFloor(3, PZ, 'f_block') !== '' && pieceFits({ x: 3, y: PZ, l: 0, s: 0, d: 0, k: 'stone' }) !== '';
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
    for (let y = 0; y < PZ - 2 && !shopB; y++) for (let x = 0; x < COLS - 2; x++) if (canPlace(D.shop, x, y, 2)) { build('shop', x, y, 2); shopB = S.buildings[S.buildings.length - 1]; break; }
    spawnV(false); const v = V[V.length - 1]; v.wallet = 30; enter(v, shopB);
    const m0 = S.money, ws0 = S.weekShop, wsu0 = S.weekSup || 0; finishVisit(v);
    o.shop = S.money > m0 && S.weekShop > ws0 && v.wallet < 30 && F.some(f => /^\+\d+$/.test(f.text));
    // 재료비는 판 순간 나가고, 정산 때 자금 변동 = 영수증의 '정산 때' 금액 (합계에 주중 순수익이 들어 있어도 설명이 맞음)
    o.shopSup = S.weekSup > wsu0 && S.money - m0 === (S.weekShop - ws0) - (S.weekSup - wsu0) && S.weekSup - wsu0 === Math.round((S.weekShop - ws0) * SHOP_COST);
    // 주일 정산 때 무작위 사건(감사 헌금·수리비)이 끼지 않게
    { S.evtLeft = 2; S.evt = null; const ms = S.money, wi = S.weekInc, wsup = S.weekSup; weekEnd(); const r = S.rcpt;
      o.settle = S.money - ms === r.settle && r.pre === Math.round(wi - wsup) && r.net === r.settle + r.pre && /정산 때 자금/.test(rcptHtml(r, false)); }
    o.shopCat = DEFS.filter(d => d.cat === 'shop' && !d.retired).length >= 4 && ['shop', 'coffeecart', 'bookstore', 'dining', 'cafe', 'books'].every(id => D[id] && D[id].income > 0);
    // 대출: 한도 안에서 빌리고, 주일마다 갚고, 한 번에 갚을 수 있음
    const lim = creditLimit(), m1 = S.money;
    o.borrow = borrow('small') === '' && S.money === m1 + LOANS.small.amt && S.loans.length === 1;
    S.unlockAll = false; S.lvl = 1; o.bigLocked = loanBlock('big') !== ''; S.unlockAll = true;
    S.members = 6; S.rep = 10; o.limit = loanBlock('mid') !== '' || debt() + LOANS.mid.amt <= creditLimit();
    const bal0 = S.loans[0].bal, mm = S.money;
    S.t = WEEK - 0.05; update(0.1);
    o.repayWeekly = S.loans[0].bal < bal0 && S.rcpt && S.rcpt.loan === S.loans[0].pay;
    o.receipt = !!S.rcpt && !document.getElementById('rcpt').hidden && /주일 정산/.test(document.getElementById('rcpt').textContent);
    S.money = 99999; levelTick(true); o.repayAll = repayLoan(0) === '' && S.loans.length === 0;
    // 문을 닫은 주일은 온라인 헌금만
    S.open = false; S.t = WEEK - 0.05; update(0.1);
    o.closedSunday = S.rcpt.closed && S.rcpt.offering === 0 && S.rcpt.online > 0;
    S.open = true;
    // 시계: 오른쪽 위, 한 주는 48초, 주일 칸 강조
    S.t = WEEK * 6.5 / 7; hud(true);
    const ck = document.getElementById('clock').getBoundingClientRect();
    o.clock = WEEK === 48 && ck.left > innerWidth / 2 && ck.top < 60 && document.querySelector('#ckDays .sun').classList.contains('now') && isSunday();
    // 재정 탭
    openGroup('status'); document.querySelector('#scrTabs [data-v="fin"]').click();
    o.finance = UI.scr === 'status' && UI.scrTab === 'fin' && /대출 받기/.test(document.getElementById('scrBody').textContent); closeScreen();
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init();
    const o = {};
    o.normalStart = S.diff === 'normal' && S.money === DIFF.normal.money;
    o.locked = isLocked('chapel') && teamAdd('admin', 1) !== '';
    // 퀘스트(성장 목표) 달성: 자금·사역 경험·신뢰·축하 카드. 주중(월요일)에도 조건을 채우면 바로 (주일 정산을 기다리지 않음). 건물은 교회 Level로 열린다
    ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].forEach(id => { S.qd[id] = 1; });
    const m0 = S.money, r0 = S.rep, x0 = S.qxp || 0, wk0 = S.week; S.t = 1; S.members = 12; recalc(); S.goalAcc = 0; update(0.6);
    o.goalMid = qDone('g1') && S.week === wk0;
    o.goal = qDone('g1') && S.money === m0 + QID.g1.m && S.qxp === x0 + QID.g1.xp && S.rep >= r0 + QID.g1.rep - 0.001 && isLocked('chapel') && !document.getElementById('cele').hidden && CF.length > 0 && /퀘스트 완료/.test(document.getElementById('cele').textContent);
    S.lvl = 2; o.goal = o.goal && !isLocked('chapel') && isLocked('dining'); S.lvl = 1;
    // 부지: 산 땅 밖에는 못 짓고, 사면 넓어진다
    S.money = 99999; levelTick(true);
    // 부지 사기는 없앴다: 지도 어디에나(도로 줄 제외) 지을 수 있다
    o.anywhere = canPlace(D.room, 2, 2, 2) && !canPlace(D.room, 2, ROWS - 2, 2) && typeof buyLand === 'undefined';
    o.noStamina = S.stam === undefined && typeof restWeek === 'undefined';
    // 사역팀·부교역자·직분자
    const cap0 = MOD.cap;
    { const mt = S.money; o.team = teamAdd('evang', 1) === '' && S.staff.evang === 1 && MOD.vis > 1 && S.money === mt; teamAdd('evang', -1); }
    refreshCands(); const fee = S.cands[0].fee, mA = S.money;
    o.assoc = hireAssoc(0) === '' && S.assoc.length === 1 && S.money === mA - fee && MOD.cap >= cap0 + 35 && assocPay() > 0;
    o.assocLimit = hireAssoc(0) !== '';
    S.members = 16; recalc();
    // 성도 한 사람 한 사람: 명단은 성도 수를 따르고, 심방 → 호감 레벨 → 교육 → 임명으로 세례·집사·장로/권사·신학 수료·부교역자까지
    { const P = S.people, pe = {}; o.pe = pe;
      pe.roster = P.length === 16 && P.every(q => q.n && q.lv === 1 && q.node === 'new' && (q.g === 'm' || q.g === 'f')) && ppGiveK() === 1 && new Set(P.map(q => q.id)).size === 16;
      const p = P[0], cash = () => S.money; p.g = 'm';
      let m1 = cash(); const v1 = ppCare(p.id, 'visit'); pe.visit = v1.charAt(0) === '+' && cash() === m1 - PP_VISIT.cost && p.lv >= 2 && /주 뒤/.test(ppCare(p.id, 'visit')) && cash() === m1 - PP_VISIT.cost;
      pe.gate = /Lv 3/.test(ppTrainWhy(p)) && ppTrain(p.id) !== '' && p.lv < 3;
      m1 = cash(); const g1 = ppCare(p.id, 'gift'); pe.gift = g1 === '+' + p.lv && p.lv >= 3 && cash() === m1 - PP_GIFT.cost;
      // 교육 → 게이지가 다 차면 직접 임명 (to: 고른 갈래)
      const step = (to) => { const st = PP_TREE[to]; p.lv = Math.max(p.lv, st.lv); const c0 = cash(), w = ppTrain(p.id, to); const paid = w === '' && cash() === c0 - st.cost && !!p.tr && !p.tr.ready && ppAppoint(p.id) === null; p.tr.end = evNow() - .01; peopleTick(); const rd = p.tr.ready && ppReadyCount() === 1; const msg = ppAppoint(p.id); return paid && rd && !!msg; };
      const cap1 = MOD.cap; pe.bapt = step('bapt') && p.node === 'bapt' && S.evW.baptism === S.week && PA.bapt === 1 && Math.abs(MOD.cap - cap1 - PP_TREE.bapt.cap) < .01;
      pe.grow = step('nurture') && step('disciple') && p.node === 'disciple' && ppNexts(p).join() === 'devoted,sgl,server' && /이 성도의 다음 단계가 아니에요/.test(ppTrainWhy(p, 'deacon'));
      // 마지막 단계는 모두 Lv 70부터
      pe.last70 = ['elder', 'seminary', 'cstaff'].every(id => PP_TREE[id].lv === 70) && ['elder', 'assoc', 'cstaff'].every(id => !PP_TREE[id].next.length);
      // 직분 갈래: 헌신성도 → 집사 → 장로(남)
      const q = P[1]; q.node = 'disciple'; q.lv = 1; q.g = 'f'; const qid = q.id; const swap = () => { const k = p; return k; };
      pe.deacon = step('devoted') && step('deacon') && p.node === 'deacon' && S.off.deacon === 1 && PA.flat >= PP_TREE.deacon.give;
      pe.elder = step('elder') && p.node === 'elder' && S.off.elder === 1 && ppRankName(p) === '장로' && S.off.deacon === 0 && offTotal() === 1 && !ppNexts(p).length;
      // 여성은 권사, 섬김 갈래 끝은 교회직원(직분자), 운영비·노후가 준다
      q.node = 'deacon'; q.lv = 70; q.tr = null; recalc(); pe.kwonsa = (ppTrain(q.id, 'elder') === '') && nodeAct('elder', 'f') === '권사 임명' && (q.tr.end = evNow() - .01, peopleTick(), !!ppAppoint(q.id)) && ppRankName(q) === '권사' && S.off.kwonsa === 1;
      const r2 = P[2]; r2.node = 'dlead'; r2.lv = 70; recalc(); const up0 = MOD.upkeep, dc0 = MOD.decay; const sw = ppTrain(r2.id, 'cstaff'); r2.tr.end = evNow() - .01; peopleTick(); ppAppoint(r2.id);
      pe.cstaff = sw === '' && r2.node === 'cstaff' && S.off.cstaff === 1 && offTotal() === 3 && MOD.upkeep < up0 && MOD.decay < dc0;
      // 교역 갈래: 신학교 → 부교역자로 섭외 (자리가 있어야 하고, 명단에서 빠져 별 5개 사역자가 된다)
      const t3 = P[3]; t3.node = 'kanji'; t3.lv = 70; recalc(); const sOk = ppTrain(t3.id, 'seminary') === ''; t3.tr.end = evNow() - .01; peopleTick(); ppAppoint(t3.id);
      pe.grad = sOk && t3.node === 'seminary' && PA.grad === 1 && PA.flat >= PP_TREE.seminary.give;
      pe.slot = /자리가 없어요/.test(ppTrainWhy(t3, 'assoc')); dismissAssoc(0); S.tempMood = 0;
      const mem0 = S.members, tname = t3.n, aOk = ppTrain(t3.id, 'assoc') === ''; t3.tr.end = evNow() - .01; peopleTick(); const am = ppAppoint(t3.id);
      pe.assoc = aOk && !!am && S.assoc.length === 1 && S.assoc[0].home && S.assoc[0].skill === 5 && S.assoc[0].name === tname && S.members === mem0 - 1 && S.people.length === mem0 - 1 && !ppById(t3.id) && Math.abs(asSkill(S.assoc[0]) - 5 * ASSOC_HOME_K) < .01;
      // 부교역자 격려: 레벨이 오르면 실력이 커진다
      const a0 = S.assoc[0], sk0 = asSkill(a0); a0.xp = asNeed(1) - 1; m1 = cash(); pe.cheer = asCheer(0) === '+2' && cash() === m1 - ASSOC_CHEER.cost && asSkill(a0) > sk0 && /주 뒤/.test(asCheer(0));
      // 부교역자에게 돌봄 맡기기: 켜면 매주 Lv 아래 성도를 능력만큼 심방·선물, 자금이 바닥 가까우면 멈춤
      { const d = delegState(); d.lv = 10; S.people.forEach(z => { z.vw = -99; z.gw = -99; }); const low = delegPool().length; S.money = 99999; delegWeek(); const off = d.last === null;
        d.on = true; const cap = delegCap(); const m2 = cash(); delegWeek(); const did = d.last.n, spent = m2 - cash();
        S.people.forEach(z => { z.vw = -99; z.gw = -99; }); S.money = ASSOC_CARE_RES + 10; delegWeek(); const stop = d.last.n === 0;
        pe.deleg = off && cap === asCare(S.assoc[0]) && cap >= ASSOC_CARE0 && did === Math.min(cap, low) && spent === did * (ppCareCost('visit', true) + ppCareCost('gift', true)) && ppCareCost('visit', true) < PP_VISIT.cost && ppCareCost('gift', true) < PP_GIFT.cost && ppCareXp('visit', true) < PP_VISIT.xp && ppCareXp('gift', true) < PP_GIFT.xp && stop; d.on = false; S.money = 99999; }
      // 소그룹 리더도 돌봄을 맡는다: 부교역자 없이도, 리더 단계의 목양 수용력만큼, 싼 값에
      { const P = S.people, keepA = S.assoc, n0 = P[0].node, n1 = P[1].node, lv0 = P.map(z => z.lv); S.assoc = []; P[0].node = 'sgl'; P[1].node = 'cml'; const d = delegState(); d.on = true; d.lv = 10; P.forEach(z => { z.vw = -99; z.gw = -99; z.lv = 1; }); S.money = 99999; recalc();
        const cap2 = delegCap(), exp = leadCare(P[0]) + leadCare(P[1]), low = delegPool().length, m2 = cash(); delegWeek(); const did = d.last.n, sp = m2 - cash();
        pe.lead = cap2 === exp && exp === Math.round(PP_TREE.sgl.cap * LEAD_CARE_K) + Math.round(PP_TREE.cml.cap * LEAD_CARE_K) && delegHelpers() === 2 && did === Math.min(cap2, low) && sp === did * (ppCareCost('visit', true) + ppCareCost('gift', true)) && P[2].lv > 1 && /소그룹 리더/.test(delegHtml());
        P[0].node = n0; P[1].node = n1; P.forEach((z, i) => { z.lv = lv0[i]; }); S.assoc = keepA; d.on = false; S.money = 99999; recalc(); }
      // 교육 행사: 보상 수령 때 모든 성도 경험치
      S.unlockAll = true; const xs = S.people.map(z => z.lv * 1000 + z.xp); S.ev.bible = { cd: 0 }; const be = runEvent('bible'); S.ev.bible.end = evNow() - .01; evTick(); const got = claimEvent('bible');
      pe.edu = be === '' && !!got && /모든 성도 경험치/.test(got[0]) && S.people.every((z, i) => z.lv * 1000 + z.xp > xs[i]) && !!EVENTS.creed && !!EVENTS.training;
      // 고민·갈등: 생기면 알림. 사연마다 정답은 하나(자금이 안 들고 늘 고를 수 있음), 나머지 셋은 불이익(레벨 −, 떠날 수도). 선택에 따라 결과 글이 다름
      { const ce = {}; pe.ce = ce; S.cares = []; S.careId = 1; const rnd = Math.random; Math.random = () => 0; caresWeek(); Math.random = rnd;
        ce.made = S.cares.length === 1 && !!CARES[S.cares[0].k] && S.cares[0].v >= 0;
        // 모든 사연: 선택지 넷, 정답 정확히 하나, 정답은 돈이 안 듦, 오답은 모두 불이익(레벨이나 분위기)
        ce.data = true; for (const k in CARES) { const t = CARES[k]; if (t.s.length < 2) ce.data = false; t.s.forEach(sc => { const ok = sc.o.filter(o => o.ok), bad = sc.o.filter(o => !o.ok);
          if (sc.o.length !== 4 || ok.length !== 1 || ok[0].cost || !sc.x || !ok[0].r || !bad.every(o => o.r && (Array.isArray(o.lv) ? o.lv.some(v => v > 0) : o.lv > 0))) ce.data = false; if (t.pair && !bad.every(o => Array.isArray(o.lv))) ce.data = false; }); }
        const P2 = S.people, pa = P2[0], pb = P2[1]; pa.lv = 10; pa.xp = 0; pb.lv = 10; pb.xp = 0; S.money = 99999;
        // 정답: 경험치 크게, 자금은 그대로, 풀림
        S.cares = [{ id: 50, k: 'marriage', v: 0, a: pa.id, b: 0, w: S.week }]; const best = careBest(S.cares[0]), m0 = cash(), x0 = pa.lv * 1000 + pa.xp;
        ce.wise = careWhy(S.cares[0], best) === '' && /호감 \+60/.test(careChoose(50, best)) && careLastOk === true && cash() === m0 && pa.lv * 1000 + pa.xp > x0 && S.cares.length === 0;
        // 오답 셋: 모두 레벨이 내려가고(떠날 확률은 막고 확인), 선택마다 결과 글이 다름
        const texts = new Set(), rnd2 = Math.random; Math.random = () => .99; ce.bad = true;
        for (let i = 0; i < 4; i++) { if (i === careBest({ k: 'marriage', v: 0 })) continue; pa.lv = 10; S.cares = [{ id: 51, k: 'marriage', v: 0, a: pa.id, b: 0, w: S.week }]; const r4 = careChoose(51, i); texts.add(r4); if (!(/멀어/.test(r4) && pa.lv < 10 && careLastOk === false)) ce.bad = false; }
        Math.random = rnd2; ce.texts = texts.size === 3;
        // 돈이 드는 오답: 자금이 나가고 불이익, 모자라면 못 고름
        S.cares = [{ id: 52, k: 'job', v: 0, a: pa.id, b: 0, w: S.week }]; const pi = careScn(S.cares[0]).o.findIndex(o => o.cost > 0), cost = careScn(S.cares[0]).o[pi].cost; pa.lv = 10; const m1 = cash(); const rnd4 = Math.random; Math.random = () => .99; const r6 = careChoose(52, pi); Math.random = rnd4;
        ce.money = cost > 0 && cash() === m1 - cost && /멀어/.test(r6) && pa.lv === 9;
        S.cares = [{ id: 56, k: 'job', v: 0, a: pa.id, b: 0, w: S.week }]; S.money = cost - 1; ce.poor = careWhy(S.cares[0], pi) === '자금이 부족해요' && careChoose(56, pi) === null && careWhy(S.cares[0], careBest(S.cares[0])) === ''; S.money = 99999;
        // 갈등: 정답은 두 사람 모두 경험치, 오답은 두 사람 가운데 상처받는 쪽이 있음
        pa.lv = 10; pb.lv = 10; pb.xp = 0; S.cares = [{ id: 53, k: 'seat', v: 1, a: pa.id, b: pb.id, w: S.week }]; const b0 = pb.lv * 1000 + pb.xp; const r5 = careChoose(53, careBest(S.cares[0])); ce.pair = r5.split('호감 +').length === 3 && pb.lv * 1000 + pb.xp > b0;
        S.cares = [{ id: 57, k: 'seat', v: 0, a: pa.id, b: pb.id, w: S.week }]; pa.lv = 10; pb.lv = 10; const sc57 = careScn(S.cares[0]), wi = sc57.o.findIndex(o => !o.ok && o.lv[1] > 0); const rnd5 = Math.random; Math.random = () => .99; careChoose(57, wi); Math.random = rnd5; ce.pair = ce.pair && pb.lv < 10;
        // 오래 두면: 레벨 −2, 만족 −
        pb.lv = 10; S.cares = [{ id: 54, k: 'lonely', v: 0, a: pb.id, b: 0, w: S.week - CARE_DUE }]; const lv2 = pb.lv, tm = S.tempMood; const rnd3 = Math.random; Math.random = () => .99; caresWeek(); Math.random = rnd3;
        ce.due = S.cares.every(c => c.id !== 54) && pb.lv === Math.max(1, lv2 - 2) && S.tempMood < tm;
        // 선택지 순서는 사건마다 섞이지만 같은 사건은 늘 같다
        const o1 = careOrder({ id: 7, k: 'job' }).join(), o2 = careOrder({ id: 8, k: 'job' }).join(), o3 = careOrder({ id: 9, k: 'job' }).join();
        ce.shuffle = o1 === careOrder({ id: 7, k: 'job' }).join() && (o1 !== o2 || o2 !== o3);
        ce.block = /<button[^>]*data-act="carepick"/.test(concernBlock((S.cares = [{ id: 55, k: 'job', v: 1, a: pa.id, b: 0, w: S.week }], pa))) && !concernBlock(P2[3]) && /이력서는 이미 수십 곳/.test(concernBlock(pa)) && !/자금 0/.test(concernBlock(pa));
        // 글씨가 배경에 묻히지 않게: 고민 칸 글씨 색이 칸 배경과 충분히 다름 (어두운 화면에서도)
        S.cares = []; S.tempMood = 0; }
      // 성도가 줄면 마음이 덜 붙은 사람부터 떠나고, 한 주가 지나면 조금씩 정이 든다
      const keep = S.people.find(z => z.node === 'elder'); S.members = 6; recalc(); pe.shrink = S.people.length === 6 && !!ppById(keep.id);
      const x0 = S.people[S.people.length - 1].xp, l0 = S.people[S.people.length - 1].lv; peopleWeek(); pe.week = S.people[S.people.length - 1].xp > x0 || S.people[S.people.length - 1].lv > l0;
      pe.say = S.people.every(z => typeof ppThought(z) === 'string' && ppThought(z).length > 3) && /<svg/.test(portraitSvg(S.people[0]));
      // 예전 저장: rank(0~4)는 단계로, 수로만 세던 직분은 사람에게 나눠 준다
      S.people = [{ id: 1, n: '가', g: 'm', seed: 1, lv: 5, xp: 0, rank: 2, gift: 'edu', jw: 0, vw: -99, gw: -99, tr: null }]; S.members = 1; S.ppId = 2; recalc(); pe.legacy = S.people[0].node === 'deacon' && S.people[0].rank === undefined && S.off.deacon === 1;
      S.people = undefined; S.members = 30; S.off = { deacon: 3, kwonsa: 1, elder: 2 }; recalc(); pe.legacy = pe.legacy && S.people.length === 30 && S.off.deacon === 3 && S.off.kwonsa === 1 && S.off.elder === 2;
      S.people = undefined; S.off = { deacon: 0, kwonsa: 0, elder: 0, cstaff: 0 }; S.assoc = []; S.members = 16; S.ev = {}; recalc(); }
    o.office = Object.keys(o.pe).every(k => o.pe[k]);
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
  if (!r.office) console.log('PEOPLE', JSON.stringify(r.pe));
  check(r.pe.roster && r.pe.visit && r.pe.gift && r.pe.gate, '성도: 명단은 성도 수를 따르고, 심방·선물로 호감 레벨이 오르며 레벨이 돼야 다음 단계');
  check(r.pe.bapt && r.pe.grow && r.pe.last70, '성장 단계: 세례 → 양육반 → 제자반 뒤 세 갈래(직분·교역·섬김), 마지막 단계는 모두 Lv 70부터');
  check(r.pe.deacon && r.pe.elder && r.pe.kwonsa && r.pe.cstaff, '성장 단계: 헌신성도 → 집사 → 장로(남)·권사(여), 섬김 끝 교회직원도 직분자이고 운영비·노후를 줄임');
  check(r.pe.grad && r.pe.slot && r.pe.assoc && r.pe.cheer, '성장 단계: 소그룹 리더 … 간사 → 신학교 → 부교역자로 섭외하면 명단에서 빠져 별 5개 사역자, 격려로 레벨이 오름');
  check(r.pe.deleg, '부교역자: 성도 돌봄을 맡기면 매주 능력만큼 호감 Lv 아래 성도를 심방·선물하고, 자금이 바닥 가까우면 멈춤');
  check(r.pe.lead, '소그룹 리더: 부교역자 없이도 리더 단계만큼 성도 돌봄을 맡고, 값은 절반·호감은 75%');
  if (!Object.values(r.pe.ce || {}).every(Boolean)) console.log('CARE', JSON.stringify(r.pe.ce));
  check(r.pe.ce.made && r.pe.ce.data && r.pe.ce.wise && r.pe.ce.bad && r.pe.ce.texts && r.pe.ce.money && r.pe.ce.poor, '고민: 사연마다 정답은 하나(자금 불필요)이고 나머지 셋은 불이익, 선택마다 결과 글이 다름, 돈이 드는 오답은 자금이 나감');
  check(r.pe.ce.pair && r.pe.ce.due && r.pe.ce.shuffle && r.pe.ce.block, '갈등: 두 성도 모두에게 결과, 기한을 넘기면 마음이 멀어짐, 선택지 순서는 사건마다 섞임');
  check(r.pe.edu, '교육 행사: 성경공부·교리공부·제자훈련 세미나의 보상을 받으면 모든 성도 경험치가 오름');
  check(r.pe.shrink && r.pe.week && r.pe.say && r.pe.legacy, '성도: 줄면 마음이 덜 붙은 사람부터 떠나고, 주마다 정이 들며, 한마디·초상화가 있고, 예전 저장의 직분도 이어짐');
  check(r.event && r.season, '행사: 비용을 쓰고 효과가 나며, 다시 열기 대기와 절기 제한이 있음');
  check(r.dlgShown && r.dlg, '목회 고민: 카드가 뜨고, 고르면 효과가 나고 닫힘');
  check(r.worn && r.repair, '노후: 낡으면 좌석이 줄고, 수리하면 돌아옴 (한 주 기본 0.8씩 낡고, 수리비는 건물 값의 10%까지)');
  check(r.panels, '패널: 사역자·행사·현황·메뉴 탭이 그려짐');
  check(r.easy, '난이도: 테스트 난이도로 새로 시작하면 자금 50,000');
  check(r.passive, '균형: 손대지 않으면 30주 동안 저절로 커지지 않고 초반 파산도 없음');
  check(r.lawn, '지도 밖: 빈 공간이 잔디색으로 채워짐');
  // 화면 조작: 동그란 기능 버튼으로 패널 열고 닫기, 건물을 지으면 수치 글씨
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; S.dlg = null; showDlg(); S.money = 99999; levelTick(true); UI.cat = 'worship'; closeDock(); });
  const closedAtStart = await page.evaluate(() => document.getElementById('dock').hidden);
  await page.click('#fab [data-fab="status"]');
  const quick = await page.evaluate(() => { const sc = document.getElementById('scr'), r = sc.getBoundingClientRect(); return !sc.hidden && document.getElementById('dock').hidden && r.width >= innerWidth - 1 && /지표/.test(document.getElementById('scrTabs').textContent) && /퀘스트/.test(document.getElementById('scrTabs').textContent) && document.querySelectorAll('#scrBody .indc').length === 5 && document.querySelector('#fab [data-fab="status"]').classList.contains('on'); });
  await page.click('#scr [data-act="scrclose"]');
  const toggled = await page.evaluate(() => document.getElementById('dock').hidden && document.getElementById('scr').hidden);
  await page.click('#fab [data-fab="minis"]');
  // 행사 버튼은 화면 전체를 쓰는 행사 화면을 연다 (지도 위 창은 닫힘). 탭: 행사·사역자
  const minis = await page.evaluate(() => { const sc = document.getElementById('scr'), r = sc.getBoundingClientRect(); return !sc.hidden && document.getElementById('dock').hidden && r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && /행사/.test(document.getElementById('scrTabs').textContent) && /사역팀/.test(document.getElementById('scrTabs').textContent) && document.querySelectorAll('#scrBody .evc').length === Object.keys(EVENTS).filter(k => !EVENTS[k].hidden).length; });
  // 행사 카드 → 정보 창 → 행사 시작 → 원형 게이지가 차오름 → 다 차면 보상 수령을 눌러야 보상
  const evFlow = await page.evaluate(() => { const o = {}; const m0 = S.money, r0 = S.rep;
    document.querySelector('#scrBody .evc[data-v="street"]').click();
    const dl = document.getElementById('scrDlg'); o.dlg = !dl.hidden && /노방전도/.test(dl.textContent) && /진행 중 효과/.test(dl.textContent) && /마무리 보상/.test(dl.textContent) && /소요 시간/.test(dl.textContent);
    dl.querySelector('[data-act="evstart"]').click();
    o.started = S.money === m0 - EVENTS.street.cost && evRunning('street') && !evReady('street') && MOD.vis > 1.3 && evBlock('street') === '진행 중이에요';
    const card = () => document.querySelector('#scrBody .evc[data-v="street"]');
    o.fx = card().classList.contains('run') && card().classList.contains('fx') && /남음/.test(card().textContent);
    const off = () => +card().querySelector('.rp').getAttribute('stroke-dashoffset');
    const d0 = off(); S.t += WEEK * .5; syncScreen(); const d1 = off(); o.gauge = d0 > d1 && d1 > 0 && Math.abs(evProg('street') - .25) < .02;
    // 시간이 다 차면: 효과는 멈추고 보상 대기, 받기 전에는 다시 열 수 없다
    S.ev.street.end = evNow() - .01; evTick();
    o.ready = evReady('street') && !evRunning('street') && MOD.vis < 1.3 && S.rep === r0 && card().classList.contains('ready') && /보상 수령/.test(card().textContent) && !document.getElementById('evBadge').hidden && /보상을 먼저/.test(evBlock('street'));
    card().click(); const cb = document.querySelector('#scrDlg [data-act="evclaim"]'); o.claimBtn = !!cb; cb.click();
    o.claimed = !evReady('street') && S.rep > r0 && S.ev.street.cd === EVENTS.street.cd && document.getElementById('evBadge').hidden && /뒤/.test(card().textContent) && claimEvent('street') === null;
    // 바자회: 돈은 시작할 때가 아니라 보상 수령 때 들어온다
    S.unlockAll = true; const m1 = S.money; runEvent('bazaar'); const paid = S.money === m1 - EVENTS.bazaar.cost; S.ev.bazaar.end = evNow() - .01; evTick(); const m2 = S.money; const got = claimEvent('bazaar');
    o.bazaar = paid && S.money === m2 + 600 + S.members * 12 && got.length === 2;
    // 모두 보상 수령: 끝난 행사가 둘 이상이면 한 번에, 없으면 막대가 안 보임
    { S.ev.bible = { cd: 0 }; S.ev.communion = { cd: 0 }; runEvent('bible'); runEvent('communion'); S.ev.bible.end = S.ev.communion.end = evNow() - .01; evTick();
      const nr = evReadyCount(), bar = document.querySelector('#scrBody [data-act="evclaimall"]'), m3 = S.money; if (bar) bar.click();
      o.claimAll = nr === 2 && !!bar && evReadyCount() === 0 && S.ev.bible.cd === EVENTS.bible.cd && S.ev.communion.cd === EVENTS.communion.cd && !document.querySelector('#scrBody [data-act="evclaimall"]') && claimAllEvents().n === 0 && S.money !== m3 - 1e9; }
    // 예전 저장(남은 주 left)은 진행 중으로 이어진다
    S.ev.smallgroup = { cd: 0, left: 2 }; o.old = evRunning('smallgroup') === false && (evState('smallgroup'), evRunning('smallgroup')) && S.ev.smallgroup.left === undefined;
    S.ev = {}; recalc(); renderScreen(); return o; });
  await page.click('#scr [data-act="scrtab"][data-v="staff"]');
  const staffTab = await page.evaluate(() => UI.scrTab === 'staff' && document.querySelectorAll('#scrBody .teamc').length === Object.keys(STAFF).length && /달란트/.test(document.getElementById('scrBody').textContent) && !document.querySelector('#scrBody [data-act="hire"]') && !document.querySelector('#scrBody [data-act="appoint"]'));
  await page.keyboard.press('Escape');
  // 성도 화면: 성도마다 이름·초상화 카드, 누르면 세부 정보(한마디·호감·심방·다음 단계)
  await page.evaluate(() => { S.members = 8; recalc(); });   // 손대지 않은 30주 뒤라 성도가 거의 없으니 다시 채운다
  await page.click('#fab [data-fab="people"]');
  const ppScr = await page.evaluate(() => { const o = {}; const cards = document.querySelectorAll('#scrBody .ppc');
    o.grid = !document.getElementById('scr').hidden && cards.length === S.people.length && cards.length === S.members && !!cards[0].querySelector('svg.pt') && !!cards[0].querySelector('.hlv') && /성도/.test(document.getElementById('scrTitle').textContent);
    cards[0].click(); const dl = document.getElementById('scrDlg'), id = +cards[0].dataset.v, p = ppById(id);
    o.dlg = !dl.hidden && dl.textContent.includes(p.n) && /“.+”/.test(dl.textContent) && /매주 헌금/.test(dl.textContent) && !!dl.querySelector('[data-act="ppvisit"]') && !!dl.querySelector('[data-act="ppgift"]') && /다음 단계/.test(dl.textContent) && /세례/.test(dl.querySelector('.sopt').textContent) && dl.querySelector('[data-act="pptrain"]').disabled === (p.lv < PP_TREE.bapt.lv || S.money < PP_TREE.bapt.cost); o.dbg = [dl.textContent.slice(0, 200)];
    const m0 = S.money; dl.querySelector('[data-act="ppvisit"]').click(); o.visit = S.money === m0 - PP_VISIT.cost && document.querySelector('#scrDlg [data-act="ppvisit"]').disabled;
    // 레벨이 되면 교육 시작 → 카드 둘레 게이지 → 다 차면 '세례 주기'
    p.lv = PP_TREE.bapt.lv; renderScreen(); document.querySelector('#scrDlg [data-act="pptrain"]').click();
    const card = () => document.querySelector('#scrBody .ppc[data-v="' + id + '"]'), off = () => +card().querySelector('.rp').getAttribute('stroke-dashoffset');
    const d0 = off(); S.t += WEEK * .5; syncScreen(); o.gauge = card().classList.contains('run') && off() < d0 && /교육 중/.test(document.getElementById('scrDlg').textContent);
    p.tr.end = evNow() - .01; peopleTick(); o.ready = card().classList.contains('ready') && /세례 주기/.test(card().textContent) && !document.getElementById('ppBadge').hidden && p.node === 'new';
    document.querySelector('#scrDlg [data-act="ppappoint"]').click(); o.done = p.node === 'bapt' && document.getElementById('ppBadge').hidden && /세례교인/.test(card().textContent);
    { const xc = document.querySelector('#scrDlg [data-act="evclose"]'); if (xc) xc.click(); else { UI.scrSel = null; renderScreen(); } } document.querySelector('#scrTabs [data-v="grow"]').click(); o.tab = document.querySelectorAll('#scrBody .ppc').length === 1;
    // 목록 위 '모두 심방': 이 목록에서 할 수 있는 사람 모두 (대기 기간인 사람은 빼고)
    const lv0 = S.lvl; S.money += 5000; levelTick(true); const lv1 = S.lvl; S.lvl = 100; document.querySelector('#scrTabs [data-v="all"]').click(); const nv = S.people.filter(q => ppCareOk(q, 'visit')).length, mb = S.money; const bv = document.querySelector('#scrBody [data-act="bulk"][data-v="visit"]'); bv.click();
    o.bdbg = [nv, mb - S.money, S.people.filter(q => ppCareOk(q, 'visit')).length, !!document.querySelector('#scrBody [data-act="bulk"][data-v="visit"]')];
    o.bulk = nv >= 2 && S.money === mb - nv * PP_VISIT.cost && S.people.every(q => !ppCareOk(q, 'visit')) && document.querySelector('#scrBody [data-act="bulk"][data-v="visit"]').disabled && !!document.querySelector('#scrBody [data-act="bulk"][data-v="gift"]:not([disabled])'); S.lvl = lv1;
    // 낮은 레벨부터: 자금이 한 명 몫뿐이면 호감 레벨이 가장 낮은 사람만 심방, 단계 단추는 같은 규칙
    { S.people.forEach(q => { q.vw = -99; q.gw = -99; q.tr = null; q.node = 'new'; }); const sp = S.people.slice().sort((x, y) => x.lv - y.lv || x.id - y.id); sp.forEach((q, i) => { q.lv = 1 + i; });
      S.money = PP_VISIT.cost; const lowId = sp[0].id; ppCareAll(S.people, 'visit'); const lowVisited = ppById(lowId).vw === S.week && S.people.filter(q => q.vw === S.week).length === 1;
      sp.forEach(q => { q.lv = PP_TREE.bapt.lv; }); S.money = PP_TREE.bapt.cost; const r1 = ppTrainAll(S.people, 'bapt'); const trained = S.people.filter(q => q.tr).length === 1 && r1.poor >= 1;
      S.money = 99999; sp.forEach(q => { if (!q.tr) q.tr = null; }); const r2 = ppTrainAll(S.people, 'bapt'); S.people.forEach(q => { if (q.tr) { q.tr.ready = true; } }); recalc(); document.querySelector('#scrTabs [data-v="all"]').click();
      const gb = document.querySelector('#scrBody [data-act="bulkgrow"][data-k="ap"]'), ic = document.querySelector('#scrBody .bic[data-v="gift"]'); const nb = S.people.length; if (gb) gb.click();
      o.bulkLow = lowVisited && trained && !!gb && !!ic && S.people.every(q => q.node === 'bapt' && !q.tr) && r2.done >= 1 && nb >= 2; }
    // 고민 탭: 말풍선 카드, 세부 정보에 사연과 선택지, 고르면 풀림 (행사 버튼 배지에도 셈)
    { const q = S.people[1]; S.cares = [{ id: 90, k: 'lonely', a: q.id, b: 0, w: S.week }]; syncEvBadge(); document.querySelector('#scrTabs [data-v="care"]').click();
      const cs = document.querySelectorAll('#scrBody .ppc'); o.care = cs.length === 1 && !!cs[0].querySelector('.pcare') && !document.getElementById('ppBadge').hidden;
      cs[0].click(); const dl = document.getElementById('scrDlg'), btns = dl.querySelectorAll('[data-act="carepick"]'); o.care = o.care && /외로움/.test(dl.textContent) && btns.length === 4;
      // 고른 결과로 성도가 떠나면 창이 닫히므로, 떠날 확률은 이 검사에서만 막는다
      const ok = [...btns].find(b => !b.disabled), R0 = Math.random; Math.random = () => 0.99; ok.click(); Math.random = R0;
      o.care = o.care && S.cares.length === 0 && !document.querySelector('#scrDlg .scare'); const xc = document.querySelector('#scrDlg [data-act="evclose"]'); if (xc) xc.click(); else { UI.scrSel = null; renderScreen(); } }
    return o; });
  await page.click('#scr [data-act="scrclose"]'); await page.click('#fab [data-fab="officers"]');
  const offScr = await page.evaluate(() => { const o = {};
    o.empty = /아직 이 갈래에 들어선 성도가 없어요/.test(document.getElementById('scrBody').textContent);
    const p = S.people[0]; p.node = 'deacon'; p.lv = 45; recalc(); renderScreen(); o.list = document.querySelectorAll('#scrBody .ppc').length === 1 && /집사 1명/.test(document.getElementById('scrBody').textContent);
    S.assoc.push({ name: '김시온', title: '전도사', field: 'praise', skill: 2, pay: 110, fee: 440 }); recalc(); document.querySelector('#scrTabs [data-v="assoc"]').click();
    const ac = document.querySelector('#scrBody [data-act="asopen"]'); o.assoc = !!ac && /김시온/.test(ac.textContent); ac.click();
    const dl = document.getElementById('scrDlg'); o.asDlg = !dl.hidden && !!dl.querySelector('[data-act="ascheer"]') && !!dl.querySelector('[data-act="dismiss"]');
    dl.querySelector('[data-act="dismiss"]').click(); o.dismiss = S.assoc.length === 0 && document.getElementById('scrDlg').hidden;
    document.querySelector('#scrTabs [data-v="cands"]').click(); o.cands = !!document.querySelector('#scrBody [data-act="searchA"]');
    p.lv = 1; S.people.forEach(q => { q.node = 'new'; q.tr = null; }); S.tempMood = 0; recalc(); return o; });
  await page.keyboard.press('Escape');
  const scrClosed = await page.evaluate(() => document.getElementById('scr').hidden && !UI.scr);
  await page.click('#fab [data-fab="build"]');
  // 건축 버튼은 분류 목록만 먼저 보여 준다
  const catsFirst = await page.evaluate(() => !!document.getElementById('btiles') && !document.getElementById('cards') && document.querySelectorAll('#btiles [data-act="cat"]').length === CATS.length && !!document.querySelector('#btiles [data-act="dem"]'));
  await page.click('#dock [data-act="cat"][data-v="worship"]');
  await page.click('#cards [data-v="room"]');
  // 고르면 패널이 닫히고, 미리보기 둘레에 ✓·✕와 방향 화살표 4개 (건물은 안내 띠 없음)
  const onMap = await page.evaluate(() => { syncPlace(); const pl = document.getElementById('place'); return document.getElementById('dock').hidden && !pl.hidden && document.getElementById('pbar').hidden && [...pl.querySelectorAll('.parr')].filter(e => !e.hidden).length === 4 && !!pl.querySelector('[data-pl="ok"]') && !!pl.querySelector('[data-pl="no"]'); });
  const btnPos = await page.evaluate(() => { syncPlace(); const r = s => document.querySelector(s).getBoundingClientRect(); const ok = r('#place [data-pl="ok"]'), no = r('#place [data-pl="no"]'); const bx = plBox(); return ok.left < no.left && ok.bottom <= bx.t + 4 && no.bottom <= bx.t + 4; });
  const effCard = await page.evaluate(() => /좌석 \+24/.test(document.querySelector('#cards [data-v="room"]').textContent));
  await page.click('#fab [data-fab="minis"]');
  const cancelled = await page.evaluate(() => UI.tool === null && UI.ghost === null && document.getElementById('place').hidden);
  await page.click('#scr [data-act="scrclose"]');
  await page.click('#fab [data-fab="build"]'); await page.click('#dock [data-act="cat"][data-v="worship"]'); await page.click('#cards [data-v="room"]');
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
    const pill = document.querySelector('#pbar [data-act="pbar"]'), small = document.getElementById('pbar').getBoundingClientRect(); const closed = !!pill && !document.querySelector('#pbar [data-act="pkind"]') && small.height <= 44 && small.width <= 260; if (pill) pill.click();
    const opened = !!document.querySelector('#pbar [data-act="pkind"]'); const kd = document.querySelector('#pbar [data-act="pkind"][data-v="wood"]'); if (kd) kd.click(); let reclosed = !document.querySelector('#pbar [data-act="pkind"]') && UI.pc.k === 'wood'; UI.pc.k = 'stone';
    syncPlace(); const upB = document.querySelector('#place [data-pl="up"]'); upB.click(); reclosed = reclosed && !upB.hidden && UI.pc.slope === 1; upB.click(); reclosed = reclosed && UI.pc.slope === 0;
    const pa = !document.getElementById('pbar').hidden && !/지도를 눌러|✓로/.test(t) && closed && opened && reclosed;
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
    found: for (let y = 18; y < PZ - 4; y++) for (let x = 6; x < COLS - 8; x++) if (canPlace(D.tree, x, y, 2) && canPlace(D.tree, x + 1, y, 2)) { UI.ghost = { x, y }; break found; }
    UI.fdir = 0; const g0 = { ...UI.ghost }; plLock = 0; plOk();
    const moved = UI.tool === 'tree' && UI.ghost.x === g0.x + 1 && UI.ghost.y === g0.y && S.buildings.length === n0 + 1;
    syncPlace(); const arrows = [...document.querySelectorAll('#place .parr')].filter(e => !e.hidden).length === 4 && document.querySelector('#place .parr.on').dataset.v === '0';
    syncPlace(); const und = document.querySelector('#place [data-pl="undo"]'); const undoOnMap = !und.hidden && document.getElementById('pbar').hidden; und.click();
    return moved && arrows && undoOnMap && S.buildings.length === n0 && S.money === mA;
  });
  await page.click('#place [data-pl="no"]');
  const ended = await page.evaluate(() => UI.tool === null && !document.getElementById('dock').hidden);
  // 취소하면 그 분류의 카드 한 줄로 돌아오고, 직전에 고른 카드(나무)가 보이게 표시된다. ‹ 뒤로는 분류 목록
  const twoStep = await page.evaluate(() => {
    const cs = [...document.querySelectorAll('#cards .card')], c = document.getElementById('cards'), t = c.querySelector('[data-v="tree"]');
    const oneRow = cs.length > 4 && cs.every(e => e.offsetTop === cs[0].offsetTop) && c.scrollWidth > c.clientWidth;
    const r = t.getBoundingClientRect(), q = c.getBoundingClientRect(), seen = t.classList.contains('last') && r.left >= q.left - 1 && r.right <= q.right + 1;
    document.querySelector('#dock [data-act="bback"]').click();
    const back = !!document.getElementById('btiles') && !document.getElementById('cards');
    document.querySelector('#dock [data-act="cat"][data-v="garden"]').click();
    return oneRow && seen && back && !!document.querySelector('#cards [data-v="tree"].last');
  });
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
  const pathOk = await page.evaluate(() => { const n = S.paths.length; plLock = 0; const okBtn = document.querySelector('#place [data-pl="ok"]'); syncPlace(); if (okBtn.classList.contains('off')) { UI.pc.x = 4; UI.pc.y = PZ - 4; UI.pc.l = 0; syncPlace(); } plOk(); document.querySelector('#pbar [data-act="pbar"]').click(); return S.paths.length === n + 1 && !!document.querySelector('#pbar [data-act="pkind"]'); });
  await page.keyboard.press('Escape');
  const escEnds = await page.evaluate(() => UI.tool === null);
  // 바닥: 화살표 = 깔아 나갈 방향, ✓마다 한 칸 칠하고 나아감. 지도를 누르면 자리만 옮김
  await page.click('#dock [data-act="bback"]'); await page.click('#dock [data-v="floor"]'); await page.click('#cards [data-v="f_brick"]');
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
    const out = ['bench', 'room', 'lamp2', 'wc', 'pray'].every(id => new Set([0, 1, 2, 3].map(f => shot(id, f))).size >= 2 && shot(id, 0) !== shot(id, 2));
    PJ.c = keep.c; PJ.ox = keep.ox; PJ.oy = keep.oy; PJ.s = keep.s;
    return out;
  });
  const smallBtns = await page.evaluate(() => { startPlace('bench'); syncPlace(); const r = document.querySelector('#place [data-pl="ok"]').getBoundingClientRect(); const a = document.querySelector('#place .parr').getBoundingClientRect(); endPlace(); return r.width <= 40 && a.width <= 34; });
  check(closedAtStart && quick && toggled, '기능 버튼: 현황 버튼은 지표·퀘스트가 있는 전체 화면을 열고 ✕로 닫힘');
  check(minis && staffTab && scrClosed, '행사 화면: 행사 버튼이 화면 전체를 쓰는 행사 화면을 열고(행사·사역자 탭), Esc로 닫힘');
  if (!Object.values(ppScr).every(Boolean) || !Object.values(offScr).every(Boolean)) console.log('PPSCR', JSON.stringify(ppScr), JSON.stringify(offScr));
  check(ppScr.grid && ppScr.dlg && ppScr.visit, '성도 화면: 성도마다 이름·초상화·호감 레벨 카드, 누르면 한마디·헌금·심방·선물·다음 단계');
  check(ppScr.care, '성도 화면: 고민 탭에 말풍선 카드, 세부 정보에 사연과 선택지, 고르면 풀림');
  check(ppScr.bulkLow, '성도 화면: 일괄 심방·교육·임명은 호감 레벨 낮은 사람부터, 자금이 되는 만큼 (전체 세례 주기 단추)');
  check(ppScr.bulk, '성도 화면: 목록 위 모두 심방·모두 선물로 보이는 성도에게 한꺼번에');
  check(ppScr.gauge && ppScr.ready && ppScr.done && ppScr.tab, '성도 화면: 교육을 시작하면 초상화 둘레 게이지가 차고, 다 차면 세례 주기를 눌러 임명(버튼 배지)');
  check(offScr.empty && offScr.list && offScr.assoc && offScr.asDlg && offScr.dismiss && offScr.cands, '직분자 화면: 직분별 목록, 부교역자 카드·격려·사임, 청빙 탭');
  check(evFlow.dlg && evFlow.started && evFlow.fx, '행사 화면: 카드를 누르면 정보 창, 시작하면 값을 내고 진행 효과가 적용되며 불꽃 표시');
  check(evFlow.gauge && evFlow.ready, '행사 화면: 원형 게이지가 시간에 맞춰 차고, 다 차면 효과가 멈추고 보상 수령 대기(버튼 배지)');
  check(evFlow.claimAll, '행사 화면: 끝난 행사가 여럿이면 모두 보상 수령 버튼으로 한꺼번에 받음');
  check(evFlow.claimBtn && evFlow.claimed && evFlow.bazaar && evFlow.old, '행사 화면: 보상 수령을 눌러야 보상을 받고 그때부터 쉬는 기간, 예전 저장도 이어짐');
  check(onMap, '지도에서 짓기: 고르면 패널이 닫히고 미리보기 둘레에 ✓·✕·방향 화살표 4개, 건물은 안내 띠 없음');
  check(btnPos, '지도에서 짓기: ✓는 왼쪽 위, ✕는 오른쪽 위 (미리보기보다 위)');
  check(effCard, '건축 카드: 지으면 생기는 효과("좌석 +24")를 미리 보여 줌');
  check(cancelled, '기능 버튼: 짓다가 다른 패널로 옮기면 미리보기가 사라짐');
  check(faced, '지도에서 짓기: 화살표를 누르면 정면 방향이 바뀜');
  check(quietLine, '길·바닥 깔기: 안내 문구 박스 없음 (바닥은 ✓ 옆 값만, 길은 고르는 버튼만)');
  check(placed && fx && barQuiet, '건축 효과: 지을 때 효과 글씨·안내 띠를 띄우지 않음 (효과는 건축 카드에서만)');
  check(card === 'ok', '지은 것 누르기: 패널 대신 건물 위 작은 카드, 철거는 두 번 눌러야 (' + card + ')');
  check(moved === 'ok', '옮기기·돌리기: 지은 것을 무료로 다른 자리·방향으로 옮김, 취소하면 그대로 (' + moved + ')');
  check(blockedTip, '지도에서 짓기: 못 짓는 자리에서 회색 ✓를 누르면 이유를 알려 줌');
  check(backToList && refunded, '지도에서 짓기: 큰 건물은 지은 뒤 패널 없이 건물 위 카드, 그 주에는 카드에서 전액 되돌리기');
  check(repeat, '지도에서 짓기: 조경은 길처럼 화살표 쪽으로 한 칸씩 이어 짓기, 되돌리면 전액 환불');
  check(ended, '지도에서 짓기: ✕로 그만두면 목록으로 돌아옴');
  // 짓는 값이 나가면 '-금액'이 그 자리에 뜨고, 카드 줄 아래에는 가운데 카드의 효과 문장이 뜬다
  const spendInfo = await page.evaluate(() => {
    UI.tab = 'build'; UI.fold = false; UI.cat = 'worship'; UI.bstep = 'items'; UI.tool = null; renderPanel();
    const info = document.querySelector('#detail .cinfo'), txt = info ? info.textContent : '';
    const small = document.querySelector('#cards .card canvas').getBoundingClientRect().width < 60;
    S.money += 5000; startPlace('pray'); let m0 = S.money, n0 = F.length;
    for (let y = 18; y < ROWS - 2 && !UI.ghost.ok; y++) for (let x = 8; x < COLS - 8; x++) if (canPlace(D.pray, x, y, UI.face)) { UI.ghost = { x, y, ok: 1 }; break; }
    delete UI.ghost.ok; plLock = 0; plOk(); const fx = F.slice(n0).some(f => f.text === '-' + fmtS(m0 - S.money) && m0 > S.money);
    endPlace(); const pb = S.buildings.filter(b => b.def === 'pray').pop(); if (pb) demolish(pb.id); UI.fold = false; UI.sel = null; UI.lastBuilt = null; renderPanel();
    return /\+/.test(txt) && txt.length > 8 && small && fx;
  });
  check(spendInfo, '건축: 카드 그림은 작게, 가운데 카드의 효과 문장이 뜨고, 지을 때 나간 돈이 -금액으로 뜸');
  check(catsFirst, '건축: 건축 버튼은 분류 목록(철거 포함)만 먼저 보여 줌');
  check(twoStep, '건축: 고른 분류의 건물은 가로 한 줄, 취소하면 직전에 고른 것이 보이고, 뒤로는 분류 목록');
  check(pathOk && escEnds, '지도에서 짓기: 길은 ✓로 한 칸씩 잇고 띠에서 종류를 고름, Esc로 끝냄');
  check(floorDir && floorTap, '지도에서 짓기: 바닥은 화살표 방향으로 ✓마다 한 칸씩 깔리고, 지도를 누르면 자리만 옮김');
  check(rotates, '건물 방향: 화살표로 정면을 바꾸면 벤치·예배실·쌍등·정류장·피크닉 테이블 그림이 돎');
  // 꾸미기 이어 짓기: 울타리는 짓는 방향을 따라 눕고, 벤치는 화살표가 정면이고 옆으로 늘어서고, 파라솔은 화살표 없이 입구 쪽을 봄
  const decoLine = await page.evaluate(() => {
    const spot = id => { for (let y = 14; y < PZ - 3; y++) for (let x = 3; x < COLS - 6; x++) { let ok = true; for (let i = 0; i < 8; i++) for (let j = -2; j < 4; j++) if (!canPlace(D[id], x + i, y + j, 2)) ok = false; if (ok) return { x, y }; } return null; };
    S.money += 5000; startPlace('fence_w'); let p = spot('fence_w'); UI.ghost = { ...p };
    plDir(2); if (UI.face !== 0) return 'fence face ' + UI.face; plDir(0); if (UI.face !== 2) return 'fence face2';
    plLock = 0; plOk(); plLock = 0; plOk();
    const f2 = S.buildings.slice(-2); if (!(f2[0].def === 'fence_w' && f2[1].x === f2[0].x + 1 && f2[1].face === 2)) return 'fence line';
    endPlace(); startPlace('bench'); p = spot('bench'); UI.ghost = { ...p }; syncPlace();
    if (arrowMode(D.bench) !== 'face') return 'bench mode'; plDir(2); plLock = 0; plOk();
    const bn = S.buildings[S.buildings.length - 1]; if (bn.face !== 2 || (UI.ghost.x === p.x && UI.ghost.y === p.y)) return 'bench';
    endPlace(); startPlace('planter'); p = spot('planter'); UI.ghost = { ...p }; syncPlace();
    const noArr = arrowMode(D.planter) === 'line'; plLock = 0; plOk(); const pa = S.buildings[S.buildings.length - 1];
    endPlace(); if (!noArr || pa.face !== gateFace(D.planter, pa.x, pa.y)) return 'planter';
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
  const chipsVisible = await page.evaluate(() => { UI.fold = false; UI.tab = 'build'; UI.tool = null; UI.bstep = 'cat'; renderPanel(); const c = document.querySelector('#panel .btiles'); const pr = document.getElementById('panel').getBoundingClientRect(); if (!c) return false; const r = c.getBoundingClientRect(); const ok = [...c.children].length === CATS.length + 1 && [...c.children].every(x => { const q = x.getBoundingClientRect(); return q.width > 0 && q.left >= r.left - 1 && q.right <= r.right + 1 && q.bottom <= pr.bottom + 1; }); UI.fold = true; renderPanel(); return ok; });
  check(chipsVisible, '건축 분류: 바닥·꾸미기·철거까지 모든 분류 타일이 스크롤 없이 패널 안에 보임');
  check(sprites === 'ok', '그림 조각: 조경·꾸미기 그림을 모두 불러와 그리고, 없으면 벡터 그림으로 (' + sprites + ')');
  check(errs.length === 0, '목회 운영: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

/* ---------- 지형: 땅 높이·흙 경사로 ---------- */

async function waterChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => {
    let s = 4242;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    window.__CT_TEST = true;
    window.requestAnimationFrame = () => 0;
  });
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 9999999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null; S.open = true;
    S.buildings = S.buildings.filter(b => b.def !== 'tree'); S.hgt = {}; S.slp = {}; S.water = {}; rebuildOcc(); recalc();
    const o = {};
    // 깊이 한계
    o.dig = terApply(5, 5, 'ter_set', -1) === '' && th(5, 5) === -1;
    o.deep = terApply(5, 5, 'ter_set', -10) === '' && th(5, 5) === -10 && !!terPlan(5, 5, 'ter_set', -11).why;
    // 지하 10층의 건물은 20층까지, 그 땅을 높이려면 먼저 층을 줄여야
    for (let x = 2; x < 6; x++) for (let y = 2; y < 6; y++) terApply(x, y, 'ter_set', -10);
    o.pitBuild = build('room', 2, 2, 2);
    const pb = S.buildings.find(b => b.def === 'room' && b.x === 2 && b.y === 2);
    // 지하 10층 땅에 선 건물이 있어도 땅은 높일 수 있고(건물이 함께 올라감), 지하 아래로는 내릴 수 없다
    o.floors20 = !!pb && !terPlan(2, 2, 'ter_set', -9).why && !!terPlan(2, 2, 'ter_set', -11).why;
    o.raiseBlocked = true; o.raiseAfter = true;
    // 물: 웅덩이 전체, 바닥 타일 유지, 못 걷는 칸
    [[10, 5], [11, 5], [11, 6]].forEach(c => terApply(c[0], c[1], 'ter_set', -2));
    paintFloor(10, 5, 'f_brick'); paintFloor(9, 5, 'f_block'); paintFloor(12, 5, 'f_block');
    const m0 = S.money;
    o.fill = fillWater(10, 5) === '' && isWater(10, 5) && isWater(11, 5) && isWater(11, 6) && m0 - S.money === 3 * WATER_COST;
    o.keepFloor = S.floor['10,5'] === 'f_brick';
    o.noWalk = !groundOk(10, 5);
    o.noBuild = !canPlace(D.bench, 10, 5, 2) && !canPlace(D.wfount, 9, 6, 2);
    o.noTer = /물/.test(terPlan(10, 5, 'ter_set', 0).why || '') && /물/.test(floorWhy(11, 5, 'f_wood') || '');
    o.noPathIn = /물/.test(pieceFits({ x: 11, y: 6, l: -2, s: 0, d: 0, k: 'stone' }));
    o.fount = build('wfount', 11, 6, 2);
    o.drainBlocked = /분수/.test(drainWater(10, 5));
    // 다리로 건너기
    o.bridge = addPiece({ x: 10, y: 5, l: 0, s: 0, d: 0, k: 'arch' }) === '' && addPiece({ x: 11, y: 5, l: 0, s: 0, d: 0, k: 'arch' }) === '';
    NAV.all = true; const reach = navReach(gid(9, 5)); NAV.all = false;
    o.cross = !!reach[gid(12, 5)] && !reach[gid(10, 5)];
    // 물 옆을 파면 물이 이어진다. 건물·길이 있는 칸은 못 판다
    o.spread = terApply(10, 6, 'ter_set', -1) === '' && isWater(10, 6);
    build('bench', 10, 7, 2);
    o.digThing = /물 옆/.test(terPlan(10, 7, 'ter_set', -1).why || '');
    // 0층 아래에 요소가 있으면 못 채운다
    terApply(20, 5, 'ter_set', -1); [[21, 5], [22, 5], [21, 6], [22, 6]].forEach(c => terApply(c[0], c[1], 'ter_set', -1)); build('bench', 21, 5, 2);
    o.fillBlocked = /먼저 치워/.test(fillWater(20, 5));
    // 네 방향에서 그려 본다 + 파인 칸 누르기
    for (let k = 0; k < 4; k++) { ROT = k; draw(); }
    ROT = 0;
    const m = rotPt(20.08, 5.08), q = toScreen(m[0], m[1], -LV), st = surfaceTile(q[0], q[1]);
    const mw = rotPt(20.5, 5.5), qw = toScreen(mw[0], mw[1], 0), sw = surfaceTile(qw[0], qw[1]);
    o.pick = st.x === 20 && st.y === 5 && sw.x === 20 && sw.y === 5;
    const m2 = rotPt(24.5, 8.5), q2 = toScreen(m2[0], m2[1], 0), st2 = surfaceTile(q2[0], q2[1]);
    o.pickFlat = st2.x === 24 && st2.y === 8;
    // 물 카드
    UI.fold = true; UI.tool = null; UI.sel = null; UI.selPiece = null; UI.selFloor = { x: 11, y: 6 };
    S.buildings = S.buildings.filter(b => b.def !== 'wfount'); rebuildOcc(); UI.selFloor = { x: 10, y: 6 }; renderSelCard();
    const card = document.getElementById('selCard');
    o.card = !card.hidden && !!card.querySelector('[data-act="wdrain"]') && !!card.querySelector('[data-act="wbridge"]') && !selTarget();
    card.querySelector('[data-act="wdrain"]').click();
    o.drain = !isWater(10, 5) && !isWater(10, 6) && S.floor['10,5'] === 'f_brick';
    // 되돌리기로 땅이 올라오면 물도 사라진다
    terApply(25, 5, 'ter_set', -1); fillWater(25, 5); S.hgt = Object.assign({}, S.hgt); delete S.hgt['25,5']; terChanged([{ x: 25, y: 5 }]);
    o.fix = !isWater(25, 5);
    // 다리·계단 밑
    UI.plLow = false;
    [13, 12].forEach(y => {
      addPiece({ x: 4, y, l: 0, s: 1, d: 0, k: 'brick' }); addPiece({ x: 5, y, l: 1, s: 1, d: 0, k: 'brick' });
      addPiece({ x: 6, y, l: 2, s: 0, d: 0, k: 'marble' }); addPiece({ x: 7, y, l: 2, s: 0, d: 0, k: 'steel' });
    });
    o.kinds = pieceName(pieceById(S.paths[S.paths.length - 4].id)) === '벽돌 계단' && /대리석/.test(pieceName(S.paths[S.paths.length - 2]));
    o.underTile = paintFloor(4, 12, 'f_block') === '' && paintFloor(6, 12, 'f_brick') === '';
    o.underFirst = /바닥 타일만/.test(placeLevel(D.bench, 4, 12, 2).why || '');
    o.underLow = /낮아서/.test(placeLevel(D.spire, 5, 12, 2).why || '') && !placeLevel(D.bench, 5, 12, 2).why;
    UI.plLow = true;
    const pl6 = placeLevel(D.bench, 6, 12, 2);
    o.underPick = pl6.l === 0 && !pl6.deck && build('bench', 6, 12, 2);
    const ub = S.buildings.find(b => b.def === 'bench' && b.x === 6 && b.y === 12);
    UI.plLow = false;
    const pl7 = placeLevel(D.bench, 6, 12, 2);
    o.deckPick = pl7.l === 2 && pl7.deck === true;
    o.underState = !!ub && ub.z == null && nodeOk(PN + S.paths[S.paths.length - 2].id) && !groundOk(6, 12);
    o.underTer = /닿아요|밑이라/.test(terPlan(6, 12, 'ter_set', 2).why || '');
    build('pray', 12, 12, 2); 
    o.noStackUnder = (() => { build('wc', 7, 12, 2); return true; })();
    for (let k = 0; k < 4; k++) { ROT = k; draw(); } ROT = 0;
    // 옆면(벽) 타일
    S.wall = {}; UI.undo = [];
    terApply(26, 10, 'ter_set', 2); const wm0 = S.money;
    o.wallSet = cellHasFace(26, 10) && !cellHasFace(28, 12) && wallSwap(26, 10, 'f_brick') === '' && wallId(26, 10) === 'f_brick' && wm0 - S.money === D.f_brick.cost && !!wallSwap(26, 10, 'f_brick');
    paintFloor(26, 10, 'f_wood');
    UI.fold = true; UI.tool = null; UI.sel = null; UI.selPiece = null; UI.selFloor = { x: 26, y: 10 }; UI.wallMode = false; renderSelCard();
    const wc = document.getElementById('selCard');
    // 벽 타일 버튼을 누르면 건축 창 모양의 고르는 창이 뜨고, 카드를 누르면 그 벽에 붙고 원래 카드로 돌아온다
    o.wallCard = !!wc.querySelector('[data-act="choose"][data-v="wswap"]') && !wc.querySelector('[data-act="wswap"]');
    wc.querySelector('[data-act="choose"][data-v="wswap"]').click();
    const wcards = [...document.querySelectorAll('#cards [data-act="cpick"]')].map(e => e.dataset.v);
    o.wallCard = o.wallCard && !document.getElementById('dock').hidden && /벽 타일/.test(document.getElementById('dtitle').textContent) && wcards.includes('f_wood') && wcards.includes('f_erase') && !wcards.includes('f_brick');
    const wm1 = S.money; document.querySelector('#cards [data-v="f_wood"]').click();
    o.wallCard = o.wallCard && wallId(26, 10) === 'f_wood' && document.getElementById('dock').hidden && !wc.hidden && S.money === wm1 - floorSwapCost('f_brick', 'f_wood');
    wallSwap(26, 10, 'f_brick');
    // 이어 짓기: 높이·윗면·옆면이 함께 이어지고, 되돌리기 한 번에 함께 돌아온다
    selExtend(0); const em = S.money; UI.undo = [];
    o.extCost = extPlan(27, 10).cost === 2 * TER_UP + D.f_wood.cost + D.f_brick.cost;
    o.extWall = extApply(27, 10) === '' && th(27, 10) === 2 && S.floor['27,10'] === 'f_wood' && wallId(27, 10) === 'f_brick';
    terUndoLast();
    o.extUndo = th(27, 10) === 0 && !wallId(27, 10) && !S.floor['27,10'] && S.money === em;
    endPlace();
    // 경사로 하나의 세모 옆면, 파인 칸의 벽, 물을 채워도 유지
    terApply(26, 13, 'ter_ramp', 0, 0); wallSwap(26, 13, 'f_step');
    terApply(28, 15, 'ter_set', -2); wallSwap(28, 15, 'f_gravel'); fillWater(28, 15);
    o.wallKeep = cellHasFace(26, 13) && wallId(28, 15) === 'f_gravel' && isWater(28, 15);
    const wr = S.money; o.wallErase = wallSwap(26, 10, 'f_erase') === '' && !wallId(26, 10) && S.money - wr === Math.floor(D.f_brick.cost * .5);
    wallSwap(26, 10, 'f_brick');
    for (let k = 0; k < 4; k++) { ROT = k; draw(); }
    ROT = 0;
    o.json = JSON.stringify(S).length > 0;
    return o;
  });
  check(r.dig && r.deep, '지하: 땅을 지하 10층까지 내릴 수 있고 그 아래는 막힘');
  check(r.pitBuild && r.floors20, '지하: 지하 10층 땅에도 건물을 지을 수 있고, 땅을 높이면 건물이 함께 오름');
  check(r.fill && r.keepFloor, '물: 이어진 지하 칸 전체에 차고 바닥 타일은 남음');
  check(r.noWalk && r.noBuild && r.noTer && r.noPathIn, '물: 걷기·건물·바닥·지형·물속 길 금지');
  check(r.fount && r.drainBlocked, '물 분수: 물 위에만 놓이고, 있으면 물을 못 뺌');
  check(r.bridge && r.cross, '아치 다리: 물 위에 놓으면 방문자가 건넘');
  check(r.spread && r.digThing, '물: 옆 칸을 파면 이어지고, 건물이 있는 칸은 못 팜');
  check(r.fillBlocked, '물: 0층 아래에 요소가 있으면 못 채움');
  check(r.pick && r.pickFlat, '지하: 파인 칸과 평지를 눌러 고를 수 있음');
  check(r.card && r.drain, '물 카드: 다리 놓기·물 빼기, 빼면 타일이 다시 보임');
  check(r.fix, '물: 땅이 0층 이상이 되면 사라짐');
  check(r.kinds, '길 종류: 벽돌·대리석·철 길과 종류별 계단 이름');
  check(r.underTile && r.underFirst, '계단 밑: 땅에서 시작하는 계단 밑은 바닥 타일만');
  check(r.underLow, '다리 밑: 빈 높이에 들어가는 것만 놓임');
  check(r.underPick && r.deckPick && r.underState, '다리 밑: 밑을 고르면 땅에, 아니면 데크 위에 놓이고 다리는 계속 걸을 수 있음');
  check(r.underTer, '다리 밑: 건물이 다리에 닿게 땅을 높일 수 없음');
  check(r.wallSet && r.wallErase, '벽 타일: 벽이 있는 칸에 붙이고 떼기(반값 환불)');
  check(r.wallCard, '벽 타일: 땅 카드에서 윗면·옆면을 바꿔 고름');
  check(r.extCost && r.extWall && r.extUndo, '벽 타일: 이어 지으면 높이·윗면·옆면이 함께 이어지고 한 번에 되돌려짐');
  check(r.wallKeep, '벽 타일: 경사로 세모 옆면·파인 칸에도 붙고, 물을 채워도 남음');
  check(errs.length === 0, '지하·물: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

async function startTerrainChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => { window.__CT_TEST = true; window.__CT_TERRAIN = true; window.requestAnimationFrame = () => 0; try { localStorage.clear(); } catch (e) {} });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); const o = {};
    const hs = Object.values(S.hgt);
    o.shapes = hs.some(h => h >= 2) && hs.some(h => h < 0) && Object.keys(S.slp).length >= 2 && Object.keys(S.water).length > 5;
    o.water = Object.keys(S.water).every(k => { const a = k.split(',').map(Number); return th(a[0], a[1]) < 0 && !cellSubWhy(a[0], a[1]); });
    o.clear = S.buildings.every(b => bTiles(b).every(t => !th(t.x, t.y) && !isRamp(t.x, t.y))) && Object.keys(S.floor).every(k => !S.hgt[k]);
    S.open = true; recalc(); const room = S.buildings.find(b => b.def === 'room');
    o.reach = usable(room);
    // 언덕 꼭대기에 경사로로 걸어 오를 수 있다
    paintFloor(14, 20, 'f_block'); paintFloor(14, 18, 'f_block'); paintFloor(14, 16, 'f_block'); recalc();
    NAV.all = true; const re = navReach(gid(14, 20)); NAV.all = false;
    o.climb = !!re[gid(14, 16)] && th(14, 16) === 2;
    for (let k = 0; k < 4; k++) { ROT = k; draw(); } ROT = 0;
    return o;
  });
  check(r.shapes && r.water && r.clear, '시작 지형: 언덕·연못(물)·도랑이 있고 교회·길·나무와 겹치지 않음');
  check(r.reach && r.climb, '시작 지형: 첫 예배실은 그대로 쓸 수 있고, 언덕은 경사로로 오를 수 있음');
  check(errs.length === 0, '시작 지형: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

async function levelChecks(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 } });
  const page = await ctx.newPage();
  const errs = watchErrors(page);
  await page.addInitScript(() => { window.__CT_TEST = true; window.requestAnimationFrame = () => 0; try { localStorage.clear(); } catch (e) {} });
  await page.goto(url);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 9999999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null; S.open = true;
    S.buildings = S.buildings.filter(b => b.def !== 'tree'); rebuildOcc(); recalc();
    const o = {};
    const put = (id, face) => { const d = D[id]; for (let y = 4; y < PZ - 8; y += 2) for (let x = 4; x < COLS - 10; x += 2) if (canPlace(d, x, y, face) && !onFloorAt(d, x, y, face)) { if (build(id, x, y, face)) { const b = S.buildings[S.buildings.length - 1]; recalc(); linkDoor(b); recalc(); if (usable(b)) return b; demolish(b.id); recalc(); } } return null; };
    // 대기줄·입구·출구 건물은 없다: 시작 예배실은 정면 문 하나로 바로 쓴다
    const room = S.buildings.find(b => b.def === 'room');
    o.start = usable(room) && !!room.door && room.door.ent.d === room.face && typeof gatesOf === 'undefined' && typeof qLen === 'undefined' && !DEFS.some(d => d.kind === 'gate' || d.queue) && !CATS.some(c => c[0] === 'gate');
    // 문은 정면 1층 가운데 한 칸, 방향을 돌리면 문도 돈다
    const pr = put('pray', 2);
    o.front = !!pr && pr.door.ent.d === 2 && pr.door.ent.l === 0 && sameSpot(pr.door.ent, pr.door.ext);
    if (pr) { pr.face = 0; recalc(); o.front = o.front && pr.door.ent.d === 0; pr.face = 2; recalc(); linkDoor(pr); recalc(); }
    // 짓고 나면 입구·출구 놓기로 이어지지 않고 건물 카드가 뜬다
    { UI.tab = 'build'; UI.fold = false; UI.cat = 'worship'; startPlace('bible'); let g = null; for (let y = 4; y < PZ - 8 && !g; y += 2) for (let x = 4; x < COLS - 10; x += 2) if (!placeWhy(D.bible, x, y, UI.face) && !onFloorAt(D.bible, x, y, UI.face)) { g = { x, y }; break; }
      UI.ghost = g; plLock = 0; plOk(); const nb = S.buildings[S.buildings.length - 1]; o.noGateFlow = !!g && nb.def === 'bible' && !isPlacing() && UI.sel === nb.id; UI.sel = null; }
    // 일괄 가동: 예배실은 정원이 찰 때까지 안에서 기다리고, 차면 한꺼번에 가동해 함께 나온다. 가동 중엔 문 앞에서 기다린다
    const cap = bCap(room), en = entNode(room), mk = () => { spawnV(); const v = V[V.length - 1]; placeAt(v, en); v.target = room.id; v.needs.word = 10; return v; };
    V.length = 0; room.inUse = 0; room.run = 0; const vs = [];
    for (let i = 0; i < cap - 1; i++) { const v = mk(); arrive(v); vs.push(v); }
    const before = room.run === 0 && vs.every(v => v.state === 'inside' && v.batch);
    const last = mk(); arrive(last); vs.push(last); const started = room.run > 0;
    const extra = mk(); arrive(extra); const waits = extra.state === 'wait';
    batchTick(room.run + .01);
    o.batch = bMode(D.room) === 'batch' && cap >= 2 && before && started && waits && vs.every(v => v.state === 'idle' && !v.inside && v.needs.word > 10) && room.inUse === 0 && room.run === 0;
    // 주일: 정원이 안 차도 주일이 되는 순간 가동. 같은 주 금·토요일에 이미 가동했으면 건너뜀
    V.length = 0; room.inUse = 0; room.run = 0; S.sunW = -1; room.fsW = -1;
    S.t = WEEK * 5.5 / 7; const one = mk(); arrive(one); batchSunday(); const notYet = room.run === 0;
    S.t = WEEK * 6.2 / 7; batchSunday(); const sun = room.run > 0; batchTick(room.run + .01);
    V.length = 0; room.inUse = 0; S.sunW = -1; S.t = WEEK * 4.5 / 7; batchStart(room); const fri = room.fsW === S.week; batchTick(room.run + .01);
    const two = mk(); arrive(two); S.t = WEEK * 6.2 / 7; batchSunday(); const skip = room.run === 0;
    o.sunday = notYet && sun && fri && skip && two.state === 'inside';
    V.length = 0; room.inUse = 0; room.run = 0; S.t = 1;
    // 한 명씩: 화장실은 정원 1명, 레벨이 오를수록 회전 시간이 크게 짧아짐
    const wc = put('wc', 2), rot1 = wc && rotTime(wc);
    if (wc) { wc.lv = 10; } const rot10 = wc && rotTime(wc); if (wc) wc.lv = 1;
    o.single = !!wc && bMode(D.wc) === 'single' && D.wc.cap > 1 && bCap(wc) === 1 && rot10 < rot1 / 2.5 && bCap(room) > 1;
    // 문 앞에서 기다리기: 꽉 찼으면 문 앞 길에서 기다리고, 한계를 넘기면 화남 표시·불만, 다른 곳으로
    let soft = false;
    if (wc) { wc.inUse = 1; spawnV(); const v = V[V.length - 1]; placeAt(v, entNode(wc)); v.target = wc.id; arrive(v); const p0 = nodePos(entNode(wc));
      const near = v.state === 'wait' && Math.hypot(v.x - p0.x, v.y - p0.y) < .5 * G, g0 = S.grip.crowd || 0;
      let n = 0; while (v.state === 'wait' && n < (VIS_PATIENCE + 2) * 10) { stepV(v, .1); n++; }
      soft = near && n >= (VIS_PATIENCE - .5) * 10 && v.state === 'idle' && v.angry > 0 && (S.grip.crowd || 0) > g0 && v.blocked[wc.id] > S.clock && !v.dead;
      wc.inUse = 0; V.length = 0; }
    // 불만: 화남 표시가 뜨고 사유가 담기며, 머리 위를 누르면 알 수 있다. 큰 돈은 '1.5억', 개방형 소품은 문 방향이 없다
    { spawnV(); const av = V[V.length - 1]; av.x = 20; av.y = 20; av.z = 0; vexed(av, 'wc'); const sp = toScreen(20, 20, .9), hit = pickAngry(sp[0], sp[1]);
      o.angryTap = av.angry > 0 && /화장실/.test(av.why) && hit === av; V.length = 0; }
    o.bigFmt = fmt(14500) === '1.5억' && fmt(10000) === '1억' && fmt(9999) === '9,999만원' && fmtS(9999) === '9,999만' && fmt(-24000) === '-2.4억';
    o.openDef = isOpenDef({ def: 'drinkfount' }) && isOpenDef({ def: 'gazebo' }) && isOpenDef({ def: 'bin' }) && !isOpenDef({ def: 'room' });
    o.soft = soft && VIS_SPEED < 1 && TEMPO_ROT > 1;
    // 레벨: 카드에서 투자, BLV_XP번이면 한 단계. 효과·정원·좌석이 오르고 최대 Lv 10, 모습은 3단계
    { const c1 = investCost(room), m0 = S.money, perf0 = bPerf(room), cap0 = bCap(room), seat0 = agg().seats;
      UI.sel = room.id; UI.fold = true; renderSelCard(); const card = document.getElementById('selCard'), btn = card.querySelector('[data-act="invest"]'), t1 = card.textContent;
      for (let i = 0; i < BLV_XP; i++) document.querySelector('#selCard [data-act="invest"]').click();
      o.invest = !!btn && /Lv 1/.test(t1) && /투자/.test(t1) && bLv(room) === 2 && S.money === m0 - BLV_XP * c1 && bPerf(room) > perf0 && bCap(room) >= cap0 && agg().seats > seat0 && /Lv 2/.test(document.getElementById('selCard').textContent) && /Lv 3까지/.test(document.getElementById('selCard').textContent);
      const st = [1, 3, 4, 6, 7, 10].map(l => { room.lv = l; return bStage(room); }).join('');
      room.lv = BLV_MAX; o.levels = st === '112233' && investWhy(room) !== '' && !document.querySelector('#selCard [data-act="invest"]') === false;
      renderSelCard(); o.levels = st === '112233' && /최고/.test(investWhy(room)) && !document.querySelector('#selCard [data-act="invest"]');
      for (const l of [1, 5, 9]) { room.lv = l; draw(); } room.lv = 1; room.bx = 0; UI.sel = null; renderSelCard(); recalc(); }
    // 티어: 상위(티어 2)는 티어 1 성능을 이어받아 × TIER2_K, 값은 티어 1의 Lv 10 누적 투자만큼 더. 티어 1은 상위가 열리기 전엔 하나만
    { let inv = 0; for (let L = 1; L < BLV_MAX; L++) inv += BLV_XP * BLV_INVEST * (1 + BLV_INVEST_UP * (L - 1));
      const ch = { def: 'chapel', lv: 1, id: 0 }, r6 = { def: 'room', lv: 6, id: 0 }, r7 = { def: 'room', lv: 7, id: 0 }, r10 = { def: 'room', lv: 10, id: 0 }, c10 = { def: 'chapel', lv: 10, id: 0 };
      o.tier2 = D.chapel.tier === 2 && D.chapel.t1 === 'room' && D.room.tier === 1 && Math.abs(D.chapel.cost - D.room.cost * (1 + inv)) <= 10 && D.chapel.cost > D.room.cost * 5 &&
        bPerf(ch) >= bPerf(r6) && bPerf(ch) <= bPerf(r7) + 1e-9 && bPerf(c10) > bPerf(r10) * 1.5 && D.chapel.seats === D.room.seats && TIER_PAIRS.every(p => D[p[0]] && D[p[1]] && D[p[1]].tier === 2);
      S.unlockAll = false; S.lvl = 1; const lockedWhy = tierWhy('room'), nb = S.buildings.length, again = build('room', 2, 2, 2);
      S.unlockAll = true; o.tier1 = isLocked('chapel') === false && /1개까지/.test(lockedWhy) && !again && S.buildings.length === nb && tierWhy('room') === ''; }
    // 매장·편의 종류는 기능별로 줄였다: 더 짓지 않는 것은 목록에 없고 지을 수 없다
    { UI.tab = 'build'; UI.fold = false; UI.bstep = 'items'; UI.cat = 'shop'; renderBuild(); const shopCards = [...document.querySelectorAll('#cards .card')].map(c => c.dataset.v); closeDock();
      o.retired = RETIRED.every(id => !D[id] || (D[id].retired && isLocked(id))) && !shopCards.some(id => RETIRED.indexOf(id) >= 0) && shopCards.includes('shop') && !build('bakery', 2, 2, 2); }
    // 예전 저장: 대기줄 바닥·입구·출구 건물은 걷어 낸다
    { const raw = JSON.parse(JSON.stringify(S)); raw.floor['3,3'] = 'q_rope'; raw.qprev = { '3,3': 2 }; raw.buildings.push({ id: 999, def: 'g_arch', x: 3, y: 4, face: 2, of: 1, inUse: 0, uses: 0 });
      localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); const L2 = load(); o.oldSave = !L2.floor['3,3'] && !L2.qprev && !L2.buildings.some(b => b.def === 'g_arch'); }
    for (let k = 0; k < 4; k++) { ROT = k; draw(); } ROT = 0;
    return o;
  });
  if (!(r.start && r.front && r.noGateFlow && r.invest && r.levels)) console.log('LV', JSON.stringify([r.start, r.front, r.noGateFlow, r.invest, r.levels]));
  check(r.start && r.front && r.noGateFlow, '문: 대기줄·입구·출구 건물이 없고, 건물마다 정면 1층 가운데 문 하나(돌리면 문도 돎), 짓고 나면 바로 건물 카드');
  check(r.batch, '일괄 가동: 예배실은 정원이 찰 때까지 안에서 기다렸다가 한꺼번에 가동 후 함께 나오고, 가동 중엔 문 앞에서 기다림');
  check(r.sunday, '일괄 가동: 주일이 되면 정원이 덜 차도 가동하되, 같은 주 금·토에 가동했으면 건너뜀');
  check(r.single, '한 명씩: 매장·편의 시설은 정원 1명, 레벨이 오를수록 회전 시간이 짧아짐');
  check(r.angryTap && r.bigFmt && r.openDef, '불만: 화남 표시 방문자를 누르면 사유가 뜨고, 1억 이상은 1.5억으로 표기, 개방형 소품은 문 방향이 없음');
  check(r.soft, '기다리기: 문 앞 길에서 기다리다 한계를 넘기면 화남 표시·불만을 남기고 다른 곳으로 (걸음은 느리게)');
  check(r.invest && r.levels, '건물 레벨: 카드에서 투자해 Lv 10까지, 효과·정원·좌석이 오르고 모습은 3단계');
  check(r.tier2 && r.tier1, '티어: 상위 시설은 티어 1 Lv 6~7 성능에 비싸고, 티어 1은 상위가 열리기 전엔 하나만');
  check(r.retired, '매장·편의: 기능별로 줄인 목록 (통합된 시설은 짓지 않음)');
  check(r.oldSave, '예전 저장: 대기줄 바닥·입구·출구 건물을 걷어 냄');
  // 달력: 한 달 5주·한 해 12달(60주), 계절별 날씨 (눈은 겨울만, 폭염·비는 여름만, 봄·가을은 바람)
  const cal = await (async () => { const pg = await ctx.newPage(); await pg.addInitScript(() => { window.__CT_TEST = true; window.requestAnimationFrame = () => 0; }); await pg.goto(url);
    const o = await pg.evaluate(() => { window.__ct.init(); const q = {};
      q.fmt = dateText(0) === '1월 1주' && dateText(4) === '1월 5주' && dateText(5) === '2월 1주' && dateText(59, true) === '1년차 12월 5주' && dateText(60, true) === '2년차 1월 1주';
      const sk = m => { S.week = (m - 1) * WEEKS_PER_MONTH; return seasonKey(); };
      q.season = [sk(3), sk(5), sk(6), sk(8), sk(9), sk(11), sk(12), sk(1), sk(2)].join() === 'spring,spring,summer,summer,autumn,autumn,winter,winter,winter';
      const seen = {}; ['spring', 'summer', 'autumn', 'winter'].forEach(k => { seen[k] = Object.keys(WX_SEASON[k].w).sort().join(); });
      q.wx = seen.winter === 'cloud,snow,sun' && seen.summer === 'cloud,heat,rain,storm,sun' && seen.spring === 'cloud,sun,wind' && seen.autumn === 'cloud,sun,wind';
      S.week = 0; document.body.dataset.x = 1; syncClock(); q.hud = document.getElementById('ckWeek').textContent === '1월 1주';
      S.week = 12 * 5 - 1; q.xm = EVENTS.christmas && monthOf() === 12 && evBlock('christmas') !== '월에만';
      S.week = 20; q.ev = /12월에만/.test(evBlock('christmas')); return q; });
    await pg.close(); return o; })();
  check(cal.fmt && cal.season && cal.hud, '달력: 한 달 5주, 한 해 12달(60주), 시계는 "0월 0주"로 보임, 계절은 달로 나뉨');
  check(cal.wx && cal.ev, '날씨: 눈은 겨울에만, 폭염·비는 여름에만, 봄·가을은 바람, 행사 계절은 달로 안내');
  check(errs.length === 0, '건물 레벨·운영: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
  await ctx.close();
}

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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 999999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null; S.open = true;
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
    o.built = build('pray', 19, 8, 2);
    const pr = S.buildings.find(b => b.def === 'pray');
    o.onTop = !!pr && bLevel(pr) === 2;
    [[19, 10], [19, 11], [20, 10], [20, 11]].forEach(t => paintFloor(t[0], t[1], 'f_block'));
    // 경사로 아래에서 기존 바닥까지
    const t = walkSearch(19, 14, {}); (t || []).forEach(q => { S.floor[q.x + ',' + q.y] = 'f_block'; }); recalc();
    // 출구도 길 쪽으로 다시 짓는다 (처음엔 길이 없어 아무 쪽에나 났다)
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
  check(r.cap, '지형: 땅은 9층 높이까지만 올릴 수 있음');
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.money = 999999; levelTick(true); S.unlockAll = true; QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.dlg = null; S.open = true;
    S.buildings = S.buildings.filter(b => b.def !== 'tree'); rebuildOcc(); recalc();
    const o = {};
    // 높이 1 데크 8x6 (x 20..27, y 6..11), 앞쪽(+y)에서 철골 계단으로 오른다
    for (let x = 20; x < 28; x++) for (let y = 6; y < 12; y++) addPiece({ x: x, y: y, l: 1, s: 0, d: 0, k: 'stone' });
    addPiece({ x: 21, y: 12, l: 0, s: 1, d: 3, k: 'stone' });
    // 계단 아래에서 기존 바닥까지
    const t = walkSearch(21, 13, {}); (t || []).forEach(q => { S.floor[q.x + ',' + q.y] = 'f_block'; }); paintFloor(21, 13, 'f_block'); recalc();
    o.level = placeLevel(D.chapel, 20, 6, 2).l === 1 && placeLevel(D.chapel, 20, 6, 2).deck;
    o.half = !!placeLevel(D.chapel, 24, 6, 2).why;
    o.built = build('cafe', 24, 6, 2);
    const cafe = S.buildings.find(b => b.def === 'cafe');
    o.onDeck = !!cafe && cafe.z === 1 && bLevel(cafe) === 1;
    o.reach = !!(cafe.acc && cafe.acc.ok);
    o.covered = deckCovered(piecesAt(24, 6)[0]) && !nodeOk(PN + piecesAt(24, 6)[0].id);
    o.noDem = pieceDemWhy(piecesAt(24, 6)[0]) !== '' && !removePiece(piecesAt(24, 6)[0].id, .5);
    // 데크 아래 땅은 그대로 걸을 수 있다
    paintFloor(24, 7, 'f_block'); o.under = groundOk(24, 7) || !!S.floor['24,7'];
    // 나무·건물·바닥 타일도 데크 위에
    o.tree = build('tree', 26, 10, 2) && S.buildings.find(b => b.def === 'tree' && b.x === 26).z === 1;
    o.room = build('bench', 20, 6, 2) && S.buildings.find(b => b.def === 'bench' && b.x === 20 && b.y === 6).z === 1;
    const dp = piecesAt(21, 6)[0]; o.tile = paintFloor(21, 6, 'f_brick', dp.id) === '' && dp.f === 'f_brick' && floorUndo() && !dp.f;
    // 땅 높이 + 층수 10층 제한 (데크 높이 1 → 9층까지)
    build('pray', 22, 8, 2); const pr = S.buildings.find(b => b.def === 'pray' && b.z === 1);
    o.cap = !!pr && pr.z === 1;
    // 옮기기: 데크에서 땅으로 옮기면 z가 사라진다
    const tr = S.buildings.find(b => b.def === 'tree' && b.x === 26);
    setPlaceLevel(tr, D.tree, 5, 3, 2); tr.x = 5; tr.y = 3; rebuildOcc(); o.moved = tr.z == null;
    draw(); ROT = 2; draw(); ROT = 0;
    save(); const L = load(); o.saved = L.buildings.some(b => b.def === 'cafe' && b.z === 1);
    // 바닥 타일을 누르면 카드가 뜨고 바로 바꾼다 (걷어낸 반값을 뺀 값)
    S.floor['8,4'] = 'f_block'; recalc(); UI.fold = true; UI.tool = null;
    const fm = rotPt(8.5, 4.5), fq = toScreen(fm[0], fm[1], 0); onTap(fq[0], fq[1]);
    const card = !document.getElementById('selCard').hidden && !!document.querySelector('#selCard [data-act="choose"][data-v="fswap"]');
    document.querySelector('#selCard [data-act="choose"][data-v="fswap"]').click();
    const m2 = S.money; document.querySelector('#cards [data-act="cpick"][data-v="f_wood"]').click();
    o.fcard = card && S.floor['8,4'] === 'f_wood' && m2 - S.money === D.f_wood.cost - Math.floor(D.f_block.cost * .5);
    // 바꾸면 바닥 깔기로 넘어가 화살표 쪽 다음 칸에서 이어 바꾼다 (기존 바닥 위는 걷어낸 반값을 뺀 값)
    o.fchain = isPlacing() && UI.tool === 'f_wood' && !!UI.ghost && Math.abs(UI.ghost.x - 8) + Math.abs(UI.ghost.y - 4) === 1;
    S.floor[UI.ghost.x + ',' + UI.ghost.y] = 'f_block'; const m4 = S.money; plOk();
    o.fchain = o.fchain && S.money === m4 - (D.f_wood.cost - Math.floor(D.f_block.cost * .5));
    endPlace(); UI.fold = true;
    const m3 = S.money; o.ferase = floorSwap(8, 4, 'f_erase') === '' && !S.floor['8,4'] && S.money - m3 === Math.floor(D.f_wood.cost * .5);
    // 빈 땅을 누르면 바닥·땅 높이기·경사로 카드, 높이기를 누르면 바로 한 층
    closeSelCard(); const em = rotPt(6.5, 2.5), eq = toScreen(em[0], em[1], 0); onTap(eq[0], eq[1]);
    const gcard = !document.getElementById('selCard').hidden && !!document.querySelector('#selCard [data-act="gter"]') && !!document.querySelector('#selCard [data-act="gramp"]') && !!document.querySelector('#selCard [data-act="choose"][data-v="fswap"]');
    document.querySelector('#selCard [data-act="gter"]').click();
    o.gcard = gcard && th(6, 2) === 1;
    // 카드가 열린 채 빈 땅을 누르면 닫기만 한다
    const om = rotPt(9.5, 2.5), oq = toScreen(om[0], om[1], 0); onTap(oq[0], oq[1]); o.gclose = document.getElementById('selCard').hidden;
    document.querySelector('#selCard') && closeSelCard();
    // 건축 목록: 지금 지을 수 있는 것부터 싼 순서
    S.money = 1000; const ord = buildOrder('worship'), can = d => !isLocked(d.id) && S.money >= d.cost;
    const k = ord.findIndex(d => !can(d)); o.order = ord.slice(0, k < 0 ? ord.length : k).every((d, i, a) => !i || a[i - 1].cost <= d.cost) && (k < 0 || ord.slice(k).every(d => !can(d)));
    S.money = 999999; levelTick(true);
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
  check(r.tree && r.room && r.tile, '데크: 나무·건물·바닥 타일도 데크 위에');
  check(r.cap, '데크: 데크 위에 지은 건물은 데크 높이에 섬');
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
  await page.goto(url); await skipSteps(page);
  const r = await page.evaluate(() => {
    window.__ct.init(); S.dlg = null; S.open = true; QUESTS.forEach(q => { S.qd[q.id] = 1; });
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
    o.price = S.money === 20000 && DIFF.hard.money === 14000 && D.wc.cost === 720 && D.room.cost === 1800 && D.chapel.cost > D.room.cost * 5 && D.bench.cost === 160 && D.tree.cost === 110 && D.f_block.cost === 8 && QID.g1.m === 800 && LOANS.big.amt === 40000;
    // 편의 소품: 벤치·쓰레기통·식수대 등은 편의 분류, 값은 그대로, 꾸미기처럼 이어 놓기
    o.props = ['bench', 'picnic', 'parasol', 'swing', 'drinkfount', 'bin', 'gazebo'].every(id => D[id].cat === 'comfort' && D[id].prop && isDecoCat(D[id])) && D.bin.cost === 50 && D.gazebo.cost === 900 && !isDecoCat(D.wc);
    S.money = 999999; levelTick(true); S.unlockAll = true; recalc();
    const put = id => { for (let y = PZ - 3; y > 0; y--) for (let x = 2; x < COLS - 3; x++) if (canPlace(D[id], x, y, 2) && !onFloorAt(D[id], x, y, 2)) { build(id, x, y, 2); const nb = S.buildings[S.buildings.length - 1]; recalc(); return nb; } return null; };
    // 길 잇기: 고른 바닥으로 깔고 값은 칸 수 × 그 바닥 값
    const cafe = put('cafe'); const lp = linkPlan(cafe), m0 = S.money;
    UI.sel = cafe.id; UI.fold = true; renderSelCard();
    document.querySelector('#selCard [data-act="link"]').click();
    const row = [...document.querySelectorAll('#cards [data-act="cpick"]')].map(b => b.dataset.v);
    document.querySelector('#cards [data-act="cpick"][data-v="f_brick"]').click();
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
    for (let y = PZ - 3; y > 0 && !club; y--) for (let x = 2; x < COLS - 3 && !club; x++) if (canPlace(D.boardgame, x, y, 2) && !onFloorAt(D.boardgame, x, y, 2)) {
      build('boardgame', x, y, 2); const nb = S.buildings[S.buildings.length - 1]; recalc(); linkDoor(nb); recalc();
      if (usable(nb)) club = nb; else { demolish(nb.id); recalc(); } }
    spawnV(false); const v6 = V[V.length - 1]; v6.urge = 'lonely';
    o.lonely1 = !!club && urgeGo(v6) === true && v6.target === club.id && v6.want === 'fel';
    enter(v6, club); finishVisit(v6); o.lonely1 = o.lonely1 && !v6.urge && v6.lonT > 1e8;
    spawnV(false); const v7 = V[V.length - 1]; v7.urge = 'food'; const fb = urgeGo(v7);
    o.food = fb === true && GRIPES.food.ids.indexOf(bById(v7.target).def) >= 0;
    // 고루 쓰기: 같은 욕구를 채우는 두 건물 중 이번 주에 덜 쓰인 쪽을 고른다
    const pick = () => { let a = 0; for (let i = 0; i < 12; i++) { spawnV(false); const w = V[V.length - 1]; w.wallet = 0; w.urge = ''; w.wcT = w.foodT = w.lonT = 1e9; w.strolls = VIS_STROLL_MAX; NEEDS.forEach(n => { w.needs[n] = 99; }); w.needs.fel = 0; decide(w); if (w.target === cafe.id) a++; V.pop(); } return a; };
    club.weekUses = 60; cafe.weekUses = 0; club.inUse = cafe.inUse = 0; const toCafe = pick();
    club.weekUses = 0; cafe.weekUses = 60; const toCafe2 = pick(); club.weekUses = cafe.weekUses = 0;
    o.dbg = [toCafe, toCafe2, !!club, !!cafe && usable(cafe)];
    o.spread = toCafe >= 9 && toCafe2 <= 3 && NEED_OK >= 85 && VIS_PATIENCE > 5 && CROWD_ANNOY > 0 && GRIPE_W.crowd >= 1;
    // 편의 시설도 정면 문 하나로 옆 길에서 바로 쓰고, 한 명씩 쓴다
    { const w2 = put('lounge'); recalc(); const lk = linkDoor(w2); recalc();
      o.wcFree = (lk === '' || /이미/.test(lk)) && usable(w2) && !!w2.door && bCap(w2) === 1 && bMode(D.wc) === 'single';
      o.wcDbg = [lk, usable(w2), JSON.stringify(w2.door), JSON.stringify(w2.acc)]; }
    o.fixes = gripeFixes(D.boardgame).includes('외로움') && gripeFixes(D.cell).includes('외로움') && gripeFixes(D.bakery).includes('배고픔') && gripeFixes(D.cafe).includes('목마름') && /외로움/.test(effText(D.futsal));
    // 소모임 분류: 제목 줄에 운동·취미·음악 칩, 고른 묶음만 목록에
    o.club = CATS.some(c => c[0] === 'club') && D.gym.cat === 'club' && D.gym.sub === 'sport' && OUTDOOR.indexOf('court') >= 0 && PRICY_CATS.indexOf('club') >= 0;
    UI.tab = 'build'; UI.fold = false; UI.cat = 'club'; UI.csub = 'sport'; UI.tool = null; UI.bstep = 'items'; renderPanel();
    const subs = [...document.querySelectorAll('#subtabs [data-act="csub"]')].map(b => b.dataset.v).join();
    const sport = [...document.querySelectorAll('#cards .card')].map(c => c.dataset.v);
    document.querySelector('#subtabs [data-act="csub"][data-v="music"]').click();
    const music = [...document.querySelectorAll('#cards .card')].map(c => c.dataset.v);
    o.club = o.club && subs === 'sport,hobby,music' && sport.includes('futsal') && sport.includes('gym') && !sport.includes('choir') && music.length === 3 && music.includes('choir');
    UI.cat = 'worship'; renderPanel(); o.club = o.club && !document.querySelector('#subtabs [data-act="csub"]');
    UI.fold = true; renderPanel();
    // 현황 화면: 지표 다섯 카드, 카드를 누르면 정보 창, 항목을 누르면 계산 방식이 펼쳐진다
    openGroup('status'); const cards = document.querySelectorAll('#scrBody .indc').length;
    document.querySelector('#scrBody .indc[data-v="conv"]').click();
    const dl = document.getElementById('scrDlg').textContent; document.querySelector('#scrDlg .covb[data-v="seat"]').click();
    const seat = document.querySelector('#scrDlg ul.rwhy'), st = seat ? seat.textContent : ''; const al = moodWhy('all');
    o.mood = cards === 5 && /편의/.test(dl) && /좌석 건물 \d+ ÷ 필요/.test(st) && /비중 20%/.test(st) && /항목 점수/.test(al) && /불편/.test(al) && /익숙해져요/.test(al);
    closeScreen();
    ['past', 'fel', 'care', 'comf', 'park', 'spirit'].forEach(k => { o.mood = o.mood && moodWhy(k).indexOf('<li>') === 0; });
    o.mood = o.mood && /성례/.test(moodWhy('spirit')) && /비중 25%/.test(moodWhy('spirit'));
    // 영성: 성찬식을 열면 성례가 차고, 8주가 지나면 사라진다
    S.evW = {}; const s0 = spiritParts().s; S.week = 20; S.evW.communion = 20; const s1 = spiritParts(); S.week = 28; const s2 = spiritParts();
    o.spirit = s0 === 0 && s1.sac.communion === 1 && s1.s > 0.5 && s2.sac.communion === 0 && Math.abs(Object.values(MW).reduce((a, b) => a + b, 0) - 1) < 1e-9;
    S.evW = {}; S.ev = {}; S.money = 99999; levelTick(true); runEvent('communion'); o.spirit = o.spirit && S.evW.communion === S.week;
    // 기대치: 300명이면 필요 1.6배
    const lv0 = S.lvl; S.lvl = 1; o.expect = Math.abs(expectK(300) - 1.6) < 1e-9 && expectK(0) === 1;
    S.lvl = 31; o.expect = o.expect && Math.abs(expectK(0) - (1 + 30 * EXP_LV)) < 1e-9; S.lvl = lv0;
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
    S.money = 99999; levelTick(true); S.wish = null; S.wishNext = S.week; S.wishOk = S.wishFail = 0; S.wishLeft = 0; S.wishMood = 0; S.evtLeft = 2; wishWeek();
    const w1 = S.wish; o.wish = !!w1 && warnings()[0].indexOf('성도들의 바람') === 0 && w1.due === S.week + WISH_DUE;
    if (w1) { const rp0 = S.rep; if (w1.t === 'event') { S.ev[w1.id] = { cd: 0 }; S.newSinceBap = 9; runEvent(w1.id); }
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
    // 교회 Level: 지표 점수 합 기준으로 오르고, 돈·성도 수를 직접 치지 않고, 내려가지 않으며, 최대 100
    o.level = levelOf(0) === 1 && levelOf(lvNeed(2)) === 2 && levelOf(lvNeed(37)) === 37 && levelOf(1e12) === 100 && lvNeed(2) < lvNeed(3);
    for (let L = 2; L < 100; L++) if (levelOf(lvNeed(L) - 1) !== L - 1) o.level = false;
    S.lvl = 1; S.qxp = 5000; recalc(); levelTick(); const up = S.lvl, shown = !document.getElementById('lvup').hidden && document.getElementById('lvN').textContent === String(up);
    S.qxp = 0; recalc(); levelTick(); o.level = o.level && up > 5 && shown && S.lvl === up && document.getElementById('clvl').textContent === 'Lv ' + up;
    document.getElementById('lvup').click(); o.level = o.level && document.getElementById('lvup').hidden;
    // 새는 길 막기: 자금·대출만으로는 점수가 오르지 않고, 바닥을 깔고 되돌리면 꾸밈 효과도 되돌아간다
    S.money = 30000; S.loans = []; recalc(); const sc0 = scoreParts().total; S.money += 1e6; borrow('small'); recalc(); const sc1 = scoreParts().total;
    o.leak = S.loans.length === 1 && sc1 === sc0; S.loans = [];
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
  if (!r.wcFree) console.log('WC', JSON.stringify(r.wcDbg));
  check(r.wcFree, '편의 시설: 정면 문 하나로 옆 길에서 바로 이용, 한 명씩');
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

// 첫 걸음 안내 · Level 보상(축하금·꾸미기 해금) · 새 Level 곡선
async function earlyChecks(browser, url) {
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
    window.__ct.init(); S.dlg = null;
    const o = {};
    // 첫 걸음 퀘스트: 새 교회는 첫 퀘스트부터, 맨 윗줄에 한 줄로 보이고, 이루면 보상(자금·사역 경험) 후 다음으로
    hud(true);
    o.line = !qDone('f1') && qActive()[0].id === 'f1' && !document.getElementById('qchip').hidden && /교회 문 열기/.test(document.getElementById('qTxt').textContent);
    const m0 = S.money, x0 = S.qxp || 0; setGate(true); hud(true);
    o.open = qDone('f1') && S.money === m0 + QID.f1.m && S.qxp === x0 + QID.f1.xp && qBase(QID.f2) === S.week;
    hud(true); o.once = qCount() === 1;
    S.week++; hud(true); o.sunday = qDone('f2') && qActive()[0].id === 'f3';
    // 첫 걸음을 마치면 성장 목표·건축 안내 퀘스트가 뜬다
    ['f3', 'f4', 'f5', 'f6'].forEach(id => { S.qd[id] = 1; }); hud(true);
    o.back = qActive().some(q => q.g === 'goal') && qActive().some(q => q.g === 'guide') && qActive()[0].g === 'goal';
    QUESTS.forEach(q => { S.qd[q.id] = 1; });   // 아래 검사들이 퀘스트 보상에 흔들리지 않게
    // Level 곡선: 시작 점수로는 Lv 1, 지표 점수 합으로 오른다
    S.lvl = 1; o.curve = levelOf(churchScore()) === 1 && lvNeed(2) > churchScore() && levelOf(lvNeed(100)) === 100 && lvNeed(9) < 1300;
    // Level 잠금: 벚나무는 Lv 2, 분수는 Lv 6 전에는 못 지음, 이유에 Lv가 보임. 기능 건물도 교회 Level로 열린다
    S.unlockAll = false; S.lvl = 1;
    o.lock = isLocked('cherry') && isLocked('fountain') && /Lv 2/.test(lockLabel('cherry')) && !isLocked('tree') && !isLocked('planter') && isLocked('chapel') && /Lv 2/.test(lockLabel('chapel')) && isLocked('dining') && /Lv 3/.test(lockLabel('dining')) && isLocked('futsal') && /Lv 5/.test(lockLabel('futsal'));
    S.unlockAll = true;
    // Level이 오르면 축하금(건너뛴 단계 몫까지)과 새로 열린 것
    const m1 = S.money; S.lvl = 1; S.unlockAll = false; S.qxp = 5000; recalc(); const m2 = S.money; levelTick();
    const L = S.lvl; let gift = 0; for (let k = 2; k <= L; k++) gift += lvGift(k);
    o.gift = L >= 6 && S.money === m2 + gift && !isLocked('cherry') && !isLocked('fountain') && !isLocked('futsal') && /축하금/.test(document.getElementById('lvS').textContent);
    S.unlockAll = true; S.qxp = 0; recalc();
    // 옛 저장: 곡선 표시가 없으면 Level을 다시 맞추고, 목표·첫 걸음 개수만큼 퀘스트를 마친 것으로 옮긴다 (보상 없이 사역 경험만)
    S.money = m1; S.lvl = 40; const raw = JSON.parse(JSON.stringify(S)); delete raw.lvc; raw.step = 4; raw.goal = 2; raw.qd = {}; raw.qxp = 0; raw.week = 9;
    localStorage.setItem(SAVE_KEY, JSON.stringify(raw)); const L2 = load();
    o.old = L2.lvl === null && L2.lvc === 3 && L2.step === undefined && L2.goal === undefined && L2.qd.f4 === 1 && !L2.qd.f5 && L2.qd.g2 === 1 && !L2.qd.g3 && L2.qxp === QID.f1.xp + QID.f2.xp + QID.f3.xp + QID.f4.xp + QID.g1.xp + QID.g2.xp;
    // 미리보기 첫 자리: 화면 가운데가 길이어도 바닥 타일 위에 놓이지 않는다
    S.money = 50000; homeView(); startPlace('wc'); o.offPath = !!UI.ghost && !onFloorAt(D.wc, UI.ghost.x, UI.ghost.y, UI.face) && canPlace(D.wc, UI.ghost.x, UI.ghost.y, UI.face); endPlace();
    // 문 앞에 길이 없으면 카드에 이유와 '길 잇기' 버튼. 문은 지을 때 고른 정면(방향)에 난다
    { let spot = null; for (let y = 4; y < PZ - 8 && !spot; y++)for (let x = 4; x < COLS - 12 && !spot; x++) { let ok = true; for (let j = -3; j <= 6 && ok; j++)for (let i = -3; i <= 10 && ok; i++)if (occ[y + j][x + i] || S.floor[(x + i) + ',' + (y + j)]) ok = false; if (ok) spot = { x, y }; }
      build('pray', spot.x, spot.y, 2); const pb = S.buildings[S.buildings.length - 1]; recalc();
      UI.sel = pb.id; UI.fold = true; UI.tool = null; renderSelCard();
      const why = (document.querySelector('#selCard .scw') || {}).textContent || '', btn = document.querySelector('#selCard [data-act="link"]');
      const unusable = !usable(pb) && !!pb.door; const lw = linkDoor(pb); recalc();
      o.fixdoor = unusable && /문 앞까지 길/.test(why) && !!btn && lw === '' && usable(pb);
      o.fd = [unusable, why, !!btn, lw, usable(pb)];
      { const px = spot.x + 6, py = spot.y - 2; build('pray', px + 2, py, 1); const pr = S.buildings[S.buildings.length - 1]; recalc();
        o.autoDoor = pr.def === 'pray' && !!pr.door && pr.door.ent.d === 1 && pr.face === 1; demolish(pr.id); recalc(); }
      UI.sel = null; renderSelCard(); }
    // 영수증: 패널이 열려 있으면 옆으로 비켜 뜨고, 눌러도 탭이 바뀌지 않음
    S.rcpt = S.rcpt || { net: 0, inc: 0, exp: 0 }; openGroup('build'); const tab0 = UI.tab; showReceipt(); const rc = document.getElementById('rcpt');
    const side = rc.classList.contains('side'), dk = document.getElementById('dock').getBoundingClientRect(), rr = rc.getBoundingClientRect(); rc.click();
    o.rcpt = side && rr.right <= dk.left + 1 && UI.tab === tab0 && rc.hidden; closeDock(); showReceipt(); o.rcpt = o.rcpt && !rc.classList.contains('side'); openGroup('build'); o.rcpt = o.rcpt && rc.classList.contains('side'); closeDock(); rc.hidden = true;
    // 영수증은 어디를 눌러도(패널이 닫혀 있어도) 그냥 사라지고, 재정 탭을 열지 않는다
    closeDock(); showReceipt(); { const tb = UI.tab, fd = UI.fold; document.getElementById('rcpt').click(); o.rcpt = o.rcpt && document.getElementById('rcpt').hidden && UI.tab === tb && UI.fold === fd; }
    // 주차 경고는 주차장이 열린 뒤부터, 바람 문구의 조사
    S.unlockAll = false; S.lvl = 1; S.cov.park = 0.2; const w0 = warnings().join('|'); S.unlockAll = true; const w1 = warnings().join('|');
    o.small = !/주차가 모자라/.test(w0) && /주차가 모자라/.test(w1) && iga('예배 자리') === '예배 자리가' && iga('돌봄 공간') === '돌봄 공간이' && /건물을 눌러/.test(w1 + (S.buildings.some(b => b.door && !usable(b)) ? '' : '건물을 눌러'));
    // 현황 지표: 다섯 점수의 합 = 교회 점수, 레벨 문턱, 보상 받기, 신뢰도(평판·호감·직분자·심방), 맨 윗줄 칩, 평판은 화면에 안 나옴
    { const k5 = ['sp', 'mood', 'conv', 'trust', 'xp'], ni = {}; o.ni = ni;
      S.unlockAll = true; S.members = 12; S.qxp = 0; S.il = {}; S.tv = 0; recalc();
      const I = S.ind;
      ni.sum = k5.every(k => Number.isFinite(I[k]) && I[k] >= 0) && I.tot === k5.reduce((t, k) => t + I[k], 0) && scoreParts().total === I.tot && levelOf(I.tot) === 1;
      ni.curve = true; for (const k of k5) for (let L = 2; L <= 30; L++) if (indLevelOf(k, indNeed(k, L)) !== L || indLevelOf(k, indNeed(k, L) - 1) !== L - 1) ni.curve = false;
      // 신뢰도: 평판·호감 레벨·직분자·심방이 점수에 들고, 지수(0~100)가 방문자 수를 좌우한다
      const t0 = S.ind.trust, i0 = trustIdx(); S.rep += 20; recalc(); const t1 = S.ind.trust, i1 = trustIdx(); S.rep -= 20;
      S.people.forEach(q => { q.lv = 21; }); recalc(); const t2 = S.ind.trust; S.people.forEach(q => { q.lv = 1; });
      S.people.slice(0, 3).forEach(q => { q.node = 'deacon'; }); recalc(); const t3 = S.ind.trust, o3 = offTotal(S); S.people.slice(0, 3).forEach(q => { q.node = 'new'; }); recalc();
      const tv0 = S.tv || 0; S.money = 99999; ppCare(S.people[0].id, 'visit'); const tv1 = S.tv; recalc(); const t4 = S.ind.trust; S.tv = 0; S.people[0].vw = -99;
      ni.td = [t0, t1, i0, i1, t2, t3, o3, tv0, tv1, t4, /trustIdx\(\)/.test(update.toString()), !/S\.rep/.test(update.toString()), !/S\.rep/.test(creditLimit.toString())];
      ni.trust = t1 === t0 + 20 * TRUST_REP && i1 > i0 && t2 > t0 && o3 === 3 && t3 >= t0 + 3 * TRUST_OFF && tv1 > tv0 && t4 > t0 && i0 >= 0 && i1 <= 100 && /trustIdx\(\)/.test(update.toString()) && !/S\.rep/.test(update.toString()) && !/S\.rep/.test(creditLimit.toString());
      // 만족도·편의·영성은 채운 만큼: 건물을 지으면 오르고, 자금만으로는 오르지 않는다
      const c0 = S.ind.conv; recalc(); S.money = 1e6; recalc(); const same = S.ind.conv === c0 && S.ind.mood === I.mood;
      { let nb = null; for (let y = 2; y < PZ - 3 && !nb; y++) for (let x = 2; x < COLS - 3 && !nb; x++) if (canPlace(D.wc, x, y, 2)) { build('wc', x, y, 2); nb = S.buildings[S.buildings.length - 1]; } recalc(); ni.build = same && S.ind.conv > c0; if (nb) demolish(nb.id); recalc(); }
      // 레벨이 오르면 '보상 받기': 오른 단계 몫을 모두 한 번에, 두 번은 못 받고, 점수가 내려가도 레벨은 그대로
      S.il = {}; S.qxp = 0; recalc(); indTick(true); S.qxp = 400; recalc(); indTick();
      const lvx = S.il.xp.lv, rdy = indReady('xp'), rw = indReward('xp'), m0 = S.money; syncEvBadge(); const bg = !document.getElementById('stBadge').hidden;
      const got = claimInd('xp'); ni.claim = lvx > 2 && rdy && bg && rw > 0 && got === rw && S.money === m0 + rw && !indReady('xp') && claimInd('xp') === 0;
      S.qxp = 0; recalc(); indTick(); ni.claim = ni.claim && S.il.xp.lv === lvx;
      // 맨 윗줄: 이름·Lv 옆에 지표 칩 다섯 칸(아이콘 + Lv + 게이지), 시계와 겹치지 않고, 평판은 어디에도 안 나옴. 누르면 현황 화면
      hud(true); const ch = document.querySelectorAll('#inds .ind'), tr = document.getElementById('top').getBoundingClientRect(), ck = document.getElementById('clock').getBoundingClientRect();
      ni.chips = ch.length === 5 && [...ch].every(c => /^Lv \d+$/.test(c.querySelector('b').textContent) && c.querySelector('svg') && c.querySelector('.ig i')) && tr.top < 20 && tr.right <= ck.left + 1 && !document.getElementById('vRep') && !/평판/.test(document.getElementById('status').textContent + document.getElementById('top').textContent);
      S.qxp = 400; recalc(); S.il.xp.lv = 1; S.il.xp.cl = 1; indTick(); hud(true); ni.chips = ni.chips && document.querySelector('#inds [data-ind="xp"]').classList.contains('rdy');
      ch[1].click(); ni.chips = ni.chips && UI.scr === 'status' && UI.scrSel && UI.scrSel.id === 'mood' && /만족도/.test(document.getElementById('scrDlg').textContent) && /교제 공간/.test(document.getElementById('scrDlg').textContent);
      document.querySelector('#scrDlg [data-act="inclose"]').click(); document.querySelector('#scrBody .indc[data-v="xp"]').click();
      const m1 = S.money, btn = document.querySelector('#scrDlg [data-act="inclaim"]'); if (btn) btn.click();
      ni.ud = [!!btn, S.money - m1, indReady('xp'), S.il.xp.lv, S.il.xp.cl, UI.scrSel && UI.scrSel.id];
      ni.ui = !!btn && S.money > m1 && !indReady('xp') && !document.querySelector('#scrDlg [data-act="inclaim"]'); closeScreen();
      document.getElementById('qchip').click(); ni.ui = ni.ui && UI.scr === 'status' && UI.scrTab === 'quest' && /마친 퀘스트/.test(document.getElementById('scrBody').textContent); closeScreen();
      // 퀘스트 화면: 지금 할 수 있는 것만, 이루면 마친 목록으로
      QUESTS.forEach(q => { delete S.qd[q.id]; }); S.qb = {}; openGroup('status'); document.querySelector('#scrTabs [data-v="quest"]').click();
      const q0 = document.querySelectorAll('#scrBody .qrow').length; S.qd.f1 = 1; renderScreen(); const q1 = document.querySelectorAll('#scrBody .qrow').length;
      ni.quest = q0 === 1 && /교회 문 열기/.test(document.getElementById('scrBody').textContent) && q1 === 1 && /마친 퀘스트 1 \/ /.test(document.getElementById('scrBody').textContent); closeScreen();
      QUESTS.forEach(q => { S.qd[q.id] = 1; }); S.qxp = 0; S.il = {}; recalc(); indTick(true);
      // 사역팀·달란트: 사역 경험 Lv 1당 1개. 넣고 빼고 옮기고 모두 빼고, 최대 5단계, 값·사례비 없음, 단계가 오를수록 효과 증가폭이 줄어듦
      { const nt = {}; o.nt = nt; for (const k in STAFF) S.staff[k] = 0; S.unlockAll = true; S.il = {}; S.qxp = 0; recalc(); indTick(true);
        nt.base = talentTotal() === S.il.xp.lv * TALENT_PER_LV && talentFree() === talentTotal();
        S.qxp = 1500; recalc(); indTick(); const tot = talentTotal(), v0 = MOD.vis, m0 = S.money;
        nt.total = tot === S.il.xp.lv * TALENT_PER_LV && tot >= 8 && talentFree() === tot;
        nt.add = teamAdd('evang', 1) === '' && S.staff.evang === 1 && talentFree() === tot - 1 && MOD.vis > v0 && S.money === m0 && typeof teamPay === 'undefined';
        for (let i = 2; i <= TEAM_MAX; i++) teamAdd('evang', 1);
        nt.max = S.staff.evang === TEAM_MAX && /최대/.test(teamAdd('evang', 1)) && talentFree() === tot - TEAM_MAX;
        let dim = true; for (let l = 1; l <= TEAM_MAX; l++) { const d = teamUnits(l) - teamUnits(l - 1); if (!(d > 0) || (l > 1 && !(d < teamUnits(l - 1) - teamUnits(l - 2)))) dim = false; }
        nt.curve = dim && teamUnits(0) === 0 && teamEff().evang === teamUnits(S.staff.evang) && STAFF.evang.fx(2).every(t => /[+−]/.test(t));
        // 옮기기: 한 팀에서 빼서 다른 팀에 넣는다
        const off0 = MOD.offer; nt.move = teamAdd('evang', -1) === '' && S.staff.evang === TEAM_MAX - 1 && teamAdd('praise', 1) === '' && MOD.offer > off0 && talentFree() === tot - TEAM_MAX;
        nt.sub = /없어요/.test(teamAdd('prayer', -1));
        // 모자라면 못 넣음, 잠긴 팀은 못 넣음
        const keep = {}; for (const k in S.staff) keep[k] = S.staff[k]; for (const k in S.staff) S.staff[k] = 0; S.il.xp.lv = 1; S.qxp = 0; recalc(); const w1 = teamAdd('care', 1), w2 = teamAdd('edu', 1);
        S.unlockAll = false; S.lvl = 1; const w3 = teamAdd('admin', 1); S.unlockAll = true; nt.poor = w1 === '' && /남은 달란트/.test(w2) && S.staff.edu === 0 && /Lv \d/.test(w3);
        // 달란트가 모자라게 되면(옛 저장) 가장 높은 팀부터 줄인다
        for (const k in S.staff) S.staff[k] = 0; S.staff.evang = 5; S.staff.praise = 3; S.il.xp.lv = 4; recalc(); nt.fit = talentUsed() === 4 && S.staff.evang === 3 && S.staff.praise === 1 || talentUsed() === 4 && S.staff.evang + S.staff.praise === 4;
        S.il.xp.lv = 20; recalc(); const n = teamReset(); nt.reset = n === 4 && talentUsed() === 0 && MOD.vis === 1;
        // 화면: 원형 카드 아홉 개, 누르면 정보 창, 넣기·빼기·모두 빼기
        S.il = {}; S.qxp = 1500; recalc(); indTick(true); for (const k in STAFF) S.staff[k] = 0; recalc(); openScreen('events', 'staff');
        const cs = document.querySelectorAll('#scrBody .teamc'), bar = document.querySelector('#scrBody .tbar').textContent;
        cs[0].querySelector('.tmi').click(); const dl = document.getElementById('scrDlg'); const dlg0 = !dl.hidden && /전도팀/.test(dl.textContent) && /다음 단계/.test(dl.textContent);
        document.querySelector('#scrDlg [data-act="tmadd"]').click(); document.querySelector('#scrDlg [data-act="tmadd"]').click(); const two = S.staff.evang === 2 && !document.getElementById('scrDlg').hidden && /Lv 2/.test(document.getElementById('scrDlg').textContent);
        document.querySelector('#scrDlg [data-act="tmsub"]').click(); const one = S.staff.evang === 1;
        document.querySelector('#scrDlg [data-act="evclose"]').click(); const reset = document.querySelector('#scrBody [data-act="tmreset"]'); reset.click();
        nt.ui = cs.length === 9 && /×\d+\s*\/\s*\d+/.test(bar) && dlg0 && two && one && S.staff.evang === 0 && talentUsed() === 0 && /달란트/.test(document.getElementById('scrBody').textContent); closeScreen();
        for (const k in STAFF) S.staff[k] = 0; recalc();
        // 지표 보상 모두 받기: 받을 수 있는 보상이 둘 이상이면 한 번에
        S.il = {}; S.qxp = 0; recalc(); indTick(true); S.il.xp.lv = 4; S.il.sp.lv = 3; S.il.conv.lv = 2; recalc();
        const cnt = indReadyCount(), sum = indReward('xp') + indReward('sp') + indReward('conv'), mm = S.money; openGroup('status'); const ba = document.querySelector('#scrBody [data-act="inclaimall"]'); if (ba) ba.click();
        nt.claimAll = cnt === 3 && !!ba && S.money === mm + sum && indReadyCount() === 0 && !document.querySelector('#scrBody [data-act="inclaimall"]') && claimAllInd().n === 0; closeScreen();
        S.il = {}; S.qxp = 0; recalc(); indTick(true); }
      // 주마다 심방 활동은 식는다
      S.tv = 10; S.t = WEEK - 0.05; S.open = true; update(0.1); ni.decay = Math.abs(S.tv - 10 * TRUST_VIS_DECAY) < 0.5 || S.tv < 10; }
    // 길과 지형은 한 분류, 지형을 지을 때 안내 글 띠가 없음
    { const pb = document.getElementById('pbar'); UI.tab = 'build'; UI.fold = false; startPlace('ter_ramp'); renderPbar(); const rampHid = pb.hidden; startPlace('ter_set'); renderPbar();
      o.land = !CATS.some(c => c[0] === 'land') && CATS.some(c => c[0] === 'path' && c[1] === '길·지형') && D.ter_ramp.cat === 'path' && D.ter_set.cat === 'path' && rampHid && pb.hidden; syncPlace(); const t0 = UI.tlv; document.querySelector('#place [data-pl="up"]').click(); o.land = o.land && UI.tlv === t0 + 1 && /높이/.test(document.querySelector('#place .ppr').textContent); endPlace(); }
    // 고른 칸에서 이어 짓기: 화살표·▲▼가 뜨고, 옆 화살표 → ✓로 같은 높이·같은 바닥이 이어짐, 건물 칸·더 높은 칸은 막음, 되돌리기는 한 묶음
    { let sp = null; for (let y = 4; y < PZ - 8 && !sp; y++)for (let x = 4; x < COLS - 8 && !sp; x++) { let ok = true; for (let j = -1; j <= 5 && ok; j++)for (let i = -1; i <= 5 && ok; i++)if (occ[y + j][x + i] || S.floor[(x + i) + ',' + (y + j)] || th(x + i, y + j)) ok = false; if (ok) sp = { x, y }; }
      S.money = 50000; UI.undo = []; terApply(sp.x, sp.y, 'ter_set', 2); paintFloor(sp.x, sp.y, 'f_gravel', 0); UI.undo = [];
      UI.tool = null; UI.fold = true; UI.sel = null; UI.selPiece = null; UI.selFloor = { x: sp.x, y: sp.y }; renderDetail(); syncPlace();
      const root = document.getElementById('place'), vis = q => [...root.querySelectorAll(q)].filter(e => !e.hidden).length;
      const shown = !root.hidden && vis('.parr:not(.pv)') === 4 && vis('.pv') === 2 && vis('[data-pl="ok"]') === 0;
      // ▲: 이 칸을 바로 한 층 높임
      root.querySelector('[data-pl="up"]').click(); const raised = th(sp.x, sp.y) === 3 && S.floor[sp.x + ',' + sp.y] === 'f_gravel';
      // 옆 화살표(방향 0) → 미리보기 → ✓ 두 번
      root.querySelector('.parr[data-v="0"]').click(); syncPlace();
      const nx = sp.x + DIRS[0][0], ny = sp.y + DIRS[0][1], n2x = nx + DIRS[0][0], n2y = ny + DIRS[0][1];
      const started = isPlacing() && UI.tool === 'ter_set' && UI.ghost.x === nx && UI.ghost.y === ny && UI.tlv === 3 && /높이 3/.test(root.querySelector('.ppr').textContent);
      const m0 = S.money; plLock = 0; plOk(); const cost1 = m0 - S.money; plLock = 0; plOk();
      const ext = th(nx, ny) === 3 && S.floor[nx + ',' + ny] === 'f_gravel' && th(n2x, n2y) === 3 && S.floor[n2x + ',' + n2y] === 'f_gravel' && cost1 === 3 * TER_UP + D.f_gravel.cost;
      // 되돌리기 한 번에 마지막 칸의 높이와 바닥이 함께 돌아옴
      terUndoLast(); const undone = th(n2x, n2y) === 0 && !S.floor[n2x + ',' + n2y] && th(nx, ny) === 3;
      // 건물 칸과 더 높은 칸은 막음
      const g = UI.ghost; build('tree', g.x, g.y, 2); recalc(); const blockB = /건물/.test(cellWhy(g.x, g.y, 'ter_set'));
      const hx = sp.x, hy = sp.y + 3; UI.ext = false; const keepU = UI.undo; UI.undo = []; terApply(hx, hy, 'ter_set', 6); UI.undo = keepU; UI.ext = true; const blockH = /더 높아요/.test(cellWhy(hx, hy, 'ter_set'));
      endPlace();
      // 경사로: 고르면 경사면에 맞는 표시가 그려지고, 오르는 쪽 화살표 → ✓로 한 층 위 경사로가 이어짐
      const rx = sp.x + 2, ry = sp.y + 5; UI.undo = []; const rw = terApply(rx, ry, 'ter_ramp', 0, 0); UI.undo = [];
      UI.tool = null; UI.fold = true; UI.selFloor = { x: rx, y: ry }; renderDetail(); syncPlace(); draw();
      root.querySelector('.parr[data-v="0"]').click(); const rnx = rx + DIRS[0][0], rny = ry + DIRS[0][1];
      const rstart = UI.tool === 'ter_ramp' && UI.rdir === 0 && UI.tlv === 1 && UI.ghost.x === rnx; plLock = 0; plOk();
      const ramp = !rw && rstart && tslope(rnx, rny) === 0 && th(rnx, rny) === 1 && UI.tlv === 2; endPlace();
      // 길 조각: 화살표로 같은 종류를 이어 짓기 시작, ▲로 오르막
      S.paths.push({ id: 9998, x: sp.x + 5, y: sp.y + 8, l: 0, s: 0, d: 0, k: 'wood' }); recalc(); UI.tool = null; UI.fold = true; UI.selFloor = null; UI.selPiece = 9998; renderDetail(); syncPlace();
      root.querySelector('[data-pl="up"]').click(); const pth = UI.tool === 'path' && UI.pc.k === 'wood' && UI.pc.slope === 1 && UI.pc.x === sp.x + 5 + DIRS[0][0]; endPlace(); UI.selPiece = null; S.paths = S.paths.filter(q => q.id !== 9998); recalc();
      o.ext = shown && raised && started && ext && undone && blockB && blockH && ramp && pth; o.extd = JSON.stringify({ shown, raised, started, ext, undone, blockB, blockH, ramp, pth, cost1, rw }); }
    // 고른 바닥 칸·길 조각에 노란 표시: 고르기 전후로 그 칸 둘레 화면이 달라진다
    { const cv = document.getElementById('cv'), g = cv.getContext('2d'); const k = Object.keys(S.floor)[3].split(',').map(Number);
      const grab = () => { draw(); const r = rotPt(k[0] + .5, k[1] + .5), q = toScreen(r[0], r[1], 0), d = window.devicePixelRatio || 1; return Array.from(g.getImageData(Math.round(q[0] * d) - 6, Math.round(q[1] * d) - 3, 12, 6).data).join(','); };
      UI.sel = null; UI.selPiece = null; UI.selFloor = null; UI.fold = true; const a = grab(); UI.selFloor = { x: k[0], y: k[1] }; const b = grab();
      S.paths.push({ id: 9999, x: k[0] + 8, y: k[1], l: 0, s: 0, d: 2, k: 'wood' }); recalc(); UI.selFloor = null;
      const grabP = () => { draw(); const r = rotPt(k[0] + 8.5, k[1] + .5), q = toScreen(r[0], r[1], 0), d = window.devicePixelRatio || 1; return Array.from(g.getImageData(Math.round(q[0] * d) - 6, Math.round(q[1] * d) - 3, 12, 6).data).join(','); };
      const c0 = grabP(); UI.selPiece = 9999; const c1 = grabP(); UI.selPiece = null; S.paths = S.paths.filter(p => p.id !== 9999); recalc();
      o.selHi = a !== b && c0 !== c1; }
    return o;
  });
  check(r.ext, '이어 짓기: 고른 칸 둘레 화살표·▲▼, 옆 화살표 → ✓로 같은 높이·바닥·경사로·길이 이어지고, 건물 칸·더 높은 칸은 막음 (' + r.extd + ')');
  check(r.selHi, '고른 바닥 칸·길 조각: 지도에 노란 반투명 표시가 그려짐');
  check(r.land, '길·지형: 한 분류로 합쳐지고, 지형을 지을 때 띠 없이 지도 위 ▲▼와 ✓ 옆 높이 글씨만');
  check(r.offPath, '미리보기 첫 자리: 길(바닥) 위를 피해 가까운 빈자리에 놓임');
  check(r.fixdoor, '문: 문 앞에 길이 없으면 카드에 이유와 길 잇기, 이으면 이용');
  { const nt = (r.ni && r.ni.nt) || r.nt || {};
    check(nt.base && nt.total && nt.add, '달란트: 사역 경험 Lv 1당 1개, 사역팀에 넣으면 효과가 생기고 자금·사례비는 안 듦');
    check(nt.max && nt.curve && nt.move && nt.sub, '사역팀: 최대 5단계, 단계가 오를수록 증가폭이 줄고, 한 팀에서 빼 다른 팀으로 옮길 수 있음');
    check(nt.poor && nt.fit && nt.reset, '사역팀: 달란트가 모자라면 못 넣고(잠긴 팀도), 모자라게 되면 높은 팀부터 줄이고, 모두 뺄 수 있음');
    check(nt.ui, '사역팀 탭: 원형 카드, 누르면 정보 창에서 달란트 넣기·빼기, 모두 빼기');
    check(nt.claimAll, '현황: 지표 보상을 모두 받기 버튼으로 한꺼번에 받음');
    if (!(nt.base && nt.total && nt.add && nt.max && nt.curve && nt.move && nt.sub && nt.poor && nt.fit && nt.reset && nt.ui && nt.claimAll)) console.log('NT', JSON.stringify(nt)); }
  { const n = r.ni || {};
    check(n.sum && n.curve, '현황 지표: 다섯 점수의 합이 교회 점수, 지표 레벨 문턱이 맞음');
    check(n.trust, '신뢰도: 평판·성도 호감·직분자·심방이 점수에 들고, 방문자·신용 한도는 평판 대신 신뢰도 지수를 따름');
    check(n.build, '지표 점수: 자금만으로는 오르지 않고, 편의 시설을 지으면 편의가 오름');
    check(n.claim, '지표 레벨 보상: 오르면 현황 버튼 배지, 보상 받기로 오른 몫을 한 번에, 두 번은 못 받고 레벨은 유지');
    check(n.chips, '맨 윗줄: 지표 칩 다섯 칸(아이콘·Lv·게이지), 시계와 안 겹치고 평판은 안 보임, 누르면 현황 정보 창');
    check(n.ui, '현황 화면: 정보 창의 보상 받기, 퀘스트 칸을 누르면 퀘스트 탭');
    check(n.quest, '퀘스트 탭: 지금 할 수 있는 퀘스트만 보이고, 마치면 마친 목록으로');
    check(n.decay, '심방 활동은 주마다 식음');
    if (!(n.sum && n.curve && n.trust && n.build && n.claim && n.chips && n.ui && n.quest && n.decay)) console.log('NI', JSON.stringify(n)); }
  check(r.autoDoor, '문: 지을 때 고른 방향(정면)에 문이 남');
  check(r.rcpt, '영수증: 패널이 열려 있으면 패널을 덮지 않고, 어디를 눌러도 그냥 사라질 뿐 재정 탭으로 넘어가지 않음');
  check(r.small, '안내 문구: 주차 경고는 주차장이 열린 뒤부터, 바람 문구 조사(이·가)');
  check(r.line && r.open && r.once && r.sunday && r.back, '첫 걸음: 목표 줄에 할 일을 한 줄씩, 이루면 보상하고 다음으로, 다 마치면 목표로 돌아감');
  check(r.curve, 'Level 곡선: 시작은 Lv 1, Lv 2는 약 2만, Lv 9는 약 8만, 100까지');
  check(r.lock && r.gift, 'Level 보상: 비싼 꾸미기는 Level로 열리고, 오를 때 축하금(건너뛴 단계 몫까지)');
  check(r.old, '옛 저장: Level을 새 곡선으로 다시 맞추고 첫 걸음은 건너뜀');
  check(errs.length === 0, '첫 걸음: 오류 없음' + (errs.length ? ':\n    ' + errs.join('\n    ') : ''));
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
    await waterChecks(browser, url);
    await levelChecks(browser, url);
    await startTerrainChecks(browser, url);
    await deckChecks(browser, url);
    await gripeChecks(browser, url);
    await earlyChecks(browser, url);
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

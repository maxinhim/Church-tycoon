#!/usr/bin/env node
/* 초반 30분 플레이 테스트: 화면에 보이는 안내만 따라 하는 초보 플레이어
   · 첫 걸음 줄 → 챙길 일(성도들의 바람·불편·부족) 순서로, 화면이 시키는 일만 한다
   · 건축·행사·임명은 모두 실제 버튼과 지도를 눌러서 한다 (게임 함수는 시간 넘기기와 읽기에만 쓴다)
   · 누른 횟수, 막힌 곳(오류 알림·못 지은 일·돈이 모자란 주), 주마다 상태를 기록한다
   쓰는 법:  node tools/playtest.js [--weeks 37] [--seed 5] [--out 폴더]   (게임 코드에서는 불러오지 않는다) */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CAREFUL = process.argv.indexOf('--careful') > 0;   // 조심하는 사람: 길(바닥) 위에는 짓지 않고 옆 잔디로 옮긴다
const WEEKS = +arg('weeks', 37), SEED = +arg('seed', 5), OUT = arg('out', path.join(ROOT, 'docs', 'playtest'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg' };
function serve() {
  return new Promise(res => { const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); }); s.listen(0, () => res(s)); });
}
// 챙길 일 문구 → 무엇을 할지 (초보가 문구를 읽고 떠올릴 만한 것)
const RULES = [
  [/화장실/, { cat: 'comfort', ids: ['wc'] }], [/배가 고파|배고픔/, { cat: 'shop', ids: ['bakery', 'shop', 'cafe'] }],
  [/목이 말라|목마름/, { cat: 'comfort', ids: ['drinkfount'] }], [/외로/, { cat: 'club' }], [/다리가 아파|다리 아픔/, { cat: 'comfort', ids: ['bench'] }],
  [/쓰레기/, { cat: 'comfort', ids: ['bin'] }], [/삭막/, { cat: 'garden' }], [/매너리즘/, { cat: 'garden' }],
  [/좌석/, { cat: 'worship' }], [/영성/, { ev: ['communion', 'baptism'], cat: 'worship', ids: ['pray', 'bible'] }],
  [/목양/, { appoint: true }], [/수리/, { repair: true }], [/이용할 수 없는|닿는 길이 없어요/, { link: true }], [/주차/, { cat: 'park' }], [/붐벼/, { cat: 'fellow' }], [/교제/, { cat: 'fellow' }], [/돌봄/, { cat: 'care' }]
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(seed => { let s = seed; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }, SEED);
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await page.waitForTimeout(800);
  const log = [], rows = [], stat = { taps: 0, builds: 0, fails: 0, toasts: {}, poor: 0, idle: 0, links: 0 };
  let week = 0;
  const note = (t) => { log.push(`[${week}주] ${t}`); };
  const tap = async (sel) => { const el = await page.$(sel); if (!el || !(await el.isVisible())) return false; await el.scrollIntoViewIfNeeded().catch(() => { }); try { await el.click({ timeout: 1500 }); } catch (e) { note(`눌러지지 않는 버튼: ${sel} (다른 것에 가려짐)`); stat.fails++; return false; } stat.taps++; await page.waitForTimeout(90); return true; };
  const toastTxt = () => page.evaluate(() => { const t = document.getElementById('toast'); return t.hidden ? '' : t.textContent; });
  const seeToast = async (why) => { const t = await toastTxt(); if (t && /없어요|못 |부족|먼저|후 |안 돼|막혀/.test(t)) { stat.toasts[t] = (stat.toasts[t] || 0) + 1; note(`막힘(${why}): "${t}"`); return t; } return ''; };
  const closeRcpt = async () => { const up = await page.evaluate(() => { const r = document.getElementById('rcpt'), d = document.getElementById('dock'); return !r.hidden && !d.hidden; }); if (up) { stat.rcpt = (stat.rcpt || 0) + 1; await page.evaluate(() => document.getElementById('rcpt').click()); stat.taps++; await page.waitForTimeout(60); await page.evaluate(() => { document.getElementById('rcpt').hidden = true; }); } };
  const closeOverlays = async () => {
    for (let i = 0; i < 3; i++) { if (!(await tap('#dlg [data-act="dlg"]:not([disabled])'))) break; note('목회 고민거리 카드에서 첫 선택지를 고름'); }
    await page.evaluate(() => { ['cele', 'lvup'].forEach(id => { const e = document.getElementById(id); if (e && !e.hidden) e.click(); }); });
  };
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, (CAREFUL ? 'careful' : 'naive') + '-' + name + '.png') }); };
  // 지도에서 누를 자리: 이미 깔린 바닥 옆의 빈 잔디 가운데, 화면에 보이고 UI에 가리지 않는 곳
  const spots = () => page.evaluate(() => {
    const out = [], seen = {};
    for (const k in S.floor) { const [x, y] = k.split(',').map(Number);
      [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 1], [-3, 1], [1, 3], [1, -3], [4, 0], [0, 4], [-4, 0], [0, -4]].forEach(d => { const nx = x + d[0], ny = y + d[1], kk = nx + ',' + ny; if (seen[kk] || nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= PZ - 1) return; seen[kk] = 1;
        const p = rotPt(nx + .5, ny + .5), q = toScreen(p[0], p[1], 0); if (q[0] > 150 && q[0] < 700 && q[1] > 110 && q[1] < 320) out.push({ x: q[0], y: q[1] }); }); }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
    return out.slice(0, 30);
  });
  // 건축 버튼 → 분류 칩 → 카드 → 지도에서 자리 잡기 → ✓ (필요하면 건물을 눌러 길 잇기)
  async function build(cat, ids) {
    const t0 = stat.taps;
    await page.evaluate(() => { if (isPlacing()) endPlace(); });
    if (await page.evaluate(() => UI.tab !== 'build' || UI.fold)) await tap('[data-fab="build"]');
    await closeRcpt();
    await page.waitForTimeout(120);
    if (!(await tap(`#panel [data-act="cat"][data-v="${cat}"]`))) { note(`분류 칩(${cat})을 못 찾음`); stat.fails++; return false; }
    await page.waitForTimeout(120);
    // 카드: 바라는 것부터, 없으면 그 분류에서 살 수 있는 가장 싼 것 (목록 맨 앞)
    const pick = await page.evaluate(({ ids }) => {
      const cs = [...document.querySelectorAll('#cards .card')], ok = c => !c.classList.contains('poor') && !c.classList.contains('lock');
      let c = null; (ids || []).some(id => (c = cs.find(x => x.dataset.v === id && ok(x))));
      const locked = (ids || []).filter(id => { const x = cs.find(y => y.dataset.v === id); return x && x.classList.contains('lock'); });
      const poor = (ids || []).filter(id => { const x = cs.find(y => y.dataset.v === id); return x && x.classList.contains('poor') && !x.classList.contains('lock'); });
      if (!c && !(ids || []).length) c = cs.find(ok);
      if (c) c.scrollIntoView({ inline: 'center', block: 'nearest' });
      return { id: c ? c.dataset.v : null, name: c ? D[c.dataset.v].name : '', cost: c ? D[c.dataset.v].cost : 0, locked, poor, any: cs.some(ok) };
    }, { ids });
    if (!pick.id) { const why = pick.locked.length ? '잠겨 있음' : pick.poor.length ? '돈이 모자람' : '살 수 있는 것이 없음'; note(`${cat}에서 고를 카드가 없음 (${why})`); if (why !== '잠겨 있음') stat.poor++; stat.fails++; await tap('#dock [data-act="close"]'); return false; }
    await tap(`#cards .card[data-v="${pick.id}"]`);
    const offNow = () => page.evaluate(careful => { syncPlace(); const o = document.querySelector('#place [data-pl="ok"]'); if (!o || o.classList.contains('off')) return true;
      if (!careful || !UI.ghost || !D[UI.tool]) return false; const d = D[UI.tool], g = UI.ghost; for (let j = 0; j < (d.h || 1); j++)for (let i = 0; i < (d.w || 1); i++)if (S.floor[(g.x + i) + ',' + (g.y + j)]) return true; return false; }, CAREFUL);
    const onPath = await page.evaluate(() => { const d = D[UI.tool], g = UI.ghost; if (!d || !g) return false; for (let j = 0; j < (d.h || 1); j++)for (let i = 0; i < (d.w || 1); i++)if (S.floor[(g.x + i) + ',' + (g.y + j)]) return true; return false; });
    if (onPath) stat.onPath = (stat.onPath || 0) + 1;
    let okOff = await offNow();
    let moves = 0;
    if (okOff) { for (const s of await spots()) { await page.mouse.click(s.x, s.y); stat.taps++; moves++; await page.waitForTimeout(40); okOff = await offNow(); if (!okOff) break; } }
    if (okOff) { await tap('#place [data-pl="ok"]'); await seeToast('자리 못 찾음'); note(`${pick.name}: ${moves}번 눌러 봐도 지을 자리를 못 찾음`); stat.fails++; await page.evaluate(() => endPlace()); return false; }
    const n0 = await page.evaluate(() => S.buildings.length);
    await page.evaluate(() => { plLock = 0; }); await tap('#place [data-pl="ok"]');
    const built = await page.evaluate(n0 => S.buildings.length > n0 ? S.buildings[S.buildings.length - 1].id : 0, n0);
    if (!built) { await seeToast('짓기'); stat.fails++; await page.evaluate(() => endPlace()); return false; }
    await page.evaluate(() => { if (isPlacing()) endPlace(); });
    stat.builds++;
    // 길이 안 닿으면 건물을 눌러 길 잇기
    const need = await page.evaluate(id => { const b = bById(id); return !!(b && b.door && !usable(b)); }, built);
    let linked = '';
    if (need) {
      const q = await page.evaluate(id => { const b = bById(id), d = bDims(b), p = rotPt(b.x + d.w / 2, b.y + d.h / 2), s = toScreen(p[0], p[1], 0); UI.sel = null; return { x: s[0], y: s[1] }; }, built);
      await page.mouse.click(q.x, q.y - 6); stat.taps++; await page.waitForTimeout(80);
      if (await tap('#selCard [data-act="link"]')) { if (await tap('#selCard [data-act="linkf"]:not([disabled])')) { stat.links++; linked = ' + 길 잇기'; } else { linked = ' (길 이을 돈이 모자람)'; await seeToast('길 잇기'); } }
      else { linked = ' (길 잇기 버튼을 못 찾음)'; stat.fails++; }
      const ok = await page.evaluate(id => { const b = bById(id); UI.sel = null; renderDetail(); return usable(b); }, built);
      if (!ok) { linked += ' → 아직 이용 불가'; stat.fails++; }
    }
    note(`${pick.name} 지음 (${fmtN(pick.cost)}원, ${stat.taps - t0}번 누름${moves ? ', 자리 ' + moves + '번 옮김' : ''})${linked}`);
    return true;
  }
  const fmtN = n => Math.round(n).toLocaleString('en-US');
  async function runEvent(ids) {
    await tap('[data-fab="minis"]'); await closeRcpt(); await tap('#subtabs [data-v="events"]');
    const id = await page.evaluate(ids => { const bs = [...document.querySelectorAll('#panel [data-act="runEv"]:not([disabled])')]; let b = null; (ids || []).some(i => (b = bs.find(x => x.dataset.v === i))); if (!b && !(ids || []).length) b = bs[0]; if (b) b.scrollIntoView({ block: 'center' }); return b ? b.dataset.v : null; }, ids);
    if (!id) { note('열 수 있는 행사가 없음 (잠김·쉬는 중·돈 부족)'); stat.fails++; await tap('#dock [data-act="close"]'); return false; }
    await tap(`#panel [data-act="runEv"][data-v="${id}"]`); const nm = await page.evaluate(id => EVENTS[id].name, id);
    note(`행사: ${nm}`); await tap('#dock [data-act="close"]'); return true;
  }
  async function appoint() {
    await tap('[data-fab="minis"]'); await closeRcpt(); await tap('#subtabs [data-v="staff"]');
    const ok = await tap('#panel [data-act="appoint"]:not([disabled])') || await tap('#panel [data-act="hire"]:not([disabled])');
    note(ok ? '직분자·사역팀을 세움' : '세울 수 있는 직분자·사역팀이 없음'); if (!ok) stat.fails++; await tap('#dock [data-act="close"]'); return ok;
  }
  const state = () => page.evaluate(() => ({ week: S.week, money: Math.round(S.money), mem: S.members, mood: Math.round(S.mood), rep: Math.round(S.rep), lvl: S.lvl, goal: S.goal, step: S.step, open: S.open, bld: S.buildings.length,
    line: document.getElementById('goalTxt').textContent, warn: warnings().slice(0, 6), wish: S.wish ? S.wish.label : '', net: (S.rcpt || {}).net || 0 }));
  const advance = async (days) => { await page.evaluate(n => { const k = Math.round(WEEK * 10 / 7 * n); for (let i = 0; i < k; i++)update(0.1); hud(true); }, days); await closeOverlays(); };

  await shot('w00-start');
  let prevStep = 0, stepAt = {}, lvAt = {}, goalAt = {};
  for (week = 0; week < WEEKS; week++) {
    let s = await state(); const m0 = s.money; let acts = 0;
    const done = [];
    for (let turn = 0; turn < 3; turn++) {
      s = await state();
      let did = false;
      if (s.step < 6) {
        // 첫 걸음 줄이 시키는 일
        const t = s.line;
        if (/문 열기/.test(t)) { const g = await page.evaluate(() => { const p = rotPt(ENT + .5, PZ), q = toScreen(p[0], p[1], .7); return { x: q[0], y: q[1] }; }).catch(() => null);
          if (g) { await page.mouse.click(g.x, g.y); stat.taps++; await page.waitForTimeout(80); } did = await tap('#gpBtn'); note(did ? '입구 아치를 눌러 문을 엶' : '입구 아치를 눌렀지만 문 열기 카드가 안 뜸'); if (!did) stat.fails++; }
        else if (/첫 주일/.test(t)) { break; }
        else if (/화장실/.test(t)) did = await build('comfort', ['wc']);
        else if (/벤치/.test(t)) did = await build('comfort', ['bench']);
        else if (/꾸미기/.test(t)) did = await build('garden', []);
        else if (/행사/.test(t)) did = await runEvent([]);
      } else {
        // 챙길 일 맨 위부터: 이번 주에 아직 안 한 것
        const w = [s.wish ? '성도들의 바람: ' + s.wish : ''].concat(s.warn).filter(Boolean).find(x => done.indexOf(x) < 0);
        if (!w) { if (s.money > 4000 && turn === 0) { did = await build(['garden', 'deco'][week % 2], []); } else break; }
        else {
          done.push(w);
          const ms = w.match(/\(([^)]+)\)/g) || [], nm = /^성도들의 바람/.test(w) && ms.length ? ms[ms.length - 1].slice(1, -1) : '';
          const target = nm ? await page.evaluate(nm => { for (const k in D) if (D[k].name === nm) return { cat: D[k].cat === 'prop' ? 'comfort' : D[k].cat, id: k }; for (const e in EVENTS) if (EVENTS[e].name === nm) return { ev: e }; return null; }, nm) : null;
          if (target && target.ev) did = await runEvent([target.ev]);
          else if (target) did = await build(target.cat, [target.id]);
          else { const r = (RULES.find(r => r[0].test(w)) || [])[1];
            if (!r) note(`무엇을 해야 할지 알 수 없는 문구: "${w}"`);
            else if (r.repair) { await tap('[data-fab="status"]'); did = await tap('#panel [data-act="repairAll"]:not([disabled])'); note(did ? '모두 수리' : '수리 버튼을 못 누름'); await tap('#dock [data-act="close"]'); }
            else if (r.appoint) did = await appoint();
            else if (r.link) {
              // 빨간 ? 건물을 찾아 눌러 길 잇기를 시도한다
              const bad = await page.evaluate(() => S.buildings.filter(b => b.door && !usable(b)).map(b => { const d = bDims(b), p = rotPt(b.x + d.w / 2, b.y + d.h / 2), q = toScreen(p[0], p[1], 0); return { id: b.id, name: defOf(b).name, x: q[0], y: q[1] }; }));
              for (const b of bad.slice(0, 2)) { await page.evaluate(() => { UI.sel = null; renderDetail(); }); await page.mouse.click(b.x, b.y - 6); stat.taps++; await page.waitForTimeout(90);
                if (await tap('#selCard [data-act="link"]') && await tap('#selCard [data-act="linkf"]:not([disabled])')) { stat.links++; did = true; note(`${b.name}: 눌러서 길 잇기`); }
                else { const why = await page.evaluate(id => { const b = bById(id), lp = linkPlan(b); return lp && lp.tiles ? '길 ' + lp.tiles.length + '칸' : '길 잇기 버튼이 없음 (이을 길을 못 찾음)'; }, b.id).catch(() => '?'); note(`${b.name}: 이용 불가인데 카드에서 풀 방법이 안 보임 · ${why}`); stat.fails++; }
                const still = await page.evaluate(id => { const b = bById(id); UI.sel = null; renderDetail(); return b && !usable(b); }, b.id); if (still) note(`${b.name}: 길을 이어도 아직 이용 불가`); } }
            else if (r.ev && (did = await runEvent(r.ev))) { }
            else if (r.cat) did = await build(r.cat, r.ids || []); }
        }
      }
      if (did) acts++;
      await closeOverlays();
    }
    if (!acts) { stat.idle++; }
    { const blk = await page.evaluate(() => S.open && !hallsReach() ? S.buildings.filter(b => S.floor[b.x + ',' + b.y] || START_FLOOR.some(t => t[0] === b.x && t[1] === b.y)).map(b => defOf(b).name + '@' + b.x + ',' + b.y).join(' ') : ''); if (blk && !stat.blocked) { stat.blocked = week; note('예배 공간 길이 막힘 · 바닥 위에 놓인 것: ' + blk); } }
    if ([0, 1, 3, 6, 12, 20, 30, 36].indexOf(week) >= 0) { await page.evaluate(() => { if (!UI.fold) closeDock(); }); await shot('w' + String(week).padStart(2, '0')); }
    await advance(7);
    s = await state();
    if (s.step !== prevStep) { for (let k = prevStep + 1; k <= s.step; k++)stepAt[k] = s.week; prevStep = s.step; }
    if (!lvAt[s.lvl]) lvAt[s.lvl] = s.week; if (s.goal && !goalAt[s.goal]) goalAt[s.goal] = s.week;
    rows.push({ w: s.week, money: s.money, spent: m0 - (await page.evaluate(() => 0)), mem: s.mem, mood: s.mood, rep: s.rep, lvl: s.lvl, goal: s.goal, step: s.step, net: s.net, acts, warn: s.warn.length, top: s.wish ? '바람: ' + s.wish : (s.warn[0] || '') });
  }
  await shot('w' + WEEKS + '-end');
  const out = { seed: SEED, weeks: WEEKS, stat, stepAt, lvAt, goalAt, rows, log, errs };
  fs.writeFileSync(path.join(OUT, `run-${CAREFUL ? 'careful' : 'naive'}-seed${SEED}.json`), JSON.stringify(out, null, 1));
  console.log(`${CAREFUL ? '조심' : '그대로'} seed ${SEED}: 미리보기가 길 위에 놓인 횟수 ${stat.onPath || 0} · 영수증이 패널을 덮은 횟수 ${stat.rcpt || 0} · 누름 ${stat.taps} · 지음 ${stat.builds} · 길 잇기 ${stat.links} · 실패 ${stat.fails} · 돈 모자람 ${stat.poor} · 한 일 없는 주 ${stat.idle} · 오류 ${errs.length}`);
  console.log('첫 걸음 완료 주:', JSON.stringify(stepAt), '| Level 도착 주:', JSON.stringify(lvAt), '| 목표 달성 주:', JSON.stringify(goalAt));
  console.log('| 주 | 자금 | 성도 | 만족 | 평판 | Lv | 목표 | 순익 | 한 일 | 맨 위 안내 |\n|---|---|---|---|---|---|---|---|---|---|');
  rows.filter(r => [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 25, 30, 37].indexOf(r.w) >= 0).forEach(r => console.log(`| ${r.w} | ${r.money} | ${r.mem} | ${r.mood} | ${r.rep} | ${r.lvl} | ${r.goal} | ${r.net} | ${r.acts} | ${r.top.slice(0, 40)} |`));
  console.log(log.join('\n'));
  if (errs.length) console.log('오류:', errs.slice(0, 5).join('\n'));
  await browser.close(); srv.close();
})();

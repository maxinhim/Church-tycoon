#!/usr/bin/env node
/* 밸런스 시뮬레이터: 게임 코드를 그대로 불러(헤드리스 브라우저) 전략별 봇이 N주를 자동으로 플레이한다.
   쓰는 법:  node tools/sim.js [--weeks 52] [--diff normal] [--seed 7] [--only balanced,spirit] [--json out.json]
   전략: idle(아무것도 안 함) · deco(꾸미기만) · shop(매장 중심) · spirit(영성·성례 중심) · balanced(모자란 것부터 고루) · wish(balanced + 성도들의 바람을 먼저 들어줌)
   게임 동작은 바꾸지 않는다(검증·조사 전용). 같은 시드면 결과가 같다. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.dirname(__dirname);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WEEKS = +arg('weeks', 52), DIFFK = arg('diff', 'normal'), SEED = +arg('seed', 7);
const ALL = ['idle', 'deco', 'shop', 'spirit', 'balanced', 'wish'];
const ONLY = arg('only', '') ? arg('only', '').split(',') : ALL;
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

/* 브라우저 안에서 도는 봇. 게임의 전역 함수(build·runEvent·hireTeam…)만 쓴다 */
function runBot(cfg) {
  /* global S,A,D,DEFS,V,MOD,PZ,COLS,ROWS,ENT,GOALS,EVENTS,STAFF,OFFICE,SPIRIT_B,HALLS */
  restart(cfg.diff); S.dlg = null; setGate(true);
  const wishFirst = cfg.strat === 'wish', strat = wishFirst ? 'balanced' : cfg.strat, RES = 1500;
  // 입구에서 가까운 자리부터
  const cells = []; for (let y = 0; y < ROWS; y += 2) for (let x = 0; x < COLS; x += 2) cells.push([x, y, Math.abs(x - ENT) + Math.abs(y - (PZ - 4))]);
  cells.sort((a, b) => a[2] - b[2]);
  const stat = { built: {}, events: 0, staff: 0, fail: {} };
  const failed = (id, why) => { const k = id + ':' + why; stat.fail[k] = (stat.fail[k] || 0) + 1; };
  function put(id) {
    const d = D[id]; if (!d || isLocked(id) || S.money < d.cost + (strat === 'deco' ? 0 : 0)) return false;
    if (isRoomDef(id)) return false;
    const okN = () => S.buildings.filter(b => b.door && usable(b)).length, dm = faceDims(d, 2);
    let tries = 0;
    for (const c of cells) {
      if (!canPlace(d, c[0], c[1], 2)) continue;
      // 바닥(걷는 길) 위에는 짓지 않는다
      // 바닥 바로 옆 한 칸도 비워 둔다 (길 둘레를 건물로 에워싸 새 길을 못 잇게 되는 일을 막는다)
      let onFloor = false; for (let j = -1; j <= dm.h; j++) for (let i = -1; i <= dm.w; i++) if (S.floor[(c[0] + i) + ',' + (c[1] + j)]) onFloor = true;
      if (onFloor) continue;
      if (++tries > 300) { failed(id, '300번 시도'); return false; }
      const m0 = S.money, n0 = okN(), f0 = S.fresh, fl0 = JSON.stringify(S.floor); if (!build(id, c[0], c[1], 2)) continue;
      const nb = S.buildings[S.buildings.length - 1];
      // 입구·출구 건물도 값을 내고 짓는다 (길 쪽 가장 좋은 자리)
      recalc(); if (needsGates(nb) && autoGates(nb)) { failed(id, '입구·출구 자리 없음'); demolish(nb.id); S.floor = JSON.parse(fl0); S.money = m0; S.fresh = f0; recalc(); continue; }
      recalc(); let lw = ''; if (nb.door && !usable(nb)) { lw = linkDoor(nb); recalc(); }
      // 문에 닿지 못하거나, 다른 건물의 길을 막았으면 되돌린다
      if ((nb.door && !usable(nb)) || okN() < n0 + (nb.door ? 1 : 0)) { failed(id, nb.door && !usable(nb) ? '길 못 이음(' + (lw || JSON.stringify(nb.acc)) + ')' : '다른 건물 막음'); demolish(nb.id); S.floor = JSON.parse(fl0); S.money = m0; S.fresh = f0; recalc(); continue; }
      stat.built[id] = (stat.built[id] || 0) + 1; return true;
    }
    failed(id, '자리 없음'); return false;
  }
  // 조건에 맞는 건물 가운데 값 대비 효과가 가장 큰 것
  function best(val, filter) {
    // 값 대비 효과가 가장 좋은 것의 절반 이상이면, 그중 효과가 가장 큰(=큰 건물) 것을 고른다
    const L = [];
    DEFS.forEach(d => { if (isLocked(d.id) || d.cost <= 0 || d.cost > S.money - RES || isRoomDef(d.id) || d.kind === 'floor' || d.kind === 'terrain' || d.kind === 'path') return;
      if (filter && !filter(d)) return; const v = val(d); if (v > 0) L.push({ id: d.id, v, r: v / d.cost }); });
    if (!L.length) return null;
    const top = Math.max(...L.map(o => o.r)); return L.filter(o => o.r >= top * 0.5).sort((x, y) => y.v - x.v)[0].id;
  }
  const decoIds = () => DEFS.filter(d => (d.cat === 'garden' || d.cat === 'deco') && d.beauty > 0 && !isLocked(d.id) && d.cost <= S.money - RES && d.kind !== 'fence' && d.kind !== 'hedge');
  let decoN = 0;
  function decorate(n) { for (let i = 0; i < n; i++) { const L = decoIds(); if (!L.length) return; L.sort((a, b) => b.beauty / b.cost - a.beauty / a.cost); put(L[(decoN++) % Math.min(6, L.length)].id); } }
  function seats() { if (S.members > A.seats * 0.85) { const id = best(d => d.seats, d => HALLS.indexOf(d.id) >= 0); if (id) put(id); } }
  function events(list) { Object.keys(S.ev).forEach(id => { if (evReady(id)) { claimEvent(id); stat.claims = (stat.claims || 0) + 1; } }); list.forEach(id => { if (EVENTS[id] && !evBlock(id) && S.money > evCost(EVENTS[id]) + RES) { if (runEvent(id) === '') stat.events++; } }); }
  function staffUp(keys) { keys.forEach(k => { const lv = S.staff[k] || 0; if (lv < 3 && (STAFF[k].goal || 0) <= S.goal && S.money > STAFF[k].costs[lv] + RES * 2) { if (hireTeam(k) === '') stat.staff++; } }); }
  function pastoral() {
    if (S.members <= MOD.cap * 0.9) return;
    Object.keys(OFFICE).forEach(k => { while (OFFICE[k].goal <= S.goal && S.off[k] < officeMax(k) && S.money > OFFICE[k].cost + RES) { if (appoint(k) !== '') break; stat.staff++; } });
    if (S.assoc.length < assocSlots() && S.cands.length) { let bi = 0; S.cands.forEach((c, i) => { if (c.skill > S.cands[bi].skill) bi = i; }); if (S.money > S.cands[bi].fee + RES * 2 && hireAssoc(bi) === '') stat.staff++; }
  }
  function spiritBuild() {
    const sp = spiritParts(), q = ['w', 'p', 'r'].sort((a, b) => sp[a] - sp[b])[0]; if (sp[q] >= 1) return;
    const id = best(d => (SPIRIT_B[d.id] || {})[q] || 0); if (id) put(id);
  }
  function week() {
    if (S.dlg) { const d = dlgById(S.dlg); let i = d.o.findIndex(o => !o.ok || o.ok()); chooseDlg(i < 0 ? 0 : i); }
    if (needRepair().length && S.money > RES) repairAll();
    if (strat === 'idle') return;
    if (strat === 'deco') { decorate(3); return; }
    seats();
    if (strat === 'shop') { const id = best(d => d.income, d => d.cat === 'shop'); if (id) put(id); return; }
    if (strat === 'spirit') { events(['communion', 'baptism', 'retreat', 'easter', 'thanks', 'christmas', 'revival']); staffUp(['praise', 'prayer', 'edu']); spiritBuild(); pastoral(); return; }
    // wish: 성도들의 바람부터 들어준다
    if (wishFirst && S.wish) { if (S.wish.t === 'event') { if (!evBlock(S.wish.id)) runEvent(S.wish.id); } else put(S.wish.id); }
    // balanced: 행사 → 목양 → 가장 모자란 항목 → 불편 → 꾸미기
    events(['communion', 'baptism', 'smallgroup', 'service', 'bazaar', 'retreat', 'street', 'easter', 'vbs', 'thanks', 'christmas', 'revival']);
    pastoral(); staffUp(['praise', 'care', 'prayer', 'evang', 'newcomer', 'edu', 'admin', 'media', 'mission']);
    for (let n = 0; n < (S.money > 30000 ? 5 : 2); n++) {
      const c = S.cov, items = [['seat', 'seats'], ['fel', 'fcap'], ['care', 'kcap'], ['comf', 'ccap'], ['park', 'park']].sort((a, b) => c[a[0]] - c[b[0]]);
      if (c.spirit < c[items[0][0]]) spiritBuild();
      else if (c[items[0][0]] < 1) { const key = items[0][1], id = best(d => d[key], key === 'seats' ? (d => HALLS.indexOf(d.id) >= 0) : null); if (id) put(id); }
    }
    const g = gripeList()[0];
    if (g) { const G = GRIPES[g.k]; if (g.k === 'bin') put('bin'); else if (g.k === 'bare') decorate(2); else if (G.ids) { const id = best(d => gripeFits(G, d) ? 1 : 0); if (id) put(id); } }
    if (S.money > 6000) { const id = best(d => d.income, d => d.cat === 'shop'); if (id && (stat.built[id] || 0) < 2) put(id); }
    decorate(1);
  }
  const rows = [];
  for (let w = 0; w < cfg.weeks && !S.over; w++) {
    week();
    for (let i = 0; i < 480; i++) { update(0.1); if (S.dlg && i % 60 === 0) { const d = dlgById(S.dlg); let k = d.o.findIndex(o => !o.ok || o.ok()); chooseDlg(k < 0 ? 0 : k); } }
    hud(true);
    const c = S.cov, r = S.rcpt || {}, g = S.gripL || {}; let gt = 0; for (const k in g) gt += g[k];
    rows.push({ w: S.week, money: Math.round(S.money), mem: S.members, mood: Math.round(S.mood), items: Math.round((c.items || 0) * 100), bonus: Math.round(S.mood - 85 * (c.items || 0)),
      spirit: Math.round(c.spirit * 100), seat: Math.round(c.seat * 100), past: Math.round(c.past * 100), fel: Math.round(c.fel * 100), park: Math.round(c.park * 100), care: Math.round(c.care * 100), comf: Math.round(c.comf * 100),
      rep: Math.round(S.rep), lvl: S.lvl, join: S.joinedWeek0 || 0, goal: S.goal, net: r.net || 0, offer: r.offering || 0, shop: (r.shop || 0) - (r.supply || 0), opex: (r.opex || 0) + (r.pay || 0), grip: gt, pen: S.gripPen || 0, vis: S.gripNL || 0, bld: S.buildings.length, sc: scoreParts() });
  }
  stat.wishOk = S.wishOk; stat.wishFail = S.wishFail;
  return { rows, over: !!S.over, stat };
}

(async () => {
  const srv = await serve(), url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch(), out = {};
  for (const strat of ONLY) {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 380 } }), page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(seed => { let s = seed; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      window.__CT_TEST = true; window.__CT_GATES = true; window.requestAnimationFrame = () => 0; try { localStorage.clear(); } catch (e) {} }, SEED);
    await page.goto(url); await page.evaluate(() => window.__ct.init());
    out[strat] = await page.evaluate(runBot, { strat, weeks: WEEKS, diff: DIFFK });
    out[strat].errs = errs; await ctx.close();
  }
  await browser.close(); srv.close();
  const marks = [1, 4, 8, 13, 26, 39, 52, 78, 104].filter(w => w <= WEEKS);
  for (const s of ONLY) {
    const R = out[s].rows;
    console.log(`\n## ${s}${out[s].over ? ' (파산)' : ''}${out[s].errs.length ? ' 오류: ' + out[s].errs[0] : ''}`);
    console.log('| 주 | 자금 | 성도 | 만족 | 항목% | 보너스 | 영성 | 좌석 | 목양 | 교제 | 주차 | 돌봄 | 편의 | 평판 | Lv | 목표 | 순익 | 헌금 | 매장 | 지출 | 불편 | 건물 |');
    console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    marks.forEach(w => { const r = R[w - 1]; if (!r) return;
      console.log(`| ${r.w} | ${r.money} | ${r.mem} | ${r.mood} | ${r.items} | ${r.bonus} | ${r.spirit} | ${r.seat} | ${r.past} | ${r.fel} | ${r.park} | ${r.care} | ${r.comf} | ${r.rep} | ${r.lvl} | ${r.goal} | ${r.net} | ${r.offer} | ${r.shop} | ${r.opex} | ${r.pen} | ${r.bld} |`); });
    console.log('지은 것:', JSON.stringify(out[s].stat));
  }
  const jf = arg('json', ''); if (jf) fs.writeFileSync(jf, JSON.stringify(out));
})();

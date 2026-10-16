/* Disjoint Sets (Union-Find) simulator + Dynamic Maze Generation */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  function player(p, render) {
    let frames = [], fi = 0, timer = null;
    const el = (s) => $(p + s);
    function show() {
      const f = frames[fi];
      if (!f) return;
      render(f);
      el('-msg').innerHTML = `<span class="stepno">${frames.length > 1 ? `ขั้น ${fi + 1}/${frames.length}` : ''}</span>${f.msg}`;
      el('-prev').disabled = fi === 0;
      el('-next').disabled = fi >= frames.length - 1;
      if (fi >= frames.length - 1) stop();
    }
    function stop() { if (timer) clearInterval(timer); timer = null; el('-play').textContent = '▶ เล่น'; }
    function play() {
      if (fi >= frames.length - 1) return;
      el('-play').textContent = '⏸ หยุด';
      timer = setInterval(() => { if (fi < frames.length - 1) { fi++; show(); } else stop(); }, +el('-speed').value);
    }
    el('-prev').onclick = () => { stop(); if (fi > 0) { fi--; show(); } };
    el('-next').onclick = () => { stop(); if (fi < frames.length - 1) { fi++; show(); } };
    el('-play').onclick = () => (timer ? stop() : play());
    return { set(fs, auto) { stop(); frames = fs; fi = 0; show(); if (auto) play(); }, stop };
  }

  /* ================= Disjoint Set engine ================= */
  function makeDSU(n, strategy, compress) {
    const s = new Array(n).fill(-1);
    const depth = (x) => { let d = 0; while (s[x] >= 0) { x = s[x]; d++; } return d; };
    const rootOf = (x) => { while (s[x] >= 0) x = s[x]; return x; };
    return { s, n, strategy, compress, depth, rootOf };
  }
  const sName = { simple: 'Simple Union', size: 'Union-by-Size', height: 'Union-by-Height' };

  function dsuSim() {
    if (!$('ds-view')) return;
    let D = makeDSU(8, 'size', true);

    const snap = (cls, msg) => ({ s: D.s.slice(), cls: cls || {}, msg });
    function layout(s) {
      const n = s.length, kids = Array.from({ length: n }, () => []);
      s.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
      const roots = []; s.forEach((p, i) => { if (p < 0) roots.push(i); });
      const U = 54, pos = {};
      let leaf = 0, maxD = 0;
      const rec = (v, d) => {
        maxD = Math.max(maxD, d);
        if (!kids[v].length) { pos[v] = [(leaf++ + 0.5) * U, d]; return; }
        kids[v].forEach((c) => rec(c, d + 1));
        pos[v] = [(pos[kids[v][0]][0] + pos[kids[v][kids[v].length - 1]][0]) / 2, d];
      };
      roots.forEach((r) => { rec(r, 0); leaf += 0.3; });
      return { pos, W: Math.max(leaf * U, 200), H: (maxD + 1) * 58 + 24, roots };
    }
    function render(f) {
      const { pos, W, H } = layout(f.s);
      let es = '', ns = '';
      f.s.forEach((p, i) => { if (p >= 0) es += `<line x1="${pos[i][0]}" y1="${pos[i][1] * 58 + 28}" x2="${pos[p][0]}" y2="${pos[p][1] * 58 + 28}"/>`; });
      f.s.forEach((p, i) => { ns += `<g class="${(f.cls[i] || '') + (p < 0 ? ' root' : '')}"><circle cx="${pos[i][0]}" cy="${pos[i][1] * 58 + 28}" r="19"/><text x="${pos[i][0]}" y="${pos[i][1] * 58 + 28}">${i}</text></g>`; });
      let h = '<tr><th>i</th>', v = '<tr><th>s[i]</th>';
      f.s.forEach((p, i) => { h += `<th>${i}</th>`; v += `<td class="${f.cls[i] || ''}">${p}</td>`; });
      const sets = f.s.filter((p) => p < 0).length;
      let maxDepth = 0; f.s.forEach((_, i) => { let d = 0, x = i; while (f.s[x] >= 0) { x = f.s[x]; d++; } maxDepth = Math.max(maxDepth, d); });
      $('ds-view').innerHTML = `<div class="dtree"><svg viewBox="0 0 ${W} ${H}">${es}${ns}</svg></div><div class="scroll-x"><table class="arr">${h}</tr>${v}</tr></table></div>`;
      $('ds-stats').innerHTML = `จำนวน set = <b>${sets}</b> · ความลึกมากสุด = <b>${maxDepth}</b> · ${sName[D.strategy]}${D.compress ? ' + Path Compression' : ''}`;
    }
    const pl = player('ds', render);

    /* find พร้อมบันทึกเฟรม */
    function find(x, F, label) {
      const path = [x];
      while (D.s[path[path.length - 1]] >= 0) path.push(D.s[path[path.length - 1]]);
      const r = path[path.length - 1];
      const cls = {}; path.forEach((p) => { cls[p] = 'cmp'; });
      F.push(snap(cls, `${label}: เดินขึ้นจาก ${x} ตาม parent: ${path.join(' → ')} · <b>root = ${r}</b> (s[${r}] = ${D.s[r]}) · ใช้ ${path.length - 1} ก้าว`));
      if (D.compress && path.length > 2) {
        path.slice(0, -1).forEach((p) => { D.s[p] = r; });
        const c2 = {}; path.slice(0, -1).forEach((p) => { c2[p] = 'done'; });
        F.push(snap(c2, `<b>Path Compression:</b> ทุก node บน path (${path.slice(0, -1).join(', ')}) ถูกทำให้ชี้ตรงไปที่ root ${r} → find ครั้งหน้าเร็วขึ้น`));
      }
      return r;
    }
    /* คืน [ข้อความ, root ที่เป็นพ่อ, root ที่เป็นลูก] ตามโค้ดในสไลด์ */
    function link(r1, r2) {
      const s = D.s;
      if (D.strategy === 'simple') {
        s[r2] = r1;
        return [`<b>Simple Union:</b> s[${r2}] = ${r1} → root ${r2} ชี้ไป ${r1} (ไม่สนขนาด/ความสูง)`, r1, r2];
      }
      if (D.strategy === 'size') {
        if (s[r2] < s[r1]) {
          s[r2] += s[r1]; s[r1] = r2;
          return [`<b>Union-by-Size:</b> set ของ ${r2} ใหญ่กว่า → ต่อ ${r1} เป็นลูกของ ${r2} · s[${r2}] = ${s[r2]} (ขนาดรวม ${-s[r2]})`, r2, r1];
        }
        s[r1] += s[r2]; s[r2] = r1;
        return [`<b>Union-by-Size:</b> set ของ ${r1} ใหญ่กว่าหรือเท่ากัน → ต่อ ${r2} เป็นลูกของ ${r1} · s[${r1}] = ${s[r1]} (ขนาดรวม ${-s[r1]})`, r1, r2];
      }
      if (s[r2] < s[r1]) {
        s[r1] = r2;
        return [`<b>Union-by-Height:</b> ${r2} สูงกว่า → ต่อ ${r1} เป็นลูกของ ${r2} (ความสูงไม่เปลี่ยน)`, r2, r1];
      }
      let msg;
      if (s[r1] === s[r2]) { s[r1]--; msg = `<b>Union-by-Height:</b> สูงเท่ากัน → ต่อ ${r2} เป็นลูกของ ${r1} และ <b>ความสูงเพิ่ม 1</b> (s[${r1}] = ${s[r1]})`; }
      else msg = `<b>Union-by-Height:</b> ${r1} สูงกว่า → ต่อ ${r2} เป็นลูกของ ${r1} (ความสูงไม่เปลี่ยน)`;
      s[r2] = r1;
      return [msg, r1, r2];
    }
    function read(id) { const x = Math.trunc(Number($(id).value)); return Number.isFinite(x) && x >= 0 && x < D.n && $(id).value !== '' ? x : null; }
    function doFind() {
      const x = read('ds-a'); if (x === null) { pl.set([snap({}, `ใส่ค่า a เป็น 0..${D.n - 1}`)], false); return; }
      const F = [snap({ [x]: 'cmp' }, `<code>find(${x})</code>`)];
      find(x, F, `find(${x})`);
      pl.set(F, true);
    }
    function union(a, b, F) {
      F.push(snap({ [a]: 'cmp', [b]: 'swap' }, `<code>union(${a}, ${b})</code> → หา root ของทั้งสอง แล้วต่อ root เข้าด้วยกัน`));
      const r1 = find(a, F, `find(${a})`), r2 = find(b, F, `find(${b})`);
      if (r1 === r2) { F.push(snap({ [r1]: 'done' }, `root เดียวกัน (${r1}) → อยู่ใน set เดียวกันแล้ว ไม่ต้อง union`)); return; }
      const [msg, parentRoot, childRoot] = link(r1, r2);
      F.push(snap({ [parentRoot]: 'done', [childRoot]: 'swap' }, msg));
    }
    function doUnion() {
      const a = read('ds-a'), b = read('ds-b');
      if (a === null || b === null) { pl.set([snap({}, `ใส่ a และ b เป็น 0..${D.n - 1}`)], false); return; }
      const F = []; union(a, b, F); pl.set(F, true);
    }
    function reset(msg) {
      D = makeDSU(+$('ds-n').value, $('ds-strategy').value, $('ds-compress').checked);
      pl.set([snap({}, msg)], false);
    }
    function chain() {
      D = makeDSU(+$('ds-n').value, $('ds-strategy').value, $('ds-compress').checked);
      const F = [snap({}, 'สร้างด้วย <code>union(1, 0)</code>, <code>union(2, 1)</code>, … , <code>union(n−1, n−2)</code> — กด ถัดไป เพื่อดูทีละ union แล้วเทียบความลึกของแต่ละ strategy')];
      for (let k = 0; k + 1 < D.n; k++) union(k + 1, k, F);
      pl.set(F, false);
    }
    function randomUnions() {
      const F = [snap({}, 'สุ่ม union 4 ครั้ง')];
      for (let k = 0; k < 4; k++) { const a = Math.floor(Math.random() * D.n), b = Math.floor(Math.random() * D.n); union(a, b, F); }
      pl.set(F, false);
    }
    $('ds-union').onclick = doUnion;
    $('ds-find').onclick = doFind;
    $('ds-chain').onclick = chain;
    $('ds-random').onclick = randomUnions;
    $('ds-reset').onclick = () => reset('รีเซ็ต — ทุก element อยู่ใน set ของตัวเอง (s[i] = −1)');
    ['ds-n', 'ds-strategy', 'ds-compress'].forEach((id) => { $(id).onchange = () => reset('เปลี่ยนค่าตั้ง → รีเซ็ตโครงสร้าง'); });
    $('ds-b').onkeydown = $('ds-a').onkeydown = (e) => { if (e.key === 'Enter') doUnion(); };
    reset('เริ่มต้น: ทุก element อยู่ใน set ของตัวเอง (s[i] = −1) · ลอง union(0, 1), union(2, 3), union(0, 2) แล้ว find');
  }

  /* ================= Dynamic Maze ================= */
  function mazeSim() {
    if (!$('mz-view')) return;
    const C = 56;
    let N = 3, frames = [];
    function render(f) {
      const W = N * C, pad = 8;
      let cells = '', walls = '', labels = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const id = r * N + c;
        const hl = f.cur && (f.cur.u === id || f.cur.v === id) ? ' a' : '';
        cells += `<rect class="mz-cell${hl}" x="${pad + c * C}" y="${pad + r * C}" width="${C}" height="${C}"/>`;
        labels += `<text class="mz-t" x="${pad + c * C + C / 2}" y="${pad + r * C + C / 2}">${id}</text>`;
      }
      const line = (x1, y1, x2, y2, cls) => `<line class="mz-wall${cls ? ' ' + cls : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      walls += line(pad, pad, pad + W, pad) + line(pad, pad + W, pad + W, pad + W) + line(pad, pad, pad, pad + W) + line(pad + W, pad, pad + W, pad + W);
      const seg = (w, cls) => (w.h
        ? line(pad + w.c * C, pad + (w.r + 1) * C, pad + (w.c + 1) * C, pad + (w.r + 1) * C, cls)
        : line(pad + (w.c + 1) * C, pad + w.r * C, pad + (w.c + 1) * C, pad + (w.r + 1) * C, cls));
      f.allWalls.forEach((w) => {
        const isCur = f.cur && f.cur.w === w;
        if (isCur) walls += seg(w, f.cur.ok ? 'ok' : 'no');   // ok = ทุบแล้ว (เส้นประเขียว), no = ถูกปฏิเสธ (แดง)
        else if (!f.open.has(w.key)) walls += seg(w, '');
      });
      $('mz-view').innerHTML = `<svg viewBox="0 0 ${W + 2 * pad} ${W + 2 * pad}">${cells}${labels}${walls}</svg>`;
      $('mz-sets').innerHTML = f.sets;
    }
    const pl = player('mz', render);

    function build(useSlide) {
      N = +$('mz-n').value;
      const walls = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const id = r * N + c;
        if (c + 1 < N) walls.push({ r, c, h: false, u: id, v: id + 1, key: `${id}-${id + 1}` });
        if (r + 1 < N) walls.push({ r, c, h: true, u: id, v: id + N, key: `${id}-${id + N}` });
      }
      let order;
      const byKey = {}; walls.forEach((w) => { byKey[w.key] = w; });
      if (useSlide && N === 3) {
        const seq = ['0-1', '4-7', '1-2', '3-4', '1-4', '6-7', '0-3', '5-8', '7-8'];
        order = seq.map((k) => byKey[k]);
        walls.forEach((w) => { if (!seq.includes(w.key)) order.push(w); });
      } else { order = walls.slice(); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
      const s = new Array(N * N).fill(-1);
      const find = (x) => { while (s[x] >= 0) x = s[x]; return x; };
      const setsText = () => { const m = {}; for (let i = 0; i < N * N; i++) (m[find(i)] = m[find(i)] || []).push(i); return Object.values(m).map((a) => '{' + a.join(', ') + '}').join(' '); };
      const open = new Set();
      const F = [{ allWalls: walls, open: new Set(open), cur: null, sets: setsText(), msg: `เริ่มต้น: ตาราง ${N}×${N} กำแพงตั้งอยู่ทุกด้าน · ทุกช่องอยู่ใน set ของตัวเอง` }];
      let sets = N * N, step = 0;
      for (const w of order) {
        if (sets === 1) break;
        step++;
        const r1 = find(w.u), r2 = find(w.v);
        if (r1 !== r2) {
          if (s[r2] < s[r1]) { s[r2] += s[r1]; s[r1] = r2; } else { s[r1] += s[r2]; s[r2] = r1; }
          open.add(w.key); sets--;
          F.push({ allWalls: walls, open: new Set(open), cur: { u: w.u, v: w.v, ok: true, w }, sets: setsText(), msg: `<b>Step ${step}:</b> เลือกกำแพงระหว่างช่อง ${w.u} กับ ${w.v} · find(${w.u}) = ${r1}, find(${w.v}) = ${r2} → <b>คนละ set</b> → ทุบกำแพง + union${sets === 1 ? ' · <b>เหลือ set เดียว → maze เสร็จ ✔</b>' : ''}` });
        } else {
          F.push({ allWalls: walls, open: new Set(open), cur: { u: w.u, v: w.v, ok: false, w }, sets: setsText(), msg: `<b>Step ${step}:</b> เลือกกำแพงระหว่างช่อง ${w.u} กับ ${w.v} · find(${w.u}) = find(${w.v}) = ${r1} → <b>set เดียวกัน</b> → ปฏิเสธ (ทุบแล้วจะเกิด loop/cycle) กำแพงยังอยู่` });
        }
      }
      pl.set(F, false);
    }
    $('mz-slide').onclick = () => { $('mz-n').value = '3'; build(true); };
    $('mz-random').onclick = () => build(false);
    $('mz-n').onchange = () => build(false);
    build(true);
  }

  document.addEventListener('DOMContentLoaded', () => { dsuSim(); mazeSim(); });
})();

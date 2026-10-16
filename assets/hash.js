/* Hash Table: engine (chaining / linear / quadratic / double) + simulator + static trace renderer */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const mod = (a, m) => ((a % m) + m) % m;
  const isPrime = (n) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const nextPrime = (n) => { while (!isPrime(n)) n++; return n; };
  const prevPrime = (n) => { n--; while (n > 1 && !isPrime(n)) n--; return n; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ================= engine ================= */
  function create(mode, M) {
    return { mode, M, used: 0, cells: mode === 'chain' ? Array.from({ length: M }, () => []) : new Array(M).fill(null) };
  }
  function cloneCells(st) {
    return st.mode === 'chain' ? st.cells.map((l) => l.slice()) : st.cells.map((c) => c && { k: c.k, del: c.del });
  }
  function stats(st) {
    if (st.mode === 'chain') return { n: st.used, d: 0, M: st.M };
    let n = 0, d = 0;
    st.cells.forEach((c) => { if (c) c.del ? d++ : n++; });
    return { n, d, M: st.M };
  }
  function snap(st, hl, msg) {
    return { mode: st.mode, M: st.M, cells: cloneCells(st), hl: hl || null, msg, stats: stats(st) };
  }
  const h2of = (M, x) => { const R = prevPrime(M); return R - mod(x, R); };

  function probePos(st, x, i) {
    const h = mod(x, st.M);
    if (st.mode === 'linear') return mod(h + i, st.M);
    if (st.mode === 'quad') return mod(h + i * i, st.M);
    return mod(h + i * h2of(st.M, x), st.M);
  }
  function probeText(st, x, i, pos, prime) {
    const M = st.M, h = mod(x, M), p = prime ? "h'" : 'h';
    if (i === 0) return `${p}(${x}) = ${x} mod ${M} = <b>${pos}</b>`;
    if (st.mode === 'linear') return `(${h} + ${i}) mod ${M} = <b>${pos}</b>`;
    if (st.mode === 'quad') return `(${h} + ${i}²) mod ${M} = <b>${pos}</b>`;
    return `(${h} + ${i}×${h2of(M, x)}) mod ${M} = <b>${pos}</b>`;
  }
  /* เหมือน findPos ของ Weiss: หยุดที่ช่องว่าง หรือช่องที่มี key ตรง (ACTIVE หรือ DELETED) */
  function findSlot(st, x) {
    const seq = [];
    for (let i = 0; i < st.M; i++) {
      const pos = probePos(st, x, i);
      const c = st.cells[pos];
      seq.push({ i, pos, c: c && { k: c.k, del: c.del } });
      if (c === null) return { seq, end: 'empty', pos };
      if (c.k === x) return { seq, end: c.del ? 'deleted' : 'active', pos };
    }
    return { seq, end: 'full', pos: -1 };
  }

  function opOpen(st, op, x, F) {
    const r = findSlot(st, x);
    const n = r.seq.length;
    r.seq.forEach((s, j) => {
      const loc = probeText(st, x, s.i, s.pos);
      const last = j === n - 1 && r.end !== 'full';
      if (!last) {
        let m = `${loc} → ช่อง ${s.pos} มี <b>${s.c.k}</b>${s.c.del ? ' (DELETED)' : ''} อยู่แล้ว <b>ชน!</b> probe ถัดไป`;
        if (j === 0 && st.mode === 'double')
          m += ` · step size h₂(${x}) = ${prevPrime(st.M)} − (${x} mod ${prevPrime(st.M)}) = <b>${h2of(st.M, x)}</b>`;
        F.push(snap(st, { row: s.pos, kind: 'cmp' }, m));
      }
    });
    if (r.end === 'full') {
      F.push(snap(st, null, `probe ครบ ${st.M} ครั้งแล้วไม่เจอช่องว่างหรือ key ที่ต้องการ — วน cycle ซ้ำช่องเดิม (TableSize ควรเป็น prime และ λ ≤ 0.5)`));
      return op === 'insert' ? 'full' : 'notfound';
    }
    const loc = probeText(st, x, r.seq[n - 1].i, r.pos);
    if (op === 'insert') {
      if (r.end === 'active') { F.push(snap(st, { row: r.pos, kind: 'cmp' }, `${loc} → พบ <b>${x}</b> อยู่แล้ว (ACTIVE) → ไม่ insert (duplicate)`)); return 'dup'; }
      if (r.end === 'deleted') {
        st.cells[r.pos].del = false;
        F.push(snap(st, { row: r.pos, kind: 'done' }, `${loc} → พบ <b>${x}</b> ที่ถูกทำเครื่องหมาย DELETED ไว้ → ทำให้กลับเป็น ACTIVE`));
        return 'ok';
      }
      st.cells[r.pos] = { k: x, del: false };
      st.used++;
      F.push(snap(st, { row: r.pos, kind: 'done' }, `${loc} → ช่อง ${r.pos} <b>ว่าง</b> → วาง <b>${x}</b> ที่ index ${r.pos}${n > 1 ? ` (probe ${n} ครั้ง)` : ''}`));
      return 'ok';
    }
    if (op === 'search') {
      if (r.end === 'active') { F.push(snap(st, { row: r.pos, kind: 'done' }, `${loc} → พบ <b>${x}</b> ที่ index ${r.pos} (probe ${n} ครั้ง) → <b>พบ</b> ✔`)); return 'found'; }
      if (r.end === 'deleted') { F.push(snap(st, { row: r.pos, kind: 'cmp' }, `${loc} → เจอ ${x} แต่ถูกทำเครื่องหมาย DELETED → ถือว่า <b>ไม่พบ</b>`)); return 'notfound'; }
      F.push(snap(st, { row: r.pos, kind: 'fail' }, `${loc} → ช่องว่าง = ปลาย probe sequence → <b>ไม่พบ</b> ${x} (probe ${n} ครั้ง)`));
      return 'notfound';
    }
    /* remove */
    if (r.end === 'active') {
      st.cells[r.pos].del = true;
      F.push(snap(st, { row: r.pos, kind: 'del' }, `${loc} → พบ <b>${x}</b> → ทำเครื่องหมาย <b>DELETED</b> (lazy deletion — ไม่ลบจริง เพื่อไม่ให้ search path ของ key อื่นขาด)`));
      return 'ok';
    }
    F.push(snap(st, { row: r.pos, kind: 'fail' }, `${loc} → ไม่พบ ${x} ในตาราง → ลบไม่ได้`));
    return 'notfound';
  }

  function opChain(st, op, x, F) {
    const M = st.M, h = mod(x, M), list = st.cells[h];
    const base = `h(${x}) = ${x} mod ${M} = <b>${h}</b>`;
    let found = -1;
    if (!list.length) F.push(snap(st, { row: h, kind: 'cmp' }, `${base} · list ที่ช่อง ${h} ยังว่าง`));
    for (let j = 0; j < list.length; j++) {
      if (list[j] === x) { found = j; break; }
      F.push(snap(st, { row: h, node: j, kind: 'cmp' }, `${j === 0 ? base + ' · ' : ''}เดิน list ช่อง ${h}: เทียบ ${x} กับ <b>${list[j]}</b> → ไม่ตรง${j === list.length - 1 ? ' (ถึงท้าย list)' : ' ไปต่อ'}`));
    }
    if (op === 'insert') {
      if (found >= 0) { F.push(snap(st, { row: h, node: found, kind: 'cmp' }, `พบ <b>${x}</b> ใน list แล้ว → ไม่ insert (duplicate)`)); return 'dup'; }
      const coll = list.length > 0;
      list.unshift(x); st.used++;
      F.push(snap(st, { row: h, node: 0, kind: 'done' }, `${coll ? '<b>ชน!</b> ' : ''}ไม่ซ้ำ → ใส่ <b>${x}</b> ที่ <b>หัว list</b> ช่อง ${h}`));
      return 'ok';
    }
    if (op === 'search') {
      if (found >= 0) { F.push(snap(st, { row: h, node: found, kind: 'done' }, `เจอ <b>${x}</b> ใน list ช่อง ${h} (เทียบ ${found + 1} ครั้ง) → <b>พบ</b> ✔`)); return 'found'; }
      F.push(snap(st, { row: h, kind: 'fail' }, `ถึงท้าย list โดยไม่เจอ (เทียบ ${list.length} ครั้ง) → <b>ไม่พบ</b> ${x}`));
      return 'notfound';
    }
    if (found >= 0) {
      F.push(snap(st, { row: h, node: found, kind: 'del' }, `เจอ <b>${x}</b> ที่ตำแหน่ง ${found + 1} ของ list ช่อง ${h}`));
      list.splice(found, 1); st.used--;
      F.push(snap(st, { row: h, kind: 'done' }, `ลบ node ของ ${x} และต่อ link ใหม่ — list ช่อง ${h} เหลือ ${list.length ? '[' + list.join(', ') + ']' : 'ว่าง'}`));
      return 'ok';
    }
    F.push(snap(st, { row: h, kind: 'fail' }, `ไม่พบ ${x} ใน list ช่อง ${h} → ลบไม่ได้`));
    return 'notfound';
  }
  const run = (st, op, x, F) => (st.mode === 'chain' ? opChain : opOpen)(st, op, x, F);

  const needRehash = (st) => (st.mode === 'chain' ? st.used > st.M : st.used * 2 > st.M);

  function rehash(st, F, reason) {
    const oldM = st.M, newM = nextPrime(oldM * 2);
    const items = st.mode === 'chain' ? [].concat(...st.cells) : st.cells.filter((c) => c && !c.del).map((c) => c.k);
    F.push(snap(st, null, `${reason} → <b>Rehash</b>: ขนาดใหม่ = nextPrime(2 × ${oldM}) = <b>${newM}</b> · scan ตารางเก่าตามลำดับ index แล้วใส่ ${items.length} ตัว${st.mode === 'chain' ? '' : ' (ตัวที่ DELETED ถูกทิ้ง)'}ลงตารางใหม่ด้วย h′(x) = x mod ${newM}`));
    const nt = create(st.mode, newM);
    items.forEach((k) => {
      if (st.mode === 'chain') {
        const p = mod(k, newM);
        nt.cells[p].unshift(k); nt.used++;
        F.push(snap(nt, { row: p, node: 0, kind: 'done' }, `ย้าย <b>${k}</b>: h′(${k}) = ${k} mod ${newM} = <b>${p}</b> → ใส่หัว list ช่อง ${p}`));
        return;
      }
      const r = findSlot(nt, k);
      const path = r.seq.map((s, j) => probeText(nt, k, s.i, s.pos, true) + (j < r.seq.length - 1 ? ` ชนกับ ${s.c.k}` : ' ว่าง')).join(' → ');
      if (r.end === 'empty') { nt.cells[r.pos] = { k, del: false }; nt.used++; }
      F.push(snap(nt, r.end === 'empty' ? { row: r.pos, kind: 'done' } : null, `ย้าย <b>${k}</b>: ${path}${r.end === 'empty' ? ` → วางที่ <b>${r.pos}</b>` : ' → ใส่ไม่ได้'}`));
    });
    st.M = nt.M; st.cells = nt.cells; st.used = nt.used;
    F.push(snap(st, null, `Rehash เสร็จ — ตารางขนาด <b>${newM}</b> · λ = ${(stats(st).n / newM).toFixed(2)}`));
  }

  /* ================= rendering ================= */
  function renderOpen(f) {
    const hl = f.hl || {};
    let h = '<tr><th>i</th>', v = '<tr><th>key</th>';
    f.cells.forEach((c, i) => {
      let cls = !c ? 'empty' : c.del ? 'del' : '';
      if (hl.row === i) cls = hl.kind === 'fail' ? 'hole' : hl.kind === 'del' ? 'del cmp' : hl.kind;
      h += `<th>${i}</th>`;
      v += `<td class="${cls}">${c ? c.k : '–'}</td>`;
    });
    return `<div class="scroll-x"><table class="arr ht-open">${h}</tr>${v}</tr></table></div>`;
  }
  function renderChain(f) {
    const hl = f.hl || {};
    let h = '<div class="ht-chain">';
    f.cells.forEach((list, i) => {
      const hcls = hl.row === i && hl.node === undefined ? ' ' + (hl.kind === 'fail' ? 'hole' : hl.kind) : '';
      h += `<div class="ht-row"><span class="ht-i">${i}</span><span class="ht-head${hcls}"></span>`;
      list.forEach((k, j) => {
        const c = hl.row === i && hl.node === j ? ' ' + hl.kind : '';
        h += `<span class="ht-arrow">→</span><span class="ht-node${c}">${k}</span>`;
      });
      h += '</div>';
    });
    return h + '</div>';
  }
  const render = (f) => (f.mode === 'chain' ? renderChain(f) : renderOpen(f));

  /* ================= static traces (data-ht) ================= */
  function renderStatic(el) {
    const mode = el.dataset.ht, M = +el.dataset.size || 10;
    const keys = el.dataset.keys.split(',').map(Number);
    const st = create(mode, M);
    const steps = keys.map((k) => { const F = []; run(st, 'insert', k, F); return { k, F }; });
    if ('cards' in el.dataset) {
      el.classList.add('grid2', 'stack');
      el.innerHTML = steps.map((s, i) => `<div class="step"><h4>Step ${i + 1}: Insert ${s.k}</h4><p>${s.F.map((f) => f.msg).join('<br>')}</p>${render(s.F[s.F.length - 1])}</div>`).join('');
      return;
    }
    const lastF = steps[steps.length - 1].F;
    let html = render(lastF[lastF.length - 1]);
    if ('log' in el.dataset) html += '<ol class="ht-log">' + steps.map((s) => `<li>${s.F.map((f) => f.msg).join(' · ')}</li>`).join('') + '</ol>';
    el.innerHTML = html;
  }

  /* ================= string hash widget ================= */
  function strWidget() {
    const inp = $('hs-input');
    if (!inp) return;
    const sz = $('hs-size'), out = $('hs-out');
    function calc() {
      const s = inp.value, M = Math.max(2, Math.trunc(+sz.value) || 11);
      if (!s) { out.innerHTML = '<p class="muted">ใส่ข้อความก่อน</p>'; return; }
      let hv = 0, exact = 0n, rows = '', sum = 0;
      for (const ch of s) {
        const code = ch.charCodeAt(0);
        const prev = hv;
        hv = (Math.imul(37, hv) + code) >>> 0;
        exact = 37n * exact + BigInt(code);
        sum += code;
        rows += `<tr><td>${esc(ch)}</td><td>${code}</td><td>37 × ${prev} + ${code}</td><td>${hv}</td></tr>`;
      }
      const wrapped = exact !== BigInt(hv);
      const k = [...s].map((c) => c.charCodeAt(0));
      const m2 = k.length >= 3 ? `${k[0]} + 27×${k[1]} + 729×${k[2]} = ${k[0] + 27 * k[1] + 729 * k[2]} → mod ${M} = <b>${(k[0] + 27 * k[1] + 729 * k[2]) % M}</b>` : 'ต้องมีอย่างน้อย 3 ตัวอักษร';
      out.innerHTML =
        `<div class="scroll-x"><table class="data"><tr><th>ตัวอักษร</th><th>ASCII</th><th>hashVal = 37 × hashVal + ch</th><th>hashVal</th></tr>${rows}</table></div>` +
        `<ul><li><b>Method 3 (Horner):</b> hashVal = ${hv}${wrapped ? ' <small>(ค่าจริงใหญ่เกิน 32 บิต → unsigned int wrap-around)</small>' : ''} → mod ${M} = <b>${hv % M}</b></li>` +
        `<li><b>Method 1 (ผลรวม ASCII):</b> ${sum} mod ${M} = <b>${sum % M}</b></li>` +
        `<li><b>Method 2 (3 ตัวแรก):</b> ${m2}</li></ul>`;
    }
    inp.oninput = calc; sz.oninput = calc;
    calc();
  }

  /* ================= simulator ================= */
  function sim() {
    if (!$('ht-view')) return;
    const MAX = 40;
    let st = create('linear', 10), frames = [], fi = 0, timer = null;

    function show() {
      const f = frames[fi];
      if (!f) return;
      $('ht-view').innerHTML = render(f);
      const s = f.stats, lam = ((f.mode === 'chain' ? s.n : s.n + s.d) / s.M).toFixed(2);
      $('ht-stats').innerHTML = `N = <b>${s.n}</b> · M = <b>${s.M}</b> · λ = <b>${lam}</b>${s.d ? ` <small>(รวม DELETED ${s.d} ตัว)</small>` : ''}`;
      $('ht-msg').innerHTML = `<span class="stepno">${frames.length > 1 ? `ขั้น ${fi + 1}/${frames.length}` : ''}</span>${f.msg}`;
      $('ht-prev').disabled = fi === 0;
      $('ht-next').disabled = fi >= frames.length - 1;
      if (fi >= frames.length - 1) stop();
    }
    function idle(msg) { frames = [snap(st, null, msg)]; fi = 0; show(); }
    function stop() { if (timer) clearInterval(timer); timer = null; $('ht-play').textContent = '▶ เล่น'; }
    function play() {
      if (fi >= frames.length - 1) return;
      $('ht-play').textContent = '⏸ หยุด';
      timer = setInterval(() => { if (fi < frames.length - 1) { fi++; show(); } else stop(); }, +$('ht-speed').value);
    }
    function start(fs) { stop(); frames = fs; fi = 0; show(); play(); }

    function readKey() {
      const raw = $('ht-input').value.trim(), x = Number(raw);
      if (raw === '' || !Number.isFinite(x)) { idle('กรุณาใส่ตัวเลข (จำนวนเต็ม) ก่อน'); return null; }
      return Math.trunc(x);
    }
    function doOp(op) {
      const x = readKey();
      if (x === null) return;
      if (op === 'insert' && st.used >= MAX) { idle(`ตารางมีข้อมูลเต็มขีดจำกัดของตัวจำลอง (${MAX} ตัว)`); return; }
      const w = { mode: st.mode, M: st.M, used: st.used, cells: cloneCells(st) }, F = [];
      const res = run(w, op, x, F);
      if (op === 'insert' && res === 'ok' && $('ht-auto').checked && needRehash(w)) {
        const s = stats(w), lam = ((s.n + s.d) / w.M).toFixed(2);
        rehash(w, F, `λ = ${w.used}/${w.M} = ${lam} เกิน ${w.mode === 'chain' ? '1.0' : '0.5'}`);
      }
      st = w;
      start(F);
      $('ht-input').value = '';
      $('ht-input').focus();
    }
    function doRehash() {
      const w = { mode: st.mode, M: st.M, used: st.used, cells: cloneCells(st) }, F = [];
      if (stats(w).n + stats(w).d === 0) { idle('ตารางว่าง ไม่มีอะไรให้ rehash'); return; }
      rehash(w, F, 'สั่ง rehash ด้วยมือ');
      st = w;
      start(F);
    }
    function reset(msg) { stop(); st = create($('ht-mode').value, +$('ht-size').value); idle(msg); }
    function doRandom() {
      stop();
      st = create($('ht-mode').value, +$('ht-size').value);
      const k = st.mode === 'chain' ? st.M : Math.floor(st.M / 2);
      for (let i = 0; i < k; i++) {
        const x = Math.floor(Math.random() * 100);
        run(st, 'insert', x, []);
        if (needRehash(st)) rehash(st, [], '');
      }
      idle(`สุ่มใส่ ${k} ตัว (ไม่ได้แสดงทีละขั้น) — ลอง Search / Remove / Insert ต่อได้เลย`);
    }

    $('ht-insert').onclick = () => doOp('insert');
    $('ht-search').onclick = () => doOp('search');
    $('ht-remove').onclick = () => doOp('remove');
    $('ht-rehash').onclick = doRehash;
    $('ht-input').onkeydown = (e) => { if (e.key === 'Enter') doOp('insert'); };
    $('ht-random').onclick = doRandom;
    $('ht-clear').onclick = () => reset('ล้างตารางแล้ว');
    $('ht-mode').onchange = () => reset(`เปลี่ยนเป็น ${$('ht-mode').selectedOptions[0].text} — ล้างตารางแล้ว`);
    $('ht-size').onchange = () => reset(`TableSize = ${$('ht-size').value} — ล้างตารางแล้ว`);
    $('ht-prev').onclick = () => { stop(); if (fi > 0) { fi--; show(); } };
    $('ht-next').onclick = () => { stop(); if (fi < frames.length - 1) { fi++; show(); } };
    $('ht-play').onclick = () => (timer ? stop() : play());
    reset('ลองใส่ 89, 18, 49, 58, 69 ตามลำดับ (Linear Probing, M = 10) แล้วเทียบกับตัวอย่างข้างบน');
  }

  window.HashViz = { create, run, rehash, findSlot, nextPrime, prevPrime, render, snap, needRehash, stats };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ht]').forEach(renderStatic);
    strWidget();
    sim();
  });
})();

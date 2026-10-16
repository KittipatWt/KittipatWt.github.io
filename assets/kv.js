/* Chapter 9 simulators: Set operations (union / intersection / difference) และ Map vs Dictionary */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (a) => '{' + a.join(', ') + '}';

  /* เล่นเฟรมทีละขั้น: ใช้ร่วมกันทั้งสอง simulator */
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

  /* ================= Set operations ================= */
  function setSim() {
    if (!$('ss-view')) return;
    const parse = (s) => [...new Set(s.split(/[\s,]+/).filter((x) => x !== '').map(Number).filter(Number.isFinite).map(Math.trunc))].sort((a, b) => a - b);
    const ins = (a, x) => { if (!a.includes(x)) { a.push(x); a.sort((p, q) => p - q); } };
    const chips = (arr, set, hl) => arr.length
      ? arr.map((v) => { const h = hl.find((e) => e.set === set && e.val === v); return `<span class="ht-node${h ? ' ' + h.kind : ''}">${v}</span>`; }).join('')
      : '<span class="muted">{ } ว่าง</span>';
    const render = (f) => {
      const row = (l, a, s) => `<div class="set-row"><span class="set-lbl">${l}</span>${chips(a, s, f.hl)}</div>`;
      $('ss-view').innerHTML = row('A', f.A, 'A') + row('B', f.B, 'B') + row('result', f.R, 'R');
    };
    const pl = player('ss', render);

    function build(op, A, B) {
      const F = [], R = op === 'inter' ? [] : A.slice();
      const push = (hl, msg) => F.push({ A, B, R: R.slice(), hl, msg });
      if (op === 'union') {
        push([], `<b>Step 1:</b> เริ่มด้วย <code>result = a</code> → result = ${fmt(R)}`);
        B.forEach((b, i) => {
          if (R.includes(b)) push([{ set: 'B', val: b, kind: 'cmp' }, { set: 'R', val: b, kind: 'cmp' }], `<b>Step ${i + 2}:</b> พิจารณา b = <b>${b}</b> · ${b} ∈ result? <b>ใช่</b> → insert ถูกเพิกเฉย (set ไม่เก็บซ้ำ)`);
          else { ins(R, b); push([{ set: 'B', val: b, kind: 'cmp' }, { set: 'R', val: b, kind: 'done' }], `<b>Step ${i + 2}:</b> พิจารณา b = <b>${b}</b> · ${b} ∈ result? <b>ไม่</b> → insert ${b} ลง result`); }
        });
        push([], `<b>Step ${B.length + 2}:</b> loop จบ → return result = ${fmt(R)}`);
      } else if (op === 'inter') {
        push([], `<b>Step 1:</b> เริ่มด้วย <code>result = {}</code>`);
        A.forEach((a, i) => {
          if (B.includes(a)) { ins(R, a); push([{ set: 'A', val: a, kind: 'cmp' }, { set: 'B', val: a, kind: 'cmp' }, { set: 'R', val: a, kind: 'done' }], `<b>Step ${i + 2}:</b> พิจารณา a = <b>${a}</b> · ${a} ∈ B? <b>ใช่</b> → insert ${a} ลง result`); }
          else push([{ set: 'A', val: a, kind: 'cmp' }], `<b>Step ${i + 2}:</b> พิจารณา a = <b>${a}</b> · ${a} ∈ B? <b>ไม่</b> → ไม่ insert`);
        });
        push([], `<b>Step ${A.length + 2}:</b> loop จบ → return result = ${fmt(R)}`);
      } else {
        push([], `<b>Step 1:</b> เริ่มด้วย <code>result = a</code> → result = ${fmt(R)}`);
        B.forEach((b, i) => {
          const at = R.indexOf(b);
          if (at >= 0) { R.splice(at, 1); push([{ set: 'B', val: b, kind: 'cmp' }], `<b>Step ${i + 2}:</b> พิจารณา b = <b>${b}</b> · <code>result.erase(${b})</code> → ลบ ${b} ออกจาก result`); }
          else push([{ set: 'B', val: b, kind: 'cmp' }], `<b>Step ${i + 2}:</b> พิจารณา b = <b>${b}</b> · ไม่มี ${b} ใน result → erase ไม่ทำอะไร (คืน 0)`);
        });
        push([], `<b>Step ${B.length + 2}:</b> loop จบ → return result = ${fmt(R)}`);
      }
      return F;
    }
    function run() {
      const A = parse($('ss-a').value), B = parse($('ss-b').value), op = $('ss-op').value;
      $('ss-a').value = A.join(', '); $('ss-b').value = B.join(', ');
      pl.set(build(op, A, B), true);
    }
    $('ss-run').onclick = run;
    ['ss-a', 'ss-b'].forEach((id) => { $(id).onkeydown = (e) => { if (e.key === 'Enter') run(); }; });
    $('ss-op').onchange = run;
    pl.set(build('union', parse($('ss-a').value), parse($('ss-b').value)), false);
  }

  /* ================= Map vs Dictionary ================= */
  function kvSim() {
    if (!$('kv-view')) return;
    const MAX = 12;
    let mode = 'map', items = [];
    const cp = (a) => a.map((x) => ({ k: x.k, v: x.v }));
    const render = (f) => {
      const cls = (i) => (f.hl.del || []).includes(i) ? 'del' : (f.hl.done || []).includes(i) ? 'done' : (f.hl.cmp || []).includes(i) ? 'cmp' : '';
      $('kv-view').innerHTML = f.items.length
        ? '<div class="kv-list">' + f.items.map((x, i) => `<div class="kv ${cls(i)}">k=${x.k}, v=${esc(x.v)}</div>`).join('') + '</div>'
        : `<p class="muted">Empty ${mode === 'map' ? 'Map' : 'Dictionary'} ∅</p>`;
      $('kv-state').innerHTML = f.items.length ? '{' + f.items.map((x) => `(${x.k}, ${esc(x.v)})`).join(', ') + '}' : '∅';
    };
    const pl = player('kv', render);
    const mk = (hl, msg, its) => ({ items: cp(its || items), hl: hl || {}, msg });

    /* สแกนแบบ log file: คืน index ตัวแรกที่ key ตรง (push เฟรมของตัวที่ไม่ตรงระหว่างทาง) */
    function scan(k, F) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].k === k) return i;
        F.push(mk({ cmp: [i] }, `เทียบ key ${items[i].k} กับ ${k}: ไม่ตรง → ตัวถัดไป`));
      }
      return -1;
    }
    function read() {
      const kr = $('kv-key').value.trim(), k = Number(kr);
      if (kr === '' || !Number.isFinite(k)) return null;
      return { k: Math.trunc(k), v: $('kv-val').value.trim().slice(0, 4) };
    }
    function go(op) {
      const a = read();
      if (!a) { pl.set([mk({}, 'กรุณาใส่ key (จำนวนเต็ม) ก่อน')], false); return; }
      const { k, v } = a, F = [];
      const add = (val) => { items.push({ k, v: val }); };
      if (op === 'put') {
        if (!v) { pl.set([mk({}, 'กรุณาใส่ value ก่อน')], false); return; }
        if (mode === 'dict') {
          if (items.length >= MAX) { pl.set([mk({}, `เต็มขีดจำกัด ${MAX} ตัว`)], false); return; }
          add(v);
          F.push(mk({ done: [items.length - 1] }, `<code>insert(${k}, ${esc(v)})</code> → ต่อท้าย list ใน O(1) <b>โดยไม่เช็กซ้ำ</b> (Dictionary อนุญาต duplicate key${items.filter((x) => x.k === k).length > 1 ? ' — ตอนนี้ key นี้มี ' + items.filter((x) => x.k === k).length + ' ตัว' : ''})`));
        } else {
          const i = scan(k, F);
          if (i >= 0) { items[i].v = v; F.push(mk({ done: [i] }, `เจอ key ${k} แล้ว → <b>เขียนทับ</b> value เป็น ${esc(v)} (Map ห้ามมี key ซ้ำ)`)); }
          else if (items.length >= MAX) F.push(mk({}, `เต็มขีดจำกัด ${MAX} ตัว`));
          else { add(v); F.push(mk({ done: [items.length - 1] }, `ไม่เจอ key ${k} → insert (${k}, ${esc(v)})`)); }
        }
      } else if (op === 'find') {
        const i = scan(k, F);
        F.push(i >= 0 ? mk({ done: [i] }, `<code>find(${k})</code> → iterator ไปที่ (${items[i].k}, ${esc(items[i].v)})${mode === 'dict' ? ' <small>(คืนตัวแรกที่เจอ)</small>' : ''}`)
          : mk({}, `<code>find(${k})</code> → <b>end()</b> (ไม่พบ) · <b>ไม่มี side-effect</b> ไม่ insert อะไรเพิ่ม`));
      } else if (op === 'findAll') {
        const hits = [];
        items.forEach((x, i) => {
          if (x.k === k) { hits.push(i); F.push(mk({ done: hits.slice() }, `เทียบ key ${x.k} กับ ${k}: <b>ตรง</b> → yield (${x.k}, ${esc(x.v)}) · และต้องสแกนต่อ`)); }
          else F.push(mk({ cmp: [i], done: hits.slice() }, `เทียบ key ${x.k} กับ ${k}: ไม่ตรง`));
        });
        F.push(mk({ done: hits }, `<code>findAll(${k})</code> → พบ <b>${hits.length}</b> รายการ${hits.length ? ': ' + hits.map((i) => `(${items[i].k}, ${esc(items[i].v)})`).join(', ') : ''} · ต้องสแกนครบ ${items.length} ตัว (O(N))`));
      } else if (op === 'erase') {
        const i = scan(k, F);
        if (i >= 0) {
          F.push(mk({ del: [i] }, `เจอ key ${k} (${esc(items[i].v)}) → ลบ node นี้${mode === 'dict' ? ' <small>(ลบเพียง 1 รายการตามนิยาม erase)</small>' : ''}`));
          items.splice(i, 1);
          F.push(mk({}, `ลบแล้ว ✔`));
        } else F.push(mk({}, `ไม่พบ key ${k} → ไม่มีอะไรถูกลบ (ใน ADT ของสไลด์ถือเป็น error · <code>erase(k)</code> ของ STL คืน 0)`));
      } else if (op === 'index') {
        const i = scan(k, F);
        if (i >= 0) {
          if (v) { items[i].v = v; F.push(mk({ done: [i] }, `<code>m[${k}] = ${esc(v)}</code> → key มีอยู่ → คืน reference แล้ว assign → value = ${esc(v)}`)); }
          else F.push(mk({ done: [i] }, `<code>m[${k}]</code> → key มีอยู่ → คืน reference ของ value <b>${esc(items[i].v)}</b>`));
        } else if (items.length >= MAX) F.push(mk({}, `เต็มขีดจำกัด ${MAX} ตัว`));
        else {
          add('0');
          F.push(mk({ done: [items.length - 1] }, `<code>m[${k}]</code> → ไม่เจอ key ${k} → <b>insert (${k}, 0)</b> ด้วย default value แล้วคืน reference${v ? '' : ' <b>— Accidental insertion!</b> แค่อ่านแต่ map เปลี่ยนถาวร'}`));
          if (v) { items[items.length - 1].v = v; F.push(mk({ done: [items.length - 1] }, `assign ค่า → value = ${esc(v)}`)); }
        }
      }
      pl.set(F, true);
    }
    function setMode(m, msg) {
      mode = m; items = [];
      $('kv-findall').disabled = m === 'map';
      $('kv-index').disabled = m === 'dict';
      pl.set([mk({}, msg)], false);
    }
    function example() {
      mode = $('kv-mode').value;
      items = [{ k: 5, v: 'A' }, { k: 7, v: 'B' }, { k: 2, v: 'C' }];
      if (mode === 'dict') items.push({ k: 8, v: 'D' });
      pl.set([mk({}, mode === 'map' ? 'โหลด {(5,A), (7,B), (2,C)} — ลอง put(2, E) แล้ว find(7), find(4), erase(5)' : 'โหลด {(5,A), (7,B), (2,C), (8,D)} — ลอง insert(2, E) แล้ว findAll(2), erase(5)')], false);
    }
    $('kv-put').onclick = () => go('put');
    $('kv-find').onclick = () => go('find');
    $('kv-findall').onclick = () => go('findAll');
    $('kv-erase').onclick = () => go('erase');
    $('kv-index').onclick = () => go('index');
    $('kv-mode').onchange = () => { $('kv-put').textContent = $('kv-mode').value === 'map' ? 'put' : 'insert'; setMode($('kv-mode').value, `เปลี่ยนเป็น ${$('kv-mode').selectedOptions[0].text} — ล้างข้อมูลแล้ว`); };
    $('kv-example').onclick = example;
    $('kv-clear').onclick = () => setMode($('kv-mode').value, 'ล้างข้อมูลแล้ว');
    $('kv-val').onkeydown = $('kv-key').onkeydown = (e) => { if (e.key === 'Enter') go('put'); };
    setMode('map', 'เริ่มต้นด้วย Map ว่าง — ลองกด "โหลดตัวอย่าง" หรือ put(5, A), put(7, B), put(2, C), put(2, E)');
  }

  document.addEventListener('DOMContentLoaded', () => { setSim(); kvSim(); });
})();

/* Sorting visualizer: Selection, Insertion, Merge, Quicksort, Heapsort, Counting, Radix
 * แต่ละ algorithm เดินตามโค้ดในสไลด์ แล้วบันทึกเฟรมทีละขั้นให้ step / play ได้ */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const MAX = 15;

  const PRESET = {
    selection: '5, 3, 8, 2, 5',
    insertion: '34, 8, 64, 51, 32, 21',
    merge: '24, 13, 26, 1, 2, 27, 38, 15',
    quick: '8, 1, 4, 9, 6, 3, 5, 2, 7, 0',
    heap: '31, 53, 59, 26, 41, 58, 97',
    counting: '4, 2, 2, 8, 3, 3, 1',
    radix: '329, 457, 657, 839, 436, 720, 355',
  };
  const HINT = {
    selection: 'ลองใส่ 2, 2, 1 เพื่อดูว่า Selection Sort ไม่ stable (2a กับ 2b สลับที่กัน)',
    insertion: 'ลองใส่ข้อมูลที่เรียงแล้ว (1, 2, 3, 4, 5) เพื่อดูว่าเป็น O(N) และไม่ต้องเลื่อนเลย',
    merge: 'ดู A / B ของแต่ละ merge และสังเกตว่าเมื่อค่าเท่ากันจะเลือกฝั่งซ้ายก่อน (stable)',
    quick: 'ข้อมูลเริ่มต้นคือชุดเดียวกับสไลด์ (ได้ pivot = 6 ซ่อนที่ index 8 หลัง median-of-three)',
    heap: 'ข้อมูลเริ่มต้นคือชุดเดียวกับสไลด์ (Figure 7.8 → max-heap 97, 53, 59, 26, 41, 58, 31)',
    counting: 'key ต้องเป็นจำนวนเต็มและช่วง (max − min + 1) ไม่เกิน 20 · สังเกตว่าสแกนจากหลังมาหน้าเพื่อให้ stable',
    radix: 'จำนวนเต็มไม่ติดลบ · แต่ละ pass ต้องใช้การแจกแบบ stable จากหลักหน่วยไปหาหลักมาก',
  };

  /* item = {v, lab}: ถ้ามีค่าซ้ำจะติด a, b, c… ตามลำดับในอินพุต เพื่อดูเรื่อง stability */
  function makeItems(vals) {
    const total = {}, seen = {};
    vals.forEach((v) => { total[v] = (total[v] || 0) + 1; });
    return vals.map((v) => {
      seen[v] = (seen[v] || 0) + 1;
      return { v, lab: total[v] > 1 ? `${v}<sub>${String.fromCharCode(96 + seen[v])}</sub>` : String(v) };
    });
  }
  const L = (x) => x.lab;
  const list = (arr) => arr.map(L).join(', ');

  function Rec(items) {
    this.a = items.slice();
    this.F = [];
    this.c = 0; // comparisons
    this.s = 0; // swaps / moves
    this.fixed = {};
  }
  Rec.prototype.base = function () { const o = {}; Object.keys(this.fixed).forEach((k) => { o[k] = 'done'; }); return o; };
  Rec.prototype.rec = function (msg, over, extra) {
    this.F.push(Object.assign({ arr: this.a.slice(), cls: Object.assign(this.base(), over || {}), msg, c: this.c, s: this.s }, extra || {}));
  };
  Rec.prototype.swap = function (i, j) { const t = this.a[i]; this.a[i] = this.a[j]; this.a[j] = t; this.s++; };
  Rec.prototype.finish = function (msg) {
    this.fixed = {};
    this.a.forEach((_, i) => { this.fixed[i] = 1; });
    this.rec(msg || `เรียงเสร็จแล้ว ✔ → [${list(this.a)}]`);
  };

  /* ---------- Selection ---------- */
  function selection(items) {
    const R = new Rec(items), a = R.a, n = a.length;
    R.rec('เริ่มต้น — แบ่งเป็น sorted prefix (ว่าง) กับ unsorted suffix');
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) { R.c++; if (a[j].v < a[m].v) m = j; }
      R.rec(`<b>Pass ${i}:</b> สแกน [${i}..${n - 1}] (เทียบ ${n - 1 - i} ครั้ง) → ค่าน้อยสุดคือ <b>${L(a[m])}</b> ที่ index ${m}`, { [m]: 'cmp', [i]: m === i ? 'cmp' : 'pivot' });
      if (m !== i) {
        const x = a[i], y = a[m];
        R.swap(i, m);
        R.rec(`swap(a[${i}], a[${m}]) → <b>${L(y)}</b> ไปอยู่หัว suffix · ${L(x)} ถูกย้ายไป index ${m}${a.slice(i + 1, m).some((z) => z.v === x.v) ? ' <small>(⚠ ' + L(x) + ' ข้ามตัวที่ค่าเท่ากันไป → ลำดับสลับ = unstable)</small>' : ''}`, { [i]: 'swap', [m]: 'swap' });
      } else R.rec(`ค่าน้อยสุดอยู่ที่ index ${i} อยู่แล้ว → ไม่ต้อง swap`, { [i]: 'cmp' });
      R.fixed[i] = 1;
    }
    R.finish();
    return R.F;
  }

  /* ---------- Insertion ---------- */
  function insertion(items) {
    const R = new Rec(items), a = R.a, n = a.length;
    R.fixed[0] = 1;
    R.rec('เริ่มต้น — prefix [0..0] ถือว่าเรียงแล้ว');
    for (let p = 1; p < n; p++) {
      const pre = {};
      for (let k = 0; k < p; k++) pre[k] = 'done';
      const tmp = a[p];
      R.rec(`<b>Pass ${p}:</b> หยิบ tmp = <b>${L(tmp)}</b> แล้วเลื่อนไปทางซ้ายใน prefix ที่เรียงแล้ว`, Object.assign(pre, { [p]: 'cmp' }));
      let j = p, shifts = 0;
      while (j > 0) { R.c++; if (tmp.v < a[j - 1].v) { a[j] = a[j - 1]; R.s++; j--; shifts++; } else break; }
      a[j] = tmp;
      for (let k = 0; k <= p; k++) R.fixed[k] = 1;
      R.rec(shifts
        ? `เลื่อนตัวที่มากกว่า ${L(tmp)} ไปทางขวา <b>${shifts}</b> ตัว (ลบ inversion ได้ ${shifts} คู่) แล้ววาง tmp ที่ index ${j}`
        : `${L(tmp)} ≥ ตัวทางซ้ายสุดของ prefix → <b>ไม่ต้องเลื่อนเลย</b> (เทียบ 1 ครั้ง) วางที่เดิม index ${j}`, { [j]: 'swap' });
    }
    R.finish();
    return R.F;
  }

  /* ---------- Merge ---------- */
  function merge(items) {
    const R = new Rec(items), a = R.a, n = a.length;
    R.rec('เริ่มต้น — แบ่งครึ่งซ้ำจนเหลือ 1 ตัว แล้ว merge กลับขึ้นมา (ตามลำดับของ recursion)');
    function ms(l, r) {
      if (l >= r) return;
      const c = (l + r) >> 1;
      ms(l, c); ms(c + 1, r);
      const A = a.slice(l, c + 1), B = a.slice(c + 1, r + 1), out = [], picks = [];
      let i = 0, j = 0;
      const cls = {};
      for (let k = l; k <= c; k++) cls[k] = 'cmp';
      for (let k = c + 1; k <= r; k++) cls[k] = 'swap';
      R.rec(`<b>merge</b> [${l}..${c}] กับ [${c + 1}..${r}] · A = [${list(A)}] (เหลือง) · B = [${list(B)}] (ชมพู)`, cls);
      while (i < A.length && j < B.length) {
        R.c++;
        if (A[i].v <= B[j].v) { out.push(A[i]); picks.push(`${L(A[i])}`); i++; } else { out.push(B[j]); picks.push(`${L(B[j])}`); j++; }
        R.s++;
      }
      while (i < A.length) { out.push(A[i]); picks.push(L(A[i])); i++; R.s++; }
      while (j < B.length) { out.push(B[j]); picks.push(L(B[j])); j++; R.s++; }
      out.forEach((x, k) => { a[l + k] = x; });
      const tcells = a.map((x, k) => (k >= l && k <= r ? { t: L(x) } : { t: '' }));
      const done = {};
      for (let k = l; k <= r; k++) done[k] = 'done';
      R.rec(`ผล merge → [${list(out)}] · ลำดับที่เลือก: ${picks.join(' → ')} · ถ้าเท่ากันเลือก <b>ซ้ายก่อน</b> (<code>a[leftPos] &lt;= a[rightPos]</code>) จึง stable`, done,
        { aux: [{ label: 'tmpArray', head: a.map((_, k) => k), cells: tcells }] });
    }
    ms(0, n - 1);
    R.finish();
    return R.F;
  }

  /* ---------- Quicksort ---------- */
  function quick(items, cutoff) {
    const R = new Rec(items), a = R.a;
    R.rec(`เริ่มต้น — quicksort(a, 0, ${a.length - 1}) ด้วย median-of-three${cutoff ? ' + cutoff (ช่วงที่ขนาด ≤ 10 ใช้ insertion sort)' : ''}`);
    function ins(l, r) {
      for (let p = l + 1; p <= r; p++) {
        const tmp = a[p]; let j = p;
        while (j > l) { R.c++; if (tmp.v < a[j - 1].v) { a[j] = a[j - 1]; R.s++; j--; } else break; }
        a[j] = tmp;
      }
      for (let k = l; k <= r; k++) R.fixed[k] = 1;
      R.rec(`ช่วง [${l}..${r}] มีขนาด ${r - l + 1} ≤ 10 → ใช้ <b>insertion sort</b> แทน quicksort (ลดภาระ recursion) → [${list(a.slice(l, r + 1))}]`);
    }
    function qs(l, r) {
      const size = r - l + 1;
      if (size <= 0) return;
      if (size === 1) { R.fixed[l] = 1; return; }
      if (cutoff && size <= 10) { ins(l, r); return; }
      if (size === 2) {
        R.c++;
        if (a[r].v < a[l].v) { R.swap(l, r); R.fixed[l] = R.fixed[r] = 1; R.rec(`ช่วง [${l}..${r}] มี 2 ตัว → swap ให้เรียง`, { [l]: 'swap', [r]: 'swap' }); } else { R.fixed[l] = R.fixed[r] = 1; R.rec(`ช่วง [${l}..${r}] มี 2 ตัวเรียงอยู่แล้ว`); }
        return;
      }
      const c = (l + r) >> 1;
      const before = [a[l], a[c], a[r]];
      R.c += 3;
      if (a[c].v < a[l].v) R.swap(l, c);
      if (a[r].v < a[l].v) R.swap(l, r);
      if (a[r].v < a[c].v) R.swap(c, r);
      R.swap(c, r - 1);
      const pivot = a[r - 1];
      R.rec(`<b>median3</b> ช่วง [${l}..${r}]: a[left]=${L(before[0])}, a[center]=${L(before[1])}, a[right]=${L(before[2])} → จัดเรียงสามตัวนี้ แล้วได้ <b>pivot = ${L(pivot)}</b> ซ่อนที่ index ${r - 1}`, { [l]: 'cmp', [r]: 'cmp', [r - 1]: 'pivot' });
      let i = l, j = r - 1;
      for (;;) {
        while (a[++i].v < pivot.v) R.c++;
        R.c++;
        while (pivot.v < a[--j].v) R.c++;
        R.c++;
        const msgStop = `i หยุดที่ index ${i} (<b>${L(a[i])}</b> ≥ pivot) · j หยุดที่ index ${j} (<b>${L(a[j])}</b> ≤ pivot)`;
        if (i < j) {
          R.rec(`${msgStop} · i &lt; j → swap`, { [i]: 'cmp', [j]: 'cmp', [r - 1]: 'pivot' });
          R.swap(i, j);
          R.rec(`หลัง swap a[${i}] ↔ a[${j}]`, { [i]: 'swap', [j]: 'swap', [r - 1]: 'pivot' });
        } else {
          R.rec(`${msgStop} · i ≥ j → pointer ข้ามกัน <b>หยุด</b>`, { [i]: 'cmp', [j]: 'cmp', [r - 1]: 'pivot' });
          break;
        }
      }
      R.swap(i, r - 1);
      R.fixed[i] = 1;
      R.rec(`คืน pivot: swap(a[${i}], a[${r - 1}]) → <b>${L(pivot)}</b> อยู่ตำแหน่งสุดท้ายที่ index ${i} · S1 = [${l}..${i - 1}] ≤ pivot · S2 = [${i + 1}..${r}] ≥ pivot`, { [i]: 'done' });
      qs(l, i - 1);
      qs(i + 1, r);
    }
    qs(0, a.length - 1);
    R.finish();
    return R.F;
  }

  /* ---------- Heapsort ---------- */
  function heap(items) {
    const R = new Rec(items), a = R.a, n = a.length;
    let size = n;
    const rec = (msg, over) => R.rec(msg, over, { heap: size });
    function perc(i, sz) {
      const path = [i], tmp = a[i];
      for (; 2 * i + 1 < sz; ) {
        let ch = 2 * i + 1;
        if (ch !== sz - 1) { R.c++; if (a[ch].v < a[ch + 1].v) ch++; }
        R.c++;
        if (tmp.v < a[ch].v) { a[i] = a[ch]; R.s++; i = ch; path.push(i); } else break;
      }
      a[i] = tmp;
      return path;
    }
    rec(`เริ่มต้น — Phase 1: buildHeap (max-heap) โดยเรียก percDown จาก index ${(n >> 1) - 1} ลงมาถึง 0`);
    for (let i = (n >> 1) - 1; i >= 0; i--) {
      const v = L(a[i]);
      const path = perc(i, n);
      const over = {};
      path.forEach((k) => { over[k] = 'cmp'; });
      over[path[path.length - 1]] = 'swap';
      rec(`percDown(${i}) ค่า ${v}: ${path.length > 1 ? `จมลงไปที่ index ${path[path.length - 1]} (เลื่อน child ที่ใหญ่กว่าขึ้นมา)` : 'ใหญ่กว่า children อยู่แล้ว ไม่เปลี่ยน'}`, over);
    }
    rec(`buildHeap เสร็จ → max-heap [${list(a)}] (root = ค่ามากสุด)`);
    for (let j = n - 1; j > 0; j--) {
      R.swap(0, j);
      size = j;
      R.fixed[j] = 1;
      rec(`<b>deleteMax:</b> swap(a[0], a[${j}]) → <b>${L(a[j])}</b> ไปอยู่ตำแหน่งสุดท้ายถูกต้องแล้ว · heap size ลดเหลือ ${j}`, { 0: 'swap' });
      const path = perc(0, j);
      const over = {};
      path.forEach((k) => { over[k] = 'cmp'; });
      over[path[path.length - 1]] = 'swap';
      rec(`percDown(0) ใน heap ขนาด ${j}: ${path.length > 1 ? `ค่า root ใหม่จมลงไปที่ index ${path[path.length - 1]}` : 'root ใหญ่กว่า children อยู่แล้ว'}`, over);
    }
    R.fixed[0] = 1;
    size = n;
    R.finish(`เรียงเสร็จแล้ว ✔ → [${list(a)}] (in-place, ไม่ใช้หน่วยความจำเพิ่ม)`);
    R.F[R.F.length - 1].heap = 0;
    return R.F;
  }

  /* ---------- Counting ---------- */
  function counting(items) {
    const R = new Rec(items), a = R.a, n = a.length;
    const mn = Math.min(...a.map((x) => x.v)), mx = Math.max(...a.map((x) => x.v)), M = mx - mn + 1;
    if (M > 20) return null;
    const C = new Array(M).fill(0), B = new Array(n).fill(null);
    const keys = Array.from({ length: M }, (_, k) => k + mn);
    const auxC = (hi) => ({ label: 'C (count)', head: keys, cells: C.map((c, k) => ({ t: c, cls: hi === k ? 'cmp' : '' })) });
    const auxB = (hi) => ({ label: 'B (output)', head: a.map((_, k) => k), cells: B.map((b, k) => ({ t: b ? L(b) : '', cls: hi === k ? 'done' : '' })) });
    R.rec(`เริ่มต้น — key อยู่ในช่วง ${mn}..${mx} (M = ${M}) · สร้าง count array ขนาด ${M}`, {}, { aux: [auxC(-1)] });
    a.forEach((x) => { C[x.v - mn]++; });
    R.c = 0;
    R.rec('<b>ขั้น 1:</b> นับจำนวนครั้งที่แต่ละ key ปรากฏ (O(N))', {}, { aux: [auxC(-1)] });
    for (let k = 1; k < M; k++) C[k] += C[k - 1];
    R.rec('<b>ขั้น 2:</b> แปลงเป็น prefix sum: <code>count[i] += count[i-1]</code> → count[x] = จำนวนตัวที่ ≤ x = ตำแหน่ง (นับจาก 1) ของตัวสุดท้ายที่ key = x', {}, { aux: [auxC(-1)] });
    for (let k = n - 1; k >= 0; k--) {
      const x = a[k], idx = x.v - mn, pos = C[idx] - 1;
      B[pos] = x; C[idx]--; R.s++;
      R.rec(`<b>ขั้น 3:</b> สแกนจากหลังมาหน้า: <b>${L(x)}</b> (key ${x.v}) → count[${x.v}] = ${C[idx] + 1} → B[${pos}] = ${L(x)} แล้ว count[${x.v}]-- เหลือ ${C[idx]}`, { [k]: 'cmp' }, { aux: [auxC(idx), auxB(pos)] });
    }
    for (let k = 0; k < n; k++) a[k] = B[k];
    R.finish(`คัดลอก B กลับ → [${list(a)}] ✔ · ตัวที่ key เท่ากันคงลำดับเดิม (stable) เพราะสแกนจากหลังมาหน้า · เวลา O(N + M)`);
    return R.F;
  }

  /* ---------- Radix (LSD) ---------- */
  function radix(items) {
    const R = new Rec(items), a = R.a;
    if (a.some((x) => x.v < 0)) return null;
    const maxLen = String(Math.max(...a.map((x) => x.v))).length;
    const names = ['หลักหน่วย', 'หลักสิบ', 'หลักร้อย', 'หลักพัน', 'หลักหมื่น'];
    R.rec(`เริ่มต้น — มากสุดมี ${maxLen} หลัก → ต้องทำ ${maxLen} pass จาก <b>หลักน้อยสุด (LSD)</b> ไปหลักมากสุด โดยแต่ละ pass ใช้การแจกที่ stable`);
    for (let d = 0; d < maxLen; d++) {
      const dig = (x) => Math.floor(x.v / Math.pow(10, d)) % 10;
      const buckets = Array.from({ length: 10 }, () => []);
      a.forEach((x) => buckets[dig(x)].push(x));
      R.rec(`<b>Pass ${d + 1} (${names[d] || 'หลักที่ ' + (d + 1)}):</b> แจกแต่ละตัวลง bucket ตามค่าของหลักนี้ (ขีดเส้นใต้) โดยคงลำดับเดิมในแต่ละ bucket`, {},
        { digit: d, aux: [{ label: 'buckets', head: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], cells: buckets.map((b) => ({ t: b.map((x) => x.v).join(', '), cls: b.length ? 'cmp' : '' })) }] });
      let k = 0;
      buckets.forEach((b) => b.forEach((x) => { a[k++] = x; R.s++; }));
      R.rec(`เก็บกลับตามลำดับ bucket 0 → 9 → [${a.map((x) => x.v).join(', ')}] · ตัวที่หลักนี้เท่ากันยังอยู่ตามลำดับจาก pass ก่อน (stable)`, {}, { digit: d });
    }
    R.finish(`เรียงเสร็จหลังครบ ${maxLen} pass ✔ → [${a.map((x) => x.v).join(', ')}] · เวลา O(P(N + B)) เมื่อ P = ${maxLen}, B = 10`);
    return R.F;
  }

  const ALGS = { selection, insertion, merge, quick, heap, counting, radix };

  /* ================= UI ================= */
  function init() {
    if (!$('so-view')) return;
    let frames = [], fi = 0, timer = null, radixLen = 1;

    function renderFrame(f) {
      const arr = f.arr;
      let h = '<tr><th>i</th>', v = '<tr><th>a</th>';
      arr.forEach((x, i) => {
        let t = x.lab;
        if (f.digit !== undefined) {
          const s = String(x.v), p = s.length - 1 - f.digit;
          t = p >= 0 ? s.slice(0, p) + '<u>' + s[p] + '</u>' + s.slice(p + 1) : s;
        }
        h += `<th>${i}</th>`;
        v += `<td class="${f.cls[i] || ''}">${t}</td>`;
      });
      let html = '';
      if (f.heap !== undefined && f.heap > 0) {
        const cmp = [], bad = [];
        Object.keys(f.cls).forEach((k) => { if (+k < f.heap) (f.cls[k] === 'swap' ? bad : cmp).push(+k + 1); });
        const nodes = [null].concat(arr.slice(0, f.heap).map((x) => x.v));
        html += `<div class="tree">${HeapViz.renderTree(nodes, { cmp: cmp.concat(bad), minLevels: 3 })}</div>`;
      }
      html += `<div class="scroll-x"><table class="arr sortview">${h}</tr>${v}</tr></table></div>`;
      (f.aux || []).forEach((r) => {
        html += `<div class="scroll-x"><table class="arr sortview aux"><tr><th>${r.label}</th>${r.head.map((x) => `<th>${x}</th>`).join('')}</tr>` +
          `<tr><th></th>${r.cells.map((c) => `<td class="${c.cls || ''}">${c.t}</td>`).join('')}</tr></table></div>`;
      });
      $('so-view').innerHTML = html;
      $('so-stats').innerHTML = f.heap !== undefined && f.heap > 0 ? `heap size = <b>${f.heap}</b> · เทียบ <b>${f.c}</b> ครั้ง · swap/เลื่อน <b>${f.s}</b> ครั้ง` : `เทียบ <b>${f.c}</b> ครั้ง · swap/เลื่อน <b>${f.s}</b> ครั้ง`;
    }
    function show() {
      const f = frames[fi];
      if (!f) return;
      renderFrame(f);
      $('so-msg').innerHTML = `<span class="stepno">${frames.length > 1 ? `ขั้น ${fi + 1}/${frames.length}` : ''}</span>${f.msg}`;
      $('so-prev').disabled = fi === 0;
      $('so-next').disabled = fi >= frames.length - 1;
      if (fi >= frames.length - 1) stop();
    }
    function stop() { if (timer) clearInterval(timer); timer = null; $('so-play').textContent = '▶ เล่น'; }
    function play() {
      if (fi >= frames.length - 1) return;
      $('so-play').textContent = '⏸ หยุด';
      timer = setInterval(() => { if (fi < frames.length - 1) { fi++; show(); } else stop(); }, +$('so-speed').value);
    }
    function parse() {
      const raw = $('so-input').value.split(/[\s,]+/).filter((x) => x !== '').map(Number);
      if (!raw.length || raw.some((x) => !Number.isFinite(x))) return { err: 'กรุณาใส่ตัวเลขคั่นด้วย comma' };
      if (raw.length > MAX) return { err: `ใส่ได้สูงสุด ${MAX} ตัว` };
      return { vals: raw.map(Math.trunc) };
    }
    function msgOnly(msg) { stop(); frames = [{ arr: [], cls: {}, msg, c: 0, s: 0 }]; fi = 0; $('so-view').innerHTML = ''; $('so-stats').innerHTML = ''; show(); }
    function run(auto) {
      stop();
      const alg = $('so-alg').value, p = parse();
      if (p.err) { msgOnly(p.err); return; }
      if (alg === 'quick' && $('so-cutoff').checked && p.vals.length <= 10) { /* ยังรันได้ แต่จะเป็น insertion ทั้งชุด */ }
      const fs = ALGS[alg](makeItems(p.vals), $('so-cutoff').checked);
      if (!fs) { msgOnly(alg === 'counting' ? 'Counting Sort ใช้ได้เมื่อช่วง key (max − min + 1) ไม่เกิน 20' : 'Radix Sort ในตัวจำลองนี้รับเฉพาะจำนวนเต็มไม่ติดลบ'); return; }
      frames = fs; fi = 0; show();
      if (auto) play();
    }
    function load(alg) {
      $('so-input').value = PRESET[alg];
      $('so-hint').textContent = HINT[alg];
      $('so-cutoff').parentElement.style.display = alg === 'quick' ? '' : 'none';
      run(false);
    }
    function random() {
      const alg = $('so-alg').value;
      const n = alg === 'radix' ? 7 : 8;
      const lo = alg === 'radix' ? 100 : 1, hi = alg === 'counting' ? 9 : alg === 'radix' ? 999 : 30;
      const a = [];
      for (let i = 0; i < n; i++) a.push(lo + Math.floor(Math.random() * (hi - lo + 1)));
      $('so-input').value = a.join(', ');
      run(false);
    }
    $('so-alg').onchange = () => load($('so-alg').value);
    $('so-run').onclick = () => run(true);
    $('so-random').onclick = random;
    $('so-cutoff').onchange = () => run(false);
    $('so-input').onkeydown = (e) => { if (e.key === 'Enter') run(true); };
    $('so-prev').onclick = () => { stop(); if (fi > 0) { fi--; show(); } };
    $('so-next').onclick = () => { stop(); if (fi < frames.length - 1) { fi++; show(); } };
    $('so-play').onclick = () => (timer ? stop() : play());
    load($('so-alg').value);
  }

  window.SortViz = { ALGS, makeItems };
  document.addEventListener('DOMContentLoaded', init);
})();

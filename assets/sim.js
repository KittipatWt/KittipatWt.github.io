/* Min-Heap simulator: insert (percolate up) / deleteMin (percolate down) ทีละขั้น */
(function () {
  const MAX = 15;
  const INITIAL = [13, 21, 16, 24, 31, 19, 68, 65, 26, 32];
  const $ = (id) => document.getElementById(id);

  let heap = [null].concat(INITIAL); // index เริ่มที่ 1
  let frames = [];
  let fi = 0;
  let timer = null;

  /* ---------- สร้างเฟรมของ insert ---------- */
  function buildInsert(x) {
    const a = heap.slice();
    const f = [];
    const n = a.length - 1;
    a.push(null);
    let hole = n + 1;
    f.push({ arr: a.slice(), hole, held: { label: 'x', value: x },
      msg: `สร้าง <b>hole</b> ที่ index ${hole} (ตำแหน่งว่างถัดไปของ complete tree) เพื่อรอใส่ <b>${x}</b>` });
    while (hole > 1) {
      const p = hole >> 1;
      if (x < a[p]) {
        f.push({ arr: a.slice(), hole, cmp: [p], held: { label: 'x', value: x },
          msg: `เทียบ ${x} กับ parent <b>${a[p]}</b> (index ${p}): ${x} &lt; ${a[p]} → <b>เลื่อน parent ลงมา</b> ใน hole` });
        a[hole] = a[p]; a[p] = null; hole = p;
        f.push({ arr: a.slice(), hole, held: { label: 'x', value: x },
          msg: `เลื่อน parent ลงแล้ว hole ย้ายขึ้นไปที่ index ${hole}` });
      } else {
        f.push({ arr: a.slice(), hole, cmp: [p], held: { label: 'x', value: x },
          msg: `เทียบ ${x} กับ parent <b>${a[p]}</b> (index ${p}): ${x} ≥ ${a[p]} → heap-order ไม่ขัดแย้ง <b>หยุด</b>` });
        break;
      }
    }
    if (hole === 1) f.push({ arr: a.slice(), hole, held: { label: 'x', value: x }, msg: `hole ขึ้นมาถึง root แล้ว ไม่มี parent ให้เทียบ → หยุด` });
    a[hole] = x;
    f.push({ arr: a.slice(), done: hole, msg: `วาง <b>${x}</b> ลงใน hole ที่ index ${hole} — heap-order กลับมาถูกต้อง ✔ (insert เสร็จ)` });
    return f;
  }

  /* ---------- สร้างเฟรมของ deleteMin ---------- */
  function buildDelete() {
    const a = heap.slice();
    const n = a.length - 1;
    const min = a[1];
    const f = [];
    if (n === 1) {
      f.push({ arr: [null, null], hole: 1, msg: `ลบ root <b>${min}</b> (heap เหลือ 0 ตัว)` });
      f.push({ arr: [null], msg: `ลบ <b>${min}</b> ออกแล้ว heap ว่างเปล่า` });
      return { frames: f, min };
    }
    const tmp = a[n];
    a.pop();
    a[1] = null;
    const size = n - 1;
    let hole = 1;
    f.push({ arr: a.slice(), hole: 1, held: { label: 'tmp', value: tmp },
      msg: `ลบ root <b>${min}</b> (ค่าต่ำสุดที่ได้คืน) ทำให้เกิด hole ที่ index 1 · หยิบตัวสุดท้าย <b>tmp = ${tmp}</b> มาถือไว้ (size เหลือ ${size})` });
    while (hole * 2 <= size) {
      let c = hole * 2;
      const kids = [c];
      if (c !== size) { kids.push(c + 1); if (a[c + 1] < a[c]) c++; }
      const note = kids.length === 1 ? ` (มี child เดียว — กรณี single child)` : '';
      if (a[c] < tmp) {
        f.push({ arr: a.slice(), hole, cmp: kids, held: { label: 'tmp', value: tmp },
          msg: `เทียบ children${note}: child ที่เล็กกว่าคือ <b>${a[c]}</b> (index ${c}) · ${tmp} &gt; ${a[c]} → <b>เลื่อน ${a[c]} ขึ้น</b> hole ลงไปที่ index ${c}` });
        a[hole] = a[c]; a[c] = null; hole = c;
        f.push({ arr: a.slice(), hole, held: { label: 'tmp', value: tmp }, msg: `hole ย้ายลงมาที่ index ${hole}` });
      } else {
        f.push({ arr: a.slice(), hole, cmp: kids, held: { label: 'tmp', value: tmp },
          msg: `เทียบ children${note}: child ที่เล็กกว่าคือ <b>${a[c]}</b> · ${tmp} ≤ ${a[c]} → <b>หยุด</b>` });
        break;
      }
    }
    if (f.length === 1)
      f.push({ arr: a.slice(), hole, held: { label: 'tmp', value: tmp }, msg: `hole ไม่มี child แล้ว → หยุด` });
    a[hole] = tmp;
    f.push({ arr: a.slice(), done: hole, msg: `วาง <b>${tmp}</b> ลงใน hole ที่ index ${hole} — heap-order ถูกต้อง ✔ (deleteMin คืนค่า <b>${min}</b>)` });
    return { frames: f, min };
  }

  /* ---------- แสดงผล ---------- */
  function show() {
    const fr = frames[fi];
    if (!fr) return;
    $('sim-tree').innerHTML = HeapViz.renderTree(fr.arr, {
      hole: fr.hole, cmp: fr.cmp, done: fr.done, held: fr.held, idx: true, minLevels: 4,
    });
    const n = fr.arr.length - 1;
    let h = '<tr><th>i</th>', v = '<tr><th>val</th>';
    for (let i = 1; i <= Math.max(n, 1); i++) {
      const c = fr.arr[i] === null ? 'hole' : (fr.cmp || []).includes(i) ? 'cmp' : fr.done === i ? 'done' : '';
      h += `<th>${i}</th>`;
      v += `<td class="${c}">${n === 0 ? '–' : fr.arr[i] === null ? '[ ]' : fr.arr[i]}</td>`;
    }
    $('sim-arr').innerHTML = h + '</tr>' + v + '</tr>';
    $('sim-msg').innerHTML = `<span class="stepno">${frames.length > 1 ? `ขั้น ${fi + 1}/${frames.length}` : ''}</span>${fr.msg}`;
    $('btn-prev').disabled = fi === 0;
    $('btn-next').disabled = fi >= frames.length - 1;
    if (fi >= frames.length - 1) stop();
  }

  function setIdle(msg) {
    frames = [{ arr: heap.slice(), msg }];
    fi = 0;
    show();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    $('btn-play').textContent = '▶ เล่น';
  }
  function play() {
    if (fi >= frames.length - 1) return;
    $('btn-play').textContent = '⏸ หยุด';
    const ms = +$('sim-speed').value;
    timer = setInterval(() => { if (fi < frames.length - 1) { fi++; show(); } else stop(); }, ms);
  }

  function start(fs) {
    stop();
    frames = fs;
    fi = 0;
    heap = fs[fs.length - 1].arr.slice();
    show();
    play();
  }

  /* ---------- actions ---------- */
  function doInsert() {
    const raw = $('sim-input').value.trim();
    const x = Number(raw);
    if (raw === '' || !Number.isFinite(x)) { setIdle('กรุณาใส่ตัวเลขก่อน Insert'); return; }
    if (heap.length - 1 >= MAX) { setIdle(`heap เต็มแล้ว (สูงสุด ${MAX} ตัวในตัวจำลองนี้)`); return; }
    start(buildInsert(Math.trunc(x)));
    $('sim-input').value = '';
  }
  function doDelete() {
    if (heap.length - 1 === 0) { setIdle('heap ว่าง — deleteMin จะ throw UnderflowException'); return; }
    start(buildDelete().frames);
  }
  function silentInsert(a, x) {
    a.push(x);
    let h = a.length - 1;
    while (h > 1 && x < a[h >> 1]) { a[h] = a[h >> 1]; h >>= 1; }
    a[h] = x;
  }
  function doRandom() {
    stop();
    const a = [null];
    const k = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < k; i++) silentInsert(a, 1 + Math.floor(Math.random() * 99));
    heap = a;
    setIdle(`สุ่ม heap ใหม่ ${k} ตัว (สร้างด้วยการ insert ทีละตัว)`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('sim-tree')) return;
    $('btn-insert').onclick = doInsert;
    $('btn-delete').onclick = doDelete;
    $('sim-input').onkeydown = (e) => { if (e.key === 'Enter') doInsert(); };
    $('btn-random').onclick = doRandom;
    $('btn-reset').onclick = () => { stop(); heap = [null].concat(INITIAL); setIdle('รีเซ็ตเป็น heap ตัวอย่างจากสไลด์ — ลองใส่ 14 แล้วกด Insert'); };
    $('btn-clear').onclick = () => { stop(); heap = [null]; setIdle('ล้าง heap แล้ว'); };
    $('btn-prev').onclick = () => { stop(); if (fi > 0) { fi--; show(); } };
    $('btn-next').onclick = () => { stop(); if (fi < frames.length - 1) { fi++; show(); } };
    $('btn-play').onclick = () => (timer ? stop() : (fi >= frames.length - 1 ? null : play()));
    setIdle('heap ตัวอย่างจากสไลด์ — ลองใส่ 14 แล้วกด Insert หรือกด deleteMin');
  });
})();

/* วาดต้นไม้ heap เป็น SVG
 * arr: array แบบเริ่มที่ index 1 (arr[0] ไม่ใช้), ค่า null = hole
 * opts: { hole, cmp:[i], done:i, bad:[i], idx:bool, held:{label,value} } */
(function () {
  const W = 720, R = 21, LH = 66, TOP = 34;

  function pos(i) {
    const lvl = Math.floor(Math.log2(i));
    const first = 1 << lvl;
    return { x: ((i - first + 0.5) / first) * W, y: TOP + lvl * LH, lvl };
  }

  function renderTree(arr, opts) {
    opts = opts || {};
    const n = arr.length - 1;
    const levels = Math.max(opts.minLevels || 3, n ? Math.floor(Math.log2(n)) + 1 : 1);
    const H = TOP + (levels - 1) * LH + R + 24;
    const cmp = opts.cmp || [], bad = opts.bad || [];
    let edges = '', nodes = '';
    for (let i = 1; i <= n; i++) {
      const p = pos(i);
      if (i > 1) {
        const q = pos(i >> 1);
        edges += `<line class="edge" x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}"/>`;
      }
      const isHole = arr[i] === null;
      const cls = ['node'];
      if (isHole) cls.push('hole');
      if (cmp.includes(i)) cls.push('cmp');
      if (opts.done === i) cls.push('done');
      if (bad.includes(i)) cls.push('bad');
      nodes += `<g class="${cls.join(' ')}"><circle cx="${p.x}" cy="${p.y}" r="${R}"/>` +
        `<text x="${p.x}" y="${p.y}">${isHole ? '[ ]' : arr[i]}</text></g>`;
      if (opts.idx) nodes += `<text class="idx" x="${p.x}" y="${p.y + R + 13}">i=${i}</text>`;
    }
    let held = '';
    if (opts.held) {
      const t = `${opts.held.label} = ${opts.held.value}`;
      held = `<rect class="held-box" x="8" y="6" width="${t.length * 9 + 20}" height="28" rx="6"/>` +
        `<text class="held-t" x="${8 + (t.length * 9 + 20) / 2}" y="20">${t}</text>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="binary heap">${edges}${nodes}${held}</svg>`;
  }

  /* รูปประกอบ static: <div class="tree" data-heap="13,21,_,..." data-hole="" data-cmp="5" data-done="2" data-bad="4" data-idx> */
  function initStatic() {
    document.querySelectorAll('.tree[data-heap]').forEach((el) => {
      const arr = [null].concat(el.dataset.heap.split(',').map((s) => (s.trim() === '_' ? null : +s)));
      const list = (k) => (el.dataset[k] ? el.dataset[k].split(',').map(Number) : []);
      el.innerHTML = renderTree(arr, {
        cmp: list('cmp'), bad: list('bad'),
        done: el.dataset.done ? +el.dataset.done : undefined,
        idx: 'idx' in el.dataset,
      });
    });
  }

  window.HeapViz = { renderTree, initStatic };
  document.addEventListener('DOMContentLoaded', initStatic);
})();

/* Graph simulator: BFS, DFS, Prim, Kruskal, Dijkstra ตามกราฟตัวอย่างในสไลด์บทที่ 11 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const INF = '∞';

  /* ---------- กราฟตัวอย่าง (ตำแหน่งอ้างอิง viewBox 520 × 300) ---------- */
  const G7 = {
    name: 'G₇ (directed) — กราฟ BFS/DFS ในสไลด์', directed: true, weighted: false,
    nodes: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'],
    pos: { v3: [60, 70], v1: [170, 70], v2: [280, 70], v5: [400, 70], v4: [225, 150], v6: [110, 235], v7: [340, 235] },
    edges: [['v1', 'v2'], ['v1', 'v4'], ['v2', 'v4'], ['v2', 'v5'], ['v3', 'v1'], ['v3', 'v6'], ['v4', 'v3'], ['v4', 'v5'], ['v4', 'v6'], ['v4', 'v7'], ['v5', 'v7'], ['v7', 'v6']],
  };
  const POS5 = { v2: [250, 55], v1: [90, 150], v4: [250, 150], v5: [420, 150], v3: [250, 245] };
  const G5U = {
    name: 'G₅ (undirected, weighted) — กราฟ MST ในสไลด์', directed: false, weighted: true,
    nodes: ['v1', 'v2', 'v3', 'v4', 'v5'], pos: POS5,
    edges: [['v1', 'v2', 2], ['v1', 'v4', 1], ['v1', 'v3', 4], ['v2', 'v4', 3], ['v2', 'v5', 10], ['v3', 'v4', 2], ['v3', 'v5', 5], ['v4', 'v5', 8]],
  };
  const G5D = {
    name: 'G₅ (directed, weighted) — กราฟ Dijkstra ในสไลด์', directed: true, weighted: true,
    nodes: ['v1', 'v2', 'v3', 'v4', 'v5'], pos: POS5,
    edges: [['v1', 'v2', 5], ['v1', 'v4', 1], ['v4', 'v2', 2], ['v4', 'v3', 1], ['v4', 'v5', 9], ['v3', 'v5', 4], ['v2', 'v5', 2]],
  };
  const GNEG = {
    name: 'ตัวอย่างน้ำหนักลบ (Dijkstra ล้มเหลว)', directed: true, weighted: true,
    nodes: ['s', 'a', 'b'], pos: { s: [90, 150], a: [300, 60], b: [300, 240] },
    edges: [['s', 'a', 3], ['s', 'b', 4], ['b', 'a', -2]],
  };
  const GRAPHS = { g7: G7, g5u: G5U, g5d: G5D, neg: GNEG };
  const ALG_GRAPHS = { bfs: ['g7'], dfs: ['g7'], prim: ['g5u'], kruskal: ['g5u'], dijkstra: ['g5d', 'neg'] };
  const DEFAULT_SRC = { g7: 'v3', g5u: 'v1', g5d: 'v1', neg: 's' };
  const DEFAULT_TGT = { g5d: 'v5', neg: 'a' };

  function adjacency(G) {
    const a = {};
    G.nodes.forEach((n) => { a[n] = []; });
    G.edges.forEach((e, i) => {
      a[e[0]].push({ to: e[1], w: e[2], i });
      if (!G.directed) a[e[1]].push({ to: e[0], w: e[2], i });
    });
    return a;
  }
  const edgeName = (G, i) => `(${G.edges[i][0]}, ${G.edges[i][1]})`;

  /* ---------- Frame helper ---------- */
  function mk(msg, v, e, sub, panels) { return { msg, v: v || {}, e: e || {}, sub: sub || {}, panels: panels || [] }; }
  const chips = (arr, cls) => (arr.length ? arr.map((x) => `<span class="ht-node${cls ? ' ' + cls : ''}">${x}</span>`).join('<span class="ht-arrow">·</span>') : '<span class="muted">(ว่าง)</span>');
  function table(head, rows, hl) {
    return '<div class="scroll-x"><table class="data gtab"><tr>' + head.map((h) => `<th>${h}</th>`).join('') + '</tr>' +
      rows.map((r, i) => `<tr${hl === i ? ' class="best"' : ''}>` + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table></div>';
  }

  /* ================= BFS ================= */
  function bfs(G, s) {
    const A = adjacency(G), F = [];
    const dist = {}, par = {}, vis = new Set([s]), done = new Set(), tree = {};
    G.nodes.forEach((n) => { dist[n] = Infinity; par[n] = '-'; });
    dist[s] = 0;
    const q = [s];
    const dd = () => { const o = {}; G.nodes.forEach((n) => { o[n] = dist[n] === Infinity ? INF : dist[n]; }); return o; };
    const nodeCls = (cur) => { const o = {}; vis.forEach((n) => { o[n] = 'q'; }); done.forEach((n) => { o[n] = 'done'; }); if (cur) o[cur] = 'cur'; return o; };
    const panel = () => [
      { title: 'Queue (FIFO)', html: chips(q) },
      { title: 'Visited (ตามลำดับที่ค้นพบ)', html: chips([...vis]) },
      { title: 'dist / path', html: table(['Node', 'dist', 'path (parent)'], G.nodes.map((n) => [n, dist[n] === Infinity ? INF : dist[n], par[n]])) },
    ];
    F.push(mk(`เริ่มต้น: dist[${s}] = 0, mark visited, push ${s} เข้า queue · vertex อื่นมี dist = ∞`, nodeCls(), {}, dd(), panel()));
    while (q.length) {
      const u = q.shift();
      const newly = [], e = Object.assign({}, tree);
      A[u].forEach(({ to, i }) => {
        if (!vis.has(to)) { vis.add(to); dist[to] = dist[u] + 1; par[to] = u; q.push(to); tree[i] = 'tree'; e[i] = 'tree'; newly.push(to); } else if (!e[i]) e[i] = 'cmp';
      });
      const msg = `<b>Dequeue ${u}</b> (dist = ${dist[u]}) → ตรวจ neighbors: ` + (A[u].length ? A[u].map((x) => x.to).join(', ') : '(ไม่มี)') +
        (newly.length ? ` · ยังไม่เคยเห็น: <b>${newly.join(', ')}</b> → dist = ${dist[u] + 1}, path = ${u}, push เข้า queue` : ' · ไม่มี vertex ใหม่');
      done.add(u);
      const nc = nodeCls(); nc[u] = 'cur';
      F.push(mk(msg, nc, e, dd(), panel()));
    }
    F.push(mk('Queue ว่าง → BFS จบ · ทุก vertex ที่ไปถึงได้มี <b>shortest unweighted path</b> (จำนวนเส้นน้อยสุด) จากต้นทาง', nodeCls(), Object.assign({}, tree), dd(), panel()));
    return F;
  }

  /* ================= DFS ================= */
  function dfs(G, s) {
    const A = adjacency(G), F = [];
    const state = {}, tree = {}, back = {}, cross = {}, order = [], stack = [];
    G.nodes.forEach((n) => { state[n] = 0; }); // 0 ยังไม่เห็น 1 อยู่ใน stack 2 เสร็จแล้ว
    const nodeCls = (cur) => { const o = {}; G.nodes.forEach((n) => { if (state[n] === 1) o[n] = 'q'; else if (state[n] === 2) o[n] = 'done'; }); if (cur) o[cur] = 'cur'; return o; };
    const edgeCls = (cur) => { const o = {}; Object.keys(cross).forEach((k) => { o[k] = 'cross'; }); Object.keys(tree).forEach((k) => { o[k] = 'tree'; }); Object.keys(back).forEach((k) => { o[k] = 'back'; }); if (cur !== undefined) o[cur] = o[cur] || 'cmp'; return o; };
    const panel = () => [
      { title: 'Recursion call stack', html: stack.length ? chips(stack, 'q') : '<span class="muted">(ว่าง)</span>' },
      { title: 'Visited (ตามลำดับเข้าเยี่ยม)', html: chips(order) },
      { title: 'ชนิดของเส้น', html: '<span class="legend-line tree">Tree edge</span> <span class="legend-line back">Back edge (ชี้กลับ ancestor ที่ยังอยู่ใน stack)</span> <span class="legend-line cross">Forward/Cross (ชี้ไป vertex ที่เสร็จแล้ว)</span>' },
    ];
    F.push(mk(`เริ่มต้น: ทุก vertex ยังไม่เคยเยี่ยม · เรียก <code>DFSVisit(${s})</code>`, {}, {}, {}, panel()));
    function visit(u) {
      state[u] = 1; stack.push(u); order.push(u);
      F.push(mk(`<b>Visit ${u}</b> → mark visited · push ลง call stack`, nodeCls(u), edgeCls(), {}, panel()));
      A[u].forEach(({ to, i }) => {
        if (state[to] === 0) {
          tree[i] = 1;
          F.push(mk(`${u} → <b>${to}</b> ยังไม่เคยเยี่ยม → เส้น ${edgeName(G, i)} เป็น <b>Tree edge</b> · เรียก DFSVisit(${to}) ต่อ`, nodeCls(u), edgeCls(i), {}, panel()));
          visit(to);
          F.push(mk(`กลับมาที่ <b>${u}</b> หลังสำรวจ ${to} เสร็จ → ตรวจ neighbor ถัดไป`, nodeCls(u), edgeCls(), {}, panel()));
        } else if (state[to] === 1) {
          back[i] = 1;
          F.push(mk(`${u} → <b>${to}</b> เยี่ยมแล้วและ <b>ยังอยู่ใน call stack</b> → เส้น ${edgeName(G, i)} เป็น <b>Back edge</b> (บ่งว่ามี cycle)`, nodeCls(u), edgeCls(), {}, panel()));
        } else {
          cross[i] = 1;
          F.push(mk(`${u} → <b>${to}</b> เยี่ยมและ <b>เสร็จแล้ว</b> → เส้น ${edgeName(G, i)} เป็น forward/cross edge (ไม่ต้องเข้าไปอีก)`, nodeCls(u), edgeCls(), {}, panel()));
        }
      });
      state[u] = 2; stack.pop();
      F.push(mk(`<b>Backtrack จาก ${u}</b> — neighbors หมดแล้ว pop ออกจาก stack`, nodeCls(), edgeCls(), {}, panel()));
    }
    visit(s);
    G.nodes.forEach((n) => { if (state[n] === 0) { F.push(mk(`ยังมี <b>${n}</b> ที่ไปไม่ถึงจากต้นทาง → <code>DFS()</code> เรียก DFSVisit(${n}) เป็นต้นไม้ใหม่ในป่า`, nodeCls(), edgeCls(), {}, panel())); visit(n); } });
    F.push(mk(`DFS จบ · ลำดับเยี่ยม: ${order.join(' → ')}`, nodeCls(), edgeCls(), {}, panel()));
    return F;
  }

  /* ================= Prim / Dijkstra (ตาราง Known / Dist / Parent) ================= */
  function tableAlgo(G, s, kind, target) {
    const A = adjacency(G), F = [];
    const dist = {}, par = {}, known = new Set();
    G.nodes.forEach((n) => { dist[n] = Infinity; par[n] = '-'; });
    dist[s] = 0;
    const isP = kind === 'prim';
    const ds = () => { const o = {}; G.nodes.forEach((n) => { o[n] = dist[n] === Infinity ? INF : dist[n]; }); return o; };
    const cost = () => [...known].reduce((a, n) => a + dist[n], 0);
    const treeE = () => { const o = {}; G.edges.forEach((e, i) => { known.forEach((n) => { if (par[n] !== '-' && ((e[0] === par[n] && e[1] === n) || (!G.directed && e[1] === par[n] && e[0] === n))) o[i] = isP ? 'mst' : 'tree'; }); }); return o; };
    const panel = (hl) => [{
      title: isP ? 'MST Construction Table' : 'Dijkstra Table',
      html: table(['Node', 'Known', isP ? 'Dist dᵥ (ถึง tree)' : 'Dist dᵥ', 'Parent pᵥ'], G.nodes.map((n) => [n, known.has(n) ? 'T' : 'F', dist[n] === Infinity ? INF : dist[n], par[n]]), hl),
    }, { title: isP ? 'ต้นทุนรวมของ MST ตอนนี้' : 'ต้นทุน', html: isP ? `<b>${cost()}</b>` : '' }].filter((p) => p.html !== '');
    const nodeCls = (cur) => { const o = {}; known.forEach((n) => { o[n] = 'done'; }); if (cur) o[cur] = 'cur'; return o; };
    F.push(mk(isP ? `เริ่มต้น: ต้นทาง ${s} มี dist = 0 · vertex อื่น dist = ∞ · เลือก vertex ที่ dist น้อยสุดที่ยังไม่ known ไปเรื่อยๆ` : `เริ่มต้น: dist[${s}] = 0 · vertex อื่น = ∞ · แต่ละรอบเลือก vertex ที่ยัง unknown ที่มี dist น้อยสุด แล้ว relax เส้นที่ออกจากมัน`, nodeCls(s), {}, ds(), panel(G.nodes.indexOf(s))));
    for (;;) {
      let u = null;
      G.nodes.forEach((n) => { if (!known.has(n) && dist[n] !== Infinity && (u === null || dist[n] < dist[u])) u = n; });
      if (u === null) break;
      known.add(u);
      const e = treeE(), notes = [];
      A[u].forEach(({ to, w, i }) => {
        const cand = isP ? w : dist[u] + w;
        if (known.has(to)) {
          if (!isP && cand < dist[to]) { notes.push(`${to}: ${dist[u]} + (${w}) = ${cand} &lt; ${dist[to]} <b>แต่ ${to} เป็น known แล้ว → ไม่แก้</b> (ผลผิด!)`); e[i] = 'rej'; }
          return;
        }
        if (cand < dist[to]) {
          notes.push(`${to}: ${isP ? `w = ${w}` : `${dist[u]} + ${w} = ${cand}`} &lt; ${dist[to] === Infinity ? '∞' : dist[to]} → d = <b>${cand}</b>, parent = ${u}`);
          dist[to] = cand; par[to] = u; e[i] = 'cmp';
        } else notes.push(`${to}: ${isP ? `w = ${w}` : `${dist[u]} + ${w} = ${cand}`} ไม่น้อยกว่า ${dist[to]} → ไม่เปลี่ยน`);
      });
      F.push(mk(`<b>Process ${u}</b> (dist = ${dist[u]}${par[u] !== '-' ? `, parent = ${par[u]}` : ''}) → mark known · ${A[u].length ? 'relax: ' + notes.join(' · ') : 'ไม่มีเส้นออก'}`, nodeCls(u), Object.assign(treeE(), e), ds(), panel(G.nodes.indexOf(u))));
    }
    const unreached = G.nodes.filter((n) => !known.has(n));
    if (isP) {
      F.push(mk(`Prim จบ · MST มี ${known.size - 1} เส้น ต้นทุนรวม <b>${cost()}</b>${unreached.length ? ` · ${unreached.join(', ')} ไปไม่ถึง (กราฟไม่ connected)` : ''}`, nodeCls(), treeE(), ds(), panel()));
    } else {
      F.push(mk(`Dijkstra จบ · ${unreached.length ? unreached.join(', ') + ' ไปไม่ถึง' : 'ทุก vertex เป็น known'}`, nodeCls(), treeE(), ds(), panel()));
      if (target && known.has(target)) {
        const path = []; for (let v = target; v !== '-'; v = par[v]) path.unshift(v);
        const e = {};
        G.edges.forEach((ed, i) => { for (let k = 0; k + 1 < path.length; k++) if (ed[0] === path[k] && ed[1] === path[k + 1]) e[i] = 'tree'; });
        const nc = {}; path.forEach((n) => { nc[n] = 'cur'; });
        const exp = target;
        let warn = '';
        if (G.edges.some((ed) => ed[2] < 0)) {
          const bf = {}; G.nodes.forEach((n) => { bf[n] = Infinity; }); bf[s] = 0;
          for (let k = 0; k < G.nodes.length; k++) G.edges.forEach((ed) => { if (bf[ed[0]] + ed[2] < bf[ed[1]]) bf[ed[1]] = bf[ed[0]] + ed[2]; });
          if (bf[exp] !== dist[exp]) warn = ` <br><b>⚠ ผิด!</b> กราฟมีน้ำหนักลบ — ระยะทางที่ถูกต้องไป ${exp} คือ <b>${bf[exp]}</b> (หาด้วย Bellman-Ford) แต่ Dijkstra ได้ ${dist[exp]} เพราะแก้ค่าของ vertex ที่ known แล้วไม่ได้`;
        }
        F.push(mk(`<b>Reconstruct path</b> ย้อนจาก ${exp}: ` + path.slice().reverse().map((n) => `${n}${par[n] !== '-' ? ` (parent = ${par[n]})` : ' (ต้นทาง)'}`).join(' → ') + ` · เส้นทาง (ถูกลำดับ): <b>${path.join(' → ')}</b> · ต้นทุน = <b>${dist[exp]}</b>${warn}`, nc, e, ds(), panel()));
      }
    }
    return F;
  }

  /* ================= Kruskal ================= */
  function kruskal(G) {
    const F = [];
    const parent = {}; G.nodes.forEach((n) => { parent[n] = n; });
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const order = G.edges.map((e, i) => i).sort((a, b) => G.edges[a][2] - G.edges[b][2] || a - b);
    const status = {}, mst = {};
    let total = 0, count = 0;
    const sets = () => { const m = {}; G.nodes.forEach((n) => { (m[find(n)] = m[find(n)] || []).push(n); }); return Object.values(m).map((a) => '{' + a.join(', ') + '}').join(', '); };
    const panel = () => [
      { title: 'Edge ที่เรียงตามน้ำหนักแล้ว', html: table(['#', 'Edge', 'w', 'ผล'], order.map((i, k) => [k + 1, edgeName(G, i), G.edges[i][2], status[i] || '']), -1) },
      { title: 'DSU Forest', html: sets() },
      { title: 'ต้นทุนรวมของ MST', html: `<b>${total}</b> (${count}/${G.nodes.length - 1} เส้น)` },
    ];
    const nodeCls = () => { const o = {}; G.nodes.forEach((n) => { o[n] = 'done'; }); return o; };
    F.push(mk(`เริ่มต้น: เรียงทุกเส้นตามน้ำหนัก (น้อย→มาก, เท่ากันคงลำดับเดิม) · ทุก vertex เป็นต้นไม้เดี่ยวๆ ใน forest: ${sets()}`, {}, {}, {}, panel()));
    for (const i of order) {
      if (count === G.nodes.length - 1) break;
      const [u, v, w] = G.edges[i];
      const r1 = find(u), r2 = find(v);
      const cur = {}; cur[i] = 'cmp'; Object.keys(mst).forEach((k) => { cur[k] = cur[k] || 'mst'; });
      if (r1 !== r2) {
        parent[r2] = r1; total += w; count++; mst[i] = 1; status[i] = '✔ รับ';
        const e = {}; Object.keys(mst).forEach((k) => { e[k] = 'mst'; });
        F.push(mk(`พิจารณา <b>${edgeName(G, i)}</b> w = ${w} · find(${u}) = ${r1}, find(${v}) = ${r2} → <b>คนละ set</b> → รับเส้นนี้ + union · forest: ${sets()}`, nodeCls(), e, {}, panel()));
      } else {
        status[i] = '✘ ทิ้ง (cycle)';
        const e = {}; Object.keys(mst).forEach((k) => { e[k] = 'mst'; }); e[i] = 'rej';
        F.push(mk(`พิจารณา <b>${edgeName(G, i)}</b> w = ${w} · find(${u}) = ${r1} = find(${v}) → <b>set เดียวกัน</b> → ทิ้ง (เพราะจะเกิด cycle)`, nodeCls(), e, {}, panel()));
      }
    }
    const e = {}; Object.keys(mst).forEach((k) => { e[k] = 'mst'; });
    F.push(mk(count === G.nodes.length - 1 ? `ครบ |V| − 1 = ${count} เส้น → <b>หยุด</b> · MST ต้นทุนรวม <b>${total}</b> (เส้นที่เหลือไม่ต้องตรวจ)` : `จบ · ได้ ${count} เส้น (กราฟไม่ connected) ต้นทุน ${total}`, nodeCls(), e, {}, panel()));
    return F;
  }

  /* ================= Rendering ================= */
  function renderGraph(G, f) {
    const R = 21;
    let defs = '<defs>' + ['def', 'tree', 'back', 'cmp', 'rej', 'mst', 'cross'].map((c) => `<marker id="ah-${c}" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path class="ah ${c}" d="M0,0 L9,4 L0,8z"/></marker>`).join('') + '</defs>';
    let es = '', ls = '', ns = '';
    G.edges.forEach((e, i) => {
      const [x1, y1] = G.pos[e[0]], [x2, y2] = G.pos[e[1]];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const c = f.e[i] || 'def';
      es += `<line class="gedge ${c}" x1="${x1 + ux * R}" y1="${y1 + uy * R}" x2="${x2 - ux * (R + 1)}" y2="${y2 - uy * (R + 1)}"${G.directed ? ` marker-end="url(#ah-${c})"` : ''}/>`;
      if (G.weighted) {
        const mx = (x1 + x2) / 2 - uy * 11, my = (y1 + y2) / 2 + ux * 11;
        ls += `<text class="gw ${c}" x="${mx}" y="${my}">${e[2]}</text>`;
      }
    });
    G.nodes.forEach((n) => {
      const [x, y] = G.pos[n], c = f.v[n] || '';
      ns += `<g class="gnode ${c}"><circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y}">${n}</text>`;
      if (f.sub[n] !== undefined) ns += `<text class="gsub" x="${x}" y="${y - R - 6}">${f.sub[n]}</text>`;
      ns += '</g>';
    });
    return `<svg viewBox="0 0 520 300" role="img" aria-label="graph">${defs}${es}${ls}${ns}</svg>`;
  }

  /* ================= UI ================= */
  function init() {
    if (!$('gr-view')) return;
    let frames = [], fi = 0, timer = null, G = G7;
    const show = () => {
      const f = frames[fi]; if (!f) return;
      $('gr-view').innerHTML = renderGraph(G, f);
      $('gr-panels').innerHTML = f.panels.map((p) => `<div class="gpanel"><h4>${p.title}</h4>${p.html}</div>`).join('');
      $('gr-msg').innerHTML = `<span class="stepno">ขั้น ${fi + 1}/${frames.length}</span>${f.msg}`;
      $('gr-prev').disabled = fi === 0;
      $('gr-next').disabled = fi >= frames.length - 1;
      if (fi >= frames.length - 1) stop();
    };
    function stop() { if (timer) clearInterval(timer); timer = null; $('gr-play').textContent = '▶ เล่น'; }
    function play() { if (fi >= frames.length - 1) return; $('gr-play').textContent = '⏸ หยุด'; timer = setInterval(() => { if (fi < frames.length - 1) { fi++; show(); } else stop(); }, +$('gr-speed').value); }
    function run(auto) {
      stop();
      const alg = $('gr-alg').value, s = $('gr-src').value, t = $('gr-tgt').value;
      if (alg === 'bfs') frames = bfs(G, s);
      else if (alg === 'dfs') frames = dfs(G, s);
      else if (alg === 'prim') frames = tableAlgo(G, s, 'prim');
      else if (alg === 'kruskal') frames = kruskal(G);
      else frames = tableAlgo(G, s, 'dijkstra', t);
      fi = 0; show();
      if (auto) play();
    }
    function fill(sel, nodes, val) { $(sel).innerHTML = nodes.map((n) => `<option value="${n}">${n}</option>`).join(''); $(sel).value = val; }
    function setAlg() {
      const alg = $('gr-alg').value, opts = ALG_GRAPHS[alg];
      $('gr-graph').innerHTML = opts.map((k) => `<option value="${k}">${GRAPHS[k].name}</option>`).join('');
      $('gr-graph').value = opts[0];
      $('gr-graph').parentElement.style.display = opts.length > 1 ? '' : 'none';
      setGraph();
    }
    function setGraph() {
      const k = $('gr-graph').value; G = GRAPHS[k];
      fill('gr-src', G.nodes, DEFAULT_SRC[k]);
      fill('gr-tgt', G.nodes, DEFAULT_TGT[k] || G.nodes[G.nodes.length - 1]);
      const alg = $('gr-alg').value;
      $('gr-src').parentElement.style.display = alg === 'kruskal' ? 'none' : '';
      $('gr-tgt').parentElement.style.display = alg === 'dijkstra' ? '' : 'none';
      run(false);
    }
    $('gr-alg').onchange = setAlg;
    $('gr-graph').onchange = setGraph;
    $('gr-src').onchange = () => run(false);
    $('gr-tgt').onchange = () => run(false);
    $('gr-run').onclick = () => run(true);
    $('gr-prev').onclick = () => { stop(); if (fi > 0) { fi--; show(); } };
    $('gr-next').onclick = () => { stop(); if (fi < frames.length - 1) { fi++; show(); } };
    $('gr-play').onclick = () => (timer ? stop() : play());
    setAlg();
  }

  window.GraphViz = { GRAPHS, bfs, dfs, tableAlgo, kruskal, G7, G5U, G5D, GNEG };
  document.addEventListener('DOMContentLoaded', init);
})();

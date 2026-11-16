/* The hero cluster: people in small teams, as one living web. Verlet integration with
   springs, so it's physical: grab anyone and fling them, and everyone connected moves.
   It hangs in the hero slot (world-anchored, so it scrolls with the page) and feeds the
   stream below. The faces are stock portraits, kept small: they read as people, not as
   anyone in particular. */

export const FACES = 160;   // cells in images/network/faces.webp (16 x 10)

export function clusterSize(small) { return small ? { faces: 90, dots: 34 } : { faces: 180, dots: 64 }; }

export function createCluster({ small, center, radius }) {
  const { faces, dots } = clusterSize(small);
  const n = faces + dots;
  const pos = new Float32Array(n * 3), prev = new Float32Array(n * 3), rest = new Float32Array(n * 3);
  const size = new Float32Array(n), photo = new Int16Array(n).fill(-1);
  const R = radius;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const springs = [];
  const link = (a, b) => springs.push([a, b, Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1])]);

  /* People don't form a mesh, they form teams. Small groups of three to seven are spread
     with breathing room inside a soft, irregular outline, and joined by the shortest
     bridges (a spanning tree, plus a few extra links), the way real working networks look.
     A uniform mesh in a circle looks like a molecule; this looks like a map of people. */
  const teams = [];
  for (let left = faces; left > 0;) { const m = Math.min(left, 3 + Math.floor(rnd() * 5)); teams.push(m); left -= m; }
  const K = teams.length;
  const fs = small ? 0.058 : 0.06;
  // team centres: dart throwing with a minimum gap, inside a gently wobbling outline
  const outline = a => R * (0.86 + 0.1 * Math.sin(a * 2 + 0.7) + 0.06 * Math.sin(a * 3 + 2.1));
  const centres = [];
  let gap = R * (small ? 0.34 : 0.28);
  for (let tries = 0; centres.length < K && tries < 20000; tries++) {
    if (tries % 2500 === 2499) gap *= 0.92;
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * outline(a);
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.9;
    if (centres.every(c => Math.hypot(c[0] - x, c[1] - y) > gap)) centres.push([x, y]);
  }
  while (centres.length < K) centres.push([(rnd() - 0.5) * R, (rnd() - 0.5) * R]);
  let i0 = 0;
  const groups = teams.map((m, k) => {
    const cx = center.x + centres[k][0], cy = center.y + centres[k][1];
    const cr = (0.13 + m * 0.038) * (small ? 0.9 : 1);
    const ids = [];
    const spin = rnd() * Math.PI * 2;
    for (let q = 0; q < m; q++) {
      const i = i0 + q;
      const lead = m >= 5 && q === 0;
      const ang = spin + (q / (lead ? m - 1 : m)) * Math.PI * 2 + rnd() * 0.4;
      const rr = lead ? 0 : cr * (0.85 + rnd() * 0.3);
      rest[i * 3] = cx + Math.cos(ang) * rr; rest[i * 3 + 1] = cy + Math.sin(ang) * rr; rest[i * 3 + 2] = (rnd() - 0.5) * 0.4;
      size[i] = fs * (lead ? 1.3 : 0.85 + rnd() * 0.25);
      photo[i] = (i * 37) % FACES;
      ids.push(i);
    }
    const ring = m >= 5 ? ids.slice(1) : ids;
    ring.forEach((id, q) => { if (ring.length > 1 && (ring.length > 2 || q === 0)) link(id, ring[(q + 1) % ring.length]); });
    if (m >= 5) ring.forEach(id => link(ids[0], id));
    i0 += m;
    return { ids, cx, cy };
  });
  const nearestPair = (A, B) => {
    let best = [A.ids[0], B.ids[0]], bd = Infinity;
    A.ids.forEach(a => B.ids.forEach(b => { const d = Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1]); if (d < bd) { bd = d; best = [a, b]; } }));
    return best;
  };
  let dot = faces;
  const bridge = (A, B) => {
    const [a, b] = nearestPair(A, B);
    if (dot < n && rnd() < 0.6) {
      const t = 0.35 + rnd() * 0.3;
      rest[dot * 3] = rest[a * 3] + (rest[b * 3] - rest[a * 3]) * t + (rnd() - 0.5) * 0.06;
      rest[dot * 3 + 1] = rest[a * 3 + 1] + (rest[b * 3 + 1] - rest[a * 3 + 1]) * t + (rnd() - 0.5) * 0.06;
      rest[dot * 3 + 2] = (rnd() - 0.5) * 0.3;
      size[dot] = 0.022 + Math.pow(rnd(), 2) * 0.022;
      link(a, dot); link(dot, b); dot++;
    } else link(a, b);
  };
  // the shortest bridges that connect every team (Prim's), then a few extra short ones
  const dist = (p, q) => Math.hypot(groups[p].cx - groups[q].cx, groups[p].cy - groups[q].cy);
  const inTree = [0], out = new Set([...Array(K).keys()].slice(1)), used = new Set();
  while (out.size) {
    let best = null;
    inTree.forEach(p => out.forEach(q => { const d = dist(p, q); if (!best || d < best[0]) best = [d, p, q]; }));
    bridge(groups[best[1]], groups[best[2]]); used.add(best[1] * 1000 + best[2]); used.add(best[2] * 1000 + best[1]);
    inTree.push(best[2]); out.delete(best[2]);
  }
  for (let p = 0; p < K; p++) {
    if (rnd() > 0.3) continue;
    let best = -1, bd = Infinity;
    for (let q = 0; q < K; q++) if (q !== p && !used.has(p * 1000 + q) && dist(p, q) < bd) { bd = dist(p, q); best = q; }
    if (best >= 0 && bd < gap * 1.8) { bridge(groups[p], groups[best]); used.add(p * 1000 + best); used.add(best * 1000 + p); }
  }
  // any relay dots left over drift quietly near their team
  for (; dot < n; dot++) {
    const g = groups[Math.floor(rnd() * K)];
    const a = rnd() * 6.2832, r = 0.35 + rnd() * 0.3;
    rest[dot * 3] = g.cx + Math.cos(a) * r; rest[dot * 3 + 1] = g.cy + Math.sin(a) * r; rest[dot * 3 + 2] = (rnd() - 0.5) * 0.3;
    size[dot] = 0.022 + rnd() * 0.008;
  }
  pos.set(rest); prev.set(rest);

  /* The formations: every few seconds about half of the people gather into a shape that says
     what AntBox is about (a Proof of Work card, a rising chart of shipped work, a capsule, Day 0),
     hold it, and go home; the rest stay a network around it, stepping aside to give it room.
     Each shape is drawn by whoever is nearest, so different people form each one and nobody
     crosses the whole cluster to get there. */
  const form = new Float32Array(n * 2), formMask = new Float32Array(n), former = new Uint8Array(n);
  const cxW = center.x, cyW = center.y, U = R * 0.98;
  const M = Math.round(n * 0.36);   // about a third draw the shape: the network stays the main thing
  // students: what you build here, never a degree or a CV. You ship something (a check), it adds
  // up week by week (a chart), you ship it with a team (a capsule), and it becomes your Proof of Work
  const SHAPES = [
    // a dashboard: a chart that climbs, with an arrow
    () => {
      const segs = [[[-0.92, -0.6], [0.92, -0.6]]], faces = [];
      for (let b = 0; b < 6; b++) { const x0 = -0.72 + b * 0.27, h = 0.2 + b * 0.18; segs.push([[x0, -0.6], [x0, -0.6 + h], [x0 + 0.16, -0.6 + h], [x0 + 0.16, -0.6]]); faces.push([x0 + 0.08, -0.6 + h + 0.13]); }
      segs.push([[0.5, 0.78], [0.86, 0.78], [0.86, 0.5]]);
      return { segs, faces, box: [-1, -0.7, 1, 0.82] };
    },
    // code: </>
    () => ({ segs: [[[-0.32, 0.55], [-0.86, 0], [-0.32, -0.55]], [[0.32, 0.55], [0.86, 0], [0.32, -0.55]], [[0.16, 0.68], [-0.16, -0.68]]], faces: [[-0.86, 0], [0.86, 0]], box: [-0.95, -0.75, 0.95, 0.75] }),
    // a sales funnel: leads in at the top, meetings out at the bottom
    () => ({ segs: [[[-0.92, 0.62], [0.92, 0.62], [0.22, -0.18], [0.22, -0.72], [-0.22, -0.72], [-0.22, -0.18], [-0.92, 0.62]], [[-0.64, 0.3], [0.64, 0.3]], [[-0.38, 0.02], [0.38, 0.02]]], faces: [[-0.6, 0.78], [0, 0.82], [0.6, 0.78], [0, -0.86]], box: [-1, -0.95, 1, 0.95] }),
    // a research report: a page, a pie chart, lines of findings
    () => ({ segs: [[[-0.62, 0.84], [0.62, 0.84], [0.62, -0.84], [-0.62, -0.84], [-0.62, 0.84]], circle(-0.18, 0.36, 0.26, 26), [[-0.18, 0.36], [-0.18, 0.62]], [[-0.18, 0.36], [0.06, 0.24]], [[0.22, 0.5], [0.48, 0.5]], [[0.22, 0.3], [0.48, 0.3]], [[-0.44, -0.12], [0.44, -0.12]], [[-0.44, -0.34], [0.44, -0.34]], [[-0.44, -0.56], [0.2, -0.56]]], faces: [], box: [-0.72, -0.94, 0.72, 0.94] }),
    // a launch: a rocket going up, with its trail
    () => ({ segs: [[[0, 0.86], [0.26, 0.42], [0.26, -0.3], [-0.26, -0.3], [-0.26, 0.42], [0, 0.86]], circle(0, 0.22, 0.1, 14), [[-0.26, -0.06], [-0.5, -0.36], [-0.26, -0.3]], [[0.26, -0.06], [0.5, -0.36], [0.26, -0.3]], [[-0.12, -0.42], [-0.18, -0.8]], [[0.12, -0.42], [0.18, -0.8]], [[0, -0.42], [0, -0.9]]], faces: [], box: [-0.6, -0.95, 0.6, 0.95] }),
    // a Proof of Work card: frame, avatar, name, "Day 0 ready", three pieces of work, a rising chart
    () => {
      const segs = [], faces = [];
      const rect = (x0, y0, x1, y1, r) => { const k = 6, c = []; const corner = (cx, cy, a0) => { for (let i = 0; i <= k; i++) { const a = a0 + i / k * Math.PI / 2; c.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } }; corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, Math.PI / 2); corner(x0 + r, y0 + r, Math.PI); corner(x1 - r, y0 + r, Math.PI * 1.5); c.push(c[0]); segs.push(c); };
      rect(-0.95, -0.64, 0.95, 0.64, 0.12);
      faces.push([-0.74, 0.4]); segs.push(circle(-0.74, 0.4, 0.13, 14));
      segs.push([[-0.5, 0.45], [0.05, 0.45]]); segs.push([[-0.5, 0.33], [-0.18, 0.33]]);
      segs.push([[0.42, 0.4], [0.78, 0.4]]);
      segs.push([[-0.85, 0.16], [0.85, 0.16]]);
      for (let r = 0; r < 3; r++) { const y = -0.04 - r * 0.2; faces.push([-0.78, y]); segs.push([[-0.66, y], [-0.1 - r * 0.08, y]]); }
      for (let b = 0; b < 5; b++) { const x = 0.2 + b * 0.15; segs.push([[x, -0.52], [x, -0.52 + 0.14 + b * 0.1]]); }
      segs.push([[0.12, -0.55], [0.86, -0.55]]);
      return { segs, faces, box: [-1.02, -0.72, 1.02, 0.72] };
    },
  ];
  // hiring: find the role, read the work, meet the capsule, watch the work add up
  const SHAPES_HIRE = [
    // finding the right person: a magnifier with someone in the lens
    () => ({ segs: [circle(-0.15, 0.15, 0.5, 36), [[0.22, -0.22], [0.7, -0.7]]], faces: [[-0.15, 0.15]], box: [-0.75, -0.8, 0.8, 0.75] }),
    // reading the work: a verified badge
    () => ({ segs: [circle(0, 0.2, 0.55, 36), [[-0.26, 0.2], [-0.06, 0], [0.3, 0.42]], [[-0.3, -0.26], [-0.42, -0.9], [-0.22, -0.78], [-0.06, -0.9], [-0.06, -0.34]], [[0.06, -0.34], [0.06, -0.9], [0.22, -0.78], [0.42, -0.9], [0.3, -0.26]]], faces: [], box: [-0.7, -0.95, 0.7, 0.85] }),
    // the capsule: a team, everyone joined to the work in the middle
    () => {
      const segs = [], faces = [[0, 0]];
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.2832 + 0.4, r = 0.56 + (k % 2) * 0.14; faces.push([Math.cos(a) * r, Math.sin(a) * r]); segs.push([[Math.cos(a) * 0.16, Math.sin(a) * 0.16], [Math.cos(a) * (r - 0.1), Math.sin(a) * (r - 0.1)]]); }
      return { segs, faces, box: [-0.82, -0.82, 0.82, 0.82] };
    },
    // the work adds up: a line that climbs, ending in an arrow
    () => {
      const c = [];
      for (let i = 0; i <= 36; i++) { const t = i / 36; c.push([-0.92 + 1.8 * t, -0.58 + 1.08 * Math.pow(t, 1.5)]); }
      return { segs: [c, [[0.64, 0.5], [0.88, 0.5], [0.88, 0.26]]], faces: [[-0.92, -0.58], [-0.47, -0.46], [0.0, -0.2], [0.44, 0.13]], box: [-1, -0.7, 1, 0.62] };
    }
  ];
  function circle(x, y, r, k) { const c = []; for (let i = 0; i <= k; i++) { const a = i / k * 6.2832; c.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return c; }
  function ellipse(x, y, rx, ry, k) { const c = []; for (let i = 0; i <= k; i++) { const a = i / k * 6.2832; c.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return c; }
  // spread exactly `count` points evenly along a shape's lines
  const sample = (segs, count) => {
    const parts = []; let total = 0;
    segs.forEach(sg => { for (let i = 1; i < sg.length; i++) { const l = Math.hypot(sg[i][0] - sg[i - 1][0], sg[i][1] - sg[i - 1][1]); parts.push([sg[i - 1], sg[i], total, l]); total += l; } });
    const out = [];
    for (let k = 0; k < count; k++) {
      const d = (k + 0.5) / count * total;
      const pt = parts.find(q => d >= q[2] && d <= q[2] + q[3]) || parts[parts.length - 1];
      const t = pt[3] ? (d - pt[2]) / pt[3] : 0;
      out.push([pt[0][0] + (pt[1][0] - pt[0][0]) * t, pt[0][1] + (pt[1][1] - pt[0][1]) * t]);
    }
    return out;
  };
  const isFace = i => photo[i] >= 0;
  let shapeIx = -1;
  function nextShape() {
    const list = document.documentElement.dataset.aud === 'company' ? SHAPES_HIRE : SHAPES;
    shapeIx = (shapeIx + 1) % list.length;
    const sh = list[shapeIx]();
    const W0 = (x, y) => [cxW + x * U, cyW + y * U * 0.92];
    const facePts = sh.faces.map(([x, y]) => W0(x, y));
    const linePts = sample(sh.segs, Math.max(0, M - facePts.length)).map(([x, y]) => W0(x, y));
    former.fill(0);
    // nearest free person for every target: faces to face spots, anyone to the lines
    const take = (pt, wantFace) => {
      let best = -1, bd = Infinity;
      for (let i = 0; i < n; i++) { if (former[i] || (wantFace && !isFace(i))) continue; const d = Math.hypot(rest[i * 3] - pt[0], rest[i * 3 + 1] - pt[1]); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) { former[best] = 1; form[best * 2] = pt[0]; form[best * 2 + 1] = pt[1]; }
    };
    facePts.forEach(pt => take(pt, true));
    linePts.sort(() => rnd() - 0.5).forEach(pt => take(pt, false));
    // everyone else stays a network; those inside the shape step aside to give it room
    const [bx0, by0, bx1, by1] = sh.box, L0 = W0(bx0, by0), L1 = W0(bx1, by1);
    for (let i = 0; i < n; i++) {
      if (former[i]) { formMask[i] = 1; continue; }
      const x = rest[i * 3], y = rest[i * 3 + 1];
      form[i * 2] = x; form[i * 2 + 1] = y; formMask[i] = 0;
      if (x > L0[0] && x < L1[0] && y > L0[1] && y < L1[1]) {
        const dx = x - cxW, dy = y - cyW, sx = (L1[0] - cxW + 0.25) / (Math.abs(dx) || 1e-3), sy = (L1[1] - cyW + 0.25) / (Math.abs(dy) || 1e-3), k = Math.min(sx, sy);
        form[i * 2] = cxW + dx * k; form[i * 2 + 1] = cyW + dy * k; formMask[i] = 0.85;
      }
    }
    return shapeIx;
  }
  let formK = 0;

  let grabbed = -1;
  const grabAt = { x: 0, y: 0 };
  let acc = 0;
  const STEP = 1 / 60;

  function step(time, paused, pointer) {
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      const fk0 = formK * formMask[i], damp = 0.94 - 0.14 * fk0, vx = (pos[o] - prev[o]) * damp, vy = (pos[o + 1] - prev[o + 1]) * damp, vz = (pos[o + 2] - prev[o + 2]) * 0.9;
      prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2];
      // home pull + a slow breath, so it is never quite still
      const breathe = paused ? 0 : 0.00035;
      const fk = formK * formMask[i];
      const hx = rest[o] + (form[i * 2] - rest[o]) * fk, hy = rest[o + 1] + (form[i * 2 + 1] - rest[o + 1]) * fk;
      const pull = 0.012 + 0.09 * fk;
      let fx = (hx - pos[o]) * pull + Math.sin(time * 0.7 + i * 1.3) * breathe * (1 - fk);
      let fy = (hy - pos[o + 1]) * pull + Math.cos(time * 0.6 + i * 2.1) * breathe * (1 - fk);
      const fz = (rest[o + 2] * (1 - fk0) - pos[o + 2]) * 0.02;
      // the cursor nudges the web aside as it passes
      if (pointer && grabbed < 0) {
        const dx = pos[o] - pointer.x, dy = pos[o + 1] - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 1.2) { const f = (1.2 - d2) * 0.004; fx += dx * f; fy += dy * f; }
      }
      pos[o] += vx + fx; pos[o + 1] += vy + fy; pos[o + 2] += vz + fz;
    }
    // springs, relaxed a few times
    for (let it = 0; it < 3; it++) {
      for (const [a, b, len] of springs) {
        const oa = a * 3, ob = b * 3;
        const dx = pos[ob] - pos[oa], dy = pos[ob + 1] - pos[oa + 1];
        const d = Math.hypot(dx, dy) || 1e-5;
        const k = (d - len) / d * 0.18 * (1 - formK * Math.max(former[a], former[b]));
        const wa = a === grabbed ? 0 : 0.5, wb = b === grabbed ? 0 : 0.5;
        pos[oa] += dx * k * wa * 2 * (wb ? 1 : 1); pos[oa + 1] += dy * k * wa * 2;
        pos[ob] -= dx * k * wb * 2; pos[ob + 1] -= dy * k * wb * 2;
      }
      if (grabbed >= 0) { const o = grabbed * 3; pos[o] += (grabAt.x - pos[o]) * 0.5; pos[o + 1] += (grabAt.y - pos[o + 1]) * 0.5; }
    }
  }

  return {
    n, faces, pos, rest, size, photo, springs,
    /* intro: everyone starts at one point and the springs throw them home */
    burstFrom(x, y) { for (let i = 0; i < n; i++) { const o = i * 3; pos[o] = prev[o] = x + (Math.random() - 0.5) * 0.02; pos[o + 1] = prev[o + 1] = y + (Math.random() - 0.5) * 0.02; } },
    update(dt, time, paused, pointer) {
      acc = Math.min(acc + dt, STEP * 4);
      while (acc >= STEP) { step(time, paused, pointer); acc -= STEP; }
    },
    pick(x, y, slack = 0.05) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < n; i++) { const d = Math.hypot(pos[i * 3] - x, pos[i * 3 + 1] - y); if (d < size[i] + slack && d < bd) { bd = d; best = i; } }
      return best;
    },
    // hold a node exactly here (the opening places everyone by hand), with no velocity
    pin(i, x, y, z) { const o = i * 3; pos[o] = prev[o] = x; pos[o + 1] = prev[o + 1] = y; pos[o + 2] = prev[o + 2] = z; },
    grab(i, x, y) { grabbed = i; grabAt.x = x; grabAt.y = y; },
    drag(x, y) { grabAt.x = x; grabAt.y = y; },
    release() { grabbed = -1; },
    get grabbed() { return grabbed; },
    set formK(v) { formK = v; }, get formK() { return formK; },
    nextShape, former, get shape() { return shapeIx; }
  };
}

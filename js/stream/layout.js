/* Lays the network down the whole document. The world is pinned to the page:
   one world unit is 1/8 of the viewport height at z = 0, x = 0 is the viewport's
   centre and y = -documentY. Every section says how the stream behaves inside it
   (data-stream), and its keyframes come from where its real elements sit, so the
   stream is linked to the page by construction. People live all through it: small
   faces in the crowd and in every capsule. The stream flows around the panels, never
   under them. */
import { FACES } from '/js/stream/cluster.js?v=26ea551a55';

// the functions capsules work in: the six Academy tracks, then the roles people hold at AntBox and its services
const TRACKS = ['SDE', 'Inbound & Customer Success', 'Data Analytics', 'GTM Strategy', 'RevOps', 'Operations & Delivery',
  "Founder's Office", 'Business Development', 'Sales Development', 'Outbound SDR', 'Growth', 'Customer Success', 'Simulation Team', 'Product Deployment'];

function rng(seed) {
  let a = seed | 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export const KIND = { dot: 0, face: 1, ring: 2, beacon: 3, me: 5, trail: 6 };

export function buildLayout({ W, H, small, reserved }) {
  const ppu = H / 8;
  const rand = rng(1709);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const sy = window.scrollY;
  const docRect = el => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2 - W / 2) / ppu, y: -(r.top + sy + r.height / 2) / ppu, top: -(r.top + sy) / ppu, bottom: -(r.bottom + sy) / ppu, left: (r.left - W / 2) / ppu, right: (r.right - W / 2) / ppu, w: r.width / ppu, h: r.height / ppu }; };
  const visible = el => !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
  const halfW = W / 2 / ppu;
  const edgeX = halfW - (small ? 0.35 : 0.7);

  const P = [];            // { x, y, z, size, alpha, purple, kind, photo, free }
  const groups = [];       // capsule groups: arrays of particle indices
  const labels = [];
  const add = p => { P.push(Object.assign({ z: 0, size: 0.06, alpha: 1, purple: 0.12, kind: 0, photo: -1, free: true }, p)); return P.length - 1; };

  // the hero cluster, the visitor and their trail come first; engine.js moves them
  for (let i = 0; i < reserved; i++) add({ kind: KIND.dot, free: false });

  /* the glass panels: the stream flows around these, so it is never lost under frost */
  const obstacles = [...document.querySelectorAll('.sec-title, .sec-lede, .hero-copy, .bx, .sx-step, .st-ch, .st-screen, .fw-t, .net-seq, .tb2-p, .tb2-list, .tb3, .ax, .tr, .duel, .nw, .rv, .tzv, .close-cta, .foot-card')]
    .filter(visible).map(el => {
      const r = docRect(el);
      // inside a pinned section the panel holds the screen for the whole pin, so it covers all of it
      // (measured from the spacer, so it holds wherever the page happens to be scrolled)
      const pin = el.closest('.pin-spacer');
      if (!pin) return { l: r.left - 0.12, r: r.right + 0.12, t: r.top + 0.12, b: r.bottom - 0.12 };
      const sp = docRect(pin), sec = docRect(pin.firstElementChild);
      const t = sp.top + (r.top - sec.top);
      return { l: r.left - 0.12, r: r.right + 0.12, t: t + 0.12, b: t - r.h - (sp.h - sec.h) - 0.12 };
    });
  const inside = (x, y) => obstacles.find(o => x > o.l && x < o.r && y < o.t && y > o.b);
  const crosses = (ax, ay, bx, by) => obstacles.some(o => {
    // sample the segment: cheap and plenty for links this short
    for (let s = 0.15; s < 1; s += 0.2) { const x = ax + (bx - ax) * s, y = ay + (by - ay) * s; if (x > o.l && x < o.r && y < o.t && y > o.b) return true; }
    return false;
  });

  /* keyframes: at a document height, which lanes the stream runs in, how wide, how present */
  const K = [];
  const kf = (y, lanes, o = {}) => K.push(Object.assign({ y, lanes, w: 0.6, alpha: 0.6, purple: 0.12, z: 2.4, dens: 3 }, o));
  const sections = [...document.querySelectorAll('[data-stream]')].filter(visible);
  let crowd = null, orbit = null;
  const beacons = [];
  const magnets = { capsules: [], thread: null, beacons, doors: [] };

  for (const sec of sections) {
    // a pinned section's real length is its pin spacer (the scroll it holds the screen for)
    const host = sec.parentElement && sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec;
    const r = docRect(host);
    const type = sec.dataset.stream;
    const at = f => r.top + (r.bottom - r.top) * f;
    if (type === 'cluster') {
      const slot = docRect(sec.querySelector('[data-stage-slot]'));
      kf(slot.y, [slot.x], { w: 0.4, alpha: 0.95, purple: 0.2, dens: 2 });
      kf(at(1), [slot.x * 0.7, -halfW * 0.4], { w: 1.4, alpha: 0.7, dens: 4 });
    } else if (type === 'branches') {
      // the stream threads the gaps between the cards
      const cards = [...sec.querySelectorAll('.prog, .iaas, .services')].filter(visible).map(docRect).sort((a, b) => a.x - b.x);
      const lanes = cards.length ? [cards[0].left - 0.3, ...cards.slice(1).map((c, i) => (cards[i].right + c.left) / 2), cards[cards.length - 1].right + 0.3] : [0];
      const y0 = cards.length ? Math.max(...cards.map(c => c.top)) : at(0.3);
      kf(at(0.12), [0], { w: 1.4, alpha: 0.6, dens: 4 });
      kf(y0 + 0.4, lanes, { w: 0.14, alpha: 0.65, purple: 0.25, dens: 4 });
      kf(cards.length ? Math.min(...cards.map(c => c.bottom)) : at(0.8), lanes, { w: 0.14, alpha: 0.65, purple: 0.25, dens: 4 });
      kf(at(1), [0], { w: 1.6, alpha: 0.7, dens: 4 });
    } else if (type === 'crowd') {
      crowd = r;
      kf(r.top, [-halfW * 0.4, halfW * 0.4], { w: halfW * 0.6, alpha: 0.4, dens: 1.2 });
      kf(r.bottom, [-halfW * 0.4, halfW * 0.4], { w: halfW * 0.5, alpha: 0.4, dens: 1.2 });
    } else if (type === 'beacons') {
      // five numbers, five lights along the top rim of the glass slab
      const slab = sec.querySelector('.proof-slab');
      const sr = visible(slab) ? docRect(slab) : null;
      const stats = [...sec.querySelectorAll('.stat')].filter(visible).map(docRect).sort((a, b) => a.x - b.x);
      const rimY = sr ? sr.top + 0.12 : at(0.4);
      kf(at(0.02), [halfW * 0.35], { w: 0.3, alpha: 0.75, purple: 0.5, dens: 3 });
      kf(rimY + 0.9, [sr ? sr.left - 0.2 : 0], { w: 0.18, alpha: 0.85, purple: 0.6, dens: 4 });
      if (sr) kf(rimY + 0.18, [sr.left + 0.2, sr.x, sr.right - 0.2], { w: 0.08, alpha: 0.9, purple: 0.7, dens: 5 });
      stats.forEach(s => beacons.push({ x: s.left + 0.45, y: rimY + 0.16 }));
      if (sr) kf(sr.bottom - 0.1, [sr.right + 0.25], { w: 0.15, alpha: 0.7, dens: 3 });
      kf(at(1), [-edgeX], { w: 0.3, alpha: 0.6, dens: 3 });
    } else if (type === 'trail') {
      kf(at(0.02), [-edgeX], { w: 0.28, alpha: 0.6, purple: 0.3, dens: 3 });
      kf(at(0.98), [-edgeX], { w: 0.28, alpha: 0.6, purple: 0.3, dens: 3 });
    } else if (type === 'orbit') {
      const svg = sec.querySelector('.tb2') || sec.querySelector('.tb-stage');
      orbit = visible(svg) ? docRect(svg) : null;
      // the stream parts around the orbit stage instead of running through it
      const lanes = orbit ? [orbit.left - 0.35, orbit.right + 0.3] : [0];
      kf(at(0.04), lanes, { w: 0.22, alpha: 0.5, dens: 1.6 });
      kf(at(0.96), lanes, { w: 0.22, alpha: 0.5, dens: 1.6 });
    } else if (type === 'split') {
      const heads = [...sec.querySelectorAll('.ts-colhead')].filter(visible).map(docRect);
      const lanes = heads.length === 2 ? [heads[0].left - 0.25, heads[1].right + 0.25] : [edgeX];
      kf(at(0.1), [0], { w: 0.8, alpha: 0.5, dens: 3 });
      kf(at(0.35), lanes, { w: 0.2, alpha: 0.55, dens: 3 });
      kf(at(0.95), lanes, { w: 0.2, alpha: 0.55, dens: 3 });
    } else if (type === 'flow') {
      // a broad, meandering current that fills the section edge to edge, so the network never breaks
      kf(at(0.02), [-halfW * 0.5, halfW * 0.5], { w: 1.8, alpha: 0.55, purple: 0.15, dens: 2.2 });
      kf(at(0.35), [-halfW * 0.15, halfW * 0.65], { w: 2.6, alpha: 0.5, purple: 0.2, dens: 2 });
      kf(at(0.7), [-halfW * 0.6, halfW * 0.2], { w: 2.6, alpha: 0.5, purple: 0.2, dens: 2 });
      kf(at(0.98), [-halfW * 0.5, halfW * 0.5], { w: 1.8, alpha: 0.55, purple: 0.15, dens: 2.2 });
    } else if (type === 'calm') {
      kf(at(0.02), [edgeX], { w: 0.22, alpha: 0.5, dens: 2 });
      kf(at(0.98), [edgeX], { w: 0.22, alpha: 0.5, dens: 2 });
    } else if (type === 'doors') {
      const doors = [...sec.querySelectorAll('.door .btn')].filter(visible).map(docRect);
      kf(at(0.05), [0], { w: 0.4, alpha: 0.6, dens: 4 });
      if (doors.length) kf(doors[0].y, doors.map(d => d.x), { w: 0.14, alpha: 0.8, purple: 0.5, dens: 5 });
      kf(at(1), [0], { w: 0.5, alpha: 0.6, dens: 4 });
      [...sec.querySelectorAll('.door')].filter(visible).forEach(d => {
        const b = docRect(d.querySelector('.btn'));
        magnets.doors.push({ side: d.classList.contains('door-co') ? 'company' : 'student', x: b.right + 0.32, y: b.y, top: r.top, bottom: r.bottom });
      });
    } else if (type === 'converge') {
      const core = sec.querySelector('.close-cta') || sec.querySelector('.vnet-core') || sec.querySelector('.bm-core');
      const c = visible(core) ? docRect(core) : { x: 0, y: at(0.7) };
      kf(at(0.02), [0], { w: 0.9, alpha: 0.6, dens: 4 });
      kf(c.y, [c.x], { w: 0.02, alpha: 0.9, purple: 0.9, dens: 6 });
    }
  }
  K.sort((a, b) => b.y - a.y);

  /* the stream: particles spread between keyframes in proportion to their density,
     pushed out of any glass panel they land in */
  const scale = small ? 0.4 : 0.6;     // a light stream: the people carry the meaning, not the particle count
  for (let k = 0; k < K.length - 1; k++) {
    const a = K[k], b = K[k + 1];
    const len = a.y - b.y;
    if (len <= 0 || (a.dens === 0 && b.dens === 0)) continue;
    const n = Math.round(len * (a.dens + b.dens) * 0.5 * 1.45 * scale);   // sparse: every node has room around it
    for (let i = 0; i < n; i++) {
      const t = rand();
      const s = t * t * (3 - 2 * t);
      let y = a.y - len * t;
      const ru = rand();
      const xa = a.lanes[Math.min(a.lanes.length - 1, Math.floor(ru * a.lanes.length))];
      const xb = b.lanes[Math.min(b.lanes.length - 1, Math.floor(ru * b.lanes.length))];
      const w = a.w + (b.w - a.w) * s;
      let x = xa + (xb - xa) * s + gauss() * 0.55 * w;
      // behind words and cards the stream stays, but turns translucent so reading comes first
      const veil = inside(x, y) ? 0.32 : 1;
      add({
        x, y,
        z: gauss() * 0.5 * (a.z + (b.z - a.z) * s),
        size: 0.028 + Math.pow(rand(), 3) * 0.13,
        alpha: (a.alpha + (b.alpha - a.alpha) * s) * (0.75 + rand() * 0.25) * veil,
        purple: a.purple + (b.purple - a.purple) * s
      });
    }
  }

  /* people are everywhere: a small face, sized as a node */
  const faceSize = small ? 0.07 : 0.075;
  let nextFace = 11;
  const face = (x, y, z, size = faceSize, purple = 0) => {
    nextFace = (nextFace + 53) % FACES;
    return add({ x, y, z, size, alpha: 1, purple: 0, kind: KIND.face, photo: nextFace, purple });
  };

  /* the network section: one dot in a crowd -> someone notices -> capsules -> a thread */
  if (crowd) {
    const h = crowd.top - crowd.bottom;
    const zone = f => crowd.top - h * f;
    const width = halfW * (small ? 0.95 : 0.85);
    const nCrowd = Math.round((small ? 200 : 420));
    const yous = [];
    const youX = small ? halfW * 0.25 : halfW * 0.35;
    for (let y = zone(0.04); y > zone(0.5); y -= 7.5) yous.push(add({ x: youX + gauss() * 0.4, y, z: 0.5, size: 0.085, alpha: 1, purple: 1, kind: KIND.beacon }));
    const near = (x, y) => yous.reduce((m, i) => Math.min(m, Math.hypot(P[i].x - x, P[i].y - y)), 99);
    // A + B: the crowd, lit around each "you" once they ship something; real people in it
    for (let i = 0; i < nCrowd; i++) {
      const f = rand() * 0.52;
      const y = zone(f), x = gauss() * width * 0.45;
      const lit = f > 0.25 ? Math.exp(-near(x, y) * 0.55) : 0;
      // a third of the crowd shows a face: it's people, not particles
      if (rand() < 0.34) face(x, y, gauss() * 1.2, faceSize, lit);
      else add({ x, y, z: gauss() * 1.4, size: 0.03 + Math.pow(rand(), 3) * 0.1, alpha: 0.9, purple: 0.04 + lit * 0.96 });
    }
    // C: capsules of 4 to 8, each inside a faint glass ring, a real face at the heart of most
    const cols = small ? 3 : 6, rows = 5;
    const c0 = zone(0.55), c1 = zone(0.76);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = -width * 0.62 + (col + 0.5) * (width * 1.24 / cols) + (rand() - 0.5) * 0.5;
        const cy = c0 - (row + 0.5) * ((c0 - c1) / rows) + (rand() - 0.5) * 0.6;
        const cz = gauss() * 1.2;
        const m = 4 + Math.floor(rand() * 5);
        const R = (0.3 + m * 0.035) * (small ? 0.55 : 1);
        const g = [];
        // a capsule is a loose knot of people around the work: no ring, no polygon
        for (let j = 0; j < m; j++) {
          const a = rand() * 6.2832, r = R * (0.25 + Math.sqrt(rand()) * 0.85);
          g.push(face(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, cz + (rand() - 0.5) * 0.4, small ? 0.06 : 0.07, 0.6));
        }
        groups.push(g);
        magnets.capsules.push({ x: cx, y: cy, z: cz, r: R });
        if (labels.length < (small ? 8 : TRACKS.length) && (row + col) % 2 === 0) labels.push({ x: cx, y: cy + R + 0.32, z: cz, text: TRACKS[labels.length] });
      }
    }
    // D: capsules don't interview, they show their work: everything braids into one bright thread
    const threadX = halfW * 0.35;
    magnets.thread = { x: threadX, top: zone(0.78), bottom: zone(1) };
    for (let i = 0; i < (small ? 160 : 300); i++) {
      const f = 0.78 + rand() * 0.22;
      const t = (f - 0.78) / 0.22;
      const spread = (1 - t) * (1 - t);
      add({ x: threadX + gauss() * width * 0.4 * spread + Math.sin(t * 9 + rand()) * 0.08, y: zone(f), z: gauss() * 1.6 * spread, size: 0.034 + rand() * 0.016, alpha: 1, purple: 0.35 + t * 0.65 });
    }
  }

  /* proof: a bright beacon above every number */
  beacons.forEach(b => { b.i = add({ x: b.x, y: b.y, z: 0.4, size: 0.14, alpha: 1, purple: 1, kind: KIND.beacon }); });

  /* the 3-body section draws its own orbits; the stream only passes through */

  /* edges: each node links down the stream to its nearest neighbours (pulses flow downward),
     capsules close their own loops, nothing reaches far, and no link crosses a glass panel */
  const N = P.length;
  const order = [...Array(N).keys()].filter(i => P[i].free && P[i].kind !== KIND.ring).sort((a, b) => P[b].y - P[a].y);
  const E = [];
  const maxD = small ? 1.3 : 1.15;
  for (let oi = 0; oi < order.length; oi++) {
    const i = order[oi];
    const best = [];
    for (let oj = oi + 1; oj < Math.min(order.length, oi + 60); oj++) {
      const j = order[oj];
      const dy = P[i].y - P[j].y;
      if (dy > maxD) break;
      const reach = maxD;
      const d = Math.hypot(P[i].x - P[j].x, dy, (P[i].z - P[j].z) * 0.6);
      if (d < reach) best.push([d, j]);
    }
    best.sort((a, b) => a[0] - b[0]);
    best.slice(0, 2).forEach(([, j]) => E.push([i, j, 0]));
  }
  // inside a capsule, each person links to the nearest teammate already placed: a small, uneven
  // web, the way real teams connect, rather than a closed ring
  groups.forEach(g => g.forEach((i, k) => {
    let best = -1, bd = Infinity;
    for (let q = 0; q < k; q++) { const j = g[q], d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y); if (d < bd) { bd = d; best = j; } }
    if (best >= 0) E.push([i, best, 1]);
  }));

  // a y-sorted index of every free node, so the visitor can find its neighbours quickly
  const byY = order.slice().sort((a, b) => P[a].y - P[b].y);
  return { P, E, K, ppu, labels, magnets, byY, reserved };
}

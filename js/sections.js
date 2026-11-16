/* Section motion: headings, the ticker, the carousels, the chart, reveals and the
   announcement. Every element already exists and is readable in the HTML; this only adds
   motion and interaction on top, and does nothing under reduced motion beyond final states. */
import { gsap, hasGsap, reduce, D, E, isPaused, scrollVelocity, lenis } from '/js/motion.js?v=a2d8108bd7';
import { onAudience } from '/js/ui.js?v=ea9c9e7efe';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- headings: lines rise out of a clip, words staggered ---------- */
function headings() {
  // our own word split: every word in a span, every space kept as a real space, so headings
  // read correctly on both sides, even the side that is hidden while the page builds
  const wrap = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else { const w = document.createElement('span'); w.className = 'hw'; w.textContent = part; frag.appendChild(w); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('hw')) wrap(n);
    });
  };
  $$('[data-split]').forEach(el => {
    if (el.closest('.hero')) return;
    wrap(el);
    const play = () => {
      const words = $$('.hw', el).filter(w => w.offsetParent);
      gsap.fromTo(words, { y: '0.45em', autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: D.base, ease: E.out, stagger: 0.035, overwrite: true });
    };
    $$('.hw', el).forEach(w => gsap.set(w, { autoAlpha: 0 }));
    let seen = false;
    window.ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => { seen = true; play(); } });
    onAudience(() => { if (seen) gsap.set($$('.hw', el), { y: 0, autoAlpha: 1 }); });
  });
}

/* ---------- ticker: a slow drift that scrolling speeds up ---------- */
/* ---------- reveal: blocks settle in once, as they arrive ---------- */
function reveal() {
  if (reduce) return;
  const groups = ['.proof-copy > *', '.bx', '.tb-list li', '.sx-step'];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const t = e.target; t.classList.add('in'); io.unobserve(t); setTimeout(() => { delete t.dataset.reveal; t.classList.remove('in'); }, 1400); } }), { rootMargin: '0px 0px -8% 0px' });
  groups.forEach(sel => $$(sel).forEach((el, i) => { el.dataset.reveal = ''; el.style.setProperty('--i', i % 6); io.observe(el); }));
}

function chart() {
  const el = $('.dots-fig');
  if (!el) return;
  $$('.dr-dots', el).forEach(r => $$('i', r).forEach((d, k) => d.style.setProperty('--k', k)));
  if (reduce) { el.classList.add('grown'); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { el.classList.add('grown'); io.disconnect(); } }), { threshold: 0.35 });
  io.observe(el);
}

/* ---------- section 2: small working interfaces, each true to what its card says ---------- */
function visuals() {
  // metrics: a live-feeling dashboard that cycles through the metrics one at a time
  $$('[data-metrics]').forEach(box => {
    const items = $$('.mt-list li', box), n = $('[data-mt-n]', box);
    let k = 0;
    const show = () => { items.forEach((li, i) => li.classList.toggle('on', i === k)); if (n) n.textContent = `${String(k + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`; };
    show();
    if (!reduce) setInterval(() => { if (!isPaused() && box.offsetParent) { k = (k + 1) % items.length; show(); } }, 2200);
  });
  // the shortlist reorders itself, as if scores were coming in
  $$('[data-pool]').forEach(list => {
    if (reduce) return;
    setInterval(() => { if (isPaused() || !list.offsetParent) return; const first = list.firstElementChild; first.classList.add('out'); setTimeout(() => { first.classList.remove('out'); list.appendChild(first); }, 500); }, 2600);
  });
  // the three ways in take turns
  $$('[data-modes]').forEach(list => {
    const li = $$('li', list); let k = 0;
    li[0].classList.add('on');
    if (!reduce) setInterval(() => { if (isPaused()) return; li[k].classList.remove('on'); k = (k + 1) % li.length; li[k].classList.add('on'); }, 2400);
  });
  // the academy day: the clock runs from 09:00 to 16:00 and the 'now' line follows it
  $$('.day').forEach(day => {
    const clockEl = $('[data-day-clock]', day), rows = $$('.day-list li', day);
    const starts = [9, 9.5, 12.5, 14, 16];
    let t = 9;
    const tick = () => {
      t += 0.12; if (t > 16.6) t = 9;
      const h = Math.floor(t), m = Math.floor((t - h) * 60);
      clockEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      let cur = 0; starts.forEach((s0, i) => { if (t >= s0) cur = i; });
      rows.forEach((r, i) => { r.classList.toggle('on', i === cur); r.classList.toggle('done', i < cur); });
      day.style.setProperty('--now', ((t - 9) / 7.6).toFixed(3));
    };
    tick();
    if (!reduce) setInterval(() => { if (!isPaused() && day.offsetParent) tick(); }, 140);
  });
  // a sprint countdown that actually counts
  $$('[data-countdown]').forEach(el => {
    let left = 71 * 3600 + 59 * 60 + 42;
    if (reduce) return;
    setInterval(() => { left = left > 0 ? left - 1 : 72 * 3600; const h = Math.floor(left / 3600), m = Math.floor(left / 60) % 60, s0 = left % 60; el.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s0).padStart(2, '0')}`; }, 1000);
  });
  $$('.months i').forEach((m, k) => m.style.setProperty('--k', k));
  // everything wakes once, when it comes into view
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.bx, .pw, .pw3, .tr, .dots-fig').forEach(el => io.observe(el));
  if (reduce) $$('.bx, .pw, .pw3, .tr').forEach(el => el.classList.add('seen'));
}

/* ---------- the three-body problem, side by side. Left: three equal bodies under mutual
   gravity, a genuinely chaotic system; paths tangle, nobody settles, each pulled by what it
   needs. Right: the same three around AntBox, on stable Kepler orbits (periods follow a^1.5,
   faster near the centre), seen in perspective. Each panel runs only while on screen. ---------- */
/* ---------- the explainer, driven by scroll: on wide screens the three cards hold still while
   you scroll, and each step lights in turn; the marker on the rail follows the scroll exactly.
   On phones the steps stack and each plays as it reaches the middle of the screen. ---------- */
/* ---------- a week at AntBox: the screen stays, the story scrolls past it. Each chapter
   that reaches the middle of the screen takes over the screen. On phones every chapter carries
   its own copy of its screen. ---------- */
function story() {
  $$('[data-story]').forEach(st => {
    const chs = $$('.st-ch', st), panes = $$('.st-pane', st), title = $('[data-st-title]', st), dots = $$('.st-dots i', st);
    chs.forEach((c, i) => { const cl = panes[i].cloneNode(true); cl.classList.add('st-inline', 'on'); cl.removeAttribute('data-i'); c.appendChild(cl); });
    let cur = -1;
    const set = i => {
      if (i === cur) return; cur = i;
      chs.forEach((c, j) => c.classList.toggle('on', j === i));
      panes.forEach((p0, j) => p0.classList.toggle('on', j === i));
      dots.forEach((d, j) => d.classList.toggle('on', j <= i));
      if (title) title.textContent = panes[i].dataset.title;
    };
    set(0);
    if (reduce) return;
    chs.forEach((c, i) => new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(i); }), { rootMargin: '-45% 0px -45% 0px' }).observe(c));
  });
}

/* ---------- the product demos (Proof of Work profile, capsule dashboard): one small app shell.
   The sidebar and the tabs switch views, a row opens on the right, chips filter, Share copies
   a link. Until someone touches it, it walks through the rows on its own. ---------- */
function axApps() {
  $$('[data-ax]').forEach(app => {
    const crumb = $('[data-ax-crumb]', app), toast = $('[data-ax-toast]', app);
    let held = false, seen = false;
    const hold = () => { held = true; app.classList.add('live'); };
    ['pointerdown', 'keydown'].forEach(ev => app.addEventListener(ev, hold));
    const view = () => $('.ax-v.on', app);
    const open = (v, i) => {
      $$('[data-ax-item]', v).forEach(r => r.classList.toggle('on', +r.dataset.i === i));
      $$('[data-ax-pv]', v).forEach(p => p.classList.toggle('on', +p.dataset.i === i));
    };
    $$('[data-ax-item]', app).forEach(r => r.addEventListener('click', () => open(r.closest('.ax-v'), +r.dataset.i)));
    $$('[data-ax-tab]', app).forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.axTab;
      $$('[data-ax-tab]', app).forEach(x => x.classList.toggle('on', x.dataset.axTab === t));
      $$('[data-ax-v]', app).forEach(v => v.classList.toggle('on', v.dataset.axV === t));
      if (crumb) crumb.textContent = b.textContent.replace(/\d+$/, '').trim();
    }));
    $$('[data-ax-f]', app).forEach(b => b.addEventListener('click', () => {
      const v = b.closest('.ax-v'), f = b.dataset.axF;
      $$('[data-ax-f]', v).forEach(x => x.classList.toggle('on', x === b));
      let first = -1, n = 0;
      $$('[data-from]', v).forEach(r => { const ok = f === 'All' || r.dataset.from === f; r.hidden = !ok; if (ok) { n++; if (first < 0 && r.dataset.i) first = +r.dataset.i; } });
      const c = $('[data-ax-n]', v); if (c) c.textContent = n;
      if (first >= 0) open(v, first);
    }));
    const share = $('[data-ax-share]', app);
    if (share) share.addEventListener('click', () => {
      try { navigator.clipboard && navigator.clipboard.writeText(location.href.split('#')[0] + '#proof'); } catch (e) {}
      toast.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('show'), 2400);
    });
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: 0.4 }).observe(app);
    if (reduce) return;
    // on phones the panes stack, so walking them would move the page under your thumb
    const wide = matchMedia('(min-width: 861px)');
    setInterval(() => {
      if (held || !seen || isPaused() || !wide.matches) return;
      const v = view(), rows = $$('[data-ax-item]', v).filter(r => !r.hidden);
      if (!rows.length) return;
      const k = rows.findIndex(r => r.classList.contains('on'));
      open(v, +rows[(k + 1) % rows.length].dataset.i);
    }, 3600);
  });
}

/* ---------- the people: a wall of real faces. One person at a time steps forward into the
   big card, with their words; everyone else floats around them as nodes, linked to their
   nearest neighbours. Built from the voices data, so adding a person is one line of JSON. ---------- */
/* ---------- five steps: the list on the left, one big screen on the right. The section
   holds still while you scroll through it; each step fills its bar, then hands the screen
   to the next. On small screens every step carries its own screen, stacked. ---------- */
function steps() {
  const wide = matchMedia('(min-width: 960px)');
  $$('[data-steps]').forEach(st => {
    const items = $$('.stp-i', st), panes = $$('.stp-pane', st), title = $('[data-stp-title]', st), num = $('[data-stp-n]', st);
    const copies = $$('.stg-c', st), floats = $$('.stg-fl', st);
    // on small screens each step carries its own screen, under its own words
    items.forEach((it, i) => { const c = panes[i].cloneNode(true); c.classList.add('stp-inline', 'on'); c.removeAttribute('data-i'); (copies[i] || it).appendChild(c); });
    let cur = -1, trig = null;
    const set = (i, f = 0) => {
      items.forEach((it, j) => { it.classList.toggle('on', j === i); it.classList.toggle('done', j < i); it.style.setProperty('--f', j < i ? 1 : j === i ? f.toFixed(3) : 0); });
      if (i === cur) return;
      cur = i;
      panes.forEach((p0, j) => p0.classList.toggle('on', j === i));
      copies.forEach((c, j) => c.classList.toggle('on', j === i));
      floats.forEach((f, j) => f.classList.toggle('on', j === i));
      st.style.setProperty('--si', i);
      if (title) title.textContent = panes[i].dataset.title;
      const big = $('[data-stp-big]', st); if (big) big.textContent = String(i + 1).padStart(2, '0');
      if (num) num.textContent = `${i + 1} / ${panes.length}`;
    };
    set(0);
    items.forEach((it, i) => $('.stp-btn', it).addEventListener('click', () => {
      if (trig && wide.matches) {
        const y = trig.start + (trig.end - trig.start) * (i + 0.35) / items.length;
        if (lenis) lenis.scrollTo(y, { duration: 0.9 }); else scrollTo({ top: y, behavior: 'smooth' });
      } else set(i, 1);
    }));
    if (!reduce && window.ScrollTrigger) {
      trig = window.ScrollTrigger.create({
        trigger: st, start: 'top 12%', end: 'bottom 88%',
        onUpdate: s0 => { if (!wide.matches) return; const x = Math.min(items.length - 0.001, s0.progress * items.length); const i = Math.floor(x); set(i, x - i); }
      });
    }
  });
}

/* ---------- the Proof of Work profile: new work keeps arriving at the top ---------- */
function proofProfile() {
  $$('[data-pw-new]').forEach(box => {
    const cards = $$('.pw-card', box);
    let k = -1, seen = false;
    const next = () => { k = (k + 1) % cards.length; cards.forEach((c, j) => { c.classList.toggle('on', j === k); c.classList.toggle('out', j === (k + cards.length - 1) % cards.length); }); };
    next();
    if (reduce) return;
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(box);
    setInterval(() => { if (seen && !isPaused()) next(); }, 3800);
  });
  // numbers count up the first time they are seen
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count;
    if (reduce || !to) return;
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = now => { const t = Math.min(1, (now - t0) / 1200); el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3))).toLocaleString('en-IN'); if (t < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
  });
}

/* ---------- your path: one horizontal road across the section, four stops on it. As you
   scroll, your avatar drives along it and each level unlocks. On phones the road turns
   vertical and runs down the left edge. ---------- */
function pathMap() {
  const map = $('[data-hpath]');
  if (!map) return;
  const svg = $('.hp-svg', map), road = $('.hp-road', svg), dash = $('.hp-dash', svg), done = $('.hp-done', svg), you = $('.hp-you', map);
  const lvlLabel = $('[data-hp-level]'), xp = $('.hp-xp-bar i');
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.appendChild(probe); probe.style.display = 'none';
  let lvls = [], len = 1, at = [], p = 0;
  const layout = () => {
    lvls = $$('.hp-lv', map).filter(l => l.offsetParent).flatMap(l => $$('.hl', l));
    if (!lvls.length) return;
    const r = map.getBoundingClientRect(), W = r.width, H = r.height;
    const stops = lvls.map(lv => { const b = $('.hl-stop', lv).getBoundingClientRect(); return [b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top]; });
    const vertical = W < 760;
    const pts = vertical ? [[stops[0][0], 0], ...stops, [stops[0][0], H]] : [[0, stops[0][1]], ...stops, [W, stops[stops.length - 1][1]]];
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    at = [];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      d += vertical
        ? ` C${(x0 + (i % 2 ? 18 : -18)).toFixed(1)} ${(y0 + (y1 - y0) * 0.5).toFixed(1)} ${(x1 - (i % 2 ? 18 : -18)).toFixed(1)} ${(y1 - (y1 - y0) * 0.5).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
        : ` C${(x0 + (x1 - x0) * 0.5).toFixed(1)} ${y0.toFixed(1)} ${(x1 - (x1 - x0) * 0.5).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      if (i < pts.length - 1) { probe.setAttribute('d', d); at.push(probe.getTotalLength()); }
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    [road, dash, done].forEach(el => el.setAttribute('d', d));
    len = road.getTotalLength();
    done.style.strokeDasharray = `${len} ${len}`;
    draw();
  };
  const draw = () => {
    const L = p * len;
    done.style.strokeDashoffset = (len - L).toFixed(1);
    const q = road.getPointAtLength(L);
    you.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
    let n = 0;
    lvls.forEach((lv, i) => { const on = L >= at[i] - 6; lv.classList.toggle('on', on); if (on) n = i + 1; });
    if (lvlLabel) lvlLabel.textContent = `${document.documentElement.dataset.aud === 'company' ? 'Stop' : 'Level'} ${Math.max(1, n)}`;
    if (xp) xp.style.transform = `scaleX(${(n / Math.max(1, lvls.length)).toFixed(3)})`;
  };
  layout();
  addEventListener('resize', layout);
  onAudience(() => requestAnimationFrame(layout));
  if (document.fonts) document.fonts.ready.then(layout);
  if (reduce || !window.ScrollTrigger) { p = 1; draw(); return; }
  window.ScrollTrigger.create({ trigger: map, start: 'top 75%', end: 'bottom 45%', onUpdate: s0 => { p = s0.progress; draw(); }, onRefresh: layout });
}

/* ---------- the closing: the people as a network. Each face is a node, linked to its
   nearest neighbours; one at a time a person pops out as a full card with their words.
   Hover, focus or tap anyone to choose them. ---------- */
function peopleNet() {
  const net = $('[data-pnet]');
  if (!net) return;
  const nodes = $$('.pn-node', net), cards = $$('.pn-card', net), svg = $('.pnet-lines', net);
  let k = 0, hold = false, P = [], edges = [];
  const place = () => {
    const r = net.getBoundingClientRect(), W = r.width, phone = W < 700;
    const H = phone ? r.height - $('.pnet-cards', net).offsetHeight : r.height;
    let seed = 9;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const n = nodes.length;
    P = nodes.map((_, i) => ({ x: (0.06 + rnd() * 0.88) * W, y: (0.1 + rnd() * 0.8) * H, s: [1.18, 0.96, 0.82][i % 3] }));
    // spread them out: nodes push apart until each has room
    const minD = Math.sqrt((W * H) / n) * 0.8;
    for (let it = 0; it < 160; it++) for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1;
      if (dd < minD) { const m = ((minD - dd) / dd) * 0.5; a.x -= dx * m; a.y -= dy * m; b.x += dx * m; b.y += dy * m; }
      [a, b].forEach(q => { q.x = Math.max(W * 0.06, Math.min(W * 0.94, q.x)); q.y = Math.max(H * 0.1, Math.min(H * 0.9, q.y)); });
    }
    // each node links to its two nearest neighbours: a network, not a ring
    const seen0 = new Set();
    edges = [];
    P.forEach((a, i) => P.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, 2).forEach(([j]) => {
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (!seen0.has(key)) { seen0.add(key); edges.push([Math.min(i, j), Math.max(i, j)]); }
    }));
    nodes.forEach((nd, i) => { nd.style.left = `${P[i].x.toFixed(1)}px`; nd.style.top = `${P[i].y.toFixed(1)}px`; nd.style.setProperty('--s', P[i].s); nd.style.setProperty('--fl', `${((i * 0.73) % 4).toFixed(2)}s`); });
    svg.setAttribute('viewBox', `0 0 ${W} ${r.height}`);
    svg.innerHTML = edges.map(([a, b]) => `<line x1="${P[a].x.toFixed(1)}" y1="${P[a].y.toFixed(1)}" x2="${P[b].x.toFixed(1)}" y2="${P[b].y.toFixed(1)}" data-a="${a}" data-b="${b}"/>`).join('');
    show(k);
  };
  const show = i => {
    k = i;
    const near = new Set(edges.filter(e => e.includes(i)).flat());
    nodes.forEach((nd, j) => { nd.classList.toggle('on', j === i); nd.classList.toggle('near', j !== i && near.has(j)); });
    $$('line', svg).forEach(l => l.classList.toggle('on', +l.dataset.a === i || +l.dataset.b === i));
    const r = net.getBoundingClientRect(), c = cards[i], p0 = P[i];
    cards.forEach((c0, j) => c0.classList.toggle('on', j === i));
    if (!p0 || r.width < 700) return;
    // the card opens beside the person, on whichever side has room
    const cw = c.offsetWidth, ch = c.offsetHeight, right = p0.x < r.width / 2, gap = 56 * p0.s;
    const x = right ? p0.x + gap : p0.x - gap - cw;
    const y = Math.max(0, Math.min(r.height - ch, p0.y - ch / 2));
    c.style.left = `${Math.max(0, Math.min(r.width - cw, x)).toFixed(1)}px`; c.style.top = `${y.toFixed(1)}px`;
    c.classList.toggle('from-left', !right);
  };
  nodes.forEach((nd, i) => {
    nd.addEventListener('pointerenter', () => { hold = true; show(i); });
    nd.addEventListener('pointerleave', () => { hold = false; });
    nd.addEventListener('focus', () => { hold = true; show(i); });
    nd.addEventListener('blur', () => { hold = false; });
    nd.addEventListener('click', () => show(i));
  });
  place();
  addEventListener('resize', place);
  if (!reduce) setInterval(() => { if (!hold && !isPaused() && net.offsetParent) show((k + 1) % nodes.length); }, 4200);
}

/* ---------- scenes: small product demos. Each step adds a class (s1, s2...) that the CSS
   turns into a state; a step can move the cursor to an element, press it, or drag an element
   along with it. A scene plays only while it is on screen and its card or screen is the
   active one, loops with a pause, and under reduced motion shows its final state. ---------- */
function scenes() {
  const list = $$('[data-scene]');
  list.forEach(sc => {
    const steps = JSON.parse(sc.dataset.scene || '[]');
    const cur = $(':scope > .cur', sc);
    let k = 0, timer = 0, on = false;
    const at = sel => {
      const el = $(sel, sc);
      if (!el) return null;
      const a = sc.getBoundingClientRect(), b = el.getBoundingClientRect();
      return [b.left - a.left + b.width * 0.5, b.top - a.top + b.height * 0.55];
    };
    const home = () => { const a = sc.getBoundingClientRect(); return [a.width * 0.86, a.height * 0.94]; };
    const move = p0 => { if (cur && p0) cur.style.transform = `translate(${p0[0].toFixed(1)}px, ${p0[1].toFixed(1)}px)`; };
    const reset = () => {
      sc.classList.add('rs');
      steps.forEach((_, i) => sc.classList.remove('s' + (i + 1)));
      $$('[data-dragged]', sc).forEach(e => { e.style.transform = ''; e.removeAttribute('data-dragged'); });
      move(home());
      void sc.offsetWidth;
      sc.classList.remove('rs');
      k = 0;
    };
    const run = () => {
      if (!on) return;
      if (k >= steps.length) { timer = setTimeout(() => { reset(); timer = setTimeout(run, 700); }, 2400); return; }
      const st = steps[k];
      k++;
      sc.classList.add('s' + k);
      if (st.go) {
        const to = at(st.go);
        if (st.drag) {
          const el = $(st.drag, sc), from = at(st.drag);
          if (el && from && to) { el.dataset.dragged = '1'; el.style.transform = `translate(${(to[0] - from[0]).toFixed(1)}px, ${(to[1] - from[1]).toFixed(1)}px) rotate(-1.5deg)`; }
        }
        move(to);
      }
      if (st.click && cur) { cur.classList.remove('tap'); void cur.offsetWidth; cur.classList.add('tap'); }
      timer = setTimeout(run, st.t || 900);
    };
    const finish = () => { steps.forEach((_, i) => sc.classList.add('s' + (i + 1))); if (cur) cur.style.opacity = '0'; };
    sc._set = v => {
      if (v === on) return;
      on = v;
      clearTimeout(timer);
      if (on) { if (cur) cur.style.opacity = ''; reset(); timer = setTimeout(run, 450); }
      else finish();
    };
    finish();
    if (reduce) steps.forEach((_, i) => sc.classList.add('s' + (i + 1)));
  });
  if (reduce) return;
  const vis = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))), { threshold: 0.3 });
  list.forEach(sc => io.observe(sc));
  const active = sc => {
    const a = sc.closest('.sx-step'), b = sc.closest('.stp-pane, .st-pane');
    return !!sc.offsetParent && sc.dataset.hold !== '1' && (!a || a.classList.contains('on')) && (!b || b.classList.contains('on'));
  };
  setInterval(() => list.forEach(sc => sc._set(vis.has(sc) && !isPaused() && active(sc))), 250);
}

/* ---------- the Proof of Work app: a sample profile you can actually use. Tabs and the
   sidebar switch views, sources and filters narrow the work, search finds it, any piece of
   work opens in a drawer, bars show their week, and Share copies a link. The moment someone
   touches it, the automatic demo stops and the cursor leaves. ---------- */
function pwApp() {
  const app = $('[data-pw]');
  if (!app) return;
  const data = JSON.parse(($('#pw-work') || {}).textContent || '[]');
  const views = $$('[data-view-panel]', app), crumb = $('[data-crumb]', app), list = $('[data-pw-list]', app);
  const drawer = $('[data-pw-drawer]', app), toast = $('[data-pw-toast]', app), tip = $('[data-pw-tip]', app), search = $('[data-pw-search]', app);
  const hold = () => {
    if (app.dataset.hold === '1') return;
    app.dataset.hold = '1';
    app._set && app._set(false);
    for (let i = 1; i < 10; i++) app.classList.remove('s' + i);
    app.classList.add('live');
  };
  ['pointerdown', 'keydown', 'focusin'].forEach(ev => app.addEventListener(ev, hold));
  app.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold(); });
  const show = v => {
    views.forEach(p => p.classList.toggle('on', p.dataset.viewPanel === v));
    $$('[data-view]', app).forEach(b => { if (b.closest('.pw3-side, .pw3-tabs')) b.classList.toggle('on', b.dataset.view === v); });
    if (crumb) crumb.textContent = v[0].toUpperCase() + v.slice(1);
    drawer.hidden = true;
  };
  // every view keeps the overview's height, so the page never jumps under the reader
  const main = $('.pw3-main', app);
  const lock = () => { main.style.minHeight = ''; const ov = $('[data-view-panel="overview"]', app); if (ov.classList.contains('on')) main.style.minHeight = `${main.offsetHeight}px`; };
  addEventListener('load', lock); addEventListener('resize', lock); if (document.fonts) document.fonts.ready.then(lock); setTimeout(lock, 1500);
  $$('[data-view]', app).forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
  $$('[data-go]', app).forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  // filter by source, from the chips or from "where your work comes from"
  let filter = 'All', q = '';
  const apply = () => {
    let n = 0;
    $$('.pw4-card', list).forEach(c => {
      const d = data[+c.dataset.i] || {};
      const ok = (filter === 'All' || c.dataset.from === filter) && (!q || (d.title + ' ' + d.sub + ' ' + d.src).toLowerCase().includes(q));
      c.hidden = !ok; if (ok) n++;
    });
    $('.pw4-empty', list).hidden = n > 0;
    $$('.pw4-filters button', app).forEach(b => b.classList.toggle('on', b.dataset.filter === filter));
  };
  $$('[data-filter]', app).forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; apply(); show('work'); }));
  if (search) search.addEventListener('input', () => { q = search.value.trim().toLowerCase(); filter = 'All'; apply(); show('work'); });
  // open a piece of work
  $$('.pw4-card', app).forEach(c => c.addEventListener('click', () => {
    const d = data[+c.dataset.i];
    if (!d) return;
    $$('[data-d]', drawer).forEach(el => { const k = el.dataset.d; el.textContent = k === 'score' ? `${d.score} / 100` : k === 'sub' ? `${d.sub} · ${d.week}` : d[k]; });
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('on'));
  }));
  $('[data-pw-close]', app).addEventListener('click', () => { drawer.classList.remove('on'); drawer.hidden = true; });
  // the chart: hover or focus a week
  $$('[data-pw-bars] i', app).forEach(b => {
    const on = () => { tip.textContent = b.dataset.tip; app.classList.add('tip-on'); $$('[data-pw-bars] i', app).forEach(x => x.classList.toggle('hot', x === b)); };
    b.addEventListener('pointerenter', on); b.addEventListener('focus', on);
  });
  $('[data-pw-bars]', app).addEventListener('pointerleave', () => app.classList.remove('tip-on'));
  // share: copies the page link (a real profile would have its own)
  $('[data-pw-share]', app).addEventListener('click', () => {
    try { navigator.clipboard && navigator.clipboard.writeText(location.href.split('#')[0] + '#proof'); } catch (e) {}
    toast.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove('show'), 2400);
  });
}

/* ---------- live feeds: the Proof of Work list keeps taking new work; counters tick ---------- */
function feeds() {
  $$('[data-feed]').forEach(ul => {
    if (reduce) return;
    setInterval(() => {
      if (isPaused() || !ul.offsetParent) return;
      const last = ul.lastElementChild;
      last.classList.add('in');
      ul.prepend(last);
      setTimeout(() => last.classList.remove('in'), 900);
    }, 2400);
  });
  $$('[data-tick]').forEach(el => {
    const [from, to] = el.dataset.tick.split(',').map(Number);
    if (reduce) return;
    let n = from;
    el.textContent = n;
    setInterval(() => { if (isPaused() || !el.offsetParent) return; n = n >= to ? from : n + 1; el.textContent = n; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }, 2400);
  });
}

/* ---------- the three-body problem, on one stage with a toggle. Without AntBox: three
   separate worlds, each reaching for the others and falling short. With AntBox: the same three
   glide in, settle on one shared orbit around AntBox, and every pair is joined with work
   flowing along the links. The stage eases between the two, so the change itself is the story.
   It alternates on its own until someone uses the toggle. ---------- */
function threeBody() {
  /* Without AntBox the three worlds drift apart with no centre; with AntBox they lock into one
     orbit around the core, lit by beams. CSS draws it; this only flips the state, on its own
     while it is on screen until someone picks a side. */
  const stage = $('[data-tb3]');
  if (!stage) return;
  const list = $('[data-tb-list]');
  let order = false, held = false, seen = false, since = 0;
  const set = (m, hold) => {
    order = m === 'order'; since = 0;
    if (hold) held = true;
    stage.classList.toggle('is-order', order);
    if (list) list.classList.toggle('is-order', order);
    $$('[data-tb3]', stage).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tb3 === m)));
  };
  $$('[data-tb3]', stage).forEach(b => { if (b.tagName === 'BUTTON') b.addEventListener('click', () => set(b.dataset.tb3, true)); });
  set('chaos');
  new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: 0.35 }).observe(stage);
  if (reduce) return;
  setInterval(() => {
    if (held || !seen || isPaused()) return;
    since += 0.5;
    if (since > (order ? 7 : 4.5)) set(order ? 'chaos' : 'order');
  }, 500);
}


/* ---------- a drawn path that glows: a gradient stroke, light flowing along the drawn part,
   and a comet tail of fading sparks behind the head. Used by the thread, the arc and the roads. */
let glowId = 0;
function glowPath(svg, base, fill, { tail = 9, color = 'p' } = {}) {
  const NS = 'http://www.w3.org/2000/svg', id = `gp${++glowId}`;
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = color === 'p'
    ? `<linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#8a3cb0"/><stop offset=".6" stop-color="#bb62de"/><stop offset="1" stop-color="#bb62de"/></linearGradient><mask id="${id}m" maskUnits="userSpaceOnUse"><path class="gp-mk" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/></mask>`
    : `<linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#1a1a1a" stop-opacity=".25"/><stop offset="1" stop-color="#1a1a1a" stop-opacity=".6"/></linearGradient><mask id="${id}m" maskUnits="userSpaceOnUse"><path class="gp-mk" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/></mask>`;
  svg.prepend(defs);
  fill.setAttribute('stroke', `url(#${id}g)`);
  const flow = document.createElementNS(NS, 'path');
  flow.setAttribute('class', 'gp-flow'); flow.setAttribute('mask', `url(#${id}m)`);
  fill.after(flow);
  const mk = defs.querySelector('.gp-mk');
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'gp-tail');
  for (let i = 0; i < tail; i++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', (3.4 * (1 - i / tail) + 0.6).toFixed(2)); c.setAttribute('opacity', (0.85 * Math.pow(1 - i / tail, 1.4)).toFixed(2)); g.appendChild(c); }
  svg.appendChild(g);
  let len = 0;
  return {
    layout(d) { flow.setAttribute('d', d); mk.setAttribute('d', d); len = base.getTotalLength(); mk.style.strokeDasharray = `${len} ${len}`; },
    update(L) {
      mk.style.strokeDashoffset = (len - L).toFixed(1);
      [...g.children].forEach((c, i) => { const q = base.getPointAtLength(Math.max(0, L - i * 9)); c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1)); c.style.display = L - i * 9 < 0 ? 'none' : ''; });
    }
  };
}

/* ---------- the explainer, held while you scroll: three separate cards. As you scroll, the
   first card comes forward, then the second, then the third ---------- */
function simple() {
  const wide = matchMedia('(min-width: 900px)');
  const pick = p => (p < 0.32 ? 0 : p < 0.66 ? 1 : 2);
  $$('[data-sx-list]').forEach(list => {
    const steps = $$('.sx-step', list), wrap = list.closest('.sx-wrap');
    let k = -1, p = 0;
    const show = i => {
      if (i === k) return; k = i;
      steps.forEach((s0, j) => { s0.classList.toggle('on', j === i); s0.classList.toggle('past', j < i); });
    };
    if (reduce) { steps.forEach(s0 => s0.classList.add('on')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (!wide.matches && e.isIntersecting) show(steps.indexOf(e.target)); }), { rootMargin: '-38% 0px -38% 0px' });
    steps.forEach(s0 => io.observe(s0));
    show(0);
    onAudience(() => requestAnimationFrame(() => { if (wide.matches && list.offsetParent) { k = -1; show(pick(p)); } }));
    if (!window.ScrollTrigger) return;
    const sec = list.closest('[data-sx-pin]') || wrap;
    window.ScrollTrigger.create({
      trigger: sec, start: 'top top', end: 'bottom bottom',
      onUpdate: t => { p = t.progress; if (!wide.matches || !list.offsetParent) return; show(pick(p)); }
    });
  });
}

/* ---------- five steps on an arc: a comet walks the arch as you scroll; each step it reaches
   lights up and opens in the middle of the arch ---------- */
function flowRow() {
  const sec = $('[data-fw-pin]');
  const wide = matchMedia('(min-width: 900px)');
  $$('[data-arc]').forEach(arc => {
    const svg = $('.arc-svg', arc), base = $('.arc-base', arc), fill = $('.arc-fill', arc), comet = $('.arc-comet', arc);
    const nodes = $$('.arc-n', arc), panels = $$('.arc-p', arc);
    let len = 0, cur = -1, p = 0;
    const gp = glowPath(svg, base, fill, { tail: 12 });
    const halo = document.createElement('span'); halo.className = 'arc-halo'; arc.prepend(halo);
    const open = i => { if (i === cur) return; cur = i; nodes.forEach((n, j) => { n.classList.toggle('on', j === i); n.classList.toggle('done', j < i); }); panels.forEach((x, j) => x.classList.toggle('on', j === i)); };
    const layout = () => {
      if (!arc.offsetParent || !wide.matches) return;
      const r = arc.getBoundingClientRect(), W = r.width, H = r.height;
      const x0 = W * 0.05, x1 = W * 0.95, yb = H * 0.84, yt = H * 0.02;
      const d = `M${x0} ${yb} C ${x0 + W * 0.02} ${yt}, ${x1 - W * 0.02} ${yt}, ${x1} ${yb}`;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      base.setAttribute('d', d); fill.setAttribute('d', d); gp.layout(d);
      len = base.getTotalLength();
      fill.style.strokeDasharray = `${len} ${len}`;
      // fine ticks along the arch, like a dial
      $$('.arc-tick', svg).forEach(t => t.remove());
      for (let t = 1; t < 40; t++) { if (t % 10 === 0) continue; const q = base.getPointAtLength(len * t / 40), c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('class', 'arc-tick'); c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1)); c.setAttribute('r', '1.6'); svg.insertBefore(c, base); }
      nodes.forEach((n, i) => { const q = base.getPointAtLength(len * i / (nodes.length - 1)); n.style.left = `${q.x.toFixed(1)}px`; n.style.top = `${q.y.toFixed(1)}px`; });
      draw();
    };
    const draw = () => {
      if (!len) return;
      const t = Math.min(1, p * 1.18);
      // the comet settles on each node for a moment, then moves on
      const seg = t * (nodes.length - 1), i = Math.min(nodes.length - 2, Math.floor(seg)), f = seg - i;
      const e = Math.min(1, Math.max(0, (f - 0.35) / 0.65));
      const pos = (i + e * e * (3 - 2 * e)) / (nodes.length - 1);
      const L = len * (t >= 1 ? 1 : pos);
      fill.style.strokeDashoffset = (len - L).toFixed(1); gp.update(L);
      const q = base.getPointAtLength(L);
      comet.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
      halo.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
      open(Math.round(L / len * (nodes.length - 1)));
    };
    open(0);
    nodes.forEach((n, i) => n.addEventListener('click', () => open(i)));
    if (reduce || !window.ScrollTrigger) { panels.forEach(x => x.classList.add('on')); return; }
    layout(); addEventListener('resize', layout); onAudience(() => requestAnimationFrame(layout)); if (document.fonts) document.fonts.ready.then(layout);
    window.ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onRefresh: layout, onUpdate: s0 => { if (!arc.offsetParent || !wide.matches) return; p = s0.progress; draw(); } });
  });
}

/* ---------- your path: a row of cards per lane. As you scroll, the active card comes forward
   and the next one takes over. You move steadily; your batch stalls at the waiting stages. ---------- */
function lanesPath() {
  const sec = $('#path');
  if (!sec || !$('[data-lanes]', sec)) return;
  const wide = matchMedia('(min-width: 900px)');
  const lanes = $$('[data-lanes]', sec).map(l => ({ l, rows: $$('.lane', l).map((row, r) => ({ cells: $$('.ln-cell', row), slow: r === 1 })) }));
  // your batch: steady at first, stuck for a while at "waits", late at the end
  const batch = p => (p < 0.4 ? p : p < 0.62 ? 0.4 + (p - 0.4) * 0.25 : 0.455 + (p - 0.62) * (0.545 / 0.38) * 0.9);
  let last = 0;
  const set = p => { last = p; lanes.forEach(({ l, rows }) => {
    if (!l.offsetParent) return;
    rows.forEach(R => {
      const n = R.cells.length, f = Math.max(0, Math.min(1, R.slow ? batch(p) : p));
      // each card gets an equal share of the scroll before the next one takes over
      const k = Math.min(n - 1, Math.floor(f * n));
      R.cells.forEach((c, i) => { c.classList.toggle('on', i <= k); c.classList.toggle('now', i === k); });
    });
    l.classList.toggle('done', p > 0.97);
  }); };
  onAudience(() => requestAnimationFrame(() => set(last)));
  if (reduce || !window.ScrollTrigger) { set(1); return; }
  set(0);
  const io = new IntersectionObserver(es => es.forEach(e => { if (!wide.matches && e.isIntersecting) { const i = +e.target.style.getPropertyValue('--k'); set(i >= 4 ? 1 : (i + 0.5) / 5); } }), { rootMargin: '-40% 0px -40% 0px' });
  $$('.ln-you .ln-cell', sec).forEach(c => io.observe(c));
  window.ScrollTrigger.matchMedia({
    '(min-width: 900px)': () => {
      window.ScrollTrigger.create({ trigger: sec, start: 'top top', end: () => `+=${innerHeight * 1.8}`, pin: true, anticipatePin: 1, onUpdate: t => set(t.progress) });
    }
  });
}

/* ---------- a guided first touch for the demo apps: a pulsing hand points at one thing to
   try, with a short line of why. It moves on when that thing is used (or after a moment), and
   leaves for good once someone has tried all three or skipped. ---------- */
function coaches() {
  $$('[data-coach-steps]').forEach(app => {
    const coach = $('[data-coach]', app);
    if (!coach) return;
    const steps = JSON.parse(app.dataset.coachSteps);
    const tT = $('[data-coach-t]', coach), tS = $('[data-coach-s]', coach), tN = $('[data-coach-n]', coach);
    let i = -1, timer = 0, done = false, started = false;
    const end = () => { done = true; clearTimeout(timer); coach.classList.remove('on'); };
    const place = () => {
      if (done || i < 0) return;
      const el = $(steps[i][2], app);
      if (!el || !el.offsetParent) { next(); return; }
      const a = app.getBoundingClientRect(), b = el.getBoundingClientRect();
      const x = b.left - a.left + b.width / 2, y = b.top - a.top + b.height / 2;
      coach.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      coach.classList.toggle('flip', x > a.width * 0.6);
      coach.classList.toggle('up', y > a.height * 0.7);
    };
    const go = k => {
      if (done) return;
      if (k >= steps.length) { end(); return; }
      i = k;
      tT.textContent = steps[i][0]; tS.textContent = steps[i][1]; tN.textContent = `${i + 1} of ${steps.length}`;
      coach.classList.remove('on'); void coach.offsetWidth; coach.classList.add('on');
      place();
      clearTimeout(timer); timer = setTimeout(() => go((i + 1) % steps.length), 5200);
    };
    const next = () => go(i + 1);
    $('[data-coach-skip]', coach).addEventListener('click', e => { e.stopPropagation(); end(); });
    app.addEventListener('click', e => {
      if (done || i < 0) return;
      const el = $(steps[i][2], app);
      if (el && (el === e.target || el.contains(e.target))) setTimeout(next, 450);
    }, true);
    addEventListener('resize', place);
    if (reduce) return;
    new IntersectionObserver(es => { if (es[0].isIntersecting && !started) { started = true; setTimeout(() => go(0), 700); } }, { threshold: 0.45 }).observe(app);
  });
}

/* ---------- your path: two lives side by side. It plays on its own while it is on screen, one
   step every few seconds; tap any step, use the arrows, the keyboard or a swipe to move, and it
   stays where you put it until you press play. The page never stops scrolling for it. ---------- */
function duels() {
  $$('[data-duel]').forEach(d => {
    const steps = $$('.dl-steps button', d), n = steps.length, sides = $$('.dl-side', d), play = $('.dl-play', d), bar = $('.dl-bar', d);
    const STEP = 4.2;
    let i = -1, f = 0, playing = !reduce, seen = false, last = performance.now(), rest = 0;
    const paint = () => steps.forEach((b, j) => b.style.setProperty('--f', j < i ? 1 : j === i ? f.toFixed(3) : 0));
    const go = (k, user) => {
      k = (k + n) % n;
      if (user) { playing = false; d.classList.add('is-paused'); }
      f = user ? 1 : 0; rest = 0;
      if (k !== i) {
        i = k;
        steps.forEach((b, j) => { b.classList.toggle('on', j === k); b.classList.toggle('done', j < k); b.setAttribute('aria-current', j === k ? 'step' : 'false'); });
        sides.forEach(sd => {
          $$('.dl-scene', sd).forEach((x, j) => x.classList.toggle('on', j === k));
          $$('.dl-cap span', sd).forEach((x, j) => x.classList.toggle('on', j === k));
          const m = $('.dl-meter', sd), v = JSON.parse(m.dataset.v), w = JSON.parse(m.dataset.w);
          $('b', m).textContent = v[k]; $('.dl-track i', m).style.setProperty('--w', w[k] + '%');
        });
        d.classList.toggle('at-end', k === n - 1);
        prev.disabled = false; next.disabled = false;
      }
      paint();
    };
    // previous / next
    const nav = document.createElement('div');
    nav.className = 'dl-nav';
    nav.innerHTML = '<button type="button" class="dl-prev" aria-label="Previous step"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></button><button type="button" class="dl-next" aria-label="Next step"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"/></svg></button>';
    bar.appendChild(nav);
    const prev = $('.dl-prev', nav), next = $('.dl-next', nav);
    prev.addEventListener('click', () => go(i - 1, true));
    next.addEventListener('click', () => go(i + 1, true));
    steps.forEach((b, k) => b.addEventListener('click', () => go(k, true)));
    play.addEventListener('click', () => {
      playing = !playing;
      d.classList.toggle('is-paused', !playing);
      if (playing) { if (i === n - 1) go(0); else { f = 0; paint(); } }
    });
    d.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { go(i + 1, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(i - 1, true); e.preventDefault(); }
    });
    // swipe between steps on touch screens
    let sx = 0, sy = 0;
    const area = $('.dl-sides', d);
    area.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; }, { passive: true });
    area.addEventListener('pointerup', e => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(i + (dx < 0 ? 1 : -1), true); }, { passive: true });
    d.classList.toggle('is-paused', !playing);
    go(0);
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: 0.35 }).observe(d);
    const tick = now => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!playing || !seen || isPaused() || !d.offsetParent) return;
      if (f < 1) { f = Math.min(1, f + dt / STEP); paint(); return; }
      rest += dt;
      if (rest > (i === n - 1 ? 2.4 : 0.15)) go(i + 1);
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- the people (students) / the work for customers (hiring): a living network.
   Real faces (or real customer outcomes) are nodes among smaller dots, linked to their nearest
   neighbours like the network at the top of the page. One node at a time is lit: its links glow,
   pulses run out from it, and a line carries it into the card. Pointing at a node holds it. ---------- */
function nodeWalls() {
  $$('[data-nw="customers"]').forEach(el => {
    const people = el.dataset.nw === 'people';
    const raw = $(people ? '#voices-data' : '#customers-data');
    if (!raw) return;
    const items = JSON.parse(raw.textContent);
    const field = $('.nw-field', el), cv = $('.nw-cv', el), host = $('.nw-nodes', el), card = $('.nw-card', el);
    const ctx = cv.getContext('2d');
    const tmp = document.createElement('span');
    const text = h => { tmp.innerHTML = h; return tmp.textContent; };
    // the card
    card.innerHTML = people
      ? '<div class="nwc-img"><img class="a" alt="" width="320" height="320"><img class="b" alt="" width="320" height="320"><span class="nwc-bg"></span><span class="nwc-ini"></span></div><figcaption><span class="nwc-n"></span><blockquote class="nwc-q"></blockquote><b class="nwc-name"></b><small class="nwc-role"></small></figcaption>'
      : '<figcaption><span class="nwc-tag"></span><b class="nwc-k"></b><span class="nwc-t"></span><p class="nwc-d"></p><small class="nwc-n"></small></figcaption>';
    let front = $('img.a', card), back = $('img.b', card);
    const cache = new Map();
    const ready = src => { if (!src) return Promise.resolve(); if (!cache.has(src)) { const im = new Image(); im.src = src; cache.set(src, (im.decode ? im.decode() : Promise.resolve()).catch(() => {})); } return cache.get(src); };
    if (people) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { items.forEach(v => ready(v.full || v.img)); o.disconnect(); } }, { rootMargin: '1600px 0px' }).observe(el);
    // the nodes
    const nodes = items.map((v, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'nw-n';
      b.setAttribute('aria-label', people ? `${text(v.n)}: read their words` : `${text(v.k)} ${text(v.t)}`);
      b.innerHTML = people
        ? `${v.img ? `<img src="${v.img}" alt="" width="160" height="160" loading="lazy" decoding="async">` : `<span class="nw-ini">${v.ini || ''}</span>`}<span class="nw-tag">${v.n}</span>`
        : `<span class="nw-g">${v.k}</span><span class="nw-tag">${v.t}</span>`;
      b.style.setProperty('--i', i);
      host.appendChild(b);
      return { b, i, s: [1.2, 0.95, 1.05, 0.85, 1.1][i % 5], x: 0, y: 0, ph: i * 1.7, f: 0.35 + (i % 4) * 0.08 };
    });
    let seed = people ? 7 : 19;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let W = 0, H = 0, dpr = 1, base = 60, dots = [], pts = [], edges = [], adj = [], ring = false, cx0 = 0, cy0 = 0, cardBox = null, rot = 0;
    const layout = () => {
      W = field.clientWidth; H = field.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      const phone = W < 560;
      // the more people, the smaller each face, so everyone fits
      const fit = Math.sqrt(W * H / nodes.length) * (phone ? 0.6 : 0.6);
      base = people ? (phone ? Math.max(38, Math.min(56, fit)) : Math.max(54, Math.min(84, fit))) : (phone ? 92 : 132);   // work tiles are big: the work is the point
      seed = people ? 7 : 19;
      // spread the faces evenly first (a jittered grid), then let them settle
      const cols = Math.max(2, Math.round(Math.sqrt(nodes.length * W / H))), rows = Math.ceil(nodes.length / cols);
      const cells = nodes.map((_, i) => i).sort((a, b) => ((a * 7919) % 31) - ((b * 7919) % 31));
      let all = nodes.map((n, i) => { const c = cells[i] % cols, r = Math.floor(cells[i] / cols); return { n, r: base * (people ? n.s : 1) / 2, x: (c + 0.5 + (rnd() - 0.5) * 0.5) * W / cols, y: (r + 0.5 + (rnd() - 0.5) * 0.45) * H / rows }; });
      // people on a wide screen: the quote sits in the middle and everyone circles it in rings
      ring = people && !phone;
      if (ring) {
        const cw = card.offsetWidth, ch = card.offsetHeight;
        cx0 = W / 2; cy0 = H / 2; cardBox = [cx0 - cw / 2, cy0 - ch / 2, cx0 + cw / 2, cy0 + ch / 2];
        // shrink the faces until every ring fits in the field
        for (base = 70; base > 36; base -= 2) {
          let left = nodes.length, kk = 0, ok = true;
          while (left > 0) { const rx = cw * 0.65 + base * (0.75 + kk * 1.18), ry = ch * 0.65 + base * (0.75 + kk * 1.12); if (rx > W / 2 - base * 0.55 || ry > H / 2 - base * 0.55) { ok = false; break; } left -= Math.floor(Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) / (base * 1.42)); kk++; }
          if (ok) break;
        }
        const order = nodes.map((_, i) => i).sort((a, b) => ((a * 7919) % 53) - ((b * 7919) % 53));
        all = []; let idx = 0, kk = 0;
        while (idx < order.length) {
          const rx = cw * 0.65 + base * (0.75 + kk * 1.18), ry = ch * 0.65 + base * (0.75 + kk * 1.12);
          const cap = Math.max(1, Math.floor(Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) / (base * 1.42)));
          const cnt = Math.min(cap, order.length - idx), off = kk * 0.37;
          for (let q = 0; q < cnt; q++, idx++) { const a = off + q / cnt * 6.2832, n = nodes[order[idx]]; n.s = 1; all.push({ n, r: base / 2, x: cx0 + Math.cos(a) * rx, y: cy0 + Math.sin(a) * ry, a, rx, ry, dir: kk % 2 ? -1 : 1 }); }
          for (let q = 0; q < Math.round(cnt / 3); q++) { const a = off + (q + 0.5) / Math.round(cnt / 3) * 6.2832; all.push({ r: 2 + rnd() * 2, x: cx0 + Math.cos(a) * (rx + base * 0.6), y: cy0 + Math.sin(a) * (ry + base * 0.55), a, rx: rx + base * 0.6, ry: ry + base * 0.55, dir: kk % 2 ? -1 : 1, dot: true }); }
          kk++;
        }
      }
      const nd = ring ? 0 : Math.max(phone ? 10 : 18, Math.round((phone ? 22 : 40) - nodes.length * 0.3));
      for (let k = 0; k < nd; k++) all.push({ r: 2 + rnd() * 2.5, x: rnd() * W, y: rnd() * H, dot: true });
      for (let it = 0; it < (ring ? 0 : 220); it++) for (let i = 0; i < all.length; i++) {
        const a = all[i];
        for (let j = i + 1; j < all.length; j++) {
          const b = all[j], need = a.r + b.r + (a.dot || b.dot ? 12 : (phone ? 10 : 18)), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
          if (d < need) { const m = (need - d) / d * 0.5; a.x -= dx * m; a.y -= dy * m; b.x += dx * m; b.y += dy * m; }
        }
        const pad = a.r + (a.dot ? 8 : (people ? 18 : 40));
        a.x = Math.max(pad, Math.min(W - pad, a.x)); a.y = Math.max(pad + (a.dot ? 0 : 4), Math.min(H - pad - (a.dot ? 0 : 18), a.y));
      }
      pts = all.map((p, k) => ({ ...p, k, bx: p.x, by: p.y, ph: k * 2.3, f: 0.3 + (k % 5) * 0.07 }));
      dots = pts.filter(p => p.dot);
      const seen = new Set(); edges = []; adj = pts.map(() => []);
      const link = (i, j) => { const key = i < j ? `${i}-${j}` : `${j}-${i}`; if (seen.has(key)) return; seen.add(key); edges.push([i, j]); adj[i].push(j); adj[j].push(i); };
      const dist = (i, j) => Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      // one connected network: a spanning tree first (nobody is an island), then a few near links
      const inT = new Set([0]), best = pts.map((_, j) => [dist(0, j), 0]);
      while (inT.size < pts.length) {
        let m = -1; best.forEach(([d], j) => { if (!inT.has(j) && (m < 0 || d < best[m][0])) m = j; });
        inT.add(m); link(m, best[m][1]);
        pts.forEach((_, j) => { if (!inT.has(j)) { const d = dist(m, j); if (d < best[j][0]) best[j] = [d, m]; } });
      }
      pts.forEach((a, i) => pts.map((_, j) => [j, dist(i, j)]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, a.dot ? 1 : 2).forEach(([j]) => link(i, j)));
      pts.forEach(p => { if (p.n) p.n.b.style.setProperty('--d', `${(base * p.n.s).toFixed(0)}px`); });
    };
    // pulses running along the links
    let pulses = [], k = -1, hold = false, visible = false, t0 = performance.now(), last = performance.now(), token = 0;
    const DWELL = 4600;
    const nodePt = i => pts.find(p => p.n && p.n.i === i);
    const burst = () => { const p = nodePt(k); if (!p) return; adj[p.k].forEach((j, m) => pulses.push({ a: p.k, b: j, t: -m * 0.12, sp: 1.1 })); };
    const show = async i => {
      if (i === k) return;
      k = i; t0 = performance.now();
      const v = items[i], my = ++token;
      nodes.forEach(n => n.b.classList.toggle('on', n.i === i));
      burst();
      if (people) await ready(v.full || v.img);
      if (my !== token) return;
      card.classList.remove('in'); void card.offsetWidth;
      if (people) {
        const pic = $('.nwc-img', card);
        pic.classList.toggle('no-img', !v.img);
        $('.nwc-ini', card).textContent = v.ini || '';
        if (v.img) {
          // the card shows the whole photo, over a soft blur of itself
          $('.nwc-bg', card).style.backgroundImage = `url("${v.img}")`;
          back.src = v.full || v.img; back.classList.add('top'); front.classList.remove('top'); [front, back] = [back, front];
        }
        $('.nwc-q', card).innerHTML = `&ldquo;${v.q}&rdquo;`; $('.nwc-name', card).innerHTML = v.n; $('.nwc-role', card).innerHTML = v.r;
      } else {
        $('.nwc-tag', card).innerHTML = v.tag; $('.nwc-k', card).innerHTML = v.k; $('.nwc-t', card).innerHTML = v.t; $('.nwc-d', card).innerHTML = v.d;
      }
      $('.nwc-n', card).textContent = `${String(i + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      card.classList.add('in');
    };
    const tick = now => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible || !W) return;
      const live = !reduce && !isPaused();
      if (live && !hold && now - t0 > DWELL) show((k + 1) % items.length);
      if (!live || hold) t0 += dt * 1000;
      const T = now / 1000;
      // reads done; now positions and drawing
      if (live) rot += dt * 0.035;
      pts.forEach(p => { const a = live ? (p.dot ? 16 : 11) : 0; if (p.rx) { const g = p.a + rot * p.dir; p.x = cx0 + Math.cos(g) * p.rx + Math.sin(T * p.f + p.ph) * a * 0.35; p.y = cy0 + Math.sin(g) * p.ry + Math.cos(T * p.f * 0.8 + p.ph) * a * 0.35; } else { p.x = p.bx + Math.sin(T * p.f * 0.7 + p.ph) * a + Math.sin(T * 0.23 + p.ph * 2) * a * 0.4; p.y = p.by + Math.cos(T * p.f * 0.55 + p.ph) * a; } if (p.n) p.n.b.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`; });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const act = nodePt(k), lit = act ? new Set(adj[act.k]) : new Set(), lit2 = new Set();
      lit.forEach(j => adj[j].forEach(q => { if (!lit.has(q) && (!act || q !== act.k)) lit2.add(q); }));
      if (act) { field.style.setProperty('--gx', `${act.x.toFixed(0)}px`); field.style.setProperty('--gy', `${act.y.toFixed(0)}px`); }
      ctx.lineWidth = 1;
      edges.forEach(([i, j]) => {
        const a = pts[i], b = pts[j], hot = act && (i === act.k || j === act.k), warm = !hot && (lit.has(i) && lit2.has(j) || lit.has(j) && lit2.has(i) || lit.has(i) && lit.has(j));
        ctx.strokeStyle = hot ? 'rgba(187,98,222,.85)' : warm ? 'rgba(187,98,222,.35)' : 'rgba(247,245,238,.14)';
        ctx.lineWidth = hot ? 1.8 : warm ? 1.3 : 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      });
      dots.forEach(p => { const on = lit.has(p.k); ctx.fillStyle = on ? 'rgba(187,98,222,.95)' : 'rgba(247,245,238,.38)'; ctx.beginPath(); ctx.arc(p.x, p.y, on ? p.r + 1 : p.r, 0, 6.283); ctx.fill(); });
      // ambient pulses keep the whole network breathing
      if (live && Math.random() < dt * 7 && edges.length) { const [a, b] = edges[Math.floor(Math.random() * edges.length)]; pulses.push({ a, b, t: 0, sp: 0.55 + Math.random() * 0.5 }); }
      // now and then someone lights up: a ring on a random face
      if (live && Math.random() < dt * 1.1 && nodes.length) { const nd = nodes[Math.floor(Math.random() * nodes.length)].b; if (!nd.classList.contains('on')) { nd.classList.remove('blip'); void nd.offsetWidth; nd.classList.add('blip'); } }
      if (live) pulses.forEach(q => { q.t += dt * q.sp; });
      pulses = pulses.filter(q => q.t < 1);
      pulses.forEach(q => {
        if (q.t < 0) return;
        const a = pts[q.a], b = pts[q.b], x = a.x + (b.x - a.x) * q.t, y = a.y + (b.y - a.y) * q.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, 'rgba(247,245,238,.95)'); g.addColorStop(.35, 'rgba(187,98,222,.85)'); g.addColorStop(1, 'rgba(187,98,222,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill();
      });
      // the line into the card (the card sits to the left on wide screens, below on phones)
      if (act) {
        const wide = W >= 560;
        let tx = wide ? 0 : act.x, ty = wide ? H / 2 : H;
        if (ring && cardBox) { tx = Math.max(cardBox[0], Math.min(cardBox[2], act.x)); ty = Math.max(cardBox[1], Math.min(cardBox[3], act.y)); }
        ctx.strokeStyle = 'rgba(187,98,222,.6)'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -T * 30;
        ctx.beginPath(); ctx.moveTo(act.x, act.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
        const f = (T * 0.8) % 1, sx = act.x + (tx - act.x) * f, sy = act.y + (ty - act.y) * f;
        ctx.fillStyle = 'rgba(247,245,238,.95)'; ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 6.283); ctx.fill();
      }
    };
    nodes.forEach(n => {
      n.b.addEventListener('pointerenter', () => { hold = true; el.classList.add('held'); show(n.i); });
      n.b.addEventListener('pointerleave', () => { hold = false; el.classList.remove('held'); });
      n.b.addEventListener('focus', () => { hold = true; show(n.i); });
      n.b.addEventListener('blur', () => { hold = false; });
      n.b.addEventListener('click', () => show(n.i));
    });
    const relayout = () => { layout(); };
    relayout(); addEventListener('resize', relayout); addEventListener('load', relayout); if (document.fonts) document.fonts.ready.then(relayout);
    onAudience(() => requestAnimationFrame(relayout));
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { if (!W) relayout(); el.classList.add('in'); if (k < 0) show(0); } }, { threshold: 0.12 }).observe(el);
    requestAnimationFrame(tick);
  });
}

/* ---------- the nudge: a quiet, honest reminder of what waiting costs ----------
   After two minutes of reading it shows how long you've been here, against a true fact
   for your side, with the next step. Dismissible for the session; hidden in the hero
   and at the end of the page, where the doors already ask. */
function nudge() {
  const el = $('[data-nudge]');
  if (!el) return;
  try { if (sessionStorage.getItem('antbox-nudge') === '0') return; } catch (e) {}
  const t0 = performance.now(), out = $$('[data-nudge-t]', el);
  let shown = false;
  $('[data-nudge-x]', el).addEventListener('click', () => { el.classList.remove('on'); el.hidden = true; try { sessionStorage.setItem('antbox-nudge', '0'); } catch (e) {} });
  setInterval(() => {
    const sec = Math.floor((performance.now() - t0) / 1000);
    const m = Math.floor(sec / 60), txt = m >= 60 ? 'over an hour' : m >= 1 ? `${m} min` : `${sec} sec`;
    out.forEach(o => { o.textContent = txt; });
    const root = document.documentElement;
    // the reminder never sits over a working screen
    const busy = ['#what-we-do', '#proof', '#path', '#start'].some(q => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); return r.top < innerHeight - 140 && r.bottom > innerHeight - 40; });
    const quiet = root.classList.contains('at-hero') || root.classList.contains('at-end') || busy;
    // first after two minutes on the page; then for 12 seconds every three minutes
    const cyc = (sec - 120) % 180, up = sec >= 120 && cyc < 12;
    if (up && !shown) { shown = true; el.hidden = false; requestAnimationFrame(() => el.classList.add('on')); }
    if (shown) el.classList.toggle('quiet', quiet || !up);
  }, 1000);
}

/* ---------- voices: the team's own words pop up as you read, one at a time ----------
   Real quotes from the Foundation Day page. Shown after the hero, every ~11s, each for ~6s;
   never in the hero or at the very end, never under reduced motion, and the x stops them
   for the visit. Hovering a quote holds it. */
function voices() {
  return; // the people wall at the end carries the team's words now
  const pop = $('[data-voice-pop]'), raw = $('#voices-data');
  if (!pop || !raw || reduce) return;
  try { if (sessionStorage.getItem('antbox-voices') === '0') return; } catch (e) {}
  const list = JSON.parse(raw.textContent);
  const av = $('[data-vp-av]', pop), q = $('[data-vp-q]', pop), n = $('[data-vp-n]', pop), r = $('[data-vp-r]', pop);
  const root = document.documentElement;
  let k = Math.floor(Math.random() * list.length), hold = false, stopped = false, timer = 0;
  pop.addEventListener('pointerenter', () => { hold = true; });
  pop.addEventListener('pointerleave', () => { hold = false; });
  $('[data-vp-x]', pop).addEventListener('click', () => { stopped = true; hide(); try { sessionStorage.setItem('antbox-voices', '0'); } catch (e) {} });
  const hide = () => { pop.classList.remove('on'); root.classList.remove('voice-on'); };
  const show = () => {
    const v = list[k = (k + 1) % list.length];
    av.innerHTML = v.img ? `<img src="${v.img}" alt="" width="40" height="40">` : `<span>${v.ini}</span>`;
    q.innerHTML = v.q; n.textContent = v.n; r.innerHTML = v.r;
    pop.hidden = false;
    requestAnimationFrame(() => { pop.classList.add('on'); root.classList.add('voice-on'); });
  };
  const loop = () => {
    if (stopped) return;
    const quiet = root.classList.contains('at-hero') || root.classList.contains('at-end') || isPaused();
    if (pop.classList.contains('on')) { if (!hold) hide(); timer = setTimeout(loop, 5000); }
    else if (!quiet) { show(); timer = setTimeout(loop, 6500); }
    else timer = setTimeout(loop, 2000);
  };
  timer = setTimeout(loop, 9000);
}


/* hiring sections animate in once */
function seenOnce() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { threshold: 0.2 });
  $$('.tz, .wh').forEach(el => io.observe(el));
}


/* ---------- the client strip: moves right to left without a seam; a mouse over it slows it to a
   stop and brings the logo under the pointer back to colour. On touch, a tap does the same. ---------- */
function logoStrip() {
  $$('[data-logos]').forEach(strip => {
    const track = $('.lg-track', strip);
    if (!track) return;
    if (reduce) { strip.classList.add('still'); return; }
    [...track.children].forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); const im = c.querySelector('img'); if (im) im.alt = ''; track.appendChild(c); });
    let x = 0, v = 1, target = 1, last = performance.now(), half = 0, seen = false;
    const measure = () => { half = track.scrollWidth / 2; };
    measure();
    addEventListener('resize', measure);
    $$('img', track).forEach(im => { if (!im.complete) im.addEventListener('load', measure); });
    strip.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') target = 0; });
    strip.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') target = 1; });
    strip.addEventListener('click', e => {
      const li = e.target.closest('li');
      if (!li || matchMedia('(hover: hover)').matches) return;
      const on = !li.classList.contains('lit');
      $$('li', track).forEach(n => n.classList.remove('lit'));
      li.classList.toggle('lit', on); target = on ? 0 : 1;
    });
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }).observe(strip);
    const tick = now => {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!seen || isPaused() || !strip.offsetParent) return;
      v += (target - v) * (1 - Math.exp(-dt * 3.2));
      x -= 84 * v * dt;
      if (half > 0 && -x >= half) x += half;
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    };
    requestAnimationFrame(tick);
  });
}


/* ---------- which team are you hiring for: the roles orbit a centre that shows the one picked.
   Lines of light run from each role to the centre; it moves on by itself until someone picks.
   The list stays in the page for screen readers and search. ---------- */
function teamScroll() {
  const list = $('[data-tz]');
  if (!list) return;
  const items = $$('li', list), wrap = list.closest('.tz2'), btn = wrap && $('.tz2-head .btn', wrap);
  const label = btn ? btn.lastChild : null, base = btn ? btn.textContent.trim() : '';
  const data = items.map(li => ({ n: $('.tz2-n', li).textContent, h: $('h3', li).textContent, p: $('.tz2-b > p', li).textContent, tools: $('.tz2-meta span', li).textContent, proof: $('.tz2-proof', li).textContent }));
  const v = document.createElement('div');
  v.className = 'tzv';
  v.innerHTML = '<svg class="tzv-svg" aria-hidden="true"></svg><div class="tzv-hub" aria-live="polite"><span class="tzv-k"></span><b class="tzv-h"></b><p class="tzv-p"></p><span class="tzv-t"></span><span class="tzv-pr"></span></div>'
    + data.map((d, i) => `<button type="button" class="tzv-n" data-i="${i}"><i>${d.n}</i>${d.h.replace('Inbound and customer success', 'Customer success').replace('Operations and delivery', 'Operations')}</button>`).join('');
  list.after(v); list.classList.add('sr-only');
  const svg = $('.tzv-svg', v), hub = $('.tzv-hub', v), nodes = $$('.tzv-n', v);
  svg.innerHTML = nodes.map(() => '<line/>').join('');
  const lines = $$('line', svg);
  let cur = -1, held = false, seen = false, rot = 0, last = performance.now(), since = 0, W = 0, H = 0, over = false, stacked = false;
  // pointing at the diagram stops it, so a role is never moving when you try to click it
  v.addEventListener('pointerenter', () => { over = true; }); v.addEventListener('pointerleave', () => { over = false; });
  const pick = (i, user) => {
    if (user) held = true;
    cur = i; since = 0;
    const d = data[i];
    nodes.forEach((n, j) => n.classList.toggle('on', j === i)); lines.forEach((l, j) => l.classList.toggle('on', j === i));
    hub.classList.remove('in'); void hub.offsetWidth; hub.classList.add('in');
    $('.tzv-k', hub).textContent = `${d.n} / 0${data.length}`; $('.tzv-h', hub).textContent = d.h; $('.tzv-p', hub).textContent = d.p; $('.tzv-t', hub).textContent = d.tools; $('.tzv-pr', hub).textContent = d.proof;
    if (label && user) label.textContent = `Brief us on ${d.h.replace(/^Inbound and /, '')}`;
  };
  nodes.forEach((n, i) => n.addEventListener('click', () => pick(i, true)));
  const size = () => {
    // the roles circle outside the card, never on it; too narrow for that and they sit as a row of chips under it
    v.classList.remove('stacked'); v.style.height = '';
    W = v.clientWidth; const hw = hub.offsetWidth, hh = hub.offsetHeight;
    stacked = W < hw + 390;
    v.classList.toggle('stacked', stacked);
    if (stacked) { nodes.forEach(n => { n.style.transform = ''; }); return; }
    v.style.height = `${Math.round(hh + 230)}px`;
    W = v.clientWidth; H = v.clientHeight; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  };
  size(); addEventListener('resize', size);
  new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: 0.2 }).observe(v);
  pick(0);
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!seen || !W) return;
    const live = !reduce && !isPaused() && !over;
    if (live) { rot += dt * 0.08; since += dt; if (!held && since > 3.2) pick((cur + 1) % data.length); }
    if (stacked) return;
    const cx = W / 2, cy = H / 2, rx = Math.min(W / 2 - 85, hub.offsetWidth / 2 + 110), ry = hub.offsetHeight / 2 + 70;
    nodes.forEach((n, i) => {
      const a = i / nodes.length * 6.2832 + rot - 1.5708, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      n.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      const l = lines[i]; l.setAttribute('x1', cx); l.setAttribute('y1', cy); l.setAttribute('x2', x.toFixed(1)); l.setAttribute('y2', y.toFixed(1));
    });
  };
  requestAnimationFrame(tick);
}


/* ---------- same start, different Day 0: the growth chart follows the month on show ---------- */
function growthChart() {
  const g = $('[data-growth]'), duel = g && g.nextElementSibling;
  if (!g || !duel) return;
  const d = JSON.parse(g.dataset.growth), mark = $('.dg-mark', g), dy = $('.dg-dy', g), dt = $('.dg-dt', g);
  const steps = $$('.dl-steps button', duel);
  const show = () => {
    const i = Math.max(0, steps.findIndex(b => b.classList.contains('on')));
    mark.setAttribute('transform', `translate(${d.x[i]} 0)`);
    dy.setAttribute('cy', d.you[i]); dt.setAttribute('cy', d.them[i]);
    g.style.setProperty('--p', (i / (steps.length - 1)).toFixed(3));
  };
  const mo = new MutationObserver(show);
  steps.forEach(b => mo.observe(b, { attributes: true, attributeFilter: ['class'] }));
  show();
}

/* ---------- the segue into the network: from "Watch your proof stack up" down, nodes start to
   appear behind the page (far ones blurred, near ones sharp, some with faces), thickening as you
   go, so the crowd in the next section is already there when you reach it ---------- */
function nodeSegue() {
  const sec = $('#what-we-do'), from = sec && $$('.wkst.only-student .st-ch', sec).pop();
  const atlas = '/images/network/faces.webp';
  if (!sec) return;
  const layer = document.createElement('div');
  layer.className = 'nseg'; layer.setAttribute('aria-hidden', 'true');
  sec.appendChild(layer);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const build = () => {
    const top = from && from.offsetParent ? from.getBoundingClientRect().top - sec.getBoundingClientRect().top - 120 : sec.offsetHeight * 0.6;
    layer.style.top = `${Math.max(0, top)}px`;
    const W = sec.clientWidth, H = sec.offsetHeight - Math.max(0, top);
    if (!W || H < 200) return;
    const N = Math.round(W * H / 6500), pts = [];
    for (let i = 0; i < N; i++) {
      const y = Math.pow(rnd(), 0.55) * H, depth = rnd();          // more of them further down
      pts.push({ x: rnd() * W, y: Math.min(H - 6, y), d: depth });
    }
    const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    let lines = '';
    pts.forEach((a, i) => { const nb = pts.map((b, j) => [j, near(a, b)]).filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, 2); nb.forEach(([j, d]) => { if (j > i && d < 140) lines += `<line x1="${a.x.toFixed(0)}" y1="${a.y.toFixed(0)}" x2="${pts[j].x.toFixed(0)}" y2="${pts[j].y.toFixed(0)}"/>`; }); });
    const far = pts.filter(p => p.d < 0.45), mid = pts.filter(p => p.d >= 0.45 && p.d < 0.85), front = pts.filter(p => p.d >= 0.85);
    const circ = (arr, r0, r1) => arr.map(p => `<circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="${(r0 + rnd() * (r1 - r0)).toFixed(1)}"/>`).join('');
    const faces = front.map((p, k) => `<span class="nseg-f" style="left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px;--fx:${(k * 37) % 16};--fy:${(k * 11) % 10};--dl:${(k % 7) * -1.3}s"></span>`).join('');
    layer.innerHTML = `<svg class="nseg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><g class="far">${circ(far, 3, 7)}</g><g class="lines">${lines}</g><g class="mid">${circ(mid, 2, 4)}</g></svg>${faces}`;
    layer.style.height = `${H}px`;
  };
  build(); addEventListener('resize', () => { seed = 3; build(); }); addEventListener('load', () => { seed = 3; build(); });
  onAudience(() => requestAnimationFrame(() => { seed = 3; build(); }));
}

/* ---------- the people: a river. Faces flow across in three depths (far ones small and soft,
   near ones large and sharp), linked to their neighbours as they pass; pulses run along the
   links. One person's words sit large in the middle, joined by a line of light to their face in
   the stream. Tap anyone to read theirs; pointing at the stream slows it. ---------- */
function riverWall() {
  const el = $('[data-rv]'), raw = $('#voices-data');
  if (!el || !raw) return;
  const items = JSON.parse(raw.textContent).filter(v => v.img);
  const cv = $('.rv-cv', el), host = $('.rv-nodes', el), stage = $('.rv-stage', el), ctx = cv.getContext('2d');
  const sImg = $('.rv-face img', stage), sQ = $('.rv-q', stage), sName = $('.rv-name', stage), sRole = $('.rv-role', stage), sN = $('.rv-n', stage);
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tmp = document.createElement('span'); const text = h => { tmp.innerHTML = h; return tmp.textContent; };
  // depth: 0 far, 1 mid, 2 near
  const L = [{ s: 0.52, v: 7, o: 0.5, b: 1.6 }, { s: 0.78, v: 12, o: 0.85, b: 0 }, { s: 1, v: 18, o: 1, b: 0 }];   // slow and steady: each depth glides at its own pace
  const people = items.map((v, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rv-p';
    b.setAttribute('aria-label', `${text(v.n)}: read their words`);
    b.innerHTML = `<img src="${v.img}" alt="" width="120" height="120" loading="lazy" decoding="async">`;
    host.appendChild(b);
    const d = i % 7 < 2 ? 0 : i % 7 < 4 ? 1 : 2;
    return { b, v, i, d, x: 0, y: 0, ph: rnd() * 6.28 };
  });
  const dots = Array.from({ length: 46 }, (_, k) => ({ d: k % 3, x: 0, y: 0, r: 1.4 + rnd() * 2.2, ph: rnd() * 6.28 }));
  let stageBox = null, W = 0, H = 0, VW = 0, dpr = 1, size = 64, cur = -1, hover = false, seen = false, t0 = 0, last = performance.now(), pulses = [], speed = 1;
  const DWELL = 6500;
  const lay = () => {
    W = el.clientWidth; H = el.clientHeight;
    if (!W) return;
    dpr = Math.min(devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; stageBox = null;
    const phone = W < 700;
    size = phone ? 46 : 68; VW = W + 220;
    seed = 5;
    // faces flow above and below the words; the far, soft ones also pass behind them
    // every depth is spread evenly along its own lanes, so faces never bunch up or pile on each other
    const lanes = { 0: [0.1, 0.5, 0.9], 1: [0.12, 0.88], 2: [0.24, 0.76] };
    if (phone) { lanes[1] = [0.08, 0.92]; lanes[2] = [0.2, 0.8]; }
    [0, 1, 2].forEach(d => {
      const group = people.filter(p => p.d === d), ys = lanes[d];
      group.forEach((p, k) => {
        const lane = k % ys.length, inLane = Math.floor(k / ys.length), per = Math.ceil(group.length / ys.length);
        p.x = (inLane + (lane / ys.length) + (rnd() - 0.5) * 0.25) / per * VW - 110;
        p.y = H * ys[lane] + (rnd() - 0.5) * H * (d === 0 ? 0.08 : 0.04);
        p.b.style.setProperty('--s', `${(size * L[p.d].s).toFixed(0)}px`); p.b.dataset.d = p.d;
      });
    });
    dots.forEach(p => { p.x = rnd() * VW - 110; p.y = 20 + rnd() * (H - 40); });
  };
  const pick = (i, user) => {
    if (i === cur) return;
    cur = i; t0 = performance.now();
    const v = items[i];
    people.forEach(p => p.b.classList.toggle('on', p.i === i));
    stage.classList.remove('in'); void stage.offsetWidth;
    sImg.src = v.img; sQ.innerHTML = `&ldquo;${v.q}&rdquo;`; sName.innerHTML = v.n; sRole.innerHTML = v.r || ''; sN.textContent = `${String(i + 1).padStart(2, '0')} / ${items.length}`;
    stage.classList.add('in'); stageBox = null;
    const p = people[i]; all().forEach(q => { if (q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 200) pulses.push({ a: p, b: q, t: 0, sp: 1.2 }); });
  };
  const all = () => [...people, ...dots];
  // the next person to speak is someone passing through the middle of the stream right now
  // the next to speak is a near face just arriving in the middle, so you can watch them pass while they talk
  const nextUp = () => { let best = -1, bd = 1e9; people.forEach(p => { if (p.d !== 2 || p.i === cur) return; const d = Math.abs(p.x - W * 0.4); if (d < bd) { bd = d; best = p.i; } }); return best < 0 ? (cur + 1) % items.length : best; };
  people.forEach(p => p.b.addEventListener('click', () => pick(p.i, true)));
  el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  el.addEventListener('pointerleave', () => { hover = false; });
  lay(); addEventListener('resize', lay); onAudience(() => requestAnimationFrame(lay));
  new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen && cur < 0) { if (!W) lay(); pick(nextUp()); } }, { threshold: 0.1 }).observe(el);
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!seen || !W) return;
    const live = !reduce && !isPaused();
    speed += ((hover ? 0 : 1) - speed) * Math.min(1, dt * 2);
    if (live && !hover && now - t0 > DWELL) pick(nextUp());
    const T = now / 1000;
    const move = p => {
      if (live) { p.x += L[p.d].v * speed * dt * (W < 700 ? 0.8 : 1); if (p.x > VW - 110) p.x -= VW; }   // left to right
      p.dy = Math.sin(T * 0.35 + p.ph) * (1.5 + p.d);
    };
    people.forEach(p => { move(p); p.b.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y + p.dy).toFixed(1)}px) translate(-50%, -50%)`; });
    dots.forEach(move);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const A = all();
    // links between neighbours of the same or next depth
    for (let i = 0; i < A.length; i++) {
      const a = A[i], ay = a.y + a.dy; let n = 0;
      for (let j = i + 1; j < A.length && n < 3; j++) {
        const b = A[j]; if (Math.abs(a.d - b.d) > 1) continue;
        const by = b.y + b.dy, d = Math.hypot(a.x - b.x, ay - by), lim = 120 + 40 * Math.min(a.d, b.d);
        if (d < lim) { n++; const k = 1 - d / lim; ctx.strokeStyle = `rgba(247,245,238,${(0.05 + 0.13 * k * (0.5 + Math.min(a.d, b.d) * 0.25)).toFixed(3)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, ay); ctx.lineTo(b.x, by); ctx.stroke(); }
      }
    }
    dots.forEach(p => { ctx.fillStyle = `rgba(247,245,238,${0.18 + p.d * 0.15})`; ctx.beginPath(); ctx.arc(p.x, p.y + p.dy, p.r, 0, 6.283); ctx.fill(); });
    // pulses, and now and then a new one somewhere in the stream
    if (live && Math.random() < dt * 5) { const a = A[Math.floor(Math.random() * A.length)], b = A[Math.floor(Math.random() * A.length)]; if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 170) pulses.push({ a, b, t: 0, sp: 0.6 + Math.random() * 0.5 }); }
    pulses = pulses.filter(q => (q.t += dt * q.sp) < 1);
    pulses.forEach(q => { const x = q.a.x + (q.b.x - q.a.x) * q.t, y = q.a.y + q.a.dy + (q.b.y + q.b.dy - q.a.y - q.a.dy) * q.t; const g = ctx.createRadialGradient(x, y, 0, x, y, 8); g.addColorStop(0, 'rgba(247,245,238,.9)'); g.addColorStop(.4, 'rgba(187,98,222,.8)'); g.addColorStop(1, 'rgba(187,98,222,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.fill(); });
    // the line of light from the speaker in the stream to their words
    const sp = people[cur];
    if (sp) {
      if (!stageBox) { const r = stage.getBoundingClientRect(), o = el.getBoundingClientRect(); stageBox = [r.left - o.left + r.width / 2, r.top - o.top, r.bottom - o.top]; }
      const fx = stageBox[0], fy = sp.y < H / 2 ? stageBox[1] : stageBox[2], sx = sp.x, sy = sp.y + sp.dy;
      const gr = ctx.createLinearGradient(sx, sy, fx, fy); gr.addColorStop(0, 'rgba(187,98,222,.95)'); gr.addColorStop(1, 'rgba(187,98,222,.15)');
      ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -T * 30;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + fx) / 2, sy, fx, fy); ctx.stroke(); ctx.setLineDash([]);
    }
  };
  requestAnimationFrame(tick);
}

export function initSections() {
  riverWall();
  nodeSegue();
  logoStrip();
  growthChart();
  teamScroll();
  seenOnce();
  voices();
  nudge();
  visuals();
  chart();
  threeBody();
  simple();
  steps();
  story();
  flowRow();
  duels();
  axApps();
  coaches();
  nodeWalls();
  scenes();
  feeds();
  pwApp();
  proofProfile();
  pathMap();
  peopleNet();
  if (!hasGsap) return;
  // under reduced motion: no heading reveals and no moving ticker
  if (!reduce) headings();
  reveal();
}

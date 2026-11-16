/* The page and the stream, bound together: the network section's four lines (a short pin),
   track labels that ride with their capsules, your own node's tag, calls to action that fire the network, the
   switch that turns the flow around, pause, and the render tick itself (same tick as
   the smooth scroll). */
import { gsap, ScrollTrigger, reduce, E, onPause, scrollVelocity } from '/js/motion.js?v=a2d8108bd7';
import { onAudience, audience } from '/js/ui.js?v=ea9c9e7efe';

const $ = (s, c = document) => c.querySelector(s);

/* the network section: a short pin. All four lines are on screen as one sequence; the
   one you're on is lit, the rest wait, and a fibre fills beside them. */
export function initNetworkScroll() {
  const sec = $('#network');
  if (!sec || reduce) return;
  const lines = [...sec.querySelectorAll('.net-line')];
  const fill = $('.net-fibre i', sec);
  let cur = -1;
  const set = p => {
    const i = Math.min(lines.length - 1, Math.floor(p * lines.length * 0.999));
    // the purple fill runs exactly from dot to dot, and rests on the lit one
    if (fill) {
      const rail = fill.parentElement.getBoundingClientRect();
      const dot = k => { const l = lines[Math.min(k, lines.length - 1)]; return l.getBoundingClientRect().top + parseFloat(getComputedStyle(l).fontSize) * 0.575 - rail.top; };
      const f = Math.min(1, (p * lines.length - i) * 1.6);
      const y = i < lines.length - 1 ? dot(i) + (dot(i + 1) - dot(i)) * Math.max(0, f - 0.6) / 0.4 * (f > 0.6 ? 1 : 0) : dot(i);
      fill.style.transform = `scaleY(${Math.max(0.01, y / Math.max(1, rail.height)).toFixed(4)})`;
    }
    if (i === cur) return;
    cur = i;
    // a timeline: each line arrives in turn and stays; the newest is lit
    lines.forEach((l, k) => { l.classList.toggle('on', k === i); l.classList.toggle('done', k < i); l.classList.toggle('wait', k > i); });
    sec.querySelectorAll('.net-prog i').forEach((b, k) => b.classList.toggle('on', k <= i));
  };
  set(0);
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => `+=${innerHeight * (matchMedia('(max-width: 767px)').matches ? 1.6 : 2)}`,
    pin: true, anticipatePin: 1, onUpdate: s => set(s.progress)
  });
}

export function bindStream(stream) {
  const layer = $('.stream-labels');
  let labelEls = [];
  const makeLabels = () => {
    layer.querySelectorAll('.stream-label').forEach(n => n.remove());
    labelEls = stream.labels.map(l => { const s = document.createElement('span'); s.className = 'stream-label'; s.textContent = l.text; layer.appendChild(s); return s; });
  };
  makeLabels();

  onPause(p => stream.setPaused(p));

  const panels = [...document.querySelectorAll('.panel')];
  // you are in the network too
  const you = document.createElement('span');
  you.className = 'you-tag'; you.innerHTML = '<span class="only-student">you</span><span class="only-company">your hire</span>';
  layer.appendChild(you);

  // the switch turns the stream around: students flow toward companies, companies toward students
  stream.setFlow(audience() === 'company' ? -1 : 1);
  onAudience(a => stream.setFlow(a === 'company' ? -1 : 1));

  // calls to action pull your node in, and a click fires the whole network
  document.querySelectorAll('.btn, .door').forEach(b => {
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') stream.attract(b); });
    b.addEventListener('pointerleave', () => stream.attract(null));
    b.addEventListener('click', () => stream.fire(b));
  });

  // the layout follows the page: rebuild when sections change height
  let pending = 0;
  const relayout = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => { stream.rebuild(); setTimeout(makeLabels, 160); }); };
  ScrollTrigger.addEventListener('refresh', relayout);
  onAudience(() => setTimeout(relayout, 900));

  // when nothing moves for a moment, draw at half rate: the ambient breath doesn't need 60fps
  let lastActive = performance.now(), skip = false, carry = 0;
  const wake = () => { lastActive = performance.now(); };
  addEventListener('pointermove', wake, { passive: true });
  addEventListener('pointerdown', wake, { passive: true });

  // one tick for scroll and canvas: Lenis updates first (it was added earlier), then we draw.
  // Everything this tick reads from the page is read before anything is written, so the browser
  // never has to lay the page out twice in one frame.
  const seq = document.querySelector('.net-seq');
  const zones = ['#top', '#what-we-do', '#network'].map(sel => document.querySelector(sel)).filter(Boolean).map(z => (z.parentElement && z.parentElement.classList.contains('pin-spacer') ? z.parentElement : z));
  let widths = [];
  const measure = () => { widths = labelEls.map(el => (el.offsetWidth || 0)); };
  measure();
  ScrollTrigger.addEventListener('refresh', () => setTimeout(measure, 200));
  if (document.fonts) document.fonts.ready.then(measure);
  gsap.ticker.add((t, deltaMs) => {
    const v = scrollVelocity();
    if (Math.abs(v) > 0.05) wake();
    const idle = performance.now() - lastActive > 1500;
    carry += deltaMs;
    skip = idle && !skip;
    if (skip) return;
    stream.frame(Math.min(0.05, carry / 1000), v, !idle);
    carry = 0;
    const m = stream.me;
    // reads
    const zr = zones.map(z => z.getBoundingClientRect());
    const sr = seq ? seq.getBoundingClientRect() : null;
    if (widths.length !== labelEls.length) measure();
    // your node rides with you through the hero and the network, and steps aside where the
    // page is showing its own interfaces
    stream.meAllow = zr.some(r => r.top < m.y && r.bottom > m.y);
    you.style.transform = `translate3d(${m.x.toFixed(1)}px, ${(m.y + 14).toFixed(1)}px, 0) translate(-50%, 0)`;
    // your tag only shows where the network is visible: inside one of its panels
    you.style.opacity = m.on.toFixed(2);
    stream.labels.forEach((l, i) => {
      const el = labelEls[i];
      if (!el) return;
      const p = stream.project(l.x, l.y, l.z);
      const vis = p.y > -60 && p.y < innerHeight + 60;
      const w = widths[i] || 0, half = w / 2 + 8;
      const x = Math.min(innerWidth - half, Math.max(half, p.x));   // labels never leave the screen
      // a label never sits on the words: hide it where it would cross the network's text
      const clash = !!(sr && vis && x + w / 2 > sr.left - 24 && x - w / 2 < sr.right + 24 && p.y > sr.top - 30 && p.y - 24 < sr.bottom + 20);
      const o = vis && !clash ? 1 : 0;
      if (el._o !== o) { el._o = o; el.style.opacity = o; }
      if (o || el._x === undefined) { el._x = x; el.style.transform = `translate3d(${x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`; }
    });
  });
}

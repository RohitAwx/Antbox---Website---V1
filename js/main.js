/* AntBox homepage entry. Content is all in the HTML; this adds the motion layer and the
   stream, a raw WebGL network that runs the full length of the page. */
import { gsap, hasGsap, reduce, startScroll, ScrollTrigger, lenis } from '/js/motion.js?v=a2d8108bd7';
import { initUI, onAudience, audience } from '/js/ui.js?v=ea9c9e7efe';
import { initSections } from '/js/sections.js?v=1d23836fc7';
import { runIntro, loadAtlas } from '/js/intro.js?v=158560180a';
import { initNetworkScroll, bindStream } from '/js/stream-scroll.js?v=11c73afe40';

const root = document.documentElement;
initUI();
startScroll();          // Lenis joins the GSAP ticker first...
initSections();
if (hasGsap) initNetworkScroll();
if (hasGsap) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }

/* sections off screen hold their looping CSS animations still: nothing far away keeps
   asking the browser for new frames */
const offIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '25% 0px' });
document.querySelectorAll('main > section, main > .pin-spacer > section, .footer').forEach(sec => offIO.observe(sec));

/* the hiring side opens on a dark hero: a different first impression from the student side */
const heroEl = document.getElementById('top');
const heroSide = a => { if (!heroEl) return; const c = a === 'company'; heroEl.classList.toggle('band-dark', c); heroEl.classList.toggle('band-light', !c); };
heroSide(audience()); onAudience(heroSide);

const canvas = document.querySelector('.stage-canvas');
const slot = document.querySelector('[data-stage-slot]');
const small = matchMedia('(max-width: 767px)').matches;

/* the black bands: rounded sheets painted behind the network (so it runs through them),
   measured from each dark section, or from its pin spacer when the section is pinned. A sheet
   comes in inset from the sides and widens to the page frame as it scrolls into view, then
   narrows again as it leaves: the page turns from white to black like a card sliding in. */
const bandLayer = document.querySelector('.bands');
// only sections that are showing: a side's hidden sections (display: none) measure as zero and would break the sheets
const bandHosts = () => [...document.querySelectorAll('.band-dark')].filter(sec => sec.getClientRects().length).map(sec => (sec.parentElement && sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec));
// black sections that follow one another share one sheet: no white seam between them
const bandGroups = () => {
  const out = [];
  bandHosts().forEach(h => {
    const prev = out[out.length - 1];
    const last = prev && prev[prev.length - 1];
    if (last && last.getBoundingClientRect().bottom >= h.getBoundingClientRect().top - 2) prev.push(h); else out.push([h]);
  });
  return out.map(g => ({ g, getBoundingClientRect() { const a = g[0].getBoundingClientRect(), b = g[g.length - 1].getBoundingClientRect(); return { top: a.top, bottom: b.bottom, height: b.bottom - a.top, left: a.left, right: a.right, width: a.width }; } }));
};
const clamp = v => Math.max(0, Math.min(1, v));
const SHEET_R = small ? 28 : 40;
let sheets = [];
let frameCache = 0;
function frameW() { return frameCache || (frameCache = parseFloat(getComputedStyle(root).getPropertyValue('--frame')) || 16); }
addEventListener('resize', () => { frameCache = 0; });
function sheetOf(r) {
  const vh = innerHeight, f = frameW(), most = small ? Math.min(innerWidth * 0.05, 18) : Math.min(innerWidth * 0.07, 96);
  const e = clamp(Math.min((vh - r.top) / (vh * 0.6), r.bottom / (vh * 0.6)));
  const k = 1 - Math.pow(1 - e, 3);
  return f + (1 - k) * most;
}
function seamAt() {}
function placeBands() {
  if (!bandLayer) return;
  const hosts = bandGroups();
  while (bandLayer.children.length > hosts.length) bandLayer.lastChild.remove();
  while (bandLayer.children.length < hosts.length) bandLayer.appendChild(document.createElement('i'));
  sheets = hosts.map((h, k) => {
    const r = h.getBoundingClientRect();
    const b = bandLayer.children[k];
    b.style.top = `${(r.top + window.scrollY).toFixed(0)}px`;
    b.style.height = `${r.height.toFixed(0)}px`;
    return { h, b, inset: -1 };
  });
  shapeBands();
}
function shapeBands() {
  // every frame the sheets follow the live layout: anything that grows or shrinks after load
  // (fonts, images, a pin, an app locking its height) can never leave a black sheet behind
  const hosts = bandHosts(), flat = sheets.flatMap(x => x.h.g);
  if (hosts.length !== flat.length || hosts.some((h, k) => flat[k] !== h)) { placeBands(); return; }
  sheets.forEach(s => {
    const r = s.h.getBoundingClientRect();
    const top = Math.round(r.top + window.scrollY), height = Math.round(r.height);
    if (top !== s.top) { s.top = top; s.b.style.top = `${top}px`; }
    if (height !== s.height) { s.height = height; s.b.style.height = `${height}px`; }
    seamAt(s, top, height);
    if (r.bottom < -40 || r.top > innerHeight + 40) return;
    const inset = frameW();   // full width, always: no white strips beside the black sections
    if (Math.abs(inset - s.inset) < 0.25) return;
    s.inset = inset;
    // a clip, not left/right: the sheet narrows without the page being laid out again
    const c = Math.max(0, inset - frameW());
    s.b.style.clipPath = c > 0.2 ? `inset(0 ${c.toFixed(1)}px round ${SHEET_R}px)` : 'none';
  });
}
function darkBands() {
  // the hiring side is dark from edge to edge: the network draws light everywhere
  if (root.getAttribute('data-aud') === 'company') return [{ top: 0, bottom: innerHeight, left: 0, right: innerWidth, radius: 0 }];
  return sheets.map(s => {
    const r = s.h.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: 0, right: innerWidth, radius: 0 };
  }).filter(r => r.bottom > 0 && r.top < innerHeight);
}
placeBands();
addEventListener('resize', placeBands);
addEventListener('load', placeBands);
if (hasGsap) {
  ScrollTrigger.addEventListener('refresh', placeBands);
  gsap.ticker.add(shapeBands);
  let lastH = 0, t = 0;
  new ResizeObserver(() => {
    const h = document.body.scrollHeight;
    if (Math.abs(h - lastH) < 2) return;
    lastH = h; clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 180);
  }).observe(document.querySelector('main') || document.body);
}
else addEventListener('scroll', shapeBands, { passive: true });

async function loadStream() {
  if (!canvas || !hasGsap) return null;
  try {
    const [atlas, { createStream }] = await Promise.all([loadAtlas('/images/network/faces.webp'), import('/js/stream/engine.js?v=db7f1420d4')]);
    // one continuous network down the whole page; on the black bands it is drawn in light ink
    const light = document.documentElement.dataset.theme !== 'dark';
    const stream = createStream({ canvas, slot, small, reduce, atlas, light, bands: darkBands });
    if (!stream) return null;
    bindStream(stream);          // ...then the stream draws in the same tick, after the scroll
    return stream;
  } catch (e) {
    console.warn('AntBox stream unavailable, keeping the still frame.', e);
    return null;
  }
}

const streamPromise = loadStream();
runIntro({ streamPromise });
streamPromise.then(stream => {
  if (!stream) { root.classList.add('stage-failed'); return; }
  if (location.hostname === 'localhost') { window.__antboxStream = stream; window.__lenis = lenis; }
  // the caption under the hero network shows while the people draw a Proof of Work
  let wasF = false, lastShape = -2, lastK = -1;
  const card = document.querySelector('.form-card');
  const watch = () => {
    const k = stream.formK, f = k > 0.55, sh = stream.formShape;
    if (f !== wasF) { wasF = f; root.classList.toggle('forming', f); }
    if (sh !== lastShape) { lastShape = sh; root.dataset.formShape = sh; }
    const ck = (root.getAttribute('data-aud') === 'company' ? sh === 0 : sh === 5) ? Math.round(k * 200) / 200 : 0;
    if (card && ck !== lastK) { lastK = ck; card.style.setProperty('--fk', ck); }
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
});

if (hasGsap) {
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
}

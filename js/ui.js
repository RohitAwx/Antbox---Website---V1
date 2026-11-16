/* Persistent UI: the Student / Company switch, nav, chapter marker with the pause
   button, magnetic buttons, card tilt and spotlights. */
import { gsap, hasGsap, reduce, fine, D, E, setPaused, onPause, isPaused, scrollY, ScrollTrigger } from '/js/motion.js?v=a2d8108bd7';

const root = document.documentElement;
const audListeners = new Set();
export const audience = () => root.getAttribute('data-aud') || 'student';
export const onAudience = fn => audListeners.add(fn);

/* ---------- the switch ---------- */
const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; };
let switching = null;
export function setAudience(a, { animate = true } = {}) {
  const from = audience();
  if (a === from && animate) return;
  document.querySelectorAll('[data-switch] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aud === a)));
  try { localStorage.setItem('antbox-aud', a); } catch (e) {}
  try { history.replaceState(null, '', a === 'company' ? '#companies' : '#students'); } catch (e) {}
  const apply = () => { root.setAttribute('data-aud', a); audListeners.forEach(fn => fn(a, from)); if (ScrollTrigger) ScrollTrigger.refresh(); };
  if (!animate || !hasGsap || reduce) { apply(); return; }
  // finish any switch still running, and clear every inline style it left behind
  if (switching) switching.progress(1);
  gsap.killTweensOf('.only-student, .only-company');
  gsap.set('.only-student, .only-company', { clearProps: 'opacity,visibility,transform,filter' });
  const oldSel = from === 'company' ? '.only-company' : '.only-student';
  const newSel = a === 'company' ? '.only-company' : '.only-student';
  const pick = sel => [...document.querySelectorAll(`.hero ${sel}, .nav ${sel}`)].filter(inView);
  const outEls = pick(oldSel);
  const heroWordOut = document.querySelector(`.ht-1 ${oldSel}`);
  // outgoing text blurs and drops (0.4s), incoming rises word by word (to 0.8s total)
  const tl = gsap.timeline({ onComplete: () => { switching = null; } });
  switching = tl;
  tl.to(outEls.filter(el => el !== heroWordOut), { autoAlpha: 0, y: 10, duration: D.fast, ease: E.inOut, stagger: 0.02 }, 0);
  if (heroWordOut) tl.to(heroWordOut, { yPercent: 40, autoAlpha: 0, duration: D.fast, ease: E.inOut }, 0);
  tl.add(() => {
    gsap.set(outEls.concat(heroWordOut || []), { clearProps: 'opacity,visibility,transform,filter' });
    apply();
    const inEls = pick(newSel);
    const heroWordIn = document.querySelector(`.ht-1 ${newSel}`);
    const line = document.querySelector('.ht-1');
    if (heroWordIn) {
      line.classList.add('is-masked');
      gsap.fromTo(heroWordIn, { yPercent: 130 }, { yPercent: 0, duration: D.fast, ease: E.out, onComplete: () => line.classList.remove('is-masked') });
    }
    gsap.fromTo(inEls.filter(el => el !== heroWordIn), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: D.fast, ease: E.out, stagger: 0.04, clearProps: 'opacity,visibility,transform' });
  }, D.fast - 0.08);
}

function initSwitch() {
  document.querySelectorAll('[data-switch] button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.aud === audience()));
    b.addEventListener('click', () => setAudience(b.dataset.aud));
  });
  // arrow keys move between the two options, like a segmented control
  document.querySelectorAll('[data-switch]').forEach(g => g.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const next = e.key === 'ArrowRight' ? 'company' : 'student';
    setAudience(next);
    g.querySelector(`[data-aud="${next}"]`).focus();
  }));
  addEventListener('hashchange', () => {
    if (location.hash === '#companies') setAudience('company');
    if (location.hash === '#students') setAudience('student');
  });
}

/* ---------- nav ---------- */
function initNav() {
  const nav = document.getElementById('nav');
  const toggle = nav.querySelector('.nav-toggle');
  const close = () => { toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; nav.classList.remove('menu-open'); };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('menu-open', open);
    nav.classList.remove('is-hidden');
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('menu-open')) { close(); toggle.focus(); } });
  nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', close));
  // footer links that name a side: on the homepage, switch side and glide there; elsewhere the
  // link itself carries the side (?for=) to the homepage
  document.querySelectorAll('a[data-go-aud]').forEach(a => a.addEventListener('click', e => {
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !document.querySelector(url.hash || '#top')) return;
    e.preventDefault();
    const aud = a.dataset.goAud;
    const go = () => { const t = document.querySelector(url.hash); if (!t) return; const y = t.getBoundingClientRect().top + window.scrollY - 70; if (window.__antboxLenis) window.__antboxLenis.scrollTo(y, { duration: 1.4 }); else scrollTo({ top: y, behavior: 'smooth' }); };
    if (aud && aud !== audience()) { setAudience(aud, { animate: false }); setTimeout(go, 450); } else go();
  }));
  // hides on scroll down, returns on scroll up; never hides while it holds focus
  let last = 0;
  const hero = document.querySelector('.hero .switch');
  // the Foundation Day banner sits above the bar and scrolls away; the bar slides up into its place
  const fdb = document.querySelector('.fdb');
  let fdbH = fdb ? fdb.offsetHeight : 0, navTop = -1;
  addEventListener('resize', () => { fdbH = fdb ? fdb.offsetHeight : 0; navTop = -1; });
  const onScroll = () => {
    const y = scrollY();
    const t = Math.max(0, Math.round(fdbH - y));
    if (t !== navTop) { navTop = t; nav.style.top = `${t}px`; }
    if (hero) nav.classList.toggle('past-hero', hero.getBoundingClientRect().bottom < 0);
    nav.classList.toggle('is-scrolled', y > 24);
    document.documentElement.classList.toggle('at-hero', y < innerHeight * 0.6);
    const close = document.getElementById('start');
    document.documentElement.classList.toggle('at-end', !!close && close.getBoundingClientRect().top < innerHeight * 0.8);
    const mid = 72, dark = [...document.querySelectorAll('.band-dark')].some(el => { if (el.closest('.nav')) return false; const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
    nav.classList.toggle('on-dark', dark);
    last = y;
  };
  if (hasGsap) gsap.ticker.add(onScroll); else addEventListener('scroll', onScroll, { passive: true });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
}

/* ---------- chapter marker + pause ---------- */
function initChapter() {
  const el = document.querySelector('[data-chapter-marker]');
  if (!el) return;
  el.hidden = false;
  const n = el.querySelector('.chapter-n span'), t = el.querySelector('.chapter-t');
  const btn = el.querySelector('.chapter-pause');
  const sync = p => { btn.setAttribute('aria-pressed', String(p)); btn.setAttribute('aria-label', p ? 'Play motion' : 'Pause motion'); };
  onPause(sync);
  btn.addEventListener('click', () => setPaused(!isPaused()));
  if (reduce) btn.hidden = true;
  if (!hasGsap) return;
  const sections = [...document.querySelectorAll('[data-chapter]')];
  let current = -1;
  const show = i => {
    if (i === current) return;
    const dir = i > current ? 1 : -1;
    current = i;
    const label = String(i + 1).padStart(2, '0');
    if (reduce) { n.textContent = label; t.textContent = sections[i].dataset.chapter; return; }
    gsap.timeline()
      .to(n, { yPercent: -110 * dir, duration: 0.2, ease: E.inOut })
      .add(() => { n.textContent = label; t.textContent = sections[i].dataset.chapter; })
      .fromTo(n, { yPercent: 110 * dir }, { yPercent: 0, duration: D.fast, ease: E.out });
  };
  sections.forEach((sec, i) => ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: s => { if (s.isActive) show(i); } }));
  show(0);
}

/* ---------- magnets, tilt, spotlight ---------- */
function initPointer() {
  document.querySelectorAll('.spot').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));
  if (!fine || reduce || !hasGsap) return;
  document.querySelectorAll('.magnet').forEach(el => {
    const mx = gsap.quickTo(el, 'x', { duration: D.fast, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: D.fast, ease: 'power3' });
    const area = 80;
    addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const near = Math.abs(dx) < r.width / 2 + area && Math.abs(dy) < r.height / 2 + area;
      mx(near ? Math.max(-10, Math.min(10, dx * 0.22)) : 0);
      my(near ? Math.max(-10, Math.min(10, dy * 0.3)) : 0);
    }, { passive: true });
  });
  document.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(el, { rotationY: x * 12, rotationX: -y * 12, transformPerspective: 1200, duration: D.base, ease: E.out, overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotationY: 0, rotationX: 0, duration: D.base, ease: E.spring, overwrite: 'auto' }));
  });
}

/* ---------- FAQ: smooth height and audience order ---------- */
const FAQ_ORDER = {
  student: ['join', 'selected', 'capsule', 'what', 'company', 'university', 'where'],
  company: ['company', 'what', 'selected', 'capsule', 'join', 'university', 'where']
};
function initFaq() {
  const list = document.querySelector('[data-faq]');
  if (!list) return;
  const order = a => FAQ_ORDER[a].forEach(k => { const q = list.querySelector(`[data-q="${k}"]`); if (q) list.appendChild(q); });
  order(audience());
  onAudience(a => order(a));
  if (reduce) return;
  list.querySelectorAll('details').forEach(d => {
    const summary = d.querySelector('summary'), body = d.querySelector('.answer');
    summary.addEventListener('click', e => {
      e.preventDefault();
      if (d.dataset.busy) return;
      d.dataset.busy = '1';
      const opening = !d.open;
      const start = d.offsetHeight;
      if (opening) d.open = true;
      const end = opening ? summary.offsetHeight + body.offsetHeight : summary.offsetHeight;
      const anim = d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)' });
      anim.onfinish = () => { if (!opening) d.open = false; delete d.dataset.busy; };
    });
  });
}

export function initUI() {
  initSwitch();
  initNav();
  initChapter();
  initPointer();
  initFaq();
}

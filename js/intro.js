/* The opening, kept light: there is no loading screen. The page is readable on first
   paint, the hero settles in (about a second), and the network opens as a brain as soon
   as its faces have loaded. */
import { gsap, hasGsap, reduce, D, E } from '/js/motion.js?v=a2d8108bd7';
import { setAudience } from '/js/ui.js?v=ea9c9e7efe';

const root = document.documentElement;

/* the faces atlas, decoded before the network starts */
export async function loadAtlas(url) {
  try {
    // decode as an image (no fetch), so it also works where network requests are locked down
    const img = new Image();
    img.src = url;
    await img.decode();
    return await createImageBitmap(img);
  } catch (e) {
    return null;
  }
}

export function buildPage({ fast = false } = {}) {
  if (!hasGsap || reduce) return gsap ? gsap.timeline() : null;
  const d = fast ? D.fast : D.base;
  const tl = gsap.timeline({ defaults: { ease: E.out } });
  const words = document.querySelectorAll('.hero-title .ht-word');
  const lines = document.querySelectorAll('.hero-title .ht-line');
  lines.forEach(l => l.classList.add('is-masked'));
  tl.from('.nav-bar', { y: -24, autoAlpha: 0, duration: d }, 0)
    .from(words, { yPercent: 130, duration: d, stagger: 0.04, onComplete: () => lines.forEach(l => l.classList.remove('is-masked')) }, fast ? 0.06 : 0.16)
    .from('.hero-sub', { y: 14, autoAlpha: 0, duration: D.fast }, fast ? 0.12 : 0.4)
    .from('.hero-actions > *', { y: 14, autoAlpha: 0, duration: D.fast, stagger: 0.04 }, fast ? 0.16 : 0.46);
  return tl;
}

/* the hero settles in now. Then the opening: a brain draws itself out of firing neurons,
   holds for a breath, and comes apart into people (the cluster). Scrolling hurries it;
   arriving mid-page or with reduced motion skips straight to the people. */
/* The question, asked once a visit while the brain holds on black: student or hiring?
   The page then opens on that side. "Surprise me" picks one and says so. Arriving with a
   side in the link (#students / #companies) skips the question. */
function askSide() {
  const gate = document.querySelector('.gate');
  let asked = false;
  try { asked = sessionStorage.getItem('antbox-asked') === '1'; } catch (e) {}
  if (!gate || asked || /^#(students|companies)$/.test(location.hash)) return null;
  return {
    show() {
      return new Promise(done => {
        gate.hidden = false;
        root.classList.add('gate-on');
        requestAnimationFrame(() => requestAnimationFrame(() => { gate.classList.add('on'); gate.querySelectorAll('animateMotion').forEach(m => { try { m.beginElement(); } catch (e) {} }); }));
        setTimeout(() => (gate.setAttribute('tabindex', '-1'), gate.focus({ preventScroll: true })), 400);
        const pick = (how, auto) => {
          let side = how, surprise = false;
          try { sessionStorage.setItem('antbox-asked', '1'); } catch (e) {}
          setAudience(side, { animate: false });
          gate.classList.remove('on');
          root.classList.remove('gate-on');
          setTimeout(() => { gate.hidden = true; }, 500);
          done({ side, surprise, auto: !!auto });
        };
        // nobody picks within five seconds: open the student page. Pointing at a choice pauses
        // the clock, so someone still reading is never rushed.
        let left = 5000, last = performance.now(), held = false, picked = false;
        const n = gate.querySelector('[data-gate-n]'), bar = gate.querySelector('.gx-timer i');
        gate.querySelectorAll('[data-pick]').forEach(o => { o.addEventListener('pointerenter', () => { held = true; gate.classList.add('held'); }); o.addEventListener('pointerleave', () => { held = false; gate.classList.remove('held'); }); });
        const tick = now => {
          if (picked) return;
          const dt = now - last; last = now;
          if (!held) left -= dt;
          if (n) n.textContent = Math.max(1, Math.ceil(left / 1000));
          if (bar) bar.style.transform = `scaleX(${Math.max(0, left / 5000).toFixed(3)})`;
          if (left <= 0) { picked = true; pick('student', true); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(t => { last = t; requestAnimationFrame(tick); });
        const pick0 = pick;
        gate.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { if (!picked) { picked = true; pick0(b.dataset.pick); } }));
        gate.addEventListener('keydown', e => {
          if (e.key === 'Escape' && !picked) { picked = true; pick0('student', true); }
          if (e.key === 'Tab') { // keep focus inside the question
            const f = [...gate.querySelectorAll('button')], i = f.indexOf(document.activeElement);
            if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
            else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
          }
        });
      });
    }
  };
}
function pickedToast(side) {
  const t = document.querySelector('.pick-toast');
  if (!t) return;
  t.querySelector('[data-pick-msg]').innerHTML = side === 'company'
    ? 'Showing AntBox for <b>hiring teams</b>. Switch any time at the top of the page.'
    : 'Showing AntBox for <b>students</b>. Hiring? Switch at the top of the page.';
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 500); }, 5200);
}

export function runIntro({ streamPromise }) {
  /* The loading moment, on black: a brain pops into the middle of the screen and asks who
     is visiting; then it breaks into nodes that stream out into the page as the black lifts.
     The black waits for the network (up to 2.6s on a slow first visit), then the sequence
     runs on its own clock, advanced at most one 30fps step per frame, so a slow first frame
     can never skip the brain. No network at all: the page simply builds. */
  const booting = root.classList.contains('boot');
  let built = false;
  const build = () => { if (built) return; built = true; root.classList.remove('boot', 'pre', 'asking'); buildPage({ fast: true }); };
  const legend = () => { root.classList.add('legend-on'); setTimeout(() => root.classList.remove('legend-on'), 4200); };
  if (!booting) build();
  const giveUp = booting ? setTimeout(build, 2600) : 0;
  streamPromise.then(stream => {
    if (!stream) { build(); return; }
    root.classList.add('stage-on');
    if (!booting || built || reduce || !hasGsap) {
      clearTimeout(giveUp); build();
      stream.brainIn = 1; stream.morph = 1; stream.photoReveal = 1; stream.boot = false;
      root.classList.add('brain-done'); legend();
      return;
    }
    clearTimeout(giveUp);
    const ask = askSide();
    root.classList.add('brain-on');
    stream.bootY = ask ? (innerWidth < 560 ? 0.22 : 0.33) : 0.5;
    if (ask) root.classList.add('asking');
    stream.boot = true; stream.brainIn = 0; stream.morph = 0; stream.photoReveal = 0;
    const e3 = t => 1 - Math.pow(1 - t, 3), io = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
    const BUILD = 1.0, END = 2.3, HOLD = 0.7;
    let t = 0, last = 0, warm = 2, shocked = false, unbooted = false, waiting = false, answer = null;
    const step = now => {
      if (warm > 0) { warm--; last = now; requestAnimationFrame(step); return; }   // let the GPU settle first
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      // the brain holds (still firing) until the question is answered
      if (ask && !answer) {
        if (t >= HOLD && !waiting) { waiting = true; ask.show().then(a => { answer = a; }); }
        t = Math.min(HOLD, t + dt);
      } else t += dt;
      stream.brainIn = e3(seg(t, 0, 0.6));
      stream.morph = io(seg(t, BUILD, BUILD + 1.15));
      stream.photoReveal = e3(seg(t, 1.6, 2.3));
      if (!shocked && t >= BUILD) { shocked = true; stream.shock(); build(); if (answer && answer.auto) setTimeout(() => pickedToast(answer.side), 900); }
      if (!unbooted && t >= 1.55) { unbooted = true; stream.boot = false; }
      if (t < END) { requestAnimationFrame(step); return; }
      root.classList.remove('brain-on'); root.classList.add('brain-done'); legend();
    };
    requestAnimationFrame(step);
  });
  return { done: Promise.resolve() };
}

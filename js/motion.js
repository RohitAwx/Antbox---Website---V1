/* The one motion system: three eases, three durations, Lenis driving ScrollTrigger
   from a single ticker, reduced motion and the pause button. Everything else imports this. */
const root = document.documentElement;
export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
export const hasGsap = !!(gsap && ScrollTrigger);
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
export const D = { fast: 0.4, base: 0.8, slow: 1.4 };
export const E = { out: 'antbox.out', inOut: 'antbox.inOut', spring: 'antbox.spring' };

if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger, window.SplitText, window.CustomEase);
  const CE = window.CustomEase;
  // antbox.out: fast out, long soft settle. inOut: for anything travelling between two places.
  // spring: one soft overshoot (about 4%) that settles.
  CE.create('antbox.out', 'M0,0 C0.16,1 0.3,1 1,1');
  CE.create('antbox.inOut', 'M0,0 C0.7,0 0.15,1 1,1');
  CE.create('antbox.spring', 'M0,0 C0.18,0 0.2,1.06 0.42,1.045 0.6,1.03 0.7,0.995 1,1');
  gsap.defaults({ ease: E.out, duration: D.base });
}
root.classList.toggle('reduce', reduce);
if (!reduce && hasGsap) root.classList.add('js-motion');

/* pause: one switch for every ambient loop (WCAG 2.2.2). Remembered for the session. */
const pauseListeners = new Set();
let paused = false;
try { paused = sessionStorage.getItem('antbox-paused') === '1'; } catch (e) {}
export const isPaused = () => paused || reduce;
export function setPaused(p) {
  paused = p;
  try { sessionStorage.setItem('antbox-paused', p ? '1' : '0'); } catch (e) {}
  root.classList.toggle('motion-paused', p);
  pauseListeners.forEach(fn => fn(p));
}
export const onPause = fn => { pauseListeners.add(fn); fn(paused); };
root.classList.toggle('motion-paused', paused);

/* smooth scroll */
export let lenis = null;
export function startScroll() {
  if (!hasGsap || reduce || !window.Lenis) return null;
  // the wheel scrolls natively (no easing between your hand and the page); Lenis stays for
  // the eased jumps the page makes itself (anchors, tapping a step)
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: false, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  window.__antboxLenis = lenis;
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
export const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
export const scrollVelocity = () => (lenis ? lenis.velocity : 0);

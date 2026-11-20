/* Footer-only return control. Existing content, motion controls and shared styles stay intact. */
(() => {
  if (document.querySelector('[data-antbox-back-to-top]')) return;

  const host = document.createElement('div');
  host.setAttribute('data-antbox-back-to-top', '');
  host.hidden = true;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host {
        position: fixed;
        right: max(calc(16px + env(safe-area-inset-right, 0px)), var(--btt-right, 20px));
        bottom: var(--btt-bottom, 20px);
        z-index: 55;
        color-scheme: light;
      }
      :host([hidden]) { display: none !important; }
      button {
        box-sizing: border-box;
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        padding: 0;
        border: 1px solid rgb(255 255 255 / .6);
        border-radius: 50%;
        background: linear-gradient(145deg, rgb(255 255 255 / .2), rgb(255 255 255 / .04));
        -webkit-backdrop-filter: blur(12px) saturate(125%);
        backdrop-filter: blur(12px) saturate(125%);
        box-shadow: inset 0 1px 0 rgb(255 255 255 / .35), inset 0 -1px 0 rgb(255 255 255 / .08), 0 8px 24px rgb(26 26 26 / .18);
        color: #fff;
        cursor: pointer;
        touch-action: manipulation;
        transition: border-color .2s, background .2s, box-shadow .2s;
      }
      svg { display: block; width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      @media (hover: hover) {
        button:hover { border-color: #bb62de; background: linear-gradient(145deg, rgb(255 255 255 / .28), rgb(187 98 222 / .12)); box-shadow: inset 0 1px 0 rgb(255 255 255 / .45), 0 8px 24px rgb(26 26 26 / .2); }
      }
      button:focus-visible { outline: 3px solid #bb62de; outline-offset: 4px; }
      @media (max-width: 767px) { button { width: 48px; height: 48px; } }
      @media (prefers-reduced-motion: reduce) { button { transition: none; } }
      @media (forced-colors: active) { button { border: 1px solid ButtonText; } }
    </style>
    <button type="button" aria-label="Back to top" title="Back to top">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20V4M5 11l7-7 7 7"/></svg>
    </button>
  `;
  document.body.appendChild(host);

  const footer = document.querySelector('.ft2-wrap');
  const chapter = document.querySelector('[data-chapter-marker]');
  const pause = chapter?.querySelector('.chapter-pause');
  let frame = 0;
  function update() {
    frame = 0;
    const viewportHeight = document.documentElement.clientHeight;
    const cta = [...document.querySelectorAll('.ft2-cta .btn')].find(el => el.getClientRects().length);
    const rect = cta?.getBoundingClientRect();
    const inFooter = footer && rect && rect.top >= 0 && rect.bottom <= viewportHeight;
    // Wait for the existing pause control to fade out. Never show both controls.
    const pauseVisible = inFooter && pause && !pause.hidden && chapter.getClientRects().length &&
      (chapter.matches(':focus-within') || (getComputedStyle(chapter).visibility !== 'hidden' && Number(getComputedStyle(chapter).opacity) > 0));
    host.hidden = !inFooter || !!pauseVisible;
    if (host.hidden) return;
    const viewportWidth = document.documentElement.clientWidth;
    host.style.setProperty('--btt-right', `${Math.max(16, viewportWidth - footer.getBoundingClientRect().right)}px`);
    host.style.setProperty('--btt-bottom', `${viewportHeight - (rect.top + rect.height / 2) - host.getBoundingClientRect().height / 2}px`);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  chapter?.addEventListener('transitionend', schedule);
  chapter?.addEventListener('transitioncancel', schedule);
  chapter?.addEventListener('focusin', schedule);
  chapter?.addEventListener('focusout', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-aud', 'class'] });
  if (chapter) observer.observe(chapter, { attributes: true, attributeFilter: ['hidden'] });
  if (pause) observer.observe(pause, { attributes: true, attributeFilter: ['hidden'] });
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(schedule);
    document.querySelectorAll('.ft2-wrap, .ft2-cta .btn').forEach(el => resizeObserver.observe(el));
  }

  shadow.querySelector('button').addEventListener('click', event => {
    // Keyboard users return to the main content instead of losing focus as we hide.
    if (event.detail === 0) document.getElementById('main')?.focus({ preventScroll: true });
    const immediate = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-paused');
    const lenis = window.__antboxLenis;
    if (lenis && !lenis.isStopped && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(0, { offset: 0, duration: 1.1, immediate });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: immediate ? 'instant' : 'smooth' });
    }
  });
  schedule();
})();

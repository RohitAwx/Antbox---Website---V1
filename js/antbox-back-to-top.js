/* Contextual return control: yields to motion controls and keeps the footer CTA alignment. */
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
        bottom: max(calc(20px + env(safe-area-inset-bottom, 0px)), var(--btt-bottom, 20px));
        z-index: 55;
        color-scheme: light;
      }
      :host([hidden]) { display: none !important; }
      :host([data-footer-row]) { bottom: var(--btt-bottom); }
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
        animation: btt-appear .24s ease-out both;
      }
      :host([data-footer-row]) button { animation-name: btt-footer-appear; }
      :host([data-on-light]) button { color: #261b2f; border-color: rgb(26 26 26 / .35); }
      @keyframes btt-appear { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @keyframes btt-footer-appear { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      :host([data-still]) button { animation: none; transition: none; }
      svg { display: block; width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      @media (hover: hover) {
        button:hover { border-color: #bb62de; background: linear-gradient(145deg, rgb(255 255 255 / .28), rgb(187 98 222 / .12)); box-shadow: inset 0 1px 0 rgb(255 255 255 / .45), 0 8px 24px rgb(26 26 26 / .2); }
      }
      button:focus-visible { outline: 3px solid #bb62de; outline-offset: 4px; }
      @media (max-width: 767px) { button { width: 48px; height: 48px; } }
      @media (prefers-reduced-motion: reduce) { button { animation: none; transition: none; } }
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
  const blockers = [...document.querySelectorAll('.nudge, .voice-pop, .ft2-base')];
  let frame = 0;
  function update() {
    frame = 0;
    const viewportHeight = document.documentElement.clientHeight;
    const cta = [...document.querySelectorAll('.ft2-cta .btn')].find(el => el.getClientRects().length);
    const rect = cta?.getBoundingClientRect();
    const inFooter = footer && rect && rect.top >= 0 && rect.bottom <= viewportHeight;
    // Reserve the corner before pause/play fades in; wait for its fade-out to finish.
    const pauseStyle = chapter && getComputedStyle(chapter);
    const pausePresent = pause && !pause.hidden && pause.getClientRects().length && pauseStyle.visibility !== 'hidden';
    const pauseVisible = pausePresent && (chapter.matches(':focus-within') ||
      !document.documentElement.matches('.at-hero, .at-end') || Number(pauseStyle.opacity) > 0);
    host.hidden = window.scrollY < 160 || !!pauseVisible;
    if (host.hidden) return;
    host.toggleAttribute('data-footer-row', !!inFooter);
    host.toggleAttribute('data-still', document.documentElement.classList.contains('motion-paused'));
    const viewportWidth = document.documentElement.clientWidth;
    const navCta = [...document.querySelectorAll('.nav .nav-cta')].find(el => el.getClientRects().length);
    const rightEdge = inFooter ? footer.getBoundingClientRect().right : navCta?.getBoundingClientRect().right ?? viewportWidth - 20;
    host.style.setProperty('--btt-right', `${Math.max(16, viewportWidth - rightEdge)}px`);
    const own = host.getBoundingClientRect();
    let bottom = 20;
    // Keep reminders, open voice cards and the copyright line unobstructed.
    blockers.forEach(el => {
      if (el.hidden || (el.matches('.nudge, .voice-pop') && (!el.classList.contains('on') || el.classList.contains('quiet')))) return;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.top < viewportHeight && r.bottom > 0 && r.right > own.left - 12 && r.left < own.right + 12) {
        bottom = Math.max(bottom, viewportHeight - r.top + 12);
      }
    });
    host.style.setProperty('--btt-bottom', `${inFooter ? viewportHeight - (rect.top + rect.height / 2) - own.height / 2 : bottom}px`);
    const placed = host.getBoundingClientRect();
    const beneath = document.elementsFromPoint(placed.left + placed.width / 2, placed.top + placed.height / 2).find(el => el !== host);
    const band = beneath?.closest('.band-dark, .band-light');
    const dark = band ? band.classList.contains('band-dark') : document.documentElement.getAttribute('data-aud') === 'company';
    host.toggleAttribute('data-on-light', !dark);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  chapter?.addEventListener('transitionrun', schedule);
  chapter?.addEventListener('transitionend', schedule);
  chapter?.addEventListener('transitioncancel', schedule);
  chapter?.addEventListener('focusin', schedule);
  chapter?.addEventListener('focusout', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-aud', 'class'] });
  if (chapter) observer.observe(chapter, { attributes: true, attributeFilter: ['hidden'] });
  if (pause) observer.observe(pause, { attributes: true, attributeFilter: ['hidden'] });
  blockers.forEach(el => observer.observe(el, { attributes: true, attributeFilter: ['class', 'hidden'] }));
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

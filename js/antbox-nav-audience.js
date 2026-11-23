/* Reuse the existing [data-switch] handlers; no second audience state or reload. */
const nav = document.querySelector('#nav');
const control = nav?.querySelector('.nav-audience-control');
const heroSwitch = document.querySelector('.hero [data-switch]');
const hero = heroSwitch?.closest('.hero');

if (control) {
  const bar = nav.querySelector('.nav-bar');
  const logo = nav.querySelector('.logo');
  const links = nav.querySelector('.nav-links');
  const right = nav.querySelector('.nav-right');
  let frame = 0;
  let visible = control.classList.contains('is-visible');

  function update() {
    frame = 0;
    const navRect = bar.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    // Homepage: hand over when the first section leaves the viewport.
    // Legal pages: always provide links back to either homepage audience.
    const show = !heroRect || heroRect.bottom <= navRect.bottom;
    const mobile = matchMedia('(max-width: 979px)').matches;
    const logoRect = logo.getBoundingClientRect();
    const rightRect = right.getBoundingClientRect();
    const gap = mobile ? 8 : 16;
    const width = mobile
      ? Math.min(220, rightRect.left - logoRect.right - 2 * gap)
      : innerWidth < 1200 ? 188 : 220;
    const baseLinksLeft = navRect.left + links.offsetLeft;
    const nextShift = !mobile && show
      ? Math.max(0, logoRect.right + gap + width + gap - baseLinksLeft) : 0;
    const end = mobile ? rightRect.left : baseLinksLeft + nextShift;
    const left = Math.max(logoRect.right + gap, (logoRect.right + end - width) / 2);
    control.style.setProperty('--aud-left', `${left - navRect.left}px`);
    control.style.setProperty('--aud-width', `${Math.max(0, width)}px`);
    // On smaller desktops use the spare space before the CTA, without moving it.
    nav.setAttribute('data-audience-shift', '');
    nav.style.setProperty('--aud-links-shift', `${nextShift}px`);
    if (show !== visible) {
      visible = show;
      if (!show && heroSwitch && control.contains(document.activeElement)) {
        const selected = control.querySelector('[aria-pressed="true"]');
        heroSwitch.querySelector(`[data-aud="${selected.dataset.aud}"]`).focus({ preventScroll: true });
      }
      control.inert = !show;
      control.setAttribute('aria-hidden', String(!show));
      control.classList.toggle('is-visible', show);
    }
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  if (hero) new ResizeObserver(schedule).observe(hero);
  // The existing nav already measures scrolling and both audience layouts.
  new MutationObserver(schedule).observe(nav, { attributes: true, attributeFilter: ['class'] });
  control.querySelectorAll('a[data-aud]').forEach(link => {
    const selected = link.dataset.aud === document.documentElement.dataset.aud;
    link.classList.toggle('is-selected', selected);
    if (selected) link.setAttribute('aria-current', 'true');
  });
  document.fonts?.ready.then(schedule);
  schedule();
}

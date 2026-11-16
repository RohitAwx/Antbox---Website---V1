/* Lead forms (Register, Book a call). Each submission goes to the Google Apps Script web app
   in site.json LEAD_ENDPOINT, which adds a row to the leads sheet and announces it in Slack
   (tools/lead-capture.gs). Until that URL is set, the form says so instead of pretending. */
import { startScroll } from '/js/motion.js?v=a2d8108bd7';
import { initUI, setAudience } from '/js/ui.js?v=ea9c9e7efe';
initUI();
startScroll();
const side = document.documentElement.dataset.pageAud;
if (side) setAudience(side, { animate: false });

let cfg = {};
try { cfg = JSON.parse(document.getElementById('lead-config').textContent); } catch (e) {}

document.querySelectorAll('form[data-lead]').forEach(form => {
  const go = form.querySelector('.fp-go'), done = form.querySelector('.fp-done'), err = form.querySelector('.fp-err');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    if (!form.checkValidity()) {
      form.classList.add('tried');
      const bad = form.querySelector(':invalid');
      if (bad) bad.focus();
      return;
    }
    const data = new URLSearchParams(new FormData(form));
    data.set('page', location.pathname);
    data.set('source', new URLSearchParams(location.search).get('from') || document.referrer || 'direct');
    go.disabled = true; go.classList.add('busy');
    try {
      if (!cfg.endpoint) throw new Error('not connected');
      // Apps Script answers with a redirect that browsers block for reading; no-cors still delivers the post
      await fetch(cfg.endpoint, { method: 'POST', mode: 'no-cors', body: data });
      [...form.children].forEach(c => { if (c !== done) c.hidden = true; });
      done.hidden = false;
      done.setAttribute('tabindex', '-1'); done.focus();
    } catch (x) {
      err.textContent = cfg.endpoint ? 'Something went wrong. Please try again in a minute.' : 'This form is not connected yet (preview). Once the lead endpoint is added, it will send straight to the AntBox team.';
      err.hidden = false;
    } finally { go.disabled = false; go.classList.remove('busy'); }
  });
});

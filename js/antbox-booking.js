(() => {
  // UI-only modal. Submission will be connected in a later release.
  const headings = {
    call: 'Book a call',
    '30-minute': 'Book a 30-minute call',
    role: 'Brief us on a role',
  };
  const roles = [
    'Sales development', 'Customer success', 'Data analytics', 'Software development',
    'GTM strategy', 'RevOps', 'Operations', 'Founder’s Office', 'Other',
  ];
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { color-scheme: light; }
      *, *::before, *::after { box-sizing: border-box; }
      [hidden] { display: none !important; }
      dialog {
        --ink: #261b2f; --muted: #5c4d65; --purple: #792ea0; --line: #67427b39;
        width: min(704px, calc(100% - 32px)); max-width: none;
        max-height: calc(100dvh - 32px); padding: 0;
        border: 1px solid #ffffffbd; border-radius: 26px;
        color: var(--ink);
        background: radial-gradient(ellipse at 99% 0%, #eacff6bf, transparent 54%),
          linear-gradient(135deg, #fffdf5ee, #f7eafbf2);
        backdrop-filter: blur(24px);
        box-shadow: 0 30px 110px #21102b55, inset 0 1px 0 #ffffffdf;
        font: 16px/1.45 Inter, system-ui, sans-serif;
        overscroll-behavior: contain;
        overflow: hidden;
      }
      dialog::backdrop { background: #2c173c68; backdrop-filter: blur(8px); }
      .panel {
        margin: 12px 8px;
        max-height: calc(100dvh - 58px);
        padding: clamp(12px, 5vw, 32px);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: #a989b8 transparent;
      }
      .panel::-webkit-scrollbar { width: 6px; }
      .panel::-webkit-scrollbar-track { background: transparent; }
      .panel::-webkit-scrollbar-thumb { background: #a989b8; border-radius: 999px; }
      .panel::-webkit-scrollbar-button { display: none; }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .brand { display: block; width: 94px; height: auto; }
      button { font: inherit; cursor: pointer; }
      .close {
        display: grid; place-items: center; width: 44px; height: 44px;
        padding: 0; border: 1px solid var(--line); border-radius: 50%;
        background: #ffffff65; color: var(--ink); font-size: 25px; line-height: 1;
      }
      h2 { margin: 7px 0 0; font-size: clamp(30px, 5vw, 46px); line-height: 1.06; letter-spacing: -.065em; }
      .intro { margin: 10px 0 24px; color: var(--muted); }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
      .field { display: grid; gap: 6px; font-size: 14px; font-weight: 650; }
      .field input {
        width: 100%; min-height: 45px; padding: 9px 12px; border: 1px solid var(--line);
        border-radius: 10px; background: #ffffff92; color: var(--ink); font: 400 16px/1.3 Inter, system-ui, sans-serif;
      }
      .field input:hover, .choice:hover span, .close:hover { border-color: #792ea08a; }
      :focus-visible, .choice input:focus-visible + span { outline: 2px solid var(--purple); outline-offset: 3px; }
      fieldset { min-inline-size: 0; padding: 0; margin: 21px 0 0; border: 0; }
      legend { margin-bottom: 9px; padding: 0; font-size: 16px; font-weight: 750; }
      .hint { margin: -4px 0 10px; font-size: 14px; color: var(--muted); }
      .choices { display: flex; flex-wrap: wrap; gap: 8px; }
      .choice { position: relative; cursor: pointer; }
      .choice input { position: absolute; width: 1px; height: 1px; opacity: 0; }
      .choice span {
        display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px;
        border: 1px solid var(--line); border-radius: 99px; background: #ffffff79;
        font-size: 14px; font-weight: 550;
      }
      .choice input:checked + span { color: #fff; border-color: var(--purple); background: var(--purple); }
      #other-wrap { margin-top: 14px; }
      .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #67427b25; }
      .submit {
        min-height: 48px; border: 0; border-radius: 999px; padding: 11px 19px;
        background: var(--purple); color: #fff; font-weight: 750;
        box-shadow: 0 6px 14px #792ea036;
      }
      .submit:hover { background: #652285; }
      .submit:disabled { opacity: .65; cursor: not-allowed; }
      @media (max-width: 490px) {
        dialog { width: calc(100% - 20px); max-height: calc(100dvh - 20px); border-radius: 18px; }
        .grid { grid-template-columns: 1fr; gap: 12px; }
        .submit { width: 100%; }
      }
    </style>
    <dialog aria-labelledby="booking-heading" aria-describedby="booking-intro">
      <div class="panel">
        <div class="top">
          <img class="brand" alt="AntBox" width="800" height="177">
          <button class="close" type="button" aria-label="Close booking form">×</button>
        </div>
        <h2 id="booking-heading" tabindex="-1" autofocus>Book a call</h2>
        <p id="booking-intro" class="intro">Share your contact details and hiring plans before choosing a time.</p>
        <form>
          <div class="grid">
            <label class="field">First name<input name="first_name" autocomplete="given-name" required maxlength="100"></label>
            <label class="field">Last name<input name="last_name" autocomplete="family-name" required maxlength="100"></label>
            <label class="field">Job title<input name="job_title" autocomplete="organization-title" required maxlength="150"></label>
            <label class="field">Work email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          </div>
          <fieldset>
            <legend>Are you actively hiring right now?</legend>
            <div class="choices">
              <label class="choice"><input type="radio" name="actively_hiring" value="Yes" required checked><span>Yes</span></label>
              <label class="choice"><input type="radio" name="actively_hiring" value="No" required><span>No</span></label>
            </div>
          </fieldset>
          <fieldset id="roles" aria-describedby="role-hint">
            <legend>Which roles are you hiring for?</legend>
            <p class="hint" id="role-hint">Select all that apply.</p>
            <div class="choices">
              ${roles.map(role => `<label class="choice"><input type="checkbox" name="roles" value="${role}"><span>${role}</span></label>`).join('')}
            </div>
            <label class="field" id="other-wrap" hidden>Other role<input name="other_role" maxlength="120" placeholder="Type the role" disabled></label>
          </fieldset>
          <div class="actions">
            <button class="submit" type="submit" disabled>Continue to 30-minute booking</button>
          </div>
        </form>
      </div>
    </dialog>
  `;
  shadow.querySelector('.brand').src = '/images/antbox-booking-logo.png';
  document.body.append(host);

  const dialog = shadow.querySelector('dialog');
  const form = shadow.querySelector('form');
  const rolesSection = shadow.querySelector('#roles');
  const otherWrap = shadow.querySelector('#other-wrap');
  const otherInput = form.elements.other_role;
  const otherChoice = form.querySelector('[value="Other"]');
  const heading = shadow.querySelector('#booking-heading');
  let intent = 'call';
  let opener = null;

  function syncHiringFields() {
    const hiring = form.elements.actively_hiring.value === 'Yes';
    const showOther = hiring && otherChoice.checked;
    rolesSection.hidden = rolesSection.disabled = !hiring;
    otherWrap.hidden = otherInput.disabled = !showOther;
    otherInput.required = showOther;
  }

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element && event.target.closest('[data-antbox-booking]');
    if (!trigger || dialog.open || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    intent = Object.hasOwn(headings, trigger.dataset.antboxBooking) ? trigger.dataset.antboxBooking : 'call';
    opener = trigger;
    heading.textContent = headings[intent];
    form.reset();
    syncHiringFields();
    dialog.showModal();
    heading.focus();
  });

  shadow.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  form.addEventListener('change', syncHiringFields);
  // Enter must never navigate or imply a saved lead before submission exists.
  form.addEventListener('submit', event => event.preventDefault());
})();

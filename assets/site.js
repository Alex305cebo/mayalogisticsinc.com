// Three behaviours: the mobile menu, the driver application, and making
// "write to us" actually work. The site is static (GitHub Pages) — there is no
// server to post a form to, and a plain mailto: link silently does nothing on a
// machine with no mail client registered, which is most machines these days.
(function () {
  /* ---------------- mobile menu ---------------- */
  var burger = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('menu');

  if (burger && nav) {
    var closeNav = function () {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    // A resize past the breakpoint would otherwise leave the panel stuck open.
    addEventListener('resize', function () {
      if (innerWidth > 960) closeNav();
    });
  }

  /* ---------------- language menu ---------------- */
  // <details> stays open until it is clicked again; close it on any click outside.
  var lang = document.querySelector('details.lang');
  if (lang) {
    document.addEventListener('click', function (e) {
      if (lang.open && !lang.contains(e.target)) lang.open = false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lang.open = false;
    });
  }

  /* ---------------- mail dialog ---------------- */
  var box = document.getElementById('mailbox');
  if (!box) return;

  var q = function (sel) { return box.querySelector(sel); };
  var elTitle = q('[data-mbox-title]');
  var elSub = q('[data-mbox-sub]');
  var elAddr = q('[data-mbox-addr]');
  var elBody = q('[data-mbox-body]');
  var elGmail = q('[data-mbox-gmail]');
  var elMailto = q('[data-mbox-mailto]');
  var elNote = q('[data-mbox-note]');
  var copyAddr = q('[data-mbox-copy-addr]');
  var copyBody = q('[data-mbox-copy-body]');
  var elPhone = q('[data-mbox-phone]');

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* nothing else to try */ }
    document.body.removeChild(ta);
  }

  function copy(text, button) {
    var done = function () {
      elNote.hidden = false;
      if (button) {
        var was = button.textContent;
        button.textContent = button.dataset.done || 'OK';
        setTimeout(function () { button.textContent = was; }, 1600);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  // The direct line is a personal number. It is never present in the page as
  // text — only as an encoded blob — and it is assembled here, in the browser,
  // at the moment a driver actually submits the application. Harvesters read
  // HTML with a regexp; they do not run scripts and do not fill in forms.
  function revealPhone(el) {
    var enc = el.getAttribute('data-p');
    var link = el.querySelector('[data-mbox-tel]');
    if (!enc || !link || link.dataset.ready) return;
    var raw = atob(enc), out = '';
    for (var i = 0; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ 42);
    var parts = out.split('|');
    var d = parts[1] || '';
    link.href = 'tel:+1' + d;
    link.textContent = parts[0] + ' — (' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    link.dataset.ready = '1';
  }

  function openBox(opts) {
    elAddr.textContent = opts.to;
    elSub.textContent = opts.subject || '';
    elSub.hidden = !opts.subject;
    if (opts.title) elTitle.textContent = opts.title;

    elBody.value = opts.body || '';
    elBody.hidden = !opts.body;
    if (copyBody) copyBody.hidden = !opts.body;

    elGmail.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' +
      encodeURIComponent(opts.to) +
      '&su=' + encodeURIComponent(opts.subject || '') +
      '&body=' + encodeURIComponent(opts.body || '');

    elMailto.href = 'mailto:' + opts.to +
      '?subject=' + encodeURIComponent(opts.subject || '') +
      '&body=' + encodeURIComponent(opts.body || '');

    if (elPhone) {
      elPhone.hidden = !opts.phone;
      if (opts.phone) revealPhone(elPhone);
    }

    elNote.hidden = true;
    if (box.showModal) box.showModal(); else box.setAttribute('open', '');
  }

  if (copyAddr) copyAddr.addEventListener('click', function () { copy(elAddr.textContent, copyAddr); });
  if (copyBody) copyBody.addEventListener('click', function () { copy(elBody.value, copyBody); });

  // Any mailto link marked data-mail opens the dialog instead of dying quietly.
  // Without JS the link still behaves as an ordinary mailto, so nothing is lost.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-mail]');
    if (!a) return;
    e.preventDefault();
    var url = new URL(a.href);
    var p = new URLSearchParams(url.search);
    openBox({
      to: decodeURIComponent(url.pathname),
      subject: p.get('subject') || '',
      body: p.get('body') || '',
      title: a.dataset.mailTitle || ''
    });
  });

  /* ---------------- driver application ---------------- */
  var form = document.querySelector('[data-mail-form]');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var lines = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.type === 'submit') return;
      lines.push((el.dataset.label || el.name) + ': ' + (el.value || '—'));
    });
    openBox({
      to: form.dataset.mailForm,
      subject: form.dataset.subject || 'Driver application',
      body: lines.join('\n'),
      title: form.dataset.sentTitle || '',
      phone: true          // the direct line is earned by filling the form in
    });
  });
})();

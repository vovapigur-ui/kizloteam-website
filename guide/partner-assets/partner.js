/* Partner guide pages: reveals, the stage crossfade, the question list, the January 1 countdown, the form. */
(function () {
  var d = document.documentElement;
  d.classList.remove('no-js'); d.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveals: each part of a section arrives in reading order, once.
  var parts = document.querySelectorAll('[data-r]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    parts.forEach(function (el) { io.observe(el); });
  } else { parts.forEach(function (el) { el.classList.add('in'); }); }

  // Stage: show one picture; sections can ask for another with data-shot.
  var stage = document.querySelector('.stage.first');
  var shots = stage ? stage.querySelectorAll('img, video') : [];
  var vid = stage ? stage.querySelector('video') : null;
  if (vid) { if (reduce) { vid.removeAttribute('autoplay'); } else { vid.play && vid.play().catch(function(){}); } }
  function show(i) {
    shots.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
  }

  // Question list: one open at a time; it also changes the stage picture.
  var items = document.querySelectorAll('.qs li');
  function open(li, quiet) {
    items.forEach(function (x) {
      var on = x === li;
      x.classList.toggle('is-on', on);
      x.querySelector('button').setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    var n = parseInt(li.getAttribute('data-shot') || '0', 10);
    if (shots.length && !quiet) show(n % shots.length);
  }
  items.forEach(function (li) {
    var b = li.querySelector('button');
    b.addEventListener('click', function () { open(li); });
    b.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) open(li); });
    b.addEventListener('focus', function () { open(li); });
  });
  if (items.length) open(items[0], true);

  // Back at the top, or above the list, the first picture returns.
  var hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting && shots.length) show(0); }, { threshold: 0.4 }).observe(hero);
  }

  // Days until January 1 (Florida homestead date).
  var out = document.querySelector('[data-days]');
  if (out) {
    var now = new Date();
    var jan1 = new Date(now.getFullYear() + 1, 0, 1);
    var days = Math.ceil((jan1 - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    out.textContent = days;
    var yr = document.querySelectorAll('[data-year]');
    yr.forEach(function (y) { y.textContent = jan1.getFullYear(); });
    var tight = document.querySelector('[data-tight]');
    if (tight) {
      tight.textContent = days <= 45
        ? 'With a typical closing taking 30 to 45 days, ' + jan1.getFullYear() + ' is already tight. Plan for the next one now.'
        : 'A typical closing takes 30 to 45 days, so there is still time if this year is the goal.';
    }
  }

  // Form: check the two required fields before it leaves the page.
  var f = document.querySelector('form[data-guide]');
  if (f) {
    f.addEventListener('submit', function (ev) {
      var bad = null;
      f.querySelectorAll('[required]').forEach(function (inp) {
        var ok = inp.value.trim() !== '' && (inp.type !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inp.value.trim()));
        inp.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !bad) bad = inp;
      });
      if (bad) { ev.preventDefault(); bad.focus(); return; }
      var btn = f.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending...';
    });
    f.querySelectorAll('[required]').forEach(function (inp) {
      inp.addEventListener('input', function () { if (inp.getAttribute('aria-invalid') === 'true') inp.setAttribute('aria-invalid', 'false'); });
    });
  }
})();

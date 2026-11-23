/* Human check for the lead forms (11/23).
   Bots were posting the forms as "Free Ai Api". Kizlo HQ now asks Cloudflare
   Turnstile whether each post came from a person. This script puts the
   (normally invisible) Turnstile widget in every form that posts to Kizlo HQ;
   the widget adds a hidden `cf-turnstile-response` field, which the forms'
   own submit code already sends along with the rest of the form.

   SITE_KEY is the public key of the Turnstile widget in Cloudflare
   (Turnstile > kizloteam.com). Empty means off: the forms work as before. */
(function () {
  "use strict";
  var SITE_KEY = "0x4AAAAAAGPY8jB7NLhj291h";
  if (!SITE_KEY) return;

  var forms = Array.prototype.filter.call(document.querySelectorAll("form"), function (f) {
    return /\/api\/public\/website-lead/.test(f.getAttribute("action") || "");
  });
  if (!forms.length) return;

  var widgets = [];   // { form, id, token, waiting }
  var find = function (form) {
    for (var i = 0; i < widgets.length; i++) if (widgets[i].form === form) return widgets[i];
    return null;
  };

  window.kizloTurnstileReady = function () {
    forms.forEach(function (form) {
      var box = document.createElement("div");
      box.className = "human-check";
      var btn = form.querySelector('[type="submit"]');
      (btn && btn.parentNode === form ? form.insertBefore(box, btn) : form.appendChild(box));
      var w = { form: form, id: null, token: "", waiting: false };
      w.id = window.turnstile.render(box, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",   // shows only if Cloudflare needs a click
        size: "flexible",
        callback: function (token) {
          w.token = token;
          if (w.waiting) { w.waiting = false; submit(form); }
        },
        "expired-callback": function () { w.token = ""; },
        "error-callback": function () { w.token = ""; }
      });
      widgets.push(w);
    });
  };

  function submit(form) {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }

  // Capture phase on document: runs before each form's own submit handler.
  document.addEventListener("submit", function (e) {
    var w = find(e.target);
    if (!w) return;
    if (!w.token) {
      // Still checking (a fast click right after the page loads): hold the
      // send and let it go the moment the token arrives, or after 8 seconds
      // regardless, so a blocked Cloudflare script never freezes the form.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!w.waiting) {
        w.waiting = true;
        setTimeout(function () { if (w.waiting) { w.waiting = false; w.token = "none"; submit(w.form); } }, 8000);
      }
      return;
    }
    // A token works once. The form's own handler has read it by the time this
    // runs, so fetch a fresh one for a second send.
    setTimeout(function () {
      w.token = "";
      try { window.turnstile.reset(w.id); } catch (err) { /* widget gone */ }
    }, 0);
  }, true);

  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=kizloTurnstileReady";
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
})();

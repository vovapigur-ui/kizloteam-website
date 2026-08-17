/* The Kizlo Team · interactions */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var hero = document.querySelector(".hero");

  var headerThreshold = 10;
  function computeThreshold() {
    headerThreshold = hero ? hero.offsetHeight - 90 : 10;
  }
  function setHeader() {
    if (!header) return;
    if (window.scrollY > headerThreshold) header.classList.add("is-solid");
    else header.classList.remove("is-solid");
  }
  if (!hero && header) header.classList.add("is-solid");
  else {
    computeThreshold();
    setHeader();
    window.addEventListener("scroll", setHeader, { passive: true });
    window.addEventListener("resize", function () { computeThreshold(); setHeader(); }, { passive: true });
  }

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    function closeNav() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { closeNav(); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });
  }

  /* Scroll reveals — CSS hides .reveal only under html.js, so no-JS visitors see everything */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Testimonial rotation — first quote is server-rendered in the HTML */
  var quoteRoot = document.querySelector("[data-quotes]");
  if (quoteRoot) {
    var quotes = JSON.parse(quoteRoot.getAttribute("data-quotes"));
    var i = 0;
    var block = quoteRoot.querySelector("blockquote");
    var cap = quoteRoot.querySelector("figcaption");
    var counter = quoteRoot.querySelector(".counter");
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function render() {
      block.textContent = "“" + quotes[i].q + "”";
      cap.textContent = quotes[i].a;
      if (counter) counter.textContent = pad(i + 1) + " / " + pad(quotes.length);
    }
    quoteRoot.querySelector("[data-prev]").addEventListener("click", function () {
      i = (i - 1 + quotes.length) % quotes.length; render();
    });
    quoteRoot.querySelector("[data-next]").addEventListener("click", function () {
      i = (i + 1) % quotes.length; render();
    });
  }

  /* Lead forms → Kizlo HQ. Without JS the form posts normally and the
     server redirects back with ?sent=1. */
  var forms = document.querySelectorAll("form[data-lead-form]");
  forms.forEach(function (form) {
    var status = form.querySelector(".form-status");
    function show(kind, msg) {
      if (!status) return;
      status.classList.remove("is-success", "is-error");
      status.classList.add(kind === "ok" ? "is-success" : "is-error");
      status.textContent = msg;
    }
    /* A ticked consent box needs a number to text. The server rejects the
       combination anyway; catching it here says so next to the field instead
       of bouncing the whole submission back with an error. */
    var phoneField = form.querySelector('input[type="tel"]');
    var consentBoxes = form.querySelectorAll('.consent-check input[type="checkbox"]');
    function syncPhoneRequired() {
      if (!phoneField || !consentBoxes.length) return;
      var wanted = false;
      consentBoxes.forEach(function (c) { if (c.checked) wanted = true; });
      phoneField.required = wanted;
      var label = form.querySelector('label[for="' + phoneField.id + '"]');
      if (label) label.textContent = wanted ? "Phone (required for texts)" : "Phone";
    }
    consentBoxes.forEach(function (c) { c.addEventListener("change", syncPhoneRequired); });
    syncPhoneRequired();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {};
      /* Unchecked boxes are absent from FormData, which the server already
         reads as "no consent" — but send an explicit "no" so the payload
         states the answer rather than leaving it to be inferred. */
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      consentBoxes.forEach(function (c) { if (!c.checked) data[c.name] = "no"; });
      data.page = location.pathname;
      var btn = form.querySelector('button[type="submit"], [type="submit"]');
      if (btn) { btn.disabled = true; }
      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status " + res.status);
        return res.json();
      }).then(function () {
        form.reset();
        show("ok", "Thank you — we received your message and will be in touch within a few hours. If it’s urgent, call or text us at (813) 992‑3073.");
      }).catch(function () {
        show("err", "Something went wrong sending your message. Please call or text us directly at (813) 992‑3073, or email thekizloteam@kw.com.");
      }).finally(function () {
        if (btn) { btn.disabled = false; }
      });
    });
    if (new URLSearchParams(location.search).get("sent") === "1") {
      show("ok", "Thank you — we received your message and will be in touch within a few hours.");
    }
  });
})();

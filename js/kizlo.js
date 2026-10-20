// The Kizlo Team · site behaviour. Everything degrades to a readable page without JS.
(function () {
  "use strict";
  // First: tells the CSS reveal failsafe (kizlo.css) that this file arrived.
  document.documentElement.classList.add("js-ready");
  var doc = document.documentElement;
  var reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reduceQ.matches;
  var onMedia = function (q, fn) { if (q.addEventListener) q.addEventListener("change", fn); else if (q.addListener) q.addListener(fn); };
  // Safari has no requestIdleCallback; a short timeout stands in for it.
  var idle = function (fn) {
    if (window.requestIdleCallback) window.requestIdleCallback.call(window, fn, { timeout: 2000 });
    else setTimeout(fn, 200);
  };
  var phoneQ = window.matchMedia("(max-width: 600px)");

  // Header turns solid once the hero is behind it.
  var header = document.querySelector(".site-header");
  if (header && !header.classList.contains("site-header--solid")) {
    var onScroll = function () { header.classList.toggle("is-solid", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Mobile menu. While it is open the page behind it is inert, so Tab stays in
  // the header and the menu; closing hands focus back to the toggle.
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var behind = [document.querySelector("main"), document.querySelector(".site-footer"), document.querySelector(".skip-link")]
      .filter(function (el) { return el; });
    var focusTimer = null;
    var setOpen = function (open) {
      var wasOpen = doc.classList.contains("nav-open");
      doc.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      behind.forEach(function (el) { if (open) el.setAttribute("inert", ""); else el.removeAttribute("inert"); });
      clearTimeout(focusTimer);
      if (open && !wasOpen) {
        focusTimer = setTimeout(function () { var first = nav.querySelector("a"); if (first) first.focus(); }, 350);
      } else if (!open && wasOpen && nav.contains(document.activeElement)) {
        toggle.focus();
      }
    };
    toggle.addEventListener("click", function () { setOpen(!doc.classList.contains("nav-open")); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !doc.classList.contains("nav-open")) return;
      setOpen(false);
      toggle.focus();
    });
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    // Widening past the overlay breakpoint (rotation, resize) closes the menu.
    var wide = window.matchMedia("(min-width: 961px)");
    onMedia(wide, function (e) { if (e.matches) setOpen(false); });
  }

  // Footer link groups: folded disclosures on phones, always open above 600px.
  var groups = document.querySelectorAll(".footer-group");
  if (groups.length) {
    var fold = function () {
      groups.forEach(function (d) {
        d.open = !phoneQ.matches;
        var s = d.querySelector("summary");
        // Above 600px the groups cannot fold, so the summary says so to assistive tech.
        if (s) {
          if (phoneQ.matches) { s.removeAttribute("tabindex"); s.removeAttribute("aria-disabled"); }
          else { s.setAttribute("tabindex", "-1"); s.setAttribute("aria-disabled", "true"); }
        }
      });
    };
    fold();
    groups.forEach(function (d) { d.addEventListener("toggle", function () { if (!phoneQ.matches && !d.open) d.open = true; }); });
    onMedia(phoneQ, fold);
  }

  // Reveals: staggered per group, once, as soon as any part of an element enters
  // (threshold 0, so a very tall article shows on entry). The timeout only fires if
  // the observer never reports at all. If this file arrived after the CSS failsafe
  // (kizlo.css, 2.5s) already showed everything, keep it shown rather than hide it again.
  var revealables = document.querySelectorAll(".reveal");
  var late = window.performance && performance.now() > 2400;
  if ("IntersectionObserver" in window && !reduced && !late) {
    var ioSeen = false;
    var io = new IntersectionObserver(function (entries) {
      ioSeen = true;
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -4% 0px", threshold: 0 });
    revealables.forEach(function (el) { io.observe(el); });
    setTimeout(function () { if (!ioSeen) revealables.forEach(function (el) { el.classList.add("is-in"); }); }, 3000);
  } else {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Stat figures are plain text and rise in with the reveal above (CSS); nothing counts.

  // Hero video. The markup never autoplays (preload="none", a poster <picture> under it).
  // After the load event and an idle moment it starts, unless the visitor prefers reduced
  // motion, has Save-Data on, is on a 2G/3G connection or paused it before (kz_video).
  // Safari has no navigator.connection: unknown counts as fast. iOS Low Power Mode
  // rejects play(): the poster stays and the button offers Play.
  var video = document.querySelector(".hero video");
  if (video) {
    var hero = video.closest(".hero") || video.parentNode;
    var vBtn = hero.querySelector(".hero__pause");
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var net = conn && conn.effectiveType;
    var never = function () {
      return reduceQ.matches || !!(conn && conn.saveData) || /^(slow-2g|2g)$/.test(net || "") || typeof video.play !== "function";
    };
    var vPaused = false;
    try { vPaused = localStorage.getItem("kz_video") === "paused"; } catch (e) {}
    var vReady = false, vInView = true, vBlocked = false;
    video.autoplay = false;
    video.removeAttribute("autoplay");
    var vSync = function () {
      var showPaused = vPaused || vBlocked;
      hero.classList.toggle("is-paused", showPaused);
      if (!vBtn) return;
      // The name swaps (Pause/Play), so it is not also a toggle button.
      vBtn.removeAttribute("aria-pressed");
      vBtn.setAttribute("aria-label", showPaused ? "Play background video" : "Pause background video");
    };
    var vHide = function () {
      video.pause();
      if (vBtn) vBtn.hidden = true;
    };
    var vPlay = function () {
      if (!vReady || vPaused || !vInView || never()) return;
      if (video.preload !== "auto") video.preload = "auto";
      var p = video.play();
      if (p && p.then) p.then(function () { vBlocked = false; vSync(); }, function () {
        // Refused (iOS Low Power Mode): stop the download, keep the poster, offer Play.
        vBlocked = true;
        vSync();
        video.preload = "none";
        try { video.load(); } catch (e) {}
      });
    };
    video.addEventListener("playing", function () { video.classList.add("is-playing"); });
    // Once no source can load there is nothing left to pause (source errors do not bubble).
    video.addEventListener("error", function () {
      setTimeout(function () { if (video.error || video.networkState === 3) vHide(); }, 0);
    }, true);
    if (never()) {
      vHide();
    } else {
      if (vPaused) video.pause();
      vSync();
      if (vBtn) vBtn.addEventListener("click", function () {
        var wasStopped = vPaused || vBlocked;
        vPaused = !wasStopped;
        vBlocked = false;
        try { if (vPaused) localStorage.setItem("kz_video", "paused"); else localStorage.removeItem("kz_video"); } catch (e) {}
        vSync();
        if (vPaused) video.pause(); else { vReady = true; vPlay(); }
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          vInView = entries[entries.length - 1].isIntersecting;
          if (vInView) vPlay(); else video.pause();
        }).observe(hero);
      }
      var vBoot = function () { idle(function () { vReady = true; vPlay(); }); };
      if (document.readyState === "complete") vBoot(); else window.addEventListener("load", vBoot);
    }
    onMedia(reduceQ, function () { if (reduceQ.matches) vHide(); });
  }

  // Slow zoom on the claim panels as they cross the screen. Browsers with scroll-driven
  // animations get it from CSS (kizlo.css); this is the fallback.
  var claims = document.querySelectorAll(".claim");
  var cssZoom = window.CSS && CSS.supports && CSS.supports("animation-timeline", "view()");
  if (claims.length && !reduced && !cssZoom) {
    var ticking = false;
    var zoom = function () {
      var vh = window.innerHeight;
      claims.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = 1 - (r.top + r.height) / (vh + r.height);
        c.style.setProperty("--zoom", (1.06 - p * 0.06).toFixed(4));
      });
      ticking = false;
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(zoom); } }, { passive: true });
    zoom();
  }

  // Testimonials: every [data-quotes] (the .quote-wrap band, or a legacy figure.quote).
  // The quote box keeps the height of the longest quote, so the band never jumps.
  // Auto-rotation (8s) runs only in view, not hovered or focused, not held, tab visible,
  // and never speaks; prev/next hold the rotation and announce the review they show.
  document.querySelectorAll("[data-quotes]").forEach(function (root) {
    var quotes;
    try { quotes = JSON.parse(root.getAttribute("data-quotes")); } catch (e) { return; }
    var fig = root.classList.contains("quote") ? root : root.querySelector(".quote");
    if (!fig || !quotes || !quotes.length) return;
    var bq = fig.querySelector("blockquote"), cap = fig.querySelector("figcaption");
    if (!bq) return;
    bq.removeAttribute("aria-live");
    var nav = root.querySelector(".quote-nav"), counter = root.querySelector(".counter");
    var prev = root.querySelector("[data-prev]"), next = root.querySelector("[data-next]"), hold = root.querySelector("[data-pause]");
    var status = root.querySelector("[data-quote-status]");
    if (!status) {
      status = document.createElement("p");
      status.className = "visually-hidden";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("data-quote-status", "");
      root.appendChild(status);
    }
    // The first caption may carry a suffix the data leaves out (" · Google review").
    var cap0 = cap ? cap.textContent.trim() : "", a0 = String(quotes[0].a || "").trim();
    var suffix = a0 && cap0.indexOf(a0) === 0 ? cap0.slice(a0.length) : "";
    var capText = function (qq) { return String(qq.a || "") + suffix; };
    var bqText = function (qq) { return "“" + qq.q + "”"; };
    if (quotes.length < 2) { if (nav) nav.hidden = true; return; }

    var i = 0, held = false, hovered = false, focused = false, inView = false, timer = null, swapTimer = null;
    var fit = function () {
      var w = fig.getBoundingClientRect().width;
      if (!w) return;
      var clone = fig.cloneNode(true);
      clone.removeAttribute("data-quotes");
      clone.removeAttribute("id");
      clone.setAttribute("aria-hidden", "true");
      clone.classList.remove("is-swapping", "reveal");
      clone.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;margin:0;min-height:0;width:" + w + "px";
      var cbq = clone.querySelector("blockquote"), ccap = clone.querySelector("figcaption");
      cbq.style.minHeight = "";
      if (ccap) ccap.style.minHeight = "";
      fig.parentNode.appendChild(clone);
      var hb = 0, hc = 0;
      quotes.forEach(function (qq) {
        cbq.textContent = bqText(qq);
        if (ccap) ccap.textContent = capText(qq);
        hb = Math.max(hb, cbq.getBoundingClientRect().height);
        if (ccap) hc = Math.max(hc, ccap.getBoundingClientRect().height);
      });
      clone.remove();
      bq.style.minHeight = Math.ceil(hb) + "px";
      if (cap) cap.style.minHeight = Math.ceil(hc) + "px";
    };
    var show = function (n, announce) {
      i = (n + quotes.length) % quotes.length;
      if (counter) counter.textContent = (i + 1) + " / " + quotes.length;
      if (announce) status.textContent = "Review " + (i + 1) + " of " + quotes.length + ": " + quotes[i].q + ", " + quotes[i].a;
      clearTimeout(swapTimer);
      fig.classList.add("is-swapping");
      swapTimer = setTimeout(function () {
        bq.textContent = bqText(quotes[i]);
        if (cap) cap.textContent = capText(quotes[i]);
        fig.classList.remove("is-swapping");
      }, reduced ? 0 : 500);
    };
    var schedule = function () {
      clearTimeout(timer);
      timer = null;
      if (held || hovered || focused || !inView || document.hidden) return;
      timer = setTimeout(function () { show(i + 1, false); schedule(); }, 8000);
    };
    var setHeld = function (on) {
      held = on;
      if (hold) {
        // The name stays "Pause reviews"; aria-pressed carries the state.
        hold.setAttribute("aria-pressed", String(on));
      }
      schedule();
    };
    if (prev) prev.addEventListener("click", function () { setHeld(true); show(i - 1, true); });
    if (next) next.addEventListener("click", function () { setHeld(true); show(i + 1, true); });
    if (hold) hold.addEventListener("click", function () { setHeld(!held); });
    root.addEventListener("mouseenter", function () { hovered = true; schedule(); });
    root.addEventListener("mouseleave", function () { hovered = false; schedule(); });
    root.addEventListener("focusin", function () { focused = true; schedule(); });
    root.addEventListener("focusout", function (e) { if (!root.contains(e.relatedTarget)) { focused = false; schedule(); } });
    document.addEventListener("visibilitychange", schedule);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        schedule();
      }, { threshold: 0.35 }).observe(root);
    } else {
      inView = true;
    }
    // Reduced motion: nothing rotates on its own; Play is still there to ask for it.
    setHeld(reduced);
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var fitTimer = null;
    window.addEventListener("resize", function () { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 150); });
  });

  // Long reviews fold to eight lines on phones; the full text always stays in the page.
  var expanders = document.querySelectorAll("[data-expand]");
  if (expanders.length) {
    var foldReviews = function () {
      expanders.forEach(function (b) {
        var card = b.closest(".review") || b.parentNode;
        var text = card.querySelector(".review__text");
        if (!phoneQ.matches) { b.hidden = true; return; }
        b.hidden = !(card.classList.contains("is-open") || (text && text.scrollHeight > text.clientHeight + 2));
      });
    };
    expanders.forEach(function (b) {
      var more = b.textContent;
      b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () {
        var card = b.closest(".review") || b.parentNode;
        var open = card.classList.toggle("is-open");
        b.setAttribute("aria-expanded", String(open));
        b.textContent = open ? "Show less" : more;
      });
    });
    foldReviews();
    onMedia(phoneQ, foldReviews);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(foldReviews);
  }

  // "Find a home" search (a plain GET form to kthomesforsale.com, not a lead form).
  // Empty choices are left out of the URL; the submission is counted as search_click.
  document.querySelectorAll("form[data-search-form]").forEach(function (form) {
    form.addEventListener("submit", function () {
      // A minimum above the maximum is read as the two picked the wrong way round.
      var lo = form.querySelector('[name="minprice"]'), hi = form.querySelector('[name="maxprice"]');
      if (lo && hi && lo.value !== "" && hi.value !== "" && +lo.value > +hi.value) {
        var setVal = function (sel, v) {
          sel.value = v;
          if (sel.value !== v) { var o = new Option(v, v); o.hidden = true; sel.add(o); sel.value = v; }
        };
        var a = lo.value, b = hi.value;
        setVal(lo, b); setVal(hi, a);
      }
      var city = form.querySelector('[name="city"]');
      var off = [];
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name && !el.disabled && el.value === "" && el.tagName === "SELECT") { el.disabled = true; off.push(el); }
      });
      setTimeout(function () { off.forEach(function (el) { el.disabled = false; }); }, 0);
      var info = { link_page: location.pathname, search_city: city ? city.value : "" };
      if (typeof window.gtag === "function") window.gtag("event", "search_click", info);
      if (typeof window.clarity === "function") window.clarity("event", "search_click");
    });
  });

  // Phone folds: long reference tables collapse on phones only. Markup ships open, so no-JS readers see everything.
  var folds = document.querySelectorAll("details.phone-fold");
  if (folds.length) {
    var phone = window.matchMedia("(max-width: 600px)");
    var applyFold = function () { folds.forEach(function (d) { d.open = !phone.matches; }); };
    applyFold();
    if (phone.addEventListener) phone.addEventListener("change", applyFold);
  }

  // Lead forms → Kizlo HQ. Without JS the form posts normally and the server redirects back with ?sent=1.
  // The form markup is pinned (kizlohq and scripts/check.mjs test it); everything here works around it.
  var params = new URLSearchParams(location.search);
  var uk = /^uk\b/i.test(doc.lang || "") || params.get("lang") === "uk";
  var T = uk ? {
    ok: "Дякуємо, ми отримали ваше повідомлення і зв’яжемося з вами протягом кількох годин. Якщо справа термінова, зателефонуйте або надішліть SMS на (813) 992-3073.",
    sent: "Дякуємо, ми отримали ваше повідомлення і зв’яжемося з вами протягом кількох годин.",
    err: "Повідомлення не надіслано. Будь ласка, зателефонуйте або надішліть SMS на (813) 992-3073, або напишіть нам на thekizloteam@kw.com.",
    fallback: "Або зателефонуйте чи надішліть SMS на (813) 992-3073.",
    check: "Будь ласка, перевірте введені дані.", // draft, awaiting client check
    slow: "Ще надсилаємо. Якщо ми не зв’яжемося з вами протягом кількох годин, зателефонуйте або надішліть SMS на (813) 992-3073.", // draft, awaiting client check
    sending: "Надсилаємо…"
  } : {
    ok: "Thank you, we have your message and will be in touch within a few hours. If it is urgent, call or text (813) 992-3073.",
    sent: "Thank you, we have your message and will be in touch within a few hours.",
    err: "Your message did not go through. Please call or text (813) 992-3073, or email thekizloteam@kw.com.",
    fallback: "You can also call or text (813) 992-3073.",
    check: "Please check the details you entered.",
    slow: "Still sending. If you do not hear from us within a few hours, call or text (813) 992-3073.",
    sending: "Sending…"
  };
  var INTERESTS = ["selling", "buying", "both", "investing", "other"];
  document.querySelectorAll("form[data-lead-form]").forEach(function (form) {
    var status = form.querySelector(".form-status");
    var showTimer = null;
    // Clear, then write a beat later, so a repeated message is announced again.
    var show = function (kind, msg) {
      if (!status) return;
      clearTimeout(showTimer);
      status.classList.remove("is-success", "is-error");
      status.textContent = "";
      showTimer = setTimeout(function () {
        status.classList.add(kind === "ok" ? "is-success" : "is-error");
        status.textContent = msg;
      }, 60);
    };

    // /contact/?interest=investing preselects the matching option.
    var wanted = (params.get("interest") || "").toLowerCase();
    var interest = form.querySelector('select[name="interest"]');
    if (interest && INTERESTS.indexOf(wanted) !== -1) {
      var match = Array.prototype.filter.call(interest.options, function (o) { return o.value === wanted; })[0];
      if (match) {
        interest.value = wanted;
        if (wanted === "investing") {
          var note = form.querySelector("textarea");
          if (note) note.placeholder = "Address, asking price, your plan: flip or hold";
        }
      }
    }

    // What a failed send says: rate limits and server faults get the plain fallback, never the
    // server's words; a 400 shows the server's reason in English (dashes made commas) or a
    // Ukrainian "check the details"; a timeout says it may still arrive.
    var failText = function (err) {
      if (err && err.name === "AbortError") return T.slow;
      var st = err && err.status;
      if (!st || st === 429 || st >= 500) return T.err;
      if (uk) return st === 400 ? T.check : T.err;
      if (!err.serverText) return T.err;
      var t = err.serverText.replace(/\s*[—–]\s*/g, ", ").replace(/[,\s]+$/, "");
      if (!/[.!?…]$/.test(t)) t += ".";
      return t + " " + T.fallback;
    };
    var reveal = function () {
      setTimeout(function () { if (status && status.scrollIntoView) status.scrollIntoView({ block: "nearest" }); }, 80);
    };
    var busy = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.page = location.pathname;
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.textContent : "";
      // aria-disabled, not disabled: the button keeps keyboard focus while the send runs.
      busy = true;
      if (btn) { btn.setAttribute("aria-disabled", "true"); btn.textContent = T.sending; }
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var timeout = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        var body = res.json().catch(function () { return {}; });
        if (res.ok) return body;
        return body.then(function (b) {
          var err = new Error("bad status " + res.status);
          err.status = res.status;
          if (b && typeof b.error === "string" && b.error.trim()) err.serverText = b.error.trim();
          throw err;
        });
      }).then(function () {
        form.reset();
        show("ok", T.ok);
        reveal();
      }).catch(function (err) {
        show("err", failText(err));
        reveal();
      }).finally(function () {
        clearTimeout(timeout);
        busy = false;
        if (btn) { btn.removeAttribute("aria-disabled"); btn.textContent = label; }
      });
    });
    if (params.get("sent") === "1") show("ok", T.sent);
  });

})();

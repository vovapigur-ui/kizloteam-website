/* The Kizlo Team · interactions */
(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var hero = document.querySelector(".hero");

  function setHeader() {
    if (!header) return;
    var threshold = hero ? hero.offsetHeight - 90 : 10;
    if (window.scrollY > threshold) header.classList.add("is-solid");
    else header.classList.remove("is-solid");
  }
  if (!hero && header) header.classList.add("is-solid");
  else { setHeader(); window.addEventListener("scroll", setHeader, { passive: true }); }

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Scroll reveals */
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

  /* Testimonial rotation */
  var quoteRoot = document.querySelector("[data-quotes]");
  if (quoteRoot) {
    var quotes = JSON.parse(quoteRoot.getAttribute("data-quotes"));
    var i = 0;
    var block = quoteRoot.querySelector("blockquote");
    var cap = quoteRoot.querySelector("figcaption");
    var counter = quoteRoot.querySelector(".counter");
    function render() {
      block.textContent = "“" + quotes[i].q + "”";
      cap.textContent = quotes[i].a;
      if (counter) counter.textContent = "0" + (i + 1) + " / 0" + quotes.length;
    }
    quoteRoot.querySelector("[data-prev]").addEventListener("click", function () {
      i = (i - 1 + quotes.length) % quotes.length; render();
    });
    quoteRoot.querySelector("[data-next]").addEventListener("click", function () {
      i = (i + 1) % quotes.length; render();
    });
    render();
  }
})();

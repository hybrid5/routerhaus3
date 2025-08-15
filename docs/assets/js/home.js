/* ============================
   RouterHaus – home.js
   Page-only behavior for index.html (new-site motions included)
============================ */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- Persona quick chips → route to kits with mapped filters ---- */
  function wireQuickChips() {
    const chips = $$(".persona-chips .chip, .persona-chip");
    if (!chips.length) return;

    const map = {
      apt: "coverage=Apartment%2FSmall&recos=1",
      large: "coverage=Large%2FMulti-floor&mesh=Mesh-ready&recos=1",
      wfh: "use=Work%20from%20Home&recos=1",
      gaming: "use=Gaming&wan=2.5G&recos=1",
    };

    chips.forEach((btn) => {
      if (!btn.getAttribute("type")) btn.setAttribute("type", "button");
      btn.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        const key = btn.dataset.qpick;
        const qs = map[key] || "quiz=1";
        window.location.href = `kits.html?${qs}`;
      });
      btn.addEventListener("mouseenter", () => btn.classList.add("hover"));
      btn.addEventListener("mouseleave", () => btn.classList.remove("hover"));
    });
  }

  /* ---- Reveal animations (new-site .visible classes) ---- */
  function motionObserver() {
    const animated = $$(".fade-in, .slide-in-left, .slide-in-right, .scale-in");
    if (!animated.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    animated.forEach((el) => io.observe(el));
  }

  /* ---- Perf-friendly parallax for hero-bg ---- */
  function parallaxHero() {
    const bg = $(".index-hero .hero-bg");
    if (!bg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY * 0.18;
        bg.style.transform = `translate3d(0, ${y}px, 0)`;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Particle system (new site) ---- */
  function createParticles() {
    const container = $("#particles");
    if (!container) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const makeOne = () => {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDelay = Math.random() * 15 + "s";
      p.style.animationDuration = 15 + Math.random() * 10 + "s";
      container.appendChild(p);
      setTimeout(() => p.remove(), 25000);
    };

    for (let i = 0; i < 15; i++) setTimeout(makeOne, i * 800);
    setInterval(() => { for (let i = 0; i < 4; i++) makeOne(); }, 4000);
  }

  /* ---- Trust logo shimmer (stagger) ---- */
  function shimmerTrust() {
    const logos = $$(".trust-logo");
    logos.forEach((logo, i) => setTimeout(() => logo.classList.add("shimmer"), i * 150));
  }

  /* ---- Feature card click feedback ---- */
  function featureClicks() {
    $$(".feature-card").forEach((card) => {
      card.addEventListener("click", () => {
        card.style.transform = "scale(0.98)";
        setTimeout(() => { card.style.transform = ""; }, 120);
        if (typeof showToast === "function") showToast("Learn more about this feature…", "info");
      });
    });
  }

  /* ---- Gentle tilt on products (capped) ---- */
  function tiltProducts() {
    const cards = $$(".product-card");
    if (!cards.length) return;
    cards.forEach((card) => {
      let rAF = 0;
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          card.style.transform = `translateY(-6px) rotateX(${(-dy * 2).toFixed(2)}deg) rotateY(${(dx * 2).toFixed(2)}deg)`;
        });
      };
      const reset = () => { cancelAnimationFrame(rAF); card.style.transform = ""; };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
      card.addEventListener("blur", reset, true);
    });
  }

  /* ---- Init ---- */
  document.addEventListener("DOMContentLoaded", () => {
    wireQuickChips();
    motionObserver();
    parallaxHero();
    createParticles();
    shimmerTrust();
    featureClicks();
    tiltProducts();
  });

  document.addEventListener("partials:loaded", () => {
    // reserved for future header/footer hooks
  });
})();

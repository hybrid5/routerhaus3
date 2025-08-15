// assets/js/home.js
/* ============================
   RouterHaus – home.js (Updated: Added wireChat for AI advisor with voice, opt-out; reduced-motion check for tilt/reveals; professional responses)
============================ */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---- Persona quick chips → route to kits with mapped filters ---- */
  function wireQuickChips() {
    const chips = $$(".persona-chips .chip");
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
        const key = btn.dataset.qpick;
        const qs = map[key] || "quiz=1";
        window.location.href = `kits.html?${qs}`;
      });
    });
  }

  /* ---- Reveal animations on scroll (aligns with .reveal/.in-view in CSS) ---- */
  function revealify() {
    const els = $$(".reveal");
    if (!els.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in-view");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---- Optional: slight tilt on value/product cards ---- */
  function tiltCards() {
    const cards = $$(".value-card, .product");
    if (!cards.length) return;
    cards.forEach((card) => {
      let rAF = 0;
      const onMove = (e) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          card.style.transform =
            `perspective(800px) rotateX(${(-dy * 6).toFixed(2)}deg) ` +
            `rotateY(${(dx * 6).toFixed(2)}deg) translateY(-6px)`;
        });
      };
      const reset = () => {
        cancelAnimationFrame(rAF);
        card.style.transform = "";
      };
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", reset);
      card.addEventListener("blur", reset, true);
    });
  }

  /* ---- AI Chat Widget ---- */
  function wireChat() {
    const btn = $("#chat-btn");
    const modal = $("#chat-modal");
    const close = $(".close", modal);
    const form = $(".chat-input", modal);
    const messages = $(".chat-messages", modal);
    const optOut = $("#opt-out", modal);

    if (!btn || !modal) return;

    btn.addEventListener("click", () => {
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
    });

    close.addEventListener("click", () => {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    });

    optOut.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      showToast("Data persistence opted out and cleared", "info");
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("input", form);
      const q = input.value.trim();
      if (!q) return;
      addMessage(q, "user");
      input.value = "";
      // Simple rule-based "AI" responses (expand with kits.json logic later)
      let response = "Based on your query, explore our kits for tailored recommendations.";
      const lower = q.toLowerCase();
      if (lower.includes("3-floor") || lower.includes("large home")) {
        response = 'For multi-floor homes, mesh systems provide optimal coverage. <a href="kits.html?coverage=Large/Multi-floor&mesh=Mesh-ready&recos=1">View large home options</a>.';
      } else if (lower.includes("gaming")) {
        response = 'Gaming setups benefit from high-speed WAN. <a href="kits.html?use=Gaming&wan=2.5G&recos=1">View gaming kits</a>.';
      } else if (lower.includes("apartment") || lower.includes("small")) {
        response = 'Compact spaces need efficient routers. <a href="kits.html?coverage=Apartment/Small&recos=1">View apartment options</a>.';
      }
      setTimeout(() => addMessage(response, "ai"), 600);
    });

    // Voice input (Web Speech API)
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRec();
      rec.lang = "en-US";
      const micBtn = $(".mic", form);
      micBtn.style.display = "inline-flex";
      micBtn.addEventListener("click", () => {
        rec.start();
        micBtn.classList.add("active");
      });
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        $("input", form).value = transcript;
        form.dispatchEvent(new Event("submit"));
        micBtn.classList.remove("active");
      };
      rec.onend = () => micBtn.classList.remove("active");
      rec.onerror = () => {
        showToast("Voice recognition error", "error");
        micBtn.classList.remove("active");
      };
    }

    function addMessage(text, type) {
      const div = document.createElement("div");
      div.classList.add("message", type);
      div.innerHTML = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
  }

  /* ---- Hooks after header/footer partials (if needed later) ---- */
  function wireHeaderHooks() {
    // Example: const quizBtn = document.getElementById('openQuiz');
  }

  /* ---- Init ---- */
  document.addEventListener("DOMContentLoaded", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    wireQuickChips();
    if (!reducedMotion) tiltCards();
    revealify();
    wireChat();
  });

  document.addEventListener("partials:loaded", wireHeaderHooks);
})();

/* ============================================================
   Παύση — script.js  (vanilla, χωρίς εξαρτήσεις)
   ============================================================ */
(function () {
  "use strict";

  // Ενεργοποίηση των JS-based στυλ (π.χ. reveal)
  document.documentElement.classList.add("js");

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Έτος στο footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Άνοιγμα μενού");
    }
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Κλείσιμο μενού" : "Άνοιγμα μενού");
    });
    // Κλείσιμο σε κλικ σε link
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeNav();
    });
    // Κλείσιμο με Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------- Mobile sticky bottom bar (μετά το hero) ---------- */
  var mobileBar = document.getElementById("mobileBar");
  var hero = document.querySelector(".hero");
  if (mobileBar && hero && "IntersectionObserver" in window) {
    var barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var show = !entry.isIntersecting;
        mobileBar.classList.toggle("is-visible", show);
        mobileBar.setAttribute("aria-hidden", show ? "false" : "true");
      });
    }, { rootMargin: "-40% 0px 0px 0px" });
    barObserver.observe(hero);
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revObserver.observe(el); });

    // Backstop: σε πολύ γρήγορο scroll ο IntersectionObserver μπορεί να
    // «προσπεράσει» στοιχεία. Εξασφαλίζουμε ότι τίποτα δεν μένει κρυφό.
    var ticking = false;
    function revealPassed() {
      ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = 0; i < revealEls.length; i++) {
        var el = revealEls[i];
        if (el.classList.contains("is-visible")) continue;
        if (el.getBoundingClientRect().top < vh * 0.92) {
          el.classList.add("is-visible");
          revObserver.unobserve(el);
        }
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(revealPassed); }
    }, { passive: true });
  }

  /* ---------- Φόρμα επικοινωνίας ---------- */
  var form = document.getElementById("contactForm");
  if (!form) return;

  var statusEl = document.getElementById("formStatus");
  var submitBtn = document.getElementById("submitBtn");
  var PHONE_FALLBACK = "Αν προτιμάτε, καλέστε μας στο 690 825 2007.";

  function showFieldError(name, show) {
    var input = form.elements[name];
    var msg = form.querySelector('.field-error[data-for="' + name + '"]');
    if (input) input.setAttribute("aria-invalid", show ? "true" : "false");
    if (msg) msg.hidden = !show;
  }

  function clearErrors() {
    ["name", "phone", "email"].forEach(function (n) { showFieldError(n, false); });
  }

  function setStatus(message, kind) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.classList.remove("is-success", "is-error");
    statusEl.classList.add(kind === "success" ? "is-success" : "is-error");
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function isValidPhone(v) {
    var digits = (v.match(/\d/g) || []).length;
    return digits >= 8 && /^[0-9+()\s.\-]+$/.test(v);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();

    var data = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      space: form.elements.space.value,
      area: form.elements.area.value.trim(),
      message: form.elements.message.value.trim(),
      company: form.elements.company.value.trim() // honeypot
    };

    // Έλεγχος πεδίων
    var firstInvalid = null;
    if (data.name.length < 2) { showFieldError("name", true); firstInvalid = firstInvalid || "name"; }
    if (!isValidPhone(data.phone)) { showFieldError("phone", true); firstInvalid = firstInvalid || "phone"; }
    if (data.email && !isValidEmail(data.email)) { showFieldError("email", true); firstInvalid = firstInvalid || "email"; }

    if (firstInvalid) {
      var el = form.elements[firstInvalid];
      if (el && el.focus) el.focus();
      setStatus("Ελέγξτε τα πεδία με κόκκινο και δοκιμάστε ξανά.", "error");
      return;
    }

    // Honeypot: αν είναι συμπληρωμένο, το αντιμετωπίζουμε ως spam χωρίς αποστολή
    if (data.company) {
      setStatus("Ευχαριστούμε! Το αίτημά σας στάλθηκε.", "success");
      form.reset();
      return;
    }

    // Αποστολή
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Αποστολή…"; }
    if (statusEl) statusEl.hidden = true;

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return { ok: false }; }).then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (result) {
        if (result.status === 200 && result.body && result.body.ok) {
          setStatus("Ευχαριστούμε! Λάβαμε το αίτημά σας και θα επικοινωνήσουμε σύντομα, συνήθως την ίδια μέρα.", "success");
          form.reset();
        } else if (result.status === 429) {
          setStatus("Έχουν σταλεί πολλά αιτήματα από τη συσκευή σας. Δοκιμάστε αργότερα. " + PHONE_FALLBACK, "error");
        } else {
          var reason = (result.body && result.body.error) ? result.body.error : "Κάτι πήγε στραβά κατά την αποστολή.";
          setStatus(reason + " " + PHONE_FALLBACK, "error");
        }
      })
      .catch(function () {
        setStatus("Δεν ήταν δυνατή η σύνδεση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά. " + PHONE_FALLBACK, "error");
      })
      .then(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Στείλτε το αίτημα"; }
      });
  });
})();

(() => {
  const SCOPE =
    "Tuition & school fees explorer beta (local_sim). Not production MoMo/card charges. Not ODEI Pay merchant OS (:5215). Next.js full app is separate on :3000.";

  function ensureScopeBanner() {
    if (document.querySelector(".scope-banner")) return;
    const banner = document.createElement("aside");
    banner.className = "scope-banner scope-banner-sticky";
    banner.setAttribute("role", "note");
    banner.innerHTML = "<strong>Scope</strong><span>" + SCOPE + "</span>";
    const header = document.querySelector("header.top");
    if (header) header.after(banner);
    else document.body.prepend(banner);
  }

  function wireWaitlist() {
    const form = document.getElementById("pay-waitlist");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = document.getElementById("waitlist-note");
      const email = (form.email && form.email.value) || "";
      if (!form.consent || !form.consent.checked) {
        if (note) {
          note.hidden = false;
          note.textContent = "Consent required — this is a local_sim stub only.";
        }
        return;
      }
      try {
        const key = "odelhub-pay-waitlist-stub";
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        prev.push({ email, role: form.role?.value || "student", at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
      } catch (_) {}
      if (note) {
        note.hidden = false;
        note.textContent =
          "Recorded in browser localStorage only — not durable enrolment, not billing setup, not production MoMo.";
      }
      form.reset();
    });
  }

  function wirePayButtons() {
    document.querySelectorAll("[data-pay-sim]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const host = btn.closest(".school-card") || btn.parentElement;
        let notice = host && host.querySelector(".honesty-notice");
        if (!notice && host) {
          notice = document.createElement("p");
          notice.className = "honesty-notice";
          host.appendChild(notice);
        }
        if (notice) {
          const school = btn.getAttribute("data-school") || "demo school";
          notice.textContent =
            "No charge initiated for " +
            school +
            ". ODELHUB Pay explorer is local_sim — not production MoMo/card, not ODEI Pay (:5215).";
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureScopeBanner();
    wireWaitlist();
    wirePayButtons();
  });
})();

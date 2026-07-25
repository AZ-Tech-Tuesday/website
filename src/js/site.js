(function () {
  "use strict";

  const endpoint = "https://api.xyzgalaxy.com/contact";

  const html = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  function applyTheme(t) {
    html.setAttribute("data-bs-theme", t);
    toggle.innerHTML = t === "dark"
      ? '<i class="bi bi-sun"></i>'
      : '<i class="bi bi-moon-stars"></i>';
  }

  let stored = null;
  try { stored = localStorage.getItem("att-theme"); } catch (e) {}
  applyTheme(stored || "dark");

  toggle.addEventListener("click", function () {
    const next = html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("att-theme", next); } catch (e) {}
  });

  // The events table is fully rendered at build time now (good for SEO).
  // This just handles the parts that are relative to "today" and so can't
  // be baked in at build time without a rebuild: greying out past rows,
  // hiding date-sensitive CTAs on them, and scrolling to the first
  // upcoming row. Runs once on load, same as the old renderEvents() did
  // every fetch.
  (function enhanceEvents() {
    const body = document.getElementById("eventsBody");
    const scroll = document.getElementById("eventsScroll");
    if (!body) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let firstUpcoming = null;

    Array.prototype.forEach.call(body.children, function (tr, i) {
      const iso = tr.getAttribute("data-date") || "";
      const parts = iso.split("-").map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : null;
      const isPast = d && !isNaN(d.getTime()) && d < today;

      if (isPast) {
        tr.classList.add("text-body-secondary", "opacity-50");
        tr.querySelectorAll("[data-past-hide]").forEach(function (el) {
          const span = document.createElement("span");
          span.className = "text-body-secondary small";
          span.textContent = "—";
          el.replaceWith(span);
        });
      } else if (firstUpcoming === null) {
        firstUpcoming = i;
      }
    });

    body.addEventListener("click", function (e) {
      const link = e.target.closest("a[data-date]");
      if (!link) return;
      const field = document.getElementById(link.getAttribute("data-target"));
      const iso = link.getAttribute("data-date");
      if (field && iso) field.value = iso;
    });

    const targetIndex = firstUpcoming === null ? body.children.length - 1 : firstUpcoming;
    const el = body.children[targetIndex];
    if (el && scroll) {
      const thead = scroll.querySelector("thead");
      scroll.scrollTop = Math.max(0, el.offsetTop - (thead ? thead.offsetHeight : 0));
    }
  })();

  function wireForm(formId, msgId, type) {
    const form = document.getElementById(formId);
    if (!form) return;
    const msg = document.getElementById(msgId);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const data = { type: type };
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name) data[el.name] = el.value.trim();
      });

      if (!data.name || !data.email) {
        msg.className = "small mt-3 text-danger";
        msg.textContent = "Please add your name and email.";
        return;
      }

      data.subject = type === "rsvp"
        ? "AZ Tech Tuesday RSVP"
        : "AZ Tech Tuesday Sponsor Inquiry";
      data.source = "aztechtuesday.com";

      const btn = form.querySelector('button[type="submit"]');
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";
      msg.className = "small mt-3 text-body-secondary";
      msg.textContent = "";

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          msg.className = "small mt-3 text-success";
          msg.textContent = type === "rsvp"
            ? "You're on the list — see you Tuesday."
            : "Thanks — we'll be in touch shortly.";
          form.reset();
          const party = form.querySelector('[name="party"]');
          if (party) party.value = "1";
        })
        .catch(function () {
          msg.className = "small mt-3 text-danger";
          msg.textContent = "Something went wrong. Email toni@xyzgalaxy.com and we'll sort it out.";
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = orig;
        });
    });
  }

  wireForm("sponsorForm", "sponsorMsg", "sponsor");
  wireForm("rsvpForm", "rsvpMsg", "rsvp");
})();

(function () {
  "use strict";

  /* ---------- Mobile menu ---------- */
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    btn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  }
  if (btn && nav) {
    btn.addEventListener("click", function () {
      setMenu(btn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
  }

  /* ---------- "Ponuda" submenu ---------- */
  var subWrap = document.querySelector(".has-sub");
  var subBtn = subWrap && subWrap.querySelector(".sub-btn");
  function setSub(open) {
    if (!subBtn) return;
    subBtn.setAttribute("aria-expanded", String(open));
    subWrap.classList.toggle("is-open", open);
  }
  if (subBtn) {
    subBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setSub(subBtn.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("click", function (e) {
      if (!subWrap.contains(e.target)) setSub(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (btn && nav) setMenu(false);
    setSub(false);
  });

  /* ---------- Open / closed status (Europe/Zagreb) ---------- */
  var HOURS = { 1: [8, 16], 2: [8, 16], 3: [8, 16], 4: [8, 16], 5: [8, 16] };
  var DAYNAMES = ["u nedjelju", "u ponedjeljak", "u utorak", "u srijedu", "u četvrtak", "u petak", "u subotu"];
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function zagrebNow() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zagreb", weekday: "short", hour: "numeric", minute: "numeric", hour12: false
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { day: WD[o.weekday], mins: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }

  function updateStatus() {
    var now = zagrebNow();
    var h = HOURS[now.day];
    var el = document.getElementById("status");
    var txt = document.getElementById("status-text");
    var open = false, msg = "";

    if (h && now.mins >= h[0] * 60 && now.mins < h[1] * 60) {
      open = true;
      msg = "Otvoreno do " + h[1] + ":00";
    } else {
      if (h && now.mins < h[0] * 60) {
        msg = "Zatvoreno, otvaramo danas u " + h[0] + ":00";
      } else {
        for (var i = 1; i <= 7; i++) {
          var d = (now.day + i) % 7;
          if (HOURS[d]) {
            msg = "Zatvoreno, otvaramo " + (i === 1 ? "sutra" : DAYNAMES[d]) + " u " + HOURS[d][0] + ":00";
            break;
          }
        }
      }
    }
    if (el && txt) {
      el.dataset.open = String(open);
      txt.textContent = msg;
    }

    document.querySelectorAll("#hours [data-day]").forEach(function (n) {
      var days = n.getAttribute("data-day").split(",");
      n.classList.toggle("today", days.indexOf(String(now.day)) !== -1);
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Slideshow ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll("#slides .slide"));
  var dotsBox = document.getElementById("dots");
  var toggle = document.getElementById("toggle");
  var slider = document.getElementById("slider");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");
  if (!slides.length || !dotsBox || !toggle || !slider || !prevBtn || !nextBtn) return;

  var INTERVAL = 5000;
  var current = 0, timer = null, userPaused = false, hovering = false;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  slides.forEach(function (s, i) {
    var img = s.querySelector("img");
    function miss() { s.classList.add("missing"); }
    img.addEventListener("error", miss);
    if (img.complete && img.naturalWidth === 0) miss();

    var d = document.createElement("button");
    d.type = "button";
    d.setAttribute("aria-label", "Fotografija " + (i + 1) + " od " + slides.length);
    d.addEventListener("click", function () { go(i); restart(); });
    dotsBox.appendChild(d);
  });
  var dots = Array.prototype.slice.call(dotsBox.children);

  function go(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, k) { s.classList.toggle("is-active", k === current); });
    dots.forEach(function (d, k) {
      if (k === current) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
    });
  }
  function stop() { clearInterval(timer); timer = null; }
  function start() {
    stop();
    if (userPaused || hovering || document.hidden || slides.length < 2) return;
    timer = setInterval(function () { go(current + 1); }, INTERVAL);
  }
  function restart() { start(); }

  prevBtn.addEventListener("click", function () { go(current - 1); restart(); });
  nextBtn.addEventListener("click", function () { go(current + 1); restart(); });
  toggle.addEventListener("click", function () {
    userPaused = !userPaused;
    toggle.setAttribute("aria-pressed", String(userPaused));
    toggle.setAttribute("aria-label", userPaused ? "Pokreni izmjenu" : "Zaustavi izmjenu");
    start();
  });

  slider.addEventListener("mouseenter", function () { hovering = true; stop(); });
  slider.addEventListener("mouseleave", function () { hovering = false; start(); });
  document.addEventListener("visibilitychange", start);

  slider.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { go(current - 1); restart(); }
    if (e.key === "ArrowRight") { go(current + 1); restart(); }
  });

  var x0 = null;
  slider.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart(); }
  }, { passive: true });

  if (reduce) {
    userPaused = true;
    toggle.setAttribute("aria-pressed", "true");
    toggle.setAttribute("aria-label", "Pokreni izmjenu");
  }
  go(0);
  start();
})();

/* =========================================================
   DRM — site behaviour
   Works without GSAP/Lenis (content stays visible); every
   flourish is layered on top when the libraries are present.
   ========================================================= */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  var root = document.documentElement;
  var lenis = null;

  if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  if (!REDUCED && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (HAS_GSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: REDUCED ? "auto" : "smooth" });
  }
  function scrollToEl(el) {
    var y = el.getBoundingClientRect().top + window.pageYOffset;
    scrollToY(y);
  }

  $$("[data-top]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); scrollToY(0); });
  });

  /* ---------- Year ---------- */
  var YEAR = new Date().getFullYear();
  $$("[data-year-now]").forEach(function (el) { el.textContent = YEAR; });
  $$("[data-years-since]").forEach(function (el) { el.textContent = (YEAR - 1970) + "+"; });

  /* ---------- Word splitting ---------- */
  function split(el, mode) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span");
            if (mode === "mask") {
              s.className = "w";
              var i = document.createElement("span");
              i.className = "wi"; i.textContent = t; s.appendChild(i);
            } else { s.className = "sw"; s.textContent = t; }
            frag.appendChild(s);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") { walk(ch); }
      });
    })(el);
  }

  /* ---------- Page curtain transitions ---------- */
  var curtain = $(".curtain");
  function leaveCurtain() {
    if (!curtain) return;
    curtain.classList.remove("is-start", "is-cover");
    curtain.classList.add("is-leave");
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a || !curtain || REDUCED) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
    var href = a.getAttribute("href") || "";
    if (/^(mailto:|tel:|https?:|#)/.test(href)) {
      if (href.charAt(0) === "#" && href.length > 1) {
        var t = document.getElementById(href.slice(1));
        if (t) { e.preventDefault(); closeMenu(); scrollToEl(t); }
      }
      return;
    }
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) {
      var tgt = document.getElementById(url.hash.slice(1));
      if (tgt) { e.preventDefault(); closeMenu(); scrollToEl(tgt); return; }
    }
    e.preventDefault();
    closeMenu();
    curtain.classList.remove("is-leave", "is-start");
    void curtain.offsetWidth;
    curtain.classList.add("is-cover");
    setTimeout(function () { location.href = a.href; }, 750);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) leaveCurtain(); });

  /* ---------- Nav ---------- */
  var nav = $(".nav");
  var lastY = window.pageYOffset;
  function onNavScroll() {
    var y = window.pageYOffset;
    if (!nav) return;
    nav.classList.toggle("is-solid", y > 40);
    if (!document.body.classList.contains("menu-open")) {
      nav.classList.toggle("is-hidden", y > 400 && y > lastY + 2);
      if (y < lastY - 2) nav.classList.remove("is-hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  var burger = $("[data-burger]");
  function closeMenu() {
    if (!document.body.classList.contains("menu-open")) return;
    document.body.classList.remove("menu-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
    var m = $("[data-menu]"); if (m) m.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
  }
  if (burger) {
    burger.addEventListener("click", function () {
      var open = !document.body.classList.contains("menu-open");
      if (!open) { closeMenu(); return; }
      document.body.classList.add("menu-open");
      burger.setAttribute("aria-expanded", "true");
      $("[data-menu]").setAttribute("aria-hidden", "false");
      nav.classList.remove("is-hidden");
      if (lenis) lenis.stop();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  /* ---------- Cursor ---------- */
  var cursor = $(".cursor");
  if (cursor && FINE && !REDUCED) {
    root.classList.add("has-cursor");
    var dot = $(".cursor__dot", cursor), ring = $(".cursor__ring", cursor), label = $(".cursor__label", cursor);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, ticking = false;
    // the ring eases after the pointer and the loop sleeps once it catches up
    var tick = function () {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.3) requestAnimationFrame(tick);
      else ticking = false;
    };
    window.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      cursor.classList.remove("is-hidden");
      if (!ticking) { ticking = true; requestAnimationFrame(tick); }
    }, { passive: true });
    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-cursor], a, button, label, select, input, textarea");
      if (t && t.dataset.cursor) {
        label.textContent = t.dataset.cursor;
        cursor.classList.add("is-label"); cursor.classList.remove("is-hover");
      } else if (t) {
        cursor.classList.add("is-hover"); cursor.classList.remove("is-label");
      } else {
        cursor.classList.remove("is-hover", "is-label");
      }
    });
    document.addEventListener("mouseleave", function () { cursor.classList.add("is-hidden"); });
  }

  /* ---------- Magnetic ---------- */
  if (FINE && !REDUCED) {
    $$("[data-magnetic]").forEach(function (el) {
      var s = parseFloat(el.dataset.magnetic) || 0.3;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * s, y = (e.clientY - r.top - r.height / 2) * s;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("pointerleave", function () {
        el.style.transition = "transform .7s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "";
        setTimeout(function () { el.style.transition = ""; }, 700);
      });
    });
  }

  /* ---------- Grain word (thank-you page) ---------- */
  var heroCanvas = $("[data-grains]");
  var grains = null;
  if (heroCanvas && window.GrainText) {
    grains = new GrainText(heroCanvas, {
      text: heroCanvas.dataset.grains || "DRM",
      widthRatio: parseFloat(heroCanvas.dataset.width) || 0.62,
      heightRatio: parseFloat(heroCanvas.dataset.height) || 0.56,
      centerY: parseFloat(heroCanvas.dataset.cy) || 0.43,
      mobileCenterY: parseFloat(heroCanvas.dataset.mcy) || 0.4
    });
  }

  /* ---------- Hero: the DRM range on a rotating stage (home) ---------- */
  var heroEl = $("[data-hero-stage]");
  var heroIntro = function () {};
  var rangeFront = null; // set below; used by the bag click handlers
  if (heroEl) {
    var rangeEl = $("[data-range]", heroEl);
    var heroBags = $$(".hero__bag", heroEl);
    var dots = $$(".hero__dots button", heroEl);
    var cap = $(".hero__cap", heroEl);
    var SLOTS = ["s-front", "s-right", "s-far", "s-left"]; // next pack waits on the right
    var front = -1, NB = heroBags.length, started = false;
    var place = function (f) {
      if (f === front) return;
      front = f;
      heroBags.forEach(function (b, i) {
        var slot = SLOTS[(i - f + NB) % NB];
        SLOTS.forEach(function (c) { b.classList.toggle(c, c === slot); });
        b.setAttribute("aria-label", b.dataset.name.replace("&amp;", "&") + (i === f ? " — view in collection" : " — bring to front"));
      });
      var d = heroBags[f].dataset;
      rangeEl.style.setProperty("--glow", d.glow);
      dots.forEach(function (b, i) {
        b.classList.remove("is-on");
        b.classList.toggle("is-done", i < f);
        b.setAttribute("aria-pressed", i === f ? "true" : "false");
      });
      if (started && !REDUCED) { void dots[f].offsetWidth; }
      if (started || REDUCED) dots[f].classList.add("is-on");
      cap.classList.add("is-swap");
      setTimeout(function () {
        $(".hero__cap-no", cap).textContent = "0" + (f + 1);
        $(".hero__cap-name", cap).textContent = d.name.replace("&amp;", "&");
        $(".hero__cap-kick", cap).innerHTML = d.kicker;
        cap.classList.remove("is-swap");
      }, front === f && started ? 300 : 0);
    };
    rangeFront = function (i) { place(i); };
    place(0);
    cap.classList.remove("is-swap");

    // the active progress bar is the timer: when it fills, the next pack comes forward
    dots.forEach(function (b, i) {
      b.addEventListener("click", function () { place(i); });
      $("i", b).addEventListener("animationend", function () { if (i === front && !REDUCED) place((front + 1) % NB); });
    });
    heroBags.forEach(function (b, i) {
      b.addEventListener("click", function (e) {
        if (i !== front) { e.stopImmediatePropagation(); place(i); }
      });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { rangeEl.classList.toggle("is-paused", !en[0].isIntersecting); }).observe(rangeEl);
    }

    var startCycle = function () { started = true; if (!REDUCED) dots[front].classList.add("is-on"); };
    if (HAS_GSAP && !REDUCED) {
      var inners = $$(".hero__bag-in", heroEl);
      // .01, not 0: looks the same (and sits under the loader) but lets the browser count the bag as painted
      gsap.set(inners, { opacity: 0.01, y: 140 });
      gsap.set(".hero__range", { opacity: 0 });
      heroIntro = function () {
        gsap.to(inners, { opacity: 1, y: 0, duration: 1.6, ease: "expo.out", stagger: { each: 0.12, from: "end" }, delay: 0.1 });
        gsap.to(".hero__range", { opacity: 1, duration: 1, delay: 0.9, onComplete: startCycle });
      };
      gsap.to(".hero__stage", { yPercent: -8, ease: "none", scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero__copy", { yPercent: -14, opacity: 0.2, ease: "none", scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true } });
    } else {
      heroIntro = startCycle;
    }

    if (FINE && !REDUCED) {
      var raf = 0, nx = 0, ny = 0;
      heroEl.addEventListener("pointermove", function (e) {
        nx = e.clientX / innerWidth - 0.5; ny = e.clientY / innerHeight - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          heroBags.forEach(function (b) {
            var dd = parseFloat(b.dataset.depth) || 10;
            b.style.setProperty("--px", (nx * dd) + "px");
            b.style.setProperty("--py", (ny * dd * 0.5) + "px");
          });
        });
      });
      heroEl.addEventListener("pointerleave", function () {
        heroBags.forEach(function (b) { b.style.setProperty("--px", "0px"); b.style.setProperty("--py", "0px"); });
      });
    }
  }

  /* ---------- Intro: loader or curtain ---------- */
  var heroWords = [];
  $$("[data-split-hero]").forEach(function (el) {
    split(el, "mask");
    heroWords = heroWords.concat($$(".wi", el));
  });
  function heroIn() {
    if (grains) grains.ready();
    heroIntro();
    if (HAS_GSAP && !REDUCED) {
      gsap.from(heroWords, { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.06, delay: 0.25 });
      gsap.from("[data-hero-in]", { y: 24, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, delay: 0.6 });
    }
  }

  var loader = $(".loader");
  if (loader) {
    var bar = $(".loader__bar i", loader);
    var seen = false;
    try { seen = sessionStorage.getItem("drm-seen") === "1"; sessionStorage.setItem("drm-seen", "1"); } catch (e) {}
    var dur = REDUCED ? 0 : (seen ? 350 : 1100);
    if (HAS_GSAP && !REDUCED) gsap.set(heroWords, { yPercent: 115 });
    if (lenis) lenis.stop();
    var t0 = performance.now();
    var done = false;
    var finish = function () {
      if (done) return; done = true;
      bar.style.transform = "scaleX(1)";
      if (HAS_GSAP && !REDUCED) gsap.set(heroWords, { clearProps: "transform" });
      var hide = function () { loader.style.display = "none"; if (lenis) lenis.start(); };
      if (loader.animate && !REDUCED) {
        var anim = loader.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: 1000, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
        anim.onfinish = hide;
        setTimeout(heroIn, 380);
      } else { hide(); heroIn(); }
    };
    (function count(now) {
      var p = dur ? Math.min(1, (now - t0) / dur) : 1;
      var e = 1 - Math.pow(1 - p, 3);
      bar.style.transform = "scaleX(" + e + ")";
      if (p < 1) requestAnimationFrame(count); else setTimeout(finish, seen ? 50 : 280);
    })(t0);
    setTimeout(finish, 4500); // safety net
  } else {
    setTimeout(function () { leaveCurtain(); heroIn(); }, 80);
  }
  if (loader && curtain) curtain.classList.remove("is-start");

  /* ---------- Generic reveals ---------- */
  if (HAS_GSAP && !REDUCED) {
    $$("[data-split]").forEach(function (el) {
      split(el, "mask");
      gsap.from($$(".wi", el), {
        yPercent: 115, duration: 1.3, ease: "expo.out", stagger: 0.045,
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
    $$("[data-reveal]").forEach(function (el) {
      gsap.from(el, {
        y: 50, opacity: 0, duration: 1.3, ease: "expo.out",
        delay: parseFloat(el.dataset.reveal) || 0,
        scrollTrigger: { trigger: el, start: "top 90%" }
      });
    });
    $$("[data-scrub]").forEach(function (el) {
      split(el, "scrub");
      gsap.to($$(".sw", el), {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true }
      });
    });
    $$("[data-speed]").forEach(function (el) {
      var s = parseFloat(el.dataset.speed);
      gsap.fromTo(el, { yPercent: s * 50 }, {
        yPercent: -s * 50, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
    $$("[data-count]").forEach(function (el) {
      var to = parseFloat(el.dataset.count), suf = el.dataset.suffix || "", obj = { v: 0 };
      el.textContent = "0" + suf;
      gsap.to(obj, {
        v: to, duration: 2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
        onUpdate: function () { el.textContent = Math.round(obj.v) + suf; }
      });
    });
    var film = $(".film__poster");
    if (film) {
      gsap.fromTo(film, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".film", start: "top bottom", end: "bottom top", scrub: true } });
    }
  } else {
    $$("[data-count]").forEach(function (el) { el.textContent = el.dataset.count + (el.dataset.suffix || ""); });
  }

  /* ---------- Collection stage ---------- */
  var stage = $(".collection");
  if (stage) {
    var prods = $$(".prod", stage);
    var thumbs = $$(".collection__thumbs button", stage);
    var countEl = $(".collection__count b", stage);
    var lineEl = $(".collection__line i", stage);
    var cur = -1, N = prods.length, st = null, tl = null;
    var SCRUB = HAS_GSAP && !REDUCED;
    var setActive = function (i) {
      if (i === cur) return;
      cur = i;
      prods.forEach(function (p, j) {
        p.classList.toggle("is-active", j === i);
        p.classList.toggle("is-past", j < i);
        p.setAttribute("aria-hidden", j === i ? "false" : "true");
        p.inert = j !== i; // keep keyboard focus out of the hidden packs
      });
      thumbs.forEach(function (b, j) { b.classList.toggle("is-active", j === i); b.setAttribute("aria-pressed", j === i ? "true" : "false"); });
      if (countEl) countEl.textContent = "0" + (i + 1);
      if (SCRUB) return; // colours and motion come from the scrubbed timeline
      var d = prods[i].dataset;
      stage.style.setProperty("--stage-bg", d.bg);
      stage.style.setProperty("--stage-fg", d.fg);
      stage.style.setProperty("--stage-ac", d.ac);
      if (lineEl) lineEl.style.transform = "scaleX(" + (i / (N - 1)) + ")";
    };
    setActive(0);

    // timeline layout: a short hold on each pack, one unit of travel between packs
    var HOLD = 0.4;
    var startOf = function (i) { return HOLD + (i - 1) * (1 + HOLD); }; // when the move to pack i begins
    var TOTAL = startOf(N) ;
    var restOf = function (i) { return i === 0 ? 0 : startOf(i) + 1 + HOLD / 2; };

    var go = function (i) {
      i = Math.max(0, Math.min(N - 1, i));
      if (st) scrollToY(st.start + (st.end - st.start) * (restOf(i) / TOTAL) + 1);
      else setActive(i);
    };
    thumbs.forEach(function (b, j) { b.addEventListener("click", function () { go(j); }); });
    $$("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(parseInt(b.dataset.go, 10)); }); });
    var prev = $("[data-prev]", stage), next = $("[data-next]", stage);
    if (prev) prev.addEventListener("click", function () { go(cur - 1); });
    if (next) next.addEventListener("click", function () { go(cur + 1); });

    if (SCRUB) {
      stage.classList.add("is-scrub");
      var parts = prods.map(function (p) {
        return { bag: $(".prod__bag", p), txt: $$(".prod__info > *, .prod__meta > *", p), word: $(".prod__word", p) };
      });
      var d0 = prods[0].dataset;
      gsap.set(stage, { "--stage-bg": d0.bg, "--stage-fg": d0.fg, "--stage-ac": d0.ac });
      parts.forEach(function (x, i) {
        // x/y reset: GSAP would otherwise inherit the CSS fallback offset as pixels
        gsap.set(x.bag, i ? { x: 0, y: 0, yPercent: 70, rotation: 14, scale: 0.86, opacity: 0 } : { x: 0, y: 0, yPercent: 0, rotation: 0, scale: 1, opacity: 1 });
        gsap.set(x.txt, { y: i ? 40 : 0, opacity: i ? 0 : 1 });
        gsap.set(x.word, { opacity: i ? 0 : 1 });
      });
      tl = gsap.timeline({ defaults: { ease: "none" } });
      for (var i = 1; i < N; i++) {
        var s = startOf(i), a = parts[i - 1], b = parts[i], d = prods[i].dataset;
        tl.to(a.bag, { yPercent: -70, rotation: -12, scale: 0.86, opacity: 0, duration: 0.9, ease: "power1.in" }, s)
          .to(a.txt, { y: -40, opacity: 0, duration: 0.4, stagger: 0.04, ease: "power1.in" }, s)
          .to(a.word, { opacity: 0, duration: 0.4 }, s)
          .to(stage, { "--stage-bg": d.bg, "--stage-fg": d.fg, "--stage-ac": d.ac, duration: 1 }, s)
          .to(b.bag, { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.9, ease: "power2.out" }, s + 0.1)
          .to(b.txt, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: "power2.out" }, s + 0.5)
          .to(b.word, { opacity: 1, duration: 0.4 }, s + 0.55);
      }
      tl.set({}, {}, TOTAL);

      st = ScrollTrigger.create({
        trigger: stage, pin: true, start: "top top",
        end: function () { return "+=" + window.innerHeight * (N - 1) * 0.8; },
        animation: tl, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var t = self.progress * TOTAL, idx = 0;
          for (var k = 1; k < N; k++) if (t >= startOf(k) + 0.5) idx = k;
          setActive(idx);
          if (lineEl) lineEl.style.transform = "scaleX(" + self.progress + ")";
        }
      });
    } else if (HAS_GSAP) {
      st = ScrollTrigger.create({
        trigger: stage, pin: true, start: "top top",
        end: function () { return "+=" + window.innerHeight * (N - 1) * 0.8; },
        onUpdate: function (s) { setActive(Math.min(N - 1, Math.round(s.progress * (N - 1)))); }
      });
    }

    if (FINE && !REDUCED) {
      stage.addEventListener("pointermove", function (e) {
        var r = stage.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        var tilt = $(".prod__tilt", prods[cur]);
        if (tilt) { tilt.style.setProperty("--ry", (nx * 22) + "deg"); tilt.style.setProperty("--rx", (-ny * 12) + "deg"); }
      });
      stage.addEventListener("pointerleave", function () {
        prods.forEach(function (p) { var t = $(".prod__tilt", p); if (t) { t.style.setProperty("--ry", "0deg"); t.style.setProperty("--rx", "0deg"); } });
      });
    }
  }

  /* ---------- Film ---------- */
  var filmBox = $(".film");
  if (filmBox) {
    var play = function () {
      if (filmBox.classList.contains("is-playing")) return;
      filmBox.classList.add("is-playing");
      filmBox.removeAttribute("data-cursor");
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + filmBox.dataset.video + "?autoplay=1&rel=0&modestbranding=1";
      f.title = "DRM Kolam Rice film";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.allowFullscreen = true;
      filmBox.appendChild(f);
      if (cursor) cursor.classList.remove("is-label");
    };
    filmBox.addEventListener("click", play);
    filmBox.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); } });
  }

  /* ---------- Drag-to-scroll rail ---------- */
  $$("[data-rail]").forEach(function (rail) {
    var down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) rail.classList.add("is-drag");
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return; down = false;
      setTimeout(function () { rail.classList.remove("is-drag"); }, 0);
    });
    rail.addEventListener("click", function (e) { if (moved > 4) e.preventDefault(); }, true);
    rail.addEventListener("dragstart", function (e) { e.preventDefault(); });
  });

  /* ---------- Gujarat network map ---------- */
  var mapSvg = $("#gj-map");
  if (mapSvg) {
    var NS = "http://www.w3.org/2000/svg";
    var LON0 = 68, LAT1 = 24.85, S = 100;
    var px = function (lon, lat) { return [(lon - LON0) * S, (LAT1 - lat) * S]; };
    // simplified Gujarat outline (lon, lat)
    var poly = [[68.15,23.6],[68.4,23.95],[68.75,24.3],[69.4,24.28],[70.1,24.3],[70.6,24.42],[71.1,24.65],[71.6,24.55],[72.2,24.55],[72.6,24.6],[73.1,24.45],[73.4,24.05],[73.65,23.75],[74.0,23.5],[74.3,23.15],[74.45,22.95],[74.2,22.55],[74.1,22.2],[73.85,21.85],[73.95,21.5],[73.7,21.2],[73.45,20.85],[73.2,20.55],[72.95,20.2],[72.75,20.15],[72.75,20.55],[72.85,21.05],[72.7,21.4],[72.6,21.75],[72.65,22.2],[72.35,22.25],[72.25,21.95],[72.1,21.6],[71.8,21.15],[71.4,20.85],[70.95,20.72],[70.5,20.88],[70.0,21.15],[69.55,21.55],[69.15,22.05],[68.95,22.35],[69.15,22.45],[69.6,22.45],[70.05,22.55],[70.4,22.85],[70.55,23.0],[70.15,22.95],[69.75,22.85],[69.2,22.8],[68.75,22.95],[68.45,23.2]].map(function (p) { return px(p[0], p[1]); });
    var inside = function (x, y) {
      var c = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
      }
      return c;
    };
    // ~2000 dots: built only as the map nears the viewport, so they don't slow the first paint
    var drawDots = function () {
      var g = document.createElementNS(NS, "g");
      for (var gy = 0; gy < 480; gy += 9) {
        for (var gx = 0; gx < 660; gx += 9) {
          if (inside(gx, gy)) {
            var c = document.createElementNS(NS, "circle");
            c.setAttribute("cx", gx); c.setAttribute("cy", gy); c.setAttribute("r", 1.9); c.setAttribute("class", "dot");
            g.appendChild(c);
          }
        }
      }
      mapSvg.insertBefore(g, mapSvg.firstChild);
    };
    if ("IntersectionObserver" in window) {
      var dotIo = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        dotIo.disconnect(); drawDots();
      }, { rootMargin: "800px 0px" });
      dotIo.observe(mapSvg);
    } else { drawDots(); }

    var cities = {
      jetalpur: { n: "Jetalpur · Head Office", ll: [72.59, 22.89], hq: true, lx: 12, ly: -12 },
      rajkot: { n: "Rajkot", ll: [70.80, 22.30], lx: -14, ly: -10, a: "end" },
      gondal: { n: "Gondal", ll: [70.79, 21.96], lx: 14, ly: 5 },
      jetpur: { n: "Jetpur", ll: [70.62, 21.75], lx: -14, ly: 14, a: "end" },
      surat: { n: "Surat", ll: [72.83, 21.17], lx: 14, ly: 5 },
      vapi: { n: "Vapi", ll: [72.90, 20.37], lx: 14, ly: 5 },
      bhuj: { n: "Bhuj", ll: [69.67, 23.25], lx: -14, ly: -10, a: "end" }
    };
    var hq = px(cities.jetalpur.ll[0], cities.jetalpur.ll[1]);
    var arcs = document.createElementNS(NS, "g"), pins = document.createElementNS(NS, "g");
    Object.keys(cities).forEach(function (key) {
      var cdat = cities[key], p = px(cdat.ll[0], cdat.ll[1]);
      if (!cdat.hq) {
        var mx2 = (hq[0] + p[0]) / 2, my2 = (hq[1] + p[1]) / 2;
        // bow each route upward (perpendicular offset pointing north)
        var dx = p[0] - hq[0], dy = p[1] - hq[1];
        var ox = -dy * 0.28, oy = dx * 0.28;
        if (oy > 0) { ox = -ox; oy = -oy; }
        var cx = mx2 + ox, cy = my2 + oy;
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", "M" + hq[0] + "," + hq[1] + " Q" + cx + "," + cy + " " + p[0] + "," + p[1]);
        path.setAttribute("class", "arc");
        path.dataset.city = key;
        arcs.appendChild(path);
      }
      var pin = document.createElementNS(NS, "g");
      pin.setAttribute("class", "pin" + (cdat.hq ? " hq" : ""));
      pin.dataset.city = key;
      var halo = document.createElementNS(NS, "circle");
      halo.setAttribute("cx", p[0]); halo.setAttribute("cy", p[1]); halo.setAttribute("r", 6); halo.setAttribute("class", "halo");
      var core = document.createElementNS(NS, "circle");
      core.setAttribute("cx", p[0]); core.setAttribute("cy", p[1]); core.setAttribute("r", cdat.hq ? 6 : 5); core.setAttribute("class", "core");
      var label = document.createElementNS(NS, "text");
      label.setAttribute("x", p[0] + cdat.lx); label.setAttribute("y", p[1] + cdat.ly);
      if (cdat.a) label.setAttribute("text-anchor", cdat.a);
      label.textContent = cdat.n;
      pin.appendChild(halo); pin.appendChild(core); pin.appendChild(label);
      pins.appendChild(pin);
    });
    mapSvg.appendChild(arcs); mapSvg.appendChild(pins);

    // draw arcs when the map enters view
    var arcEls = $$(".arc", mapSvg);
    arcEls.forEach(function (a) {
      var l = a.getTotalLength();
      a.style.strokeDasharray = l; a.style.strokeDashoffset = REDUCED ? 0 : l;
    });
    if ("IntersectionObserver" in window && !REDUCED) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        arcEls.forEach(function (a, i) {
          a.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1) " + (i * 0.12) + "s, opacity .4s, stroke-width .4s";
          a.style.strokeDashoffset = 0;
        });
        io.disconnect();
      }, { threshold: 0.3 });
      io.observe(mapSvg);
    } else { arcEls.forEach(function (a) { a.style.strokeDashoffset = 0; }); }

    var light = function (key) {
      $$(".pin", mapSvg).forEach(function (p) { if (!p.classList.contains("hq")) p.classList.toggle("is-on", p.dataset.city === key); });
      arcEls.forEach(function (a) { a.classList.toggle("is-on", a.dataset.city === key); });
    };
    var rows = $$(".city");
    var open = function (row, force) {
      var isOpen = force != null ? force : !row.classList.contains("is-open");
      rows.forEach(function (r) {
        var on = r === row && isOpen;
        r.classList.toggle("is-open", on);
        $(".city__btn", r).setAttribute("aria-expanded", on ? "true" : "false");
      });
      light(isOpen ? row.dataset.city : null);
      if (HAS_GSAP) setTimeout(function () { ScrollTrigger.refresh(); }, 750);
    };
    rows.forEach(function (row) {
      var btn = $(".city__btn", row);
      btn.addEventListener("click", function () { open(row); });
      btn.addEventListener("mouseenter", function () { light(row.dataset.city); });
      btn.addEventListener("mouseleave", function () { var o = $(".city.is-open"); light(o ? o.dataset.city : null); });
    });
    $$(".pin", mapSvg).forEach(function (p) {
      p.addEventListener("click", function () {
        var row = $('.city[data-city="' + p.dataset.city + '"]');
        if (row) open(row, true);
      });
    });
    if (rows[0]) open(rows[0], true);
  }

  /* ---------- Contact form ---------- */
  var form = $("#enquiry");
  if (form) {
    $$(".field input, .field textarea, .field select", form).forEach(function (inp) {
      var f = function () { inp.closest(".field").classList.toggle("is-filled", !!inp.value); };
      inp.addEventListener("input", f); inp.addEventListener("change", f); f();
    });
    var btn = $("#submitBtn"), status = $(".form__status", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      btn.disabled = true;
      $(".btn__label", btn).textContent = "Sending…";
      status.textContent = "";
      var type = (form.querySelector('input[name="inquiryType"]:checked') || {}).value || "";
      var payload = {
        access_key: form.dataset.key,
        subject: "New website inquiry: " + type,
        from_name: "DRM Website",
        name: $("#name").value,
        email: $("#email").value,
        phone: $("#phone").value,
        date: $("#date").value,
        inquiryType: type,
        message: $("#message").value,
        botcheck: $("#botcheck").checked
      };
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.success) throw new Error(d.message || "Submission failed");
          form.reset();
          if (curtain) { curtain.classList.add("is-cover"); setTimeout(function () { location.href = "./thankyou.html"; }, 700); }
          else location.href = "./thankyou.html";
        })
        .catch(function (err) {
          console.error(err);
          status.textContent = "Something went wrong — please try again, or call us on +91 78787 35775.";
          btn.disabled = false;
          $(".btn__label", btn).textContent = "Send enquiry";
        });
    });
  }

  /* refresh after fonts/images settle */
  if (HAS_GSAP) {
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();

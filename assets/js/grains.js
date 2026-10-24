/* =========================================================
   GrainText — thousands of rice grains that pour in and
   settle into a word, then part around the visitor's hand.
   Usage: const g = new GrainText(canvas, { text: "DRM" });
   ========================================================= */
(function () {
  "use strict";

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var TONES = [
    ["#fffaf1", "#efe5d2", "#c9b694"], // cream
    ["#ffffff", "#f6f0e5", "#d8cbb0"], // polished white
    ["#fbf3e2", "#e8d9bb", "#bba27a"], // warm
    ["#f8dc98", "#d9a94f", "#93641d"]  // the odd golden grain
  ];

  function sprite(len, wid, tone) {
    var w = Math.ceil(len * DPR) + 4, h = Math.ceil(wid * DPR) + 4;
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var g = c.getContext("2d");
    var rx = (len * DPR) / 2, ry = (wid * DPR) / 2;
    var grd = g.createLinearGradient(0, h / 2 - ry, 0, h / 2 + ry);
    grd.addColorStop(0, tone[0]);
    grd.addColorStop(0.5, tone[1]);
    grd.addColorStop(1, tone[2]);
    g.fillStyle = grd;
    // grain: an ellipse with slightly tapered tip
    g.beginPath();
    g.ellipse(w / 2, h / 2, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.55;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.ellipse(w / 2 - rx * 0.15, h / 2 - ry * 0.3, rx * 0.5, ry * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function GrainText(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.text = opts.text || "DRM";
    this.font = opts.font || "'DM Serif Display', serif";
    this.weight = opts.weight || "400";
    this.widthRatio = opts.widthRatio || 0.66;
    this.heightRatio = opts.heightRatio || 0.56;
    this.centerY = opts.centerY || 0.44;
    this.mobileCenterY = opts.mobileCenterY || 0.4;
    this.maxGrains = opts.maxGrains || 4200;
    this.ambient = opts.ambient == null ? 90 : opts.ambient;
    this.parts = [];
    this.mouse = { x: -9999, y: -9999, active: false };
    this.scatter = 0;
    this.visible = true;
    this.time = 0;
    this.running = false;
    this._loop = this._loop.bind(this);

    var self = this;
    this._onMove = function (e) {
      var r = self.canvas.getBoundingClientRect();
      self.mouse.x = e.clientX - r.left;
      self.mouse.y = e.clientY - r.top;
      self.mouse.active = true;
    };
    this._onLeave = function () { self.mouse.x = -9999; self.mouse.y = -9999; self.mouse.active = false; };
    window.addEventListener("pointermove", this._onMove, { passive: true });
    window.addEventListener("pointerdown", this._onMove, { passive: true });
    document.addEventListener("pointerleave", this._onLeave);
    window.addEventListener("blur", this._onLeave);

    var rt;
    this._onResize = function () { clearTimeout(rt); rt = setTimeout(function () { self.layout(false); }, 150); };
    window.addEventListener("resize", this._onResize);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        self.visible = en[0].isIntersecting;
        if (self.visible) self.start();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) self.start(); });
  }

  GrainText.prototype.layout = function (intro) {
    var cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
    if (!cw || !ch) return;
    this.w = cw; this.h = ch;
    this.canvas.width = Math.round(cw * DPR);
    this.canvas.height = Math.round(ch * DPR);
    var mobile = cw < 700;

    var len = Math.max(6, Math.min(13, cw / 120));
    var wid = len * 0.42;
    this.len = len;
    this.sprites = TONES.map(function (t) { return sprite(len, wid, t); });

    // render the word off-screen and sample it
    var off = document.createElement("canvas");
    off.width = cw; off.height = ch;
    var o = off.getContext("2d");
    var fs = ch * this.heightRatio;
    o.font = this.weight + " " + fs + "px " + this.font;
    var tw = o.measureText(this.text).width;
    var maxW = cw * (mobile ? 0.9 : this.widthRatio);
    if (tw > maxW) { fs *= maxW / tw; }
    o.font = this.weight + " " + fs + "px " + this.font;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillStyle = "#000";
    var cy = ch * (mobile ? this.mobileCenterY : this.centerY);
    o.fillText(this.text, cw / 2, cy);
    var data = o.getImageData(0, 0, cw, ch).data;

    var pts, step = len * 0.56;
    for (var tries = 0; tries < 6; tries++) {
      pts = [];
      for (var y = 0; y < ch; y += step) {
        for (var x = (Math.floor(y / step) % 2) * step * 0.5; x < cw; x += step) {
          var jx = x + (Math.random() - 0.5) * step * 0.7;
          var jy = y + (Math.random() - 0.5) * step * 0.7;
          var ix = jx | 0, iy = jy | 0;
          if (ix < 0 || iy < 0 || ix >= cw || iy >= ch) continue;
          if (data[(iy * cw + ix) * 4 + 3] > 140) pts.push([jx, jy]);
        }
      }
      var cap = mobile ? Math.min(1900, this.maxGrains) : this.maxGrains;
      if (pts.length <= cap) break;
      step *= Math.sqrt(pts.length / cap) * 1.02;
    }

    // shuffle so the pour isn't row-by-row
    for (var i = pts.length - 1; i > 0; i--) {
      var k = (Math.random() * (i + 1)) | 0, tmp = pts[i]; pts[i] = pts[k]; pts[k] = tmp;
    }

    var total = pts.length + this.ambient;
    var parts = this.parts;
    while (parts.length > total) parts.pop();
    for (var n = 0; n < total; n++) {
      var p = parts[n];
      var isNew = !p;
      if (isNew) {
        p = parts[n] = {
          x: 0, y: 0, vx: 0, vy: 0,
          a: Math.random() * Math.PI * 2, va: 0,
          tone: Math.random() < 0.035 ? 3 : (Math.random() * 3) | 0,
          ph: Math.random() * Math.PI * 2,
          sd: 0.6 + Math.random() * 0.9,
          dir: Math.random() * Math.PI * 2,
          s: 0.85 + Math.random() * 0.3
        };
      }
      if (n < pts.length) {
        p.amb = false;
        p.tx = pts[n][0]; p.ty = pts[n][1];
      } else {
        p.amb = true;
        p.tx = Math.random() * cw; p.ty = Math.random() * ch;
        p.drift = 0.08 + Math.random() * 0.22;
      }
      if (isNew || intro) {
        if (intro && !REDUCED && !p.amb) {
          p.x = p.tx + (Math.random() - 0.5) * 80;
          p.y = -20 - Math.random() * ch * 0.7;
          p.delay = (p.tx / cw) * 0.9 + Math.random() * 0.7;
        } else {
          p.x = p.tx; p.y = p.ty; p.delay = 0;
        }
        p.vx = 0; p.vy = 0;
      }
    }
    this.count = pts.length;
    this.introT = 0;
    if (REDUCED) this.draw();
    this.start();
  };

  GrainText.prototype.setScatter = function (v) {
    this.scatter = v;
    if (REDUCED) this.draw();
  };

  GrainText.prototype.start = function () {
    if (this.running || REDUCED) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  };

  GrainText.prototype._loop = function (now) {
    if (!this.visible || document.hidden) { this.running = false; return; }
    var dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.step(dt);
    this.draw();
    requestAnimationFrame(this._loop);
  };

  GrainText.prototype.step = function (dt) {
    var parts = this.parts, m = this.mouse;
    var R = Math.max(80, Math.min(150, this.w / 11)), R2 = R * R;
    var sc = this.scatter, spread = Math.max(this.w, this.h) * 0.75;
    var t = this.time, f60 = dt * 60;
    var k = 0.045, damp = Math.pow(0.86, f60);

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }

      var tx, ty;
      if (p.amb) {
        p.ty -= p.drift * f60;
        p.tx += Math.sin(t * 0.4 + p.ph) * 0.15 * f60;
        if (p.ty < -20) { p.ty = this.h + 20; p.tx = Math.random() * this.w; p.y = p.ty; p.x = p.tx; }
        tx = p.tx; ty = p.ty;
      } else {
        tx = p.tx + Math.cos(p.dir) * sc * spread * p.sd;
        ty = p.ty + Math.sin(p.dir) * sc * spread * p.sd - sc * this.h * 0.25;
        ty += Math.sin(t * 1.3 + p.ph) * 0.6; // breathing
      }

      var dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) {
        var d = Math.sqrt(d2), f = (1 - d / R) * 2.4 * f60;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
        p.va += (Math.random() - 0.5) * 0.06 * f;
      }

      p.vx = (p.vx + (tx - p.x) * k * f60) * damp;
      p.vy = (p.vy + (ty - p.y) * k * f60) * damp;
      p.x += p.vx * f60;
      p.y += p.vy * f60;
      p.va *= 0.92;
      p.a += p.va * f60 + (p.vx * 0.004);
    }
  };

  GrainText.prototype.draw = function () {
    var ctx = this.ctx, parts = this.parts, sp = this.sprites;
    if (!sp) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var fade = 1 - Math.min(1, this.scatter * 1.1);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.delay > 0) continue;
      if (REDUCED && p.amb) continue;
      var s = sp[p.tone], c = Math.cos(p.a) * p.s, sn = Math.sin(p.a) * p.s;
      ctx.globalAlpha = p.amb ? 0.35 : (0.35 + 0.65 * fade);
      ctx.setTransform(c, sn, -sn, c, p.x * DPR, p.y * DPR);
      ctx.drawImage(s, -s.width / 2, -s.height / 2);
    }
    ctx.globalAlpha = 1;
  };

  GrainText.prototype.ready = function (cb) {
    var self = this;
    var go = function () { self.layout(true); if (cb) cb(); };
    if (document.fonts && document.fonts.load) {
      document.fonts.load(this.weight + " 100px " + this.font).then(go, go);
    } else { go(); }
  };

  window.GrainText = GrainText;
})();

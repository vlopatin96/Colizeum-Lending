/* COLIZEUM бэк-офис: корпоративная карта (макет 856×540 рисуется на canvas, перенесён из присланного генератора) */
(function () {
  var A = window.A, $ = A.$, IM = window.CERT_ASSETS;
  var W = 856, H = 540, S = 2, cF = $("#cF"), cB = $("#cB");
  cF.width = cB.width = W * S; cF.height = cB.height = H * S;
  var ctx, ACC = "#ffd21a", LG = null, WMI = null, CL = null;
  var RU = '"Russo One","Arial Black",Impact,sans-serif', SANS = '"Segoe UI",Arial,sans-serif';
  var load = function (src) { return new Promise(function (r) { var i = new Image(); i.onload = function () { r(i); }; i.onerror = function () { r(null); }; i.src = src; }); };
  var rgba = function (h, a) { var n = parseInt(h.slice(1), 16); return "rgba(" + (n >> 16) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; };

  function T(s, x, y, f, c, ls, al, bl) {
    ctx.font = f; ctx.fillStyle = c; ctx.textAlign = al || "left"; ctx.textBaseline = bl || "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = (ls || 0) + "px";
    ctx.fillText(s, x, y);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }
  function fit(s, x, y, maxW, size, c, bl) {
    ctx.font = size + "px " + RU;
    while (size > 10 && ctx.measureText(s).width > maxW) { size -= 1; ctx.font = size + "px " + RU; }
    T(s, x, y, size + "px " + RU, c, 0, "left", bl || "alphabetic");
  }
  function contain(img, x, y, w, h) { var r = Math.min(w / img.width, h / img.height), dw = img.width * r, dh = img.height * r; ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function brush(x, y, w, h) {
    var P = [[0, .15], [.06, 0], [.34, .1], [.62, 0], [1, .12], [.97, .52], [1, .92], [.7, 1], [.38, .94], [.05, 1], [.02, .55]];
    ctx.beginPath(); P.forEach(function (p, i) { ctx[i ? "lineTo" : "moveTo"](x + p[0] * w, y + p[1] * h); }); ctx.closePath();
  }
  function seeded(s) { return function () { return (s = (s * 9301 + 49297) % 233280) / 233280; }; }

  function base() {
    ctx.beginPath(); rr(0, 0, W, H, 26); ctx.clip();
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * .3, H * .28, 0, W * .3, H * .28, W * .62);
    g.addColorStop(0, "rgba(120,95,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var hz = H * .68; ctx.strokeStyle = rgba(ACC, .26); ctx.lineWidth = 1;
    for (var i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 26, hz); ctx.lineTo(W / 2 + i * 120, H); ctx.stroke(); }
    for (var k = 0; k < 8; k++) { var y = hz + (H - hz) * Math.pow(k / 7, 1.8); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    var r = seeded(11);
    for (var n = 0; n < 70; n++) { ctx.fillStyle = rgba(ACC, .25 + r() * .5); ctx.beginPath(); ctx.arc(r() * W, r() * H, r() * 1.4 + .3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = ACC; ctx.lineWidth = 7; ctx.lineJoin = "miter";
    ctx.beginPath(); ctx.moveTo(W - 340, 24); ctx.lineTo(W - 24, 24); ctx.lineTo(W - 24, 150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, H - 130); ctx.lineTo(24, H - 24); ctx.lineTo(300, H - 24); ctx.stroke();
  }
  function front() {
    if (LG) ctx.drawImage(LG, 56, 140, 160, 160);
    if (WMI) ctx.drawImage(WMI, 240, 150, 560, 560 * WMI.height / WMI.width);
    T("КИБЕРСПОРТИВНЫЙ КЛУБ", 242, 254, "700 21px " + SANS, "#b5b19c", 4.6);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(250, 360); ctx.lineTo(606, 360); ctx.stroke();
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.moveTo(428, 349); ctx.lineTo(439, 360); ctx.lineTo(428, 371); ctx.lineTo(417, 360); ctx.fill();
    [["ИГРЫ", 300], ["ЛЮДИ", 428], ["ЭМОЦИИ", 566]].forEach(function (p) { T(p[0], p[1], 412, "20px " + RU, ACC, 4, "center"); });
  }
  function qrM(t) {
    if (!t || !window.qrcode) return null;
    try { var q = qrcode(0, "H"); q.addData(t); q.make(); return { n: q.getModuleCount(), get: function (r, c) { return q.isDark(r, c); } }; } catch (e) { return null; }
  }
  function fake(seed) {
    var r = seeded(seed), n = 25, m = [];
    for (var y = 0; y < n; y++) { m[y] = []; for (var x = 0; x < n; x++) {
      var fx = x < 7 ? x : x > 17 ? x - 18 : -1, fy = y < 7 ? y : y > 17 ? y - 18 : -1;
      m[y][x] = (fx >= 0 && fy >= 0 && ((x < 7 && y < 7) || (x > 17 && y < 7) || (x < 7 && y > 17))) ? (fx == 0 || fx == 6 || fy == 0 || fy == 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5)) : r() > .5;
    } }
    return { n: n, get: function (r, c) { return m[r][c]; } };
  }
  function qrBox(x, y, s, txt, seed, center) {
    ctx.lineWidth = 2.5; ctx.strokeStyle = ACC; ctx.fillStyle = "#0a0a0a"; rr(x, y, s, s, 16); ctx.fill(); ctx.stroke();
    var p = 12, inner = s - 2 * p; ctx.fillStyle = "#fff"; rr(x + p, y + p, inner, inner, 8); ctx.fill();
    var m = qrM(txt) || fake(seed), q = 5, mod = (inner - 2 * q) / m.n; ctx.fillStyle = "#000";
    for (var r = 0; r < m.n; r++) for (var c = 0; c < m.n; c++) if (m.get(r, c)) ctx.fillRect(x + p + q + c * mod, y + p + q + r * mod, mod + .4, mod + .4);
    if (center && LG) { var d = inner * .24, cx = x + s / 2, cy = y + s / 2; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, d * .62, 0, 7); ctx.fill(); ctx.drawImage(LG, cx - d / 2, cy - d / 2, d, d); }
  }
  function partner() {
    var x = 44, y = 304, w = 440, h = 84, name = $("#k-name").value.trim();
    var chip = function (cw) { ctx.fillStyle = "#fff"; rr(x, y, cw, h, 14); ctx.fill(); };
    if (CL && !name) { chip(w); contain(CL, x + 18, y + 10, w - 36, h - 20); }
    else if (CL) { var cw = Math.min(170, Math.max(84, (h - 20) * CL.width / CL.height + 32)); chip(cw); contain(CL, x + 14, y + 10, cw - 28, h - 20); fit(name, x + cw + 20, y + h / 2 + 2, w - cw - 20, 44, "#fff", "middle"); }
    else if (name) fit(name, x, y + h / 2 + 2, w, 52, "#fff", "middle");
    else { ctx.setLineDash([8, 6]); ctx.strokeStyle = "#5a5336"; ctx.lineWidth = 2; rr(x, y, w, h, 14); ctx.stroke(); ctx.setLineDash([]); fit("Ваша компания", x + 22, y + h / 2 + 2, w - 44, 36, "#6b6650", "middle"); }
  }
  function back() {
    fit("КОРПОРАТИВНАЯ", 44, 140, 560, 54, "#fff");
    ctx.fillStyle = ACC; brush(28, 158, 340, 92); ctx.fill();
    T("КАРТА", 50, 230, "76px " + RU, "#000");
    T("В ПАРТНЁРСТВЕ С", 46, 288, "700 14px " + SANS, "#b5b19c", 3.2);
    partner();
    if (LG) ctx.drawImage(LG, 44, 452, 36, 36);
    if (WMI) ctx.drawImage(WMI, 90, 459, 120, 120 * WMI.height / WMI.width);
    qrBox(650, 50, 160, $("#k-u1").value.trim(), 7, true);
    T("БРОНИРУЙ ПК", 730, 238, "700 14px " + SANS, "#b5b19c", 2.4, "center");
    qrBox(650, 262, 160, $("#k-u2").value.trim(), 31, false);
    T("АКЦИИ В INSTAGRAM", 730, 450, "700 14px " + SANS, "#b5b19c", 2.4, "center");
  }
  function paint(cv, fn) { ctx = cv.getContext("2d"); ctx.save(); ctx.clearRect(0, 0, cv.width, cv.height); ctx.scale(S, S); base(); fn(); ctx.restore(); }
  var raf = 0;
  function draw() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { paint(cF, front); paint(cB, back); }); }

  /* логотип компании */
  function logoUi(has, src) {
    $("#k-thumb").hidden = !has; $("#k-rm").hidden = !has; if (has) $("#k-thumb").src = src; else $("#k-thumb").removeAttribute("src");
    $("#k-dropTxt").textContent = has ? "Заменить файл" : "Выбрать файл";
  }
  function logoErr(t) { var e = $("#k-e-logo"); e.hidden = !t; e.textContent = t || ""; }
  function clearLogo() { CL = null; $("#k-logo").value = ""; logoUi(false); logoErr(""); draw(); }
  $("#k-logo").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { clearLogo(); logoErr("Формат не поддерживается. Загрузите PNG, JPG, SVG или WebP"); return; }
    if (f.size > 2 * 1024 * 1024) { clearLogo(); logoErr("Файл больше 2 МБ. Уменьшите его и загрузите снова"); return; }
    var r = new FileReader();
    r.onload = function () { load(r.result).then(function (i) { if (!i) { clearLogo(); logoErr("Не удалось открыть изображение. Попробуйте другой файл"); return; } CL = i; logoErr(""); logoUi(true, r.result); draw(); }); };
    r.onerror = function () { logoErr("Не удалось прочитать файл. Попробуйте другой"); };
    r.readAsDataURL(f);
  });
  $("#k-rm").addEventListener("click", clearLogo);
  ["k-name", "k-u1", "k-u2"].forEach(function (id) { $("#" + id).addEventListener("input", draw); });

  /* уменьшенная копия логотипа для журнала (чтобы не переполнить хранилище браузера) */
  function smallLogo() {
    if (!CL) return "";
    var k = Math.min(1, 320 / Math.max(CL.width, CL.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(CL.width * k)); c.height = Math.max(1, Math.round(CL.height * k)); c.getContext("2d").drawImage(CL, 0, 0, c.width, c.height);
    try { return c.toDataURL("image/png"); } catch (e) { return ""; }
  }
  function sheet() {
    var g = 80, c = document.createElement("canvas"); c.width = W * S + 2 * g; c.height = H * S * 2 + 3 * g;
    var x = c.getContext("2d"); x.fillStyle = "#1b1b20"; x.fillRect(0, 0, c.width, c.height); x.drawImage(cF, g, g); x.drawImage(cB, g, H * S + 2 * g); return c;
  }

  A.card = {
    draw: draw,
    setAccent: function (c) { ACC = c; draw(); },
    values: function () { return { name: $("#k-name").value.trim(), u1: $("#k-u1").value.trim(), u2: $("#k-u2").value.trim(), logo: smallLogo() }; },
    fill: function (v) {
      $("#k-name").value = v.name || ""; $("#k-u1").value = v.u1 || ""; $("#k-u2").value = v.u2 || "";
      if (v.logo) load(v.logo).then(function (i) { CL = i; logoUi(!!i, v.logo); draw(); }); else { CL = null; logoUi(false); draw(); }
    },
    reset: function () { $("#k-name").value = ""; $("#k-u1").value = ""; $("#k-u2").value = ""; clearLogo(); },
    blob: function (kind) { var cv = kind === "front" ? cF : kind === "back" ? cB : sheet(); return new Promise(function (r) { cv.toBlob(r, "image/png"); }); }
  };

  Promise.all([load(IM.logo), load(IM.wordmark), document.fonts ? document.fonts.load("40px " + RU).catch(function () { }) : 0]).then(function (a) { LG = a[0]; WMI = a[1]; draw(); });
  if (document.fonts) document.fonts.ready.then(draw);
})();

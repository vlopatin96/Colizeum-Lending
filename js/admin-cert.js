/* COLIZEUM бэк-офис: сертификаты — форма, предпросмотр двух сторон, выгрузка PNG, журнал */
(function () {
  var A = window.A, $ = A.$, esc = A.esc, IM = window.CERT_ASSETS;
  var KEY = "clz_certs";

  /* ---------- разметка сертификата (из присланного шаблона) ---------- */
  var BLOB = '<svg viewBox="0 0 400 100" preserveAspectRatio="none"><path class="blobp" d="M6 22 L60 10 L130 18 L210 6 L290 16 L360 4 L394 20 L384 52 L396 84 L330 94 L250 86 L170 96 L90 88 L24 94 L10 60 Z"/></svg>';
  function bgSvg(seed) {
    var s = seed, h = "", y0 = 335, g = '<g class="grid">';
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = -16; i <= 16; i++) g += '<line x1="' + (450 + i * 14) + '" y1="' + y0 + '" x2="' + (450 + i * 110) + '" y2="540" stroke-opacity=".22" stroke-width="1.2"/>';
    for (var k = 0; k <= 9; k++) { var y = y0 + 205 * Math.pow(k / 9, 1.9); g += '<line x1="0" x2="900" y1="' + y + '" y2="' + y + '" stroke-opacity="' + (.1 + k * .03) + '" stroke-width="1.2"/>'; }
    h += g + "</g>";
    for (var n = 0; n < 70; n++) h += '<circle cx="' + (rnd() * 900) + '" cy="' + (rnd() * 540) + '" r="' + (0.6 + rnd() * 1.1) + '" fill-opacity="' + (.3 + rnd() * .5) + '"/>';
    [[40, 150], [560, 120], [420, 300], [690, 250]].forEach(function (p) {
      h += '<path class="spark" d="M' + p[0] + " " + (p[1] - 11) + " Q" + p[0] + " " + p[1] + " " + (p[0] + 11) + " " + p[1] + " Q" + p[0] + " " + p[1] + " " + p[0] + " " + (p[1] + 11) + " Q" + p[0] + " " + p[1] + " " + (p[0] - 11) + " " + p[1] + " Q" + p[0] + " " + p[1] + " " + p[0] + " " + (p[1] - 11) + 'Z"/>';
    });
    return '<svg class="bg" viewBox="0 0 900 540" preserveAspectRatio="none">' + h + "</svg>";
  }
  var FRONT = function () {
    return '<div class="cert" id="front">' + bgSvg(7) +
      '<div class="corner c1"></div><div class="corner c2"></div><div class="hatch"></div>' +
      '<svg class="crown" viewBox="0 0 50 34"><path d="M3 30 L6 8 L17 19 L25 3 L33 19 L44 8 L47 30 Z" stroke-width="3" stroke-linejoin="round"/></svg>' +
      '<div class="f-head"><img class="logo" src="' + IM.logo + '" alt=""><div><img class="wm" src="' + IM.wordmark + '" alt="COLIZEUM"><div class="club">КИБЕРСПОРТИВНЫЙ КЛУБ</div></div></div>' +
      '<div class="divider"><i></i></div><div class="tagline">ИГРЫ ЛЮДИ ЭМОЦИИ</div>' +
      '<div class="f-label">ПОДАРОЧНЫЙ СЕРТИФИКАТ НА</div>' +
      '<div class="blob f-blob">' + BLOB + '<div class="amt"><span id="o-amount">50</span><span class="cur" id="o-cur">BYN</span></div></div>' +
      '<div class="f-valid"><span class="k">ДЕЙСТВИТЕЛЕН ДО</span><span class="v" id="o-until-f">—</span></div></div>';
  };
  var BACK = function () {
    return '<div class="cert" id="back">' + bgSvg(20) +
      '<div class="corner c1"></div><div class="corner c2"></div><div class="hatch"></div>' +
      '<div class="b-title">ПОДАРОЧНЫЙ</div>' +
      '<div class="blob blob2">' + BLOB + '<div class="b2">СЕРТИФИКАТ</div></div>' +
      '<div class="b-note" id="o-note"></div>' +
      '<div class="b-terms">' +
      '<div><span class="k">НОМИНАЛ</span><span class="v" id="o-nom">—</span></div>' +
      '<div><span class="k">НОМЕР</span><span class="v" id="o-num">—</span></div>' +
      '<div><span class="k">ДАТА ВЫДАЧИ</span><span class="v" id="o-issue">—</span></div>' +
      '<div><span class="k">ДЕЙСТВИТЕЛЕН ДО</span><span class="v" id="o-until">—</span></div></div>' +
      '<div class="b-small" id="o-small"></div>' +
      '<div class="b-foot"><img class="logo" src="' + IM.logo + '" alt=""><img class="wm" src="' + IM.wordmark + '" alt="COLIZEUM"></div>' +
      '<div class="qrs"><img src="' + IM.qrBook + '" alt="QR бронирование"><div class="cap">БРОНИРУЙ ПК</div><img src="' + IM.qrInsta + '" alt="QR Instagram"><div class="cap">АКЦИИ В INSTAGRAM</div></div></div>';
  };
  $("#scaler-front").innerHTML = FRONT();
  $("#scaler-back").innerHTML = BACK();

  /* масштаб под ширину колонки */
  function fit() {
    ["front", "back"].forEach(function (n) {
      var box = $("#box-" + n), sc = $("#scaler-" + n), s = box.clientWidth / 900;
      if (!s) return; sc.style.transform = "scale(" + s + ")"; box.style.height = (540 * s) + "px";
    });
  }
  if (window.ResizeObserver) { var ro = new ResizeObserver(fit); ro.observe($("#box-front")); }
  window.addEventListener("resize", fit);

  /* ---------- журнал сертификатов и карт ---------- */
  var KEY = "clz_certs", mode = "cert", jf = "all";
  var today = new Date();
  var seedDate = function (off) { var d = new Date(today); d.setDate(d.getDate() + off); return A.isoDate(d); };
  var items = A.load(KEY, null);
  if (!items) {
    items = [
      { type: "cert", num: "CLZ-0001", amount: 50, cur: "BYN", issued: seedDate(-12), days: 30, name: "Иван", phone: "375291234567", used: false, demo: true },
      { type: "cert", num: "CLZ-0002", amount: 20, cur: "BYN", issued: seedDate(-40), days: 30, name: "Анна", phone: "375447654321", used: false, demo: true },
      { type: "cert", num: "CLZ-0003", amount: 100, cur: "BYN", issued: seedDate(-5), days: 30, name: "", phone: "", used: true, demo: true },
      { type: "card", num: "CRP-0001", company: "ООО «Пример»", logo: "", u1: "", u2: "", acc: "#3cc8ff", issued: seedDate(-20), blocked: false, demo: true }
    ];
    A.save(KEY, items);
  }
  items.forEach(function (c) { if (!c.type) c.type = "cert"; });
  function untilOf(c) { var d = A.parseISO(c.issued); d.setDate(d.getDate() + (+c.days || 30)); return d; }
  function statusOf(c) {
    if (c.type === "card") return c.blocked ? ["bad", "Заблокирована"] : ["ok", "Активна"];
    if (c.used) return ["info", "Использован"];
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return untilOf(c) < t ? ["bad", "Просрочен"] : ["ok", "Активен"];
  }
  function nextNum(type) {
    var pre = type === "card" ? "CRP-" : "CLZ-", m = 0;
    items.forEach(function (c) { if (String(c.num).indexOf(pre) === 0) { var n = parseInt(String(c.num).replace(/\D/g, ""), 10); if (n > m) m = n; } });
    return pre + String(m + 1).padStart(4, "0");
  }

  /* ---------- форма ---------- */
  var F = { amount: $("#c-amount"), cur: $("#c-cur"), issue: $("#c-issue"), days: $("#c-days"), num: $("#c-num"), name: $("#c-name"), phone: $("#c-phone"), note: $("#c-note"), small: $("#c-small"), acc: $("#c-acc") };
  [20, 30, 50, 100, 150].forEach(function (v) { var b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = v; b.dataset.v = v; b.setAttribute("aria-pressed", "false"); $("#amount-chips").appendChild(b); });
  $("#amount-chips").addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; F.amount.value = b.dataset.v; render(); });
  [["#ffd21a", "Жёлтый"], ["#6fd34a", "Зелёный"], ["#3cc8ff", "Голубой"], ["#ff6a3d", "Оранжевый"]].forEach(function (c) {
    var b = document.createElement("button"); b.type = "button"; b.className = "acc-dot"; b.style.setProperty("--c", c[0]); b.dataset.c = c[0]; b.setAttribute("aria-label", c[1]); b.setAttribute("aria-pressed", "false"); $("#acc-presets").appendChild(b);
  });
  $("#acc-presets").addEventListener("click", function (e) { var b = e.target.closest(".acc-dot"); if (!b) return; F.acc.value = b.dataset.c; render(); });

  function setMode(m) {
    mode = m;
    $$("[data-mode]").forEach(function (n) { n.hidden = n.dataset.mode !== m; });
    $$("#doc-mode button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === m)); });
    $("#form-title").textContent = m === "card" ? "Новая корпоративная карта" : "Новый сертификат";
    $("#form-sub").textContent = m === "card" ? "Добавьте название и логотип компании: обе стороны карты соберутся сразу." : "Дата окончания считается сама: дата выдачи плюс срок действия.";
    $("#c-issue-btn").textContent = m === "card" ? "Выдать карту" : "Выдать сертификат";
    $("#c-num-lbl").textContent = m === "card" ? "Номер карты" : "Номер сертификата";
    F.num.value = nextNum(m); fit(); render();
  }
  $("#doc-mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b && b.dataset.v !== mode) setMode(b.dataset.v); });
  function $$(s) { return A.$$(s); }

  function resetForm() {
    F.amount.value = 50; F.cur.value = "BYN"; F.issue.value = A.isoDate(new Date()); F.days.value = 30; F.num.value = nextNum(mode);
    F.name.value = ""; F.phone.value = ""; $("#c-phone-err").hidden = true; if (A.card) A.card.reset(); render();
  }
  function render() {
    var issue = A.parseISO(F.issue.value || A.isoDate(new Date()));
    var until = new Date(issue); until.setDate(until.getDate() + (parseInt(F.days.value, 10) || 30));
    var amt = F.amount.value || "0", cur = F.cur.value || "BYN";
    $("#o-amount").textContent = amt; $("#o-cur").textContent = cur;
    $("#o-until-f").textContent = A.fmtDate(until); $("#o-until").textContent = A.fmtDate(until); $("#c-until").textContent = A.fmtDate(until);
    $("#o-issue").textContent = A.fmtDate(issue); $("#o-num").textContent = F.num.value || "—";
    $("#o-nom").textContent = amt + " " + cur;
    $("#o-note").textContent = F.note.value; $("#o-small").textContent = F.small.value;
    $$("#amount-chips .chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.v === String(amt))); });
    $$("#acc-presets .acc-dot").forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.c.toLowerCase() === F.acc.value.toLowerCase())); });
    $$(".cert").forEach(function (c) { c.style.setProperty("--yellow", F.acc.value); });
    if (A.card) A.card.setAccent(F.acc.value);
  }
  Object.keys(F).forEach(function (k) { F[k].addEventListener("input", render); });

  /* ---------- выгрузка PNG ---------- */
  function certCanvas(id) {
    var holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:540px";
    var clone = $("#" + id).cloneNode(true); holder.appendChild(clone); document.body.appendChild(holder);
    return (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { return html2canvas(clone, { backgroundColor: null, scale: 3, useCORS: true }); })
      .then(function (cv) { holder.remove(); return cv; }, function (e) { holder.remove(); throw e; });
  }
  function toBlob(cv) { return new Promise(function (r) { cv.toBlob(r, "image/png"); }); }
  function certBlob(kind) {
    if (!window.html2canvas) return Promise.reject(new Error("no html2canvas"));
    if (kind !== "sheet") return certCanvas(kind).then(toBlob);
    return Promise.all([certCanvas("front"), certCanvas("back")]).then(function (cs) {
      var g = 80, c = document.createElement("canvas"); c.width = cs[0].width + 2 * g; c.height = cs[0].height * 2 + 3 * g;
      var x = c.getContext("2d"); x.fillStyle = "#1b1b20"; x.fillRect(0, 0, c.width, c.height); x.drawImage(cs[0], g, g); x.drawImage(cs[1], g, cs[0].height + 2 * g); return toBlob(c);
    });
  }
  var KIND = { front: "lico", back: "oborot", sheet: "list" };
  $$("[data-dl]").forEach(function (b) {
    b.addEventListener("click", function () {
      var kind = b.dataset.dl; A.toast("Готовим картинку…");
      var p = mode === "card" ? A.card.blob(kind) : certBlob(kind);
      p.then(function (blob) { return A.saveBlob(blob, "colizeum-" + (mode === "card" ? "karta" : "sertifikat") + "-" + F.num.value + "-" + KIND[kind] + ".png"); })
        .catch(function () { A.toast("Не удалось собрать картинку. Проверьте интернет и попробуйте ещё раз.", true); });
    });
  });

  /* ---------- выдача ---------- */
  $("#cert-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (items.some(function (c) { return c.num === F.num.value; })) { A.toast("Документ с таким номером уже есть в журнале", true); F.num.focus(); return; }
    if (mode === "card") {
      var v = A.card.values();
      if (!v.name) { A.toast("Укажите название компании", true); $("#k-name").focus(); return; }
      items.unshift({ type: "card", num: F.num.value, company: v.name, logo: v.logo, u1: v.u1, u2: v.u2, acc: F.acc.value, issued: F.issue.value, blocked: false });
      A.save(KEY, items); A.toast("Карта " + F.num.value + " выдана"); resetForm(); rows(); return;
    }
    var ph = F.phone.value.trim(), err = $("#c-phone-err");
    var norm = ph ? A.normPhone(ph) : { ok: true, phone: "" };
    if (!norm.ok) { err.hidden = false; err.textContent = "Номер не распознан: " + norm.reason; F.phone.classList.add("bad"); F.phone.focus(); return; }
    err.hidden = true; F.phone.classList.remove("bad");
    if (!(+F.amount.value > 0)) { A.toast("Укажите сумму больше нуля", true); F.amount.focus(); return; }
    items.unshift({ type: "cert", num: F.num.value, amount: +F.amount.value, cur: F.cur.value, issued: F.issue.value, days: +F.days.value || 30, name: F.name.value.trim(), phone: norm.phone, used: false, note: F.note.value, small: F.small.value, acc: F.acc.value });
    A.save(KEY, items); A.toast("Сертификат " + F.num.value + " выдан"); resetForm(); rows();
  });
  $("#c-reset").addEventListener("click", resetForm);

  /* ---------- таблица журнала ---------- */
  $("#j-filter").addEventListener("click", function (e) { var b = e.target.closest(".chip"); if (!b) return; jf = b.dataset.f; $$("#j-filter .chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); }); rows(); });
  function rows() {
    var tb = $("#cert-rows");
    $("#cnt-certs").textContent = items.length;
    var list = items.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return jf === "all" || x.c.type === jf; });
    if (!list.length) { tb.innerHTML = '<tr><td colspan="8"><div class="empty"><b>Здесь пока пусто</b>Заполните форму выше и нажмите «Выдать».</div></td></tr>'; return; }
    tb.innerHTML = list.map(function (x) {
      var c = x.c, i = x.i, st = statusOf(c), card = c.type === "card";
      var who = card ? (c.logo ? '<img class="logothumb" alt="" src="' + c.logo + '">' : "") + esc(c.company) : (esc(c.name) || '<span class="muted">—</span>') + (c.phone ? '<br><span class="muted mono" style="font-size:12.5px">+' + esc(c.phone) + "</span>" : "");
      var acts = '<button class="btn sm quiet" data-a="show" data-i="' + i + '">Показать</button>' +
        (card ? '<button class="btn sm quiet" data-a="block" data-i="' + i + '">' + (c.blocked ? "Включить" : "Заблокировать") + "</button>"
          : (c.phone && !c.used ? '<button class="btn sm" data-a="sms" data-i="' + i + '">СМС</button>' : "") + '<button class="btn sm quiet" data-a="use" data-i="' + i + '">' + (c.used ? "Вернуть" : "Использован") + "</button>") +
        '<button class="btn sm danger" data-a="del" data-i="' + i + '">Удалить</button>';
      return '<tr><td><span class="typebadge ' + (card ? "card" : "") + '">' + (card ? "Карта" : "Сертификат") + "</span></td><td class=\"mono\">" + esc(c.num) + (c.demo ? '<span class="tagx">пример</span>' : "") + "</td><td>" + who + "</td>" +
        '<td class="num">' + (card ? '<span class="muted">—</span>' : c.amount + " " + esc(c.cur)) + "</td><td>" + A.fmtDate(A.parseISO(c.issued)) + "</td><td>" + (card ? '<span class="muted">без срока</span>' : A.fmtDate(untilOf(c))) + "</td>" +
        '<td><span class="pill ' + st[0] + '">' + st[1] + '</span></td><td><div class="acts">' + acts + "</div></td></tr>";
    }).join("");
  }
  $("#cert-rows").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return; var i = +b.dataset.i, c = items[i];
    if (b.dataset.a === "use") { c.used = !c.used; A.save(KEY, items); rows(); }
    if (b.dataset.a === "block") { c.blocked = !c.blocked; A.save(KEY, items); rows(); A.toast(c.blocked ? "Карта заблокирована" : "Карта снова активна"); }
    if (b.dataset.a === "del") A.confirmBtn(b, "Точно удалить?", function () { items.splice(i, 1); A.save(KEY, items); rows(); A.toast("Удалено"); });
    if (b.dataset.a === "show") {
      if (c.type !== mode) setMode(c.type);
      F.num.value = c.num; F.issue.value = c.issued;
      if (c.type === "card") { A.card.fill({ name: c.company, logo: c.logo, u1: c.u1, u2: c.u2 }); }
      else { F.amount.value = c.amount; F.cur.value = c.cur; F.days.value = c.days; F.name.value = c.name || ""; F.phone.value = c.phone ? "+" + c.phone : ""; if (c.note) F.note.value = c.note; if (c.small) F.small.value = c.small; }
      if (c.acc) F.acc.value = c.acc; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (b.dataset.a === "sms") {
      var d = untilOf(c);
      A.smsPrefill({ recipients: "+" + c.phone + (c.name ? "; " + c.name : ""), message: "{name}, ваш подарочный сертификат COLIZEUM " + c.num + " на " + c.amount + " " + c.cur + ". Действует до " + A.fmtDate(d) + ". Покажите сообщение администратору: ул. Советская, 48-57.", batch: "Сертификат " + c.num });
    }
  });

  A.hooks.certs = function () { fit(); if (A.card) A.card.draw(); };
  F.num.value = nextNum("cert"); F.issue.value = A.isoDate(new Date()); render(); rows(); setTimeout(fit, 0);
})();

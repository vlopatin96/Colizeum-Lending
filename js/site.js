/* COLIZEUM — общий скрипт публичного сайта: шапка, подвал, тарифы, акции, копирование номера */
(function () {
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var pageEl = document.querySelector("[data-page]");
  var page = (pageEl && pageEl.getAttribute("data-page")) || "home";

  /* перспективная сетка «пол арены» */
  var floor = document.querySelector(".floor");
  if (floor) {
    var g = "", y0 = 0, H = 260, W = 1200;
    for (var i = -16; i <= 16; i++) g += '<line x1="' + (W / 2 + i * 22) + '" y1="0" x2="' + (W / 2 + i * 120) + '" y2="' + H + '"/>';
    for (var k = 1; k <= 9; k++) { var y = H * Math.pow(k / 9, 1.9); g += '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" style="opacity:' + (0.25 + k * 0.07) + '"/>'; }
    floor.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true"><g stroke="#ffd21a" stroke-opacity=".22" stroke-width="1.2" fill="none">' + g + "</g></svg>";
  }

  var header = $("#site-header");
  if (header) {
    header.className = "topbar";
    header.innerHTML =
      '<div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="COLIZEUM — на главную"><img class="mark" src="img/logo.png" alt=""><img class="word" src="img/wordmark.png" alt="COLIZEUM"></a>' +
      '<nav class="nav" aria-label="Разделы сайта">' +
      '<a href="index.html"' + (page === "home" ? ' aria-current="page"' : "") + '>Главная</a>' +
      '<a class="hide-s" href="index.html#tariffs">Тарифы</a>' +
      '<a href="akcii.html"' + (page === "akcii" ? ' aria-current="page"' : "") + '>Акции</a>' +
      '<a class="hide-s" href="index.html#contacts">Контакты</a>' +
      "</nav></div>";
  }

  var footer = $("#site-footer");
  if (footer) {
    footer.innerHTML =
      '<div class="wrap"><div>© COLIZEUM Cyber Arena, ' + esc(S.city) + ". " + esc(S.address) + "</div>" +
      '<div><a href="' + S.instagram + '" target="_blank" rel="noopener">Instagram</a> &nbsp;·&nbsp; <a href="' + S.telegram + '" target="_blank" rel="noopener">Telegram</a> &nbsp;·&nbsp; <a href="admin.html">Для сотрудников</a></div></div>';
  }

  function toast(msg) {
    var t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 1800);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]");
    if (!b) return;
    var text = b.getAttribute("data-copy");
    var done = function () { toast("Скопировано: " + text); };
    var fallback = function () {
      var r = document.createRange(), n = $(b.getAttribute("data-copy-target") || "");
      if (n) { r.selectNodeContents(n); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast("Выделено, нажмите Ctrl+C");
    };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (err) { fallback(); }
  });

  /* ---- контакты, подставляем из данных ---- */
  document.querySelectorAll("[data-site]").forEach(function (n) { n.textContent = S[n.getAttribute("data-site")]; });
  document.querySelectorAll("[data-href]").forEach(function (n) { n.setAttribute("href", S[n.getAttribute("data-href")]); });

  /* ---- тарифы ---- */
  var troot = $("#tariff-root");
  if (troot) {
    var tabs = '<div class="tabs" role="tablist" aria-label="Зона клуба">';
    S.zones.forEach(function (z, i) {
      tabs += '<button class="tab" role="tab" id="tab-' + z.id + '" data-zone="' + z.id + '" aria-selected="' + (i === 0) + '">' + esc(z.name) + "</button>";
    });
    tabs += "</div>";
    troot.innerHTML = tabs + '<div class="tariff" id="tariff-panel" role="tabpanel"></div>';
    var draw = function (id) {
      var z = S.zones.filter(function (x) { return x.id === id; })[0];
      var prices = z.rows.map(function (r, i) {
        var hot = i === z.rows.length - 1;
        return '<div class="price' + (hot ? " hot" : "") + '"><span class="when">' + esc(r[0]) + '</span><span class="sum">' + r[1] + "<small>" + S.currency + "</small></span></div>";
      }).join("");
      $("#tariff-panel").innerHTML =
        '<div class="tariff-info"><h3>' + esc(z.name) + '</h3><p class="muted">' + esc(z.note) + '</p><a class="btn primary" href="' + S.bookingUrl + '">Забронировать</a></div>' +
        '<div class="rows">' + prices + "</div>";
      troot.querySelectorAll(".tab").forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.zone === id)); });
    };
    troot.addEventListener("click", function (e) { var t = e.target.closest(".tab"); if (t) draw(t.dataset.zone); });
    draw(S.zones[0].id);
  }

  /* ---- акции ---- */
  var proot = $("#promos-root");
  if (proot) {
    var cats = [["all", "Все акции"], ["season", "Сезонные"], ["always", "Постоянные"], ["gift", "Подарки"], ["events", "События"]];
    var have = {}; (window.PROMOS ? window.PROMOS.visible() : S.promos).forEach(function (p) { have[p.cat] = 1; });
    cats = cats.filter(function (c) { return c[0] === "all" || have[c[0]]; });
    var fil = $("#filters");
    fil.innerHTML = cats.map(function (c, i) { return '<button class="chip" data-cat="' + c[0] + '" aria-pressed="' + (i === 0) + '">' + c[1] + "</button>"; }).join("");
    var card = function (p) {
      var cls = "promo" + (p.featured ? " featured" : "") + (p.cat === "gift" ? " gift" : "") + (p.qr ? " qr" : "");
      var h = '<article class="' + cls + '" data-cat="' + p.cat + '">';
      if (p.img) h += '<div class="media"><img src="' + p.img + '" alt="' + esc(p.imgAlt || "") + '" loading="lazy"><span class="badge">' + esc(p.catName) + "</span></div>";
      h += '<div class="body">';
      if (!p.img) h += '<span class="label">' + esc(p.catName) + "</span>";
      h += "<h2>" + esc(p.title) + "</h2><p class=\"muted\">" + esc(p.lead) + "</p>";
      if (p.price) h += '<div class="pricebox"><b>' + esc(p.price) + "</b><span>" + esc(p.priceNote || "") + "</span></div>";
      if (p.list) h += "<ul>" + p.list.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>";
      if (p.qr) h += '<div class="qrrow"><img src="img/qr-insta.png" alt="QR-код Instagram клуба"><div><b>Следите в Instagram</b><p class="muted">' + esc(S.instagramName) + '</p><a class="btn sm ghost" style="margin-top:10px" href="' + S.instagram + '" target="_blank" rel="noopener">Открыть</a></div></div>';
      if (p.note) h += '<p class="note">' + esc(p.note) + "</p>";
      if (p.end) h += '<p class="until">Акция действует до ' + fmtD(p.end) + "</p>";
      return h + "</div></article>";
    };
    var live = (window.PROMOS ? window.PROMOS.visible() : S.promos);
    var fmtD = function (iso) { var m = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"], a = iso.split("-"); return +a[2] + " " + m[+a[1] - 1]; };
    proot.innerHTML = live.length ? live.map(card).join("") : '<p class="muted" style="grid-column:1/-1;padding:40px 0">Сейчас активных акций нет. Загляните позже или следите за анонсами в Instagram.</p>';
    fil.addEventListener("click", function (e) {
      var b = e.target.closest(".chip"); if (!b) return;
      fil.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      proot.querySelectorAll(".promo").forEach(function (a) { a.hidden = b.dataset.cat !== "all" && a.dataset.cat !== b.dataset.cat; });
    });
  }
})();

/* COLIZEUM: список акций, общий для сайта и бэк-офиса. Хранится в браузере (в рабочей версии это запрос к серверу). */
(function () {
  var KEY = "clz_promos", mem = null;
  var P = window.PROMOS = {};
  P.CATS = { season: "Сезонная", always: "Постоянная", gift: "Подарок", events: "События" };
  P.IMGS = [["", "Без картинки"], ["img/promo-newyear.jpg", "Новый год"], ["img/promo-pizza.jpg", "Пицца"], ["img/cert-front.jpg", "Сертификат"], ["img/hall.jpg", "Зал клуба"]];
  var pad = function (n) { return String(n).padStart(2, "0"); };
  P.today = function () { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  function seed() {
    return ((window.SITE && window.SITE.promos) || []).map(function (p) {
      var q = JSON.parse(JSON.stringify(p)); q.on = true; q.start = ""; q.end = "";
      if (q.id === "newyear") q.end = "2027-01-10";
      return q;
    });
  }
  P.all = function () {
    if (mem) return mem;
    try { var v = localStorage.getItem(KEY); if (v) { mem = JSON.parse(v); return mem; } } catch (e) { }
    mem = seed(); return mem;
  };
  P.save = function (list) { mem = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { } };
  P.reset = function () { mem = seed(); try { localStorage.removeItem(KEY); } catch (e) { } return mem; };
  /* live: идёт сейчас; soon: ещё не началась; done: срок вышел; off: выключена вручную */
  P.status = function (p, today) {
    today = today || P.today();
    if (!p.on) return "off";
    if (p.start && today < p.start) return "soon";
    if (p.end && today > p.end) return "done";
    return "live";
  };
  P.visible = function () { return P.all().filter(function (p) { return P.status(p) === "live"; }); };
})();

/* COLIZEUM бэк-офис: общие функции, хранение в браузере, переключение разделов */
(function () {
  var A = window.A = {};
  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  A.esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* хранение: только удобства этого браузера, всё обёрнуто в try/catch */
  var mem = {};
  A.load = function (k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : (mem[k] !== undefined ? mem[k] : def); } catch (e) { return mem[k] !== undefined ? mem[k] : def; } };
  A.save = function (k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* без хранилища работаем в памяти */ } };

  var th;
  A.toast = function (msg, bad) {
    var t = A.$("#toast"); t.textContent = msg; t.className = "toast on" + (bad ? " bad" : "");
    clearTimeout(th); th = setTimeout(function () { t.className = "toast"; }, 2600);
  };

  A.pad = function (n) { return String(n).padStart(2, "0"); };
  A.isoDate = function (d) { return d.getFullYear() + "-" + A.pad(d.getMonth() + 1) + "-" + A.pad(d.getDate()); };
  A.months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  A.fmtDate = function (d) { return d.getDate() + " " + A.months[d.getMonth()] + " " + d.getFullYear(); };
  A.fmtDT = function (ts) { var d = new Date(ts); return A.pad(d.getDate()) + "." + A.pad(d.getMonth() + 1) + "." + d.getFullYear() + " " + A.pad(d.getHours()) + ":" + A.pad(d.getMinutes()); };
  A.parseISO = function (s) { var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };

  /* двухшаговое подтверждение вместо confirm(): кнопка меняет подпись на несколько секунд */
  A.confirmBtn = function (btn, label, fn) {
    if (btn.dataset.armed) { clearTimeout(btn._t); delete btn.dataset.armed; btn.textContent = btn.dataset.orig; fn(); return; }
    btn.dataset.armed = "1"; btn.dataset.orig = btn.textContent; btn.textContent = label;
    btn._t = setTimeout(function () { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; }, 3000);
  };

  /* сохранение файла: через возможность downloads внутри claude.ai, иначе обычная ссылка и запасная картинка */
  A.dl = null;
  try { if (window.claude && window.claude.use) window.claude.use("downloads").then(function (d) { A.dl = d; }, function () { }); } catch (e) { }
  A.saveBlob = function (blob, name) {
    if (A.dl) {
      return A.dl.save({ filename: name, data: blob }).then(function () { A.toast("Файл сохранён"); }, function (e) {
        if (e && e.code === "declined") return; A.toast("Не удалось сохранить файл. Попробуйте ещё раз.", true);
      });
    }
    var url = URL.createObjectURL(blob), a = document.createElement("a"); a.download = name; a.href = url; document.body.appendChild(a);
    try { a.click(); } catch (e) { /* покажем картинку ниже */ }
    a.remove();
    var out = A.$("#dl-result"); out.hidden = false;
    out.innerHTML = '<p class="sidelbl">Готово: ' + A.esc(name) + '</p><img alt="Готовая картинка" style="width:100%;border-radius:12px;border:1px solid var(--line)" src="' + url + '">';
    A.toast("Картинка готова");
    return Promise.resolve();
  };

  A.copy = function (text, el) {
    var ok = function () { A.toast("Скопировано"); };
    var fb = function () { if (el) { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } A.toast("Выделено: нажмите Ctrl+C"); };
    try { navigator.clipboard.writeText(text).then(ok, fb); } catch (e) { fb(); }
  };

  /* разделы: certs, sms, history, black, promos, config (имена в hash без служебных слов claude.ai) */
  var views = ["certs", "sms", "history", "black", "promos", "config"];
  A.hooks = {};
  A.go = function (v) { if (location.hash.slice(1) !== v) location.hash = v; else show(); };
  function show() {
    var v = location.hash.slice(1); if (views.indexOf(v) < 0) v = "certs";
    views.forEach(function (n) { A.$("#view-" + n).hidden = n !== v; });
    A.$$("#menu button").forEach(function (b) { if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    document.title = "COLIZEUM Бэк-офис";
    if (A.hooks[v]) A.hooks[v]();
    window.scrollTo(0, 0);
  }
  A.$("#menu").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) A.go(b.dataset.view); });
  window.addEventListener("hashchange", show);
  A.start = show;
})();

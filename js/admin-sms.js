/* COLIZEUM бэк-офис: СМС-рассылки по SmartDelivery API (multi.php), история и статусы, подключение */
(function () {
  var A = window.A, $ = A.$, $$ = A.$$, esc = A.esc;
  var CFG_KEY = "clz_cfg2", MAIL_KEY = "clz_mail", BAL_KEY = "clz_bal";
  var HOSTS = { main: "sds.smstraffic.ru", backup: "sds2.smstraffic.ru" };
  var DELIM = "|~|", CHUNK = 500, STATUS_CHUNK = 15;

  var cfg = Object.assign({ server: "main", login: "", mode: "demo", proxy: "", orig: "COLIZEUM.BY", price: 0.045 }, A.load(CFG_KEY, {}));
  var pass = "";
  var money = function (n) { var t = (+n || 0).toFixed(3); if (t.slice(-1) === "0") t = t.slice(0, -1); return t.replace(".", ","); };
  var balance = A.load(BAL_KEY, 250);

  /* ---------- справочники из документации ---------- */
  var ST = { ROUTED: ["info", "Отправляется"], SENT: ["info", "Отправлено"], DELIVERED: ["ok", "Доставлено"], READ: ["ok", "Прочитано"], CLICKED: ["ok", "Переход по ссылке"],
    UNDELIVERED: ["bad", "Не доставлено"], NOT_ROUTED: ["warn", "Нет отчёта о доставке"], DOUBLED: ["warn", "Дубль"], ERROR: ["bad", "Ошибка маршрута"], TIMEOUT: ["warn", "Время жизни истекло"],
    SCHEDULED: ["info", "Отложено"], QUEUED: ["info", "В очереди"] };
  var ERR = { sms: { 1: "Абонент недоступен или отключён", 2: "Запрет на приём сообщений", 3: "Номер не существует или не обслуживается", 4: "Память телефона переполнена", 5: "Аппаратная ошибка телефона", 6: "Сервис коротких сообщений не предоставляется", 7: "Аппарат не поддерживает СМС", 8: "Аппарат занят операцией", 9: "Абонент в роуминге", 10: "Истекло время ожидания доставки" },
    viber: { 8: "Абонент заблокировал чат с отправителем", 9: "На устройстве не установлен Viber", 10: "Viber на устройстве недоступен" } };

  /* ---------- телефоны ---------- */
  A.normPhone = function (raw) {
    var d = String(raw).replace(/\D/g, "");
    if (!d) return { ok: false, reason: "нет цифр (428)", raw: raw, digits: "" };
    if (/^80(25|29|33|44)\d{7}$/.test(d)) d = "375" + d.slice(2);
    else if (/^(25|29|33|44)\d{7}$/.test(d)) d = "375" + d;
    else if (/^8\d{10}$/.test(d)) d = "7" + d.slice(1);
    if (/^375(25|29|33|44)\d{7}$/.test(d) || /^7\d{10}$/.test(d)) return { ok: true, phone: d };
    var why = d.length < 10 ? "слишком короткий (425)" : d.length > 15 ? "слишком длинный (426)" : /^375/.test(d) ? "неверная длина или код оператора (427)" : "неверный формат или оператор не поддерживается (428)";
    return { ok: false, reason: why, raw: raw, digits: d };
  };
  var fmtPhone = function (p) { return /^375/.test(p) ? "+375 " + p.slice(3, 5) + " " + p.slice(5, 8) + "-" + p.slice(8, 10) + "-" + p.slice(10) : "+" + p; };

  function parseRcpts(text, ignore) {
    var out = { valid: [], invalid: [], dups: 0 }, seen = {}, first = true;
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      if (first) { first = false; if (!/\d/.test(line)) return; }
      var parts = line.split(/[;\t]/), items = [];
      if (parts.length === 1 && line.indexOf(",") > -1) {
        var tk = line.split(",");
        if (tk.every(function (t) { return t.replace(/\D/g, "").length >= 7; })) items = tk.map(function (t) { return [t, ""]; });
        else items = [[tk[0], tk.slice(1).join(",").trim()]];
      } else items = [[parts[0], (parts[1] || "").trim()]];
      items.forEach(function (it) {
        var n = A.normPhone(it[0]);
        if (!n.ok && ignore && n.digits && n.digits.length >= 7 && n.digits.length <= 15) n = { ok: true, phone: n.digits, forced: true };
        if (!n.ok) { out.invalid.push({ raw: it[0].trim(), reason: n.reason }); return; }
        if (seen[n.phone]) { out.dups++; return; }
        seen[n.phone] = 1; out.valid.push({ phone: n.phone, name: it[1], forced: n.forced });
      });
    });
    return out;
  }

  /* ---------- длина и части сообщения ---------- */
  var TL = { "ж": 2, "х": 2, "ц": 2, "ч": 2, "ш": 2, "ю": 2, "я": 2, "ё": 2, "щ": 4, "ъ": 0, "ь": 0 };
  function translitLen(t) { var n = 0; for (var i = 0; i < t.length; i++) { var c = t[i], lc = c.toLowerCase(); n += (/[а-яё]/.test(lc)) ? (TL[lc] !== undefined ? TL[lc] : 1) : 1; } return n; }
  function msgInfo(text, rus) {
    var cyr = /[^\u0000-\u007f]/.test(text), len = text.length;
    if (rus === "0" && cyr) { len = translitLen(text); cyr = false; }
    var single = cyr ? 70 : 160, multi = cyr ? 67 : 153;
    return { len: len, cyr: cyr, single: single, multi: multi, parts: len === 0 ? 0 : (len <= single ? 1 : Math.ceil(len / multi)) };
  }
  var withName = function (msg, name) { return msg.split("{name}").join(name || "гость"); };

  /* ---------- чтение формы ---------- */
  var T = { rcpt: $("#s-rcpt"), msg: $("#s-msg"), rus: $("#s-rus"), maxp: $("#s-maxparts"), orig: $("#s-orig"), route: $("#s-route"), routeC: $("#s-route-custom"),
    img: $("#s-img"), btnn: $("#s-btnname"), btnu: $("#s-btnurl"), linkt: $("#s-linktext"), start: $("#s-start"), stop: $("#s-stop"), next: $("#s-nextday"), local: $("#s-localtime"),
    batch: $("#s-batch"), track: $("#s-track"), wantids: $("#s-wantids"), ignore: $("#s-ignore") };
  var when = "now", tried = false;

  function routeValue() { return T.route.value === "custom" ? T.routeC.value.trim() : T.route.value; }
  function mskTs(v) { if (!v) return null; var m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 3 * 3600e3 : null; }
  function mskStr(v) { return v.replace("T", " ") + ":00"; }

  function read() {
    var ignore = T.ignore.checked, r = parseRcpts(T.rcpt.value, ignore), msg = T.msg.value, rus = T.rus.value;
    r.blocked = r.valid.filter(function (x) { return A.black && A.black.has(x.phone); });
    if (r.blocked.length) r.valid = r.valid.filter(function (x) { return !(A.black && A.black.has(x.phone)); });
    var infos = r.valid.map(function (x) { return msgInfo(withName(msg, x.name), rus); });
    var parts = infos.reduce(function (s, i) { return s + i.parts; }, 0);
    var maxp = Math.max(1, Math.min(255, parseInt(T.maxp.value, 10) || 255));
    var capped = infos.reduce(function (s, i) { return s + Math.min(i.parts, maxp); }, 0);
    var sample = msgInfo(withName(msg, (r.valid[0] || {}).name), rus);
    return { r: r, msg: msg, rus: rus, sample: sample, totalParts: capped, maxp: maxp, route: routeValue(), orig: T.orig.value.trim(), ignore: ignore,
      later: when === "later", start: T.start.value, stop: T.stop.value, individual: /\{name\}/.test(msg), want: T.wantids.checked && when !== "later", batch: T.batch.value.trim(), track: T.track.value.trim() };
  }

  function validate(st) {
    var e = [];
    if (!st.r.valid.length) e.push(st.r.blocked.length ? "Все номера из списка находятся в чёрном списке." : st.r.invalid.length ? "Нет ни одного корректного номера (407)." : "Не указан ни один телефон (407).");
    if (!st.msg.trim()) e.push("Не указан текст сообщения (405).");
    if (st.msg.length > 17085) e.push("Текст слишком длинный (703): не более 17085 символов.");
    if (st.individual && st.msg.indexOf(DELIM) > -1) e.push("Текст не должен содержать «" + DELIM + "» (704).");
    if (!st.orig) e.push("Не указан отправитель (443).");
    else if (/^\d+$/.test(st.orig) ? st.orig.length > 15 : (st.orig.length > 11 || /[^A-Za-z0-9 .\-_!&+]/.test(st.orig))) e.push("Отправитель указан неверно (421/436): до 11 латинских символов или до 15 цифр.");
    if (st.route) {
      if (!/^[a-z]+(\(\d+\))?(-[a-z]+(\(\d+\))?)*$/i.test(st.route)) e.push("Маршрут задан неверно (701). Пример: viber(60)-sms.");
      else (st.route.match(/\((\d+)\)/g) || []).forEach(function (m) { var n = +m.slice(1, -1); if (n < 30 || n > 86400) e.push("TTL в маршруте должен быть от 30 до 86400 секунд (701)."); });
    }
    if (cfg.mode === "demo" && st.totalParts * (+cfg.price || 0) > balance + 1e-9) e.push("Не хватает средств на балансе: нужно " + money(st.totalParts * (+cfg.price || 0)) + " BYN, доступно " + money(balance) + " (415).");
    if (st.track.length > 40) e.push("Метка для статусов длиннее 40 символов.");
    if (st.later) {
      var s = mskTs(st.start), p = mskTs(st.stop), now = Date.now();
      if (s === null) e.push("Не указана дата начала рассылки (416).");
      else {
        if (s <= now) e.push("Дата начала находится в прошлом (417).");
        if (s > now + 3 * 864e5) e.push("Отложить можно не более чем на 3 суток вперёд.");
        if (p !== null && p <= s) e.push("Время остановки раньше времени начала (502).");
      }
    }
    if (/viber/.test(st.route)) {
      if (T.btnu.value && !T.btnn.value) e.push("Для кнопки Viber укажите её название.");
      if (T.btnn.value && !T.btnu.value) e.push("Для кнопки Viber укажите ссылку.");
    }
    return e;
  }

  /* ---------- запросы к API ---------- */
  function buildRequests(st) {
    var list = st.r.valid, reqs = [];
    for (var i = 0; i < list.length; i += CHUNK) {
      var ch = list.slice(i, i + CHUNK), p = {};
      p.login = cfg.login || "(логин)"; p.password = "••••••••";
      if (st.individual) { p.phones = ch.map(function (x) { return x.phone + " " + withName(st.msg, x.name).replace(/\r?\n/g, " "); }).join(DELIM); p.message = ""; p.individual_messages = 1; p.delimiter = DELIM; }
      else { p.phones = ch.map(function (x) { return x.phone; }).join(","); p.message = st.msg.replace(/\r?\n/g, " "); }
      p.rus = st.rus; p.originator = st.orig; p.max_parts = st.maxp;
      if (st.route) p.route = st.route;
      if (st.later) { p.start_date = mskStr(st.start); if (st.stop) p.stop_date = mskStr(st.stop); if (T.next.checked) p.isSendNextDay = 1; if (T.local.checked) p.isAbonentLocalTime = 1; }
      if (st.want) p.want_sms_ids = 1;
      if (st.batch) p.batch_name = st.batch;
      if (st.track) p.tracking_data = st.track;
      if (st.ignore) p.ignore_phone_format = 1;
      if (/viber/.test(st.route)) { if (T.img.value) p.image_url = T.img.value; if (T.btnu.value) { p.btn_url = T.btnu.value; p.btn_name = T.btnn.value; } if (T.linkt.checked) p.link_in_text = 1; }
      reqs.push(p);
    }
    return reqs;
  }
  function reqText(reqs, forCopy) {
    if (!reqs.length) return "";
    var p = reqs[0], host = HOSTS[cfg.server];
    var head = cfg.mode === "proxy" && cfg.proxy ? "POST " + cfg.proxy + "   (ваш сервер добавит login и password)" : "POST http://" + host + "/smartdelivery-in/multi.php";
    var lines = [head, "Content-Type: application/x-www-form-urlencoded", ""];
    Object.keys(p).forEach(function (k) {
      var v = String(p[k]);
      if (k === "phones" && !forCopy) { var sep = p.delimiter || ",", arr = v.split(sep); v = arr.slice(0, 2).join(sep) + (arr.length > 2 ? "  … ещё " + (arr.length - 2) : ""); }
      lines.push(k + "=" + v);
    });
    if (reqs.length > 1) lines.push("", "# всего запросов: " + reqs.length + " (не более " + CHUNK + " получателей в одном)");
    return lines.join("\n");
  }
  function reqHtml(txt) {
    return esc(txt).split("\n").map(function (l, i) {
      if (i === 0) return '<span class="g">' + l + "</span>";
      if (/^Content-Type/.test(l)) return '<span class="m">' + l + "</span>";
      if (l[0] === "#") return '<span class="m">' + l + "</span>";
      var m = l.match(/^([A-Za-z_]+)=(.*)$/); return m ? '<span class="k">' + m[1] + "</span>=" + m[2] : l;
    }).join("\n");
  }

  /* ---------- сводка и предпросмотр ---------- */
  function refresh() {
    var st = read();
    $("#s-rcpt-stat").innerHTML = "<span><b>" + st.r.valid.length + "</b> верных</span><span><b>" + st.r.invalid.length + "</b> с ошибкой</span>" + (st.r.dups ? "<span><b>" + st.r.dups + "</b> повторов убрано</span>" : "") + (st.r.blocked.length ? "<span><b>" + st.r.blocked.length + "</b> в чёрном списке, исключены</span>" : "");
    var inv = $("#s-invalid");
    if (st.r.invalid.length) { inv.hidden = false; inv.innerHTML = "<b>Не вошли в рассылку:</b><br>" + st.r.invalid.slice(0, 6).map(function (x) { return esc(x.raw) + " — " + esc(x.reason); }).join("<br>") + (st.r.invalid.length > 6 ? "<br>… и ещё " + (st.r.invalid.length - 6) : ""); } else inv.hidden = true;
    var i = st.sample;
    $("#s-len").innerHTML = "<b>" + i.len + "</b> симв. · " + (i.cyr ? "кириллица" : "латиница") + ", в одной части до " + i.single + " (в составной до " + i.multi + ") · частей: <b>" + i.parts + "</b>" + (i.parts > st.maxp ? ' <span style="color:var(--warn)">лишнее обрежется (max_parts=' + st.maxp + ")</span>" : "");
    $("#sum-r").textContent = st.r.valid.length; $("#sum-p").textContent = i.parts; $("#sum-t").textContent = st.totalParts;
    var cost = st.totalParts * (+cfg.price || 0), live = cfg.mode === "demo";
    $("#sum-c").textContent = st.totalParts ? money(cost) : "—"; $("#sum-cur").textContent = "BYN";
    $("#cost-price").textContent = money(cfg.price) + " BYN"; $("#cost-parts").textContent = st.totalParts; $("#cost-total").textContent = money(cost) + " BYN";
    $("#cost-bal").textContent = live ? money(balance) + " BYN" : "узнайте в разделе «Подключение»"; $("#cost-left").textContent = live ? money(balance - cost) + " BYN" : "—";
    $("#costbox").classList.toggle("short", live && cost > balance + 1e-9);
    $("#sum-note").textContent = st.individual ? "В тексте есть {name}: каждому получателю уйдёт своё сообщение (individual_messages=1)." : "Всем получателям уйдёт одинаковый текст.";
    var reqs = buildRequests(st); $("#s-req").innerHTML = reqs.length ? reqHtml(reqText(reqs)) : '<span class="m">Добавьте получателей и текст, запрос соберётся сам.</span>';
    $("#s-viber").hidden = !/viber/.test(st.route);
    $("#s-custom-wrap").hidden = T.route.value !== "custom";
    $("#s-sched").hidden = when !== "later";
    var wi = $("#s-wantids-wrap"); T.wantids.disabled = when === "later"; wi.classList.toggle("off", when === "later");
    $("#s-mode-note").textContent = cfg.mode === "demo" ? "Демо-режим: запрос не уходит, ответ имитируется. Подключение и режимы: раздел «Подключение»." : "Запрос уйдёт на ваш сервер-посредник.";
    $("#bal-side").textContent = cfg.mode === "demo" ? money(balance) + " BYN" : "—";
    if (tried) showErrors(validate(st));
    return st;
  }
  function showErrors(e) { var b = $("#s-errors"); b.hidden = !e.length; b.innerHTML = e.length ? "<b>Исправьте перед отправкой:</b><br>" + e.map(esc).join("<br>") : ""; }

  ["input", "change"].forEach(function (ev) { $("#view-sms").addEventListener(ev, function (e) { if (e.target.closest("#s-when") || e.target.id === "s-file") return; refresh(); }); });
  $("#s-when").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return; when = b.dataset.v;
    $$("#s-when button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    if (when === "later") { if (!T.start.value) { var d = new Date(Date.now() + 3600e3); T.start.value = A.isoDate(d) + "T" + A.pad(d.getHours()) + ":00"; } T.wantids.checked = false; } else T.wantids.checked = true;
    refresh();
  });
  var BUILTIN = [["День пиццы", "{name}, по вторникам в COLIZEUM кусочек пиццы в подарок! Ждём вас: ул. Советская, 48-57."],
    ["Новый год", "{name}, встречайте 2027 год в COLIZEUM: фуршет, программа, любые зоны клуба. Депозит 100 руб. Бронь: +375 44 531-31-33"],
    ["Бронь", "Забронируйте ПК в COLIZEUM онлайн и играйте без очереди. Работаем 24/7."],
    ["Сертификат", "{name}, ваш подарочный сертификат COLIZEUM готов. Покажите это сообщение администратору."]];
  var TPL_KEY = "clz_tpl", saved = A.load(TPL_KEY, []);
  var TPL = BUILTIN;
  function tplDraw() {
    $("#s-tpls").innerHTML = BUILTIN.map(function (t, i) { return '<button type="button" class="chip" data-b="' + i + '">' + esc(t[0]) + "</button>"; }).join("") +
      saved.map(function (t, i) { return '<span class="tplchip"><button type="button" class="chip" data-s="' + i + '" aria-pressed="false">★ ' + esc(t.name) + '</button><button type="button" class="x" data-x="' + i + '" aria-label="Удалить шаблон ' + esc(t.name) + '">Удалить</button></span>'; }).join("");
  }
  tplDraw();
  $("#s-tpls").addEventListener("click", function (e) {
    var x = e.target.closest("[data-x]");
    if (x) { A.confirmBtn(x, "Точно?", function () { saved.splice(+x.dataset.x, 1); A.save(TPL_KEY, saved); tplDraw(); A.toast("Шаблон удалён"); }); return; }
    var b = e.target.closest(".chip"); if (!b) return;
    var t = b.dataset.b !== undefined ? BUILTIN[+b.dataset.b] : [saved[+b.dataset.s].name, saved[+b.dataset.s].text];
    T.msg.value = t[1]; if (!T.batch.value) T.batch.value = t[0]; refresh();
  });
  $("#s-tpl-save").addEventListener("click", function () {
    var name = $("#s-tpl-name").value.trim(), text = T.msg.value.trim();
    if (!text) { A.toast("Сначала введите текст сообщения", true); T.msg.focus(); return; }
    if (!name) { A.toast("Дайте шаблону название", true); $("#s-tpl-name").focus(); return; }
    var ex = saved.filter(function (t) { return t.name.toLowerCase() === name.toLowerCase(); })[0];
    if (ex) { ex.text = text; A.toast("Шаблон «" + name + "» обновлён"); } else { saved.push({ name: name, text: text }); A.toast("Шаблон «" + name + "» сохранён"); }
    A.save(TPL_KEY, saved); $("#s-tpl-name").value = ""; tplDraw();
  });
  $("#s-ins-name").addEventListener("click", function () { var t = T.msg, s = t.selectionStart || 0, e = t.selectionEnd || 0; t.value = t.value.slice(0, s) + "{name}" + t.value.slice(e); t.focus(); t.selectionStart = t.selectionEnd = s + 6; refresh(); });
  $("#s-sample").addEventListener("click", function () { T.rcpt.value = "+375 29 111-22-33; Иван\n+375 44 222-33-44; Анна\n+375 33 333-44-55; Дмитрий\n80255556677\n29 777-88-99; Олег\n12345; Ошибка в номере"; refresh(); });
  $("#s-clear-r").addEventListener("click", function () { T.rcpt.value = ""; refresh(); });
  $("#s-file").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return; if (f.size > 2e6) { A.toast("Файл больше 2 МБ", true); return; }
    var fr = new FileReader(); fr.onload = function () { T.rcpt.value = String(fr.result); refresh(); A.toast("Список загружен"); }; fr.readAsText(f); e.target.value = "";
  });
  $("#s-copy-req").addEventListener("click", function () { A.copy(reqText(buildRequests(read()), true), $("#s-req")); });

  A.smsPrefill = function (o) { T.rcpt.value = o.recipients || ""; T.msg.value = o.message || ""; T.batch.value = o.batch || ""; A.go("sms"); refresh(); A.toast("Данные перенесены в рассылку"); };

  /* ---------- отправка ---------- */
  var rid = function () { var s = String(1 + Math.floor(Math.random() * 9)); while (s.length < 38) s += Math.floor(Math.random() * 10); return s; };
  function xml(r) {
    var s = '<?xml version="1.0" ?>\n<reply>\n  <result>' + r.result + "</result>\n  <code>" + r.code + "</code>\n  <description>" + esc(r.description) + "</description>";
    if (r.infos && r.infos.length) { s += "\n  <message_infos>"; r.infos.slice(0, 3).forEach(function (i) { s += "\n    <message_info>\n      <phone>" + i.phone + "</phone>\n      <sms_id>" + i.id + "</sms_id>\n    </message_info>"; }); if (r.infos.length > 3) s += "\n    <!-- … ещё " + (r.infos.length - 3) + " -->"; s += "\n  </message_infos>"; }
    return s + "\n</reply>";
  }
  function xmlHtml(t) { return esc(t).replace(/&lt;(\/?[a-z_?]+)([^&]*?)&gt;/gi, '<span class="k">&lt;$1$2&gt;</span>').replace(/(&lt;!--.*?--&gt;)/g, '<span class="m">$1</span>'); }

  function callProxy(p) {
    var body = new URLSearchParams(); Object.keys(p).forEach(function (k) { if (k !== "login" && k !== "password") body.append(k, p[k]); });
    return fetch(cfg.proxy, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body }).then(function (r) { return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, "text/xml"), g = function (n) { var e = d.getElementsByTagName(n)[0]; return e ? e.textContent : ""; };
      var infos = Array.prototype.slice.call(d.getElementsByTagName("message_info")).map(function (m) { return { phone: m.getElementsByTagName("phone")[0].textContent, id: m.getElementsByTagName("sms_id")[0].textContent }; });
      return { result: g("result") || "ERROR", code: g("code") || "1000", description: g("description") || "empty reply", infos: infos, account: g("account") };
    });
  }

  var sending = false, lastId = null;
  $("#s-send").addEventListener("click", function () {
    var st = read(); tried = true; var errs = validate(st); showErrors(errs); if (errs.length || sending) { if (errs.length) A.toast("Проверьте форму: " + errs.length + " замеч.", true); return; }
    A.confirmBtn(this, "Списать " + money(st.totalParts * (+cfg.price || 0)) + " BYN и отправить?", doSend);
  });
  function doSend() {
    var st = read();
    var reqs = buildRequests(st), btn = $("#s-send"); sending = true; btn.disabled = true; btn.textContent = "Отправляем…";
    var total = st.totalParts, cost = total * (+cfg.price || 0), infos = [], chain = Promise.resolve({ result: "OK", code: 0, description: "queued " + st.r.valid.length + " messages" });
    if (cfg.mode === "demo") {
      chain = new Promise(function (res) { setTimeout(res, 700); }).then(function () {
        if (cost > balance + 1e-9) return { result: "ERROR", code: 415, description: "Insufficient funds" };
        balance = +(balance - cost).toFixed(3); A.save(BAL_KEY, balance);
        infos = st.r.valid.map(function (x) { return { phone: x.phone, id: rid() }; });
        return { result: "OK", code: 0, description: "queued " + st.r.valid.length + " messages", infos: st.want ? infos : [] };
      });
    } else {
      chain = reqs.reduce(function (pr, p) { return pr.then(function (acc) { if (acc.result !== "OK") return acc; return callProxy(p).then(function (r) { r.infos = (acc.infos || []).concat(r.infos || []); return r; }); }); }, Promise.resolve({ result: "OK", code: 0, description: "", infos: [] }));
      chain = chain.then(function (r) { infos = r.infos || []; return r; });
    }
    chain.then(function (r) {
      var panel = $("#s-reply-panel"); panel.hidden = false; $("#s-reply").innerHTML = xmlHtml(xml(r));
      if (r.result === "OK") {
        var m = makeMailing(st, infos, cost); lastId = m.id; refreshAll(); $("#s-to-history").hidden = false;
        A.toast("Рассылка в очереди: " + st.r.valid.length + " получателей"); tried = false; showErrors([]);
      } else { $("#s-to-history").hidden = true; A.toast("Сервер вернул ошибку " + r.code + ": " + r.description, true); }
    }).catch(function (err) {
      $("#s-reply-panel").hidden = false; $("#s-reply").innerHTML = '<span class="r">Не удалось связаться с сервером-посредником.\n' + esc(err && err.message || err) + "</span>"; $("#s-to-history").hidden = true; A.toast("Нет связи с вашим сервером", true);
    }).then(function () { sending = false; btn.disabled = false; btn.textContent = "Отправить рассылку"; refresh(); });
  }
  $("#s-to-history").addEventListener("click", function () { sel = lastId; A.go("history"); });

  /* ---------- история ---------- */
  var mails = A.load(MAIL_KEY, null), sel = null, flt = "all";
  function makeMailing(st, infos, cost) {
    var viber = /viber/.test(st.route), idmap = {}; infos.forEach(function (i) { idmap[i.phone] = i.id; });
    var m = { id: "m" + Date.now(), created: Date.now(), batch: st.batch || "Без названия", route: st.route || "sms", orig: st.orig, rus: st.rus, message: st.msg, viber: viber, start: st.later ? mskTs(st.start) : null,
      reqs: Math.ceil(st.r.valid.length / CHUNK), parts: st.totalParts, cost: +cost.toFixed(3), noids: !st.want, demo: cfg.mode === "demo",
      rcpts: st.r.valid.map(function (x) { return { phone: x.phone, name: x.name, id: idmap[x.phone] || null, status: st.later ? "SCHEDULED" : (st.want ? "ROUTED" : "QUEUED"), ch: viber ? "viber" : "sms" }; }) };
    mails.unshift(m); mails = mails.slice(0, 30); A.save(MAIL_KEY, mails); return m;
  }
  function advance(m) {
    var now = Date.now(), n = 0, pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    m.rcpts.forEach(function (r) {
      if (r.status === "SCHEDULED") { if (m.start && now >= m.start) r.status = "ROUTED"; else return; }
      if (r.status === "ROUTED" || r.status === "QUEUED" || r.status === "SENT") {
        var x = Math.random(); n++;
        if (x < .86) r.status = "DELIVERED";
        else if (x < .95) { r.status = "UNDELIVERED"; r.ch = m.viber && Math.random() < .5 ? "viber" : "sms"; r.err = r.ch === "viber" ? 9 : pick([1, 3, 9, 10]); }
        else r.status = "NOT_ROUTED";
        return;
      }
      if (r.status === "DELIVERED" && m.viber && Math.random() < .5) { r.status = "READ"; n++; }
    });
    return n;
  }
  if (!mails) {
    var demoR = [["375291112233", "Иван"], ["375442223344", "Анна"], ["375333334455", "Дмитрий"], ["375255556677", ""], ["375297778899", "Олег"], ["375291234000", "Мария"], ["375447770011", "Павел"], ["375336660022", ""]];
    var dm = { id: "demo1", created: Date.now() - 26 * 3600e3, batch: "Акция «День пиццы»", route: "viber(60)-sms", orig: "COLIZEUM.BY", rus: "5", message: "{name}, по вторникам в COLIZEUM кусочек пиццы в подарок! Ждём вас: ул. Советская, 48-57.", viber: true, start: null, reqs: 1, parts: 8, cost: 0.36, noids: false, demo: true, example: true,
      rcpts: demoR.map(function (x) { return { phone: x[0], name: x[1], id: rid(), status: "ROUTED", ch: "viber" }; }) };
    advance(dm); advance(dm); advance(dm); mails = [dm]; A.save(MAIL_KEY, mails);
  }
  var KIND = function (s) { return s === "DELIVERED" || s === "READ" || s === "CLICKED" ? "ok" : (s === "UNDELIVERED" || s === "ERROR" || s === "TIMEOUT" || s === "NOT_ROUTED" || s === "DOUBLED") ? "bad" : "wait"; };
  function counts(m) { var c = { ok: 0, bad: 0, wait: 0, read: 0 }; m.rcpts.forEach(function (r) { c[KIND(r.status)]++; if (r.status === "READ" || r.status === "CLICKED") c.read++; }); return c; }
  var pill = function (s) { var p = ST[s] || ["info", s]; return '<span class="pill ' + p[0] + '">' + p[1] + "</span>"; };

  function history() {
    $("#cnt-mail").textContent = mails.length;
    var tot = 0, ok = 0, bad = 0, rd = 0; mails.forEach(function (m) { var c = counts(m); tot += m.rcpts.length; ok += c.ok; bad += c.bad; rd += c.read; });
    var pd = ok + bad ? Math.round(100 * ok / (ok + bad)) : 0, pr = ok ? Math.round(100 * rd / ok) : 0;
    $("#kpis").innerHTML = '<div class="kpi"><b>' + mails.length + "</b><span>рассылок в истории</span></div><div class=\"kpi\"><b>" + tot + "</b><span>сообщений отправлено</span></div>" +
      '<div class="kpi"><b>' + pd + '%</b><span>доставлено</span><i><em style="width:' + pd + '%"></em></i></div><div class="kpi"><b>' + pr + '%</b><span>прочитано (Viber)</span><i><em style="width:' + pr + '%"></em></i></div>';
    var tb = $("#mail-rows");
    if (!mails.length) { tb.innerHTML = '<tr><td colspan="6"><div class="empty"><b>Рассылок пока нет</b>Создайте первую в разделе «Новая рассылка».</div></td></tr>'; $("#detail").hidden = true; return; }
    tb.innerHTML = mails.map(function (m) {
      var c = counts(m), res;
      if (m.rcpts.length && m.rcpts.every(function (r) { return r.status === "SCHEDULED"; })) res = '<span class="pill info">Отложена до ' + A.fmtDT(m.start) + "</span>";
      else if (c.wait) res = '<span class="pill info">В процессе: ' + (m.rcpts.length - c.wait) + " из " + m.rcpts.length + "</span>";
      else res = '<span class="pill ' + (c.bad ? "warn" : "ok") + '">Завершена: доставлено ' + c.ok + " из " + m.rcpts.length + "</span>";
      return '<tr class="' + (m.id === sel ? "sel" : "") + '"><td>' + A.fmtDT(m.created) + "</td><td>" + esc(m.batch) + (m.example ? '<span class="tagx">пример</span>' : "") + '</td><td class="mono">' + esc(m.route) + '</td><td class="num">' + m.rcpts.length + "</td><td>" + res + '</td><td><div class="acts"><button class="btn sm" data-a="open" data-id="' + m.id + '">Открыть</button></div></td></tr>';
    }).join("");
    detail();
  }
  function detail() {
    var box = $("#detail"), m = mails.filter(function (x) { return x.id === sel; })[0];
    if (!m) { box.hidden = true; return; } box.hidden = false;
    var c = counts(m), list = m.rcpts.filter(function (r) { return flt === "all" || (flt === "ok" && KIND(r.status) === "ok") || (flt === "bad" && KIND(r.status) === "bad") || (flt === "wait" && KIND(r.status) === "wait"); });
    var chips = [["all", "Все " + m.rcpts.length], ["ok", "Доставлено " + c.ok], ["bad", "Проблемы " + c.bad], ["wait", "Ожидают " + c.wait]].map(function (x) { return '<button class="chip" data-f="' + x[0] + '" aria-pressed="' + (flt === x[0]) + '">' + x[1] + "</button>"; }).join("");
    box.innerHTML = '<div class="row between"><div><h2>' + esc(m.batch) + '</h2><p class="muted" style="margin-top:4px">Создана ' + A.fmtDT(m.created) + " · отправитель " + esc(m.orig) + " · маршрут <span class=\"mono\">" + esc(m.route) + "</span> · частей: " + m.parts + (m.cost ? " · " + money(m.cost) + " BYN" : "") + '</p></div>' +
      '<div class="row"><button class="btn sm" data-a="refresh">Обновить статусы</button><button class="btn sm quiet" data-a="again">Повторить рассылку</button><button class="btn sm danger" data-a="del">Удалить</button></div></div>' +
      '<div class="note" style="margin:14px 0"><b style="color:var(--white)">Текст:</b> ' + esc(m.message) + "</div>" +
      (m.noids ? '<div class="note warn" style="margin-bottom:14px">Идентификаторы не запрашивались (want_sms_ids=0): статусы можно получать только через callback.</div>' : '<p class="muted" style="font-size:13px;margin-bottom:12px">Проверка статусов: операция status, не больше ' + STATUS_CHUNK + ' идентификаторов за запрос. Для этой рассылки нужно запросов: ' + Math.ceil(m.rcpts.length / STATUS_CHUNK) + ".</p>") +
      '<div class="chips" id="d-flt" style="margin-bottom:12px">' + chips + "</div>" +
      '<div class="tablewrap"><table><thead><tr><th>Телефон</th><th>Имя</th><th>sms_id</th><th>Статус</th><th>Причина</th><th></th></tr></thead><tbody>' +
      (list.length ? list.slice(0, 100).map(function (r) {
        var why = r.err ? (ERR[r.ch] && ERR[r.ch][r.err] || "код " + r.err) + " (" + r.ch + ", " + r.err + ")" : (r.status === "NOT_ROUTED" ? "Ответ о доставке не получен" : "");
        return "<tr><td class=\"mono\">" + fmtPhone(r.phone) + "</td><td>" + (esc(r.name) || '<span class="muted">—</span>') + '</td><td class="mono" style="font-size:12px;color:var(--mute)">' + (r.id ? esc(r.id.slice(0, 10)) + "…" : "—") + "</td><td>" + pill(r.status) + '</td><td class="muted">' + esc(why) + '</td><td>' + (KIND(r.status) === "bad" ? (A.black.has(r.phone) ? '<span class="muted">в чёрном списке</span>' : '<button class="btn sm quiet" data-bl="' + r.phone + '">В чёрный список</button>') : "") + "</td></tr>";
      }).join("") : '<tr><td colspan="6"><div class="empty">В этой выборке сообщений нет.</div></td></tr>') + "</tbody></table></div>" + (list.length > 100 ? '<p class="muted" style="margin-top:8px">Показаны первые 100 из ' + list.length + ".</p>" : "");
  }
  $("#mail-rows").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; sel = b.dataset.id; flt = "all"; history(); $("#detail").scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("#detail").addEventListener("click", function (e) {
    var f = e.target.closest("[data-f]"); if (f) { flt = f.dataset.f; detail(); return; }
    var bl = e.target.closest("[data-bl]"); if (bl) { A.black.add(bl.dataset.bl, "Не доставлено в рассылке"); detail(); A.toast("Номер добавлен в чёрный список"); return; }
    var b = e.target.closest("button[data-a]"); if (!b) return; var m = mails.filter(function (x) { return x.id === sel; })[0]; if (!m) return;
    if (b.dataset.a === "refresh") { var n = advance(m); A.save(MAIL_KEY, mails); history(); A.toast(n ? "Статусы обновлены: изменилось " + n : "Новых статусов нет"); }
    if (b.dataset.a === "again") A.smsPrefill({ recipients: m.rcpts.map(function (r) { return "+" + r.phone + (r.name ? "; " + r.name : ""); }).join("\n"), message: m.message, batch: m.batch });
    if (b.dataset.a === "del") A.confirmBtn(b, "Точно удалить?", function () { mails = mails.filter(function (x) { return x.id !== m.id; }); A.save(MAIL_KEY, mails); sel = null; history(); A.toast("Рассылка удалена из истории"); });
  });
  $("#h-new").addEventListener("click", function () { A.go("sms"); });

  /* ---------- подключение ---------- */
  var G = { server: $("#g-server"), login: $("#g-login"), pass: $("#g-pass"), proxy: $("#g-proxy"), orig: $("#g-orig"), price: $("#g-price") };
  function cfgFill() {
    G.server.value = cfg.server; G.login.value = cfg.login; G.proxy.value = cfg.proxy; G.orig.value = cfg.orig; G.price.value = cfg.price; G.pass.value = pass;
    $$("#g-mode button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === cfg.mode)); }); $("#g-proxy-wrap").hidden = cfg.mode !== "proxy";
  }
  $("#g-mode").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; cfg.mode = b.dataset.v; $$("#g-mode button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); $("#g-proxy-wrap").hidden = cfg.mode !== "proxy"; });
  $("#cfg-form").addEventListener("submit", function (e) {
    e.preventDefault(); cfg.server = G.server.value; cfg.login = G.login.value.trim(); cfg.proxy = G.proxy.value.trim(); cfg.orig = G.orig.value.trim() || "COLIZEUM.BY"; cfg.price = +G.price.value || 0; pass = G.pass.value;
    A.save(CFG_KEY, cfg); T.orig.value = cfg.orig; refresh(); A.toast("Настройки сохранены");
  });
  $("#g-balance").addEventListener("click", function () {
    var out = $("#g-balance-out"); out.hidden = false;
    if (cfg.mode === "demo") { out.innerHTML = xmlHtml('<?xml version="1.0" ?>\n<reply>\n  <account>' + balance.toFixed(2) + "</account>\n</reply>") + '\n<span class="m">демо-значение, настоящий баланс покажет боевой режим</span>'; return; }
    if (!cfg.proxy) { out.innerHTML = '<span class="r">Укажите адрес сервера-посредника и сохраните настройки.</span>'; return; }
    out.textContent = "Запрашиваем…";
    callProxy({ operation: "account" }).then(function (r) { out.innerHTML = xmlHtml("<reply>\n  <account>" + r.account + "</account>\n</reply>"); }).catch(function (er) { out.innerHTML = '<span class="r">Нет связи: ' + esc(er.message || er) + "</span>"; });
  });

  function refreshAll() { refresh(); history(); }
  A.hooks.history = history; A.hooks.sms = refresh; A.hooks.config = cfgFill;
  T.orig.value = cfg.orig;
  T.msg.value = BUILTIN[0][1]; T.batch.value = BUILTIN[0][0];
  T.rcpt.value = "+375 29 111-22-33; Иван\n+375 44 222-33-44; Анна\n+375 33 333-44-55; Дмитрий";
  cfgFill(); refresh(); history(); A.start();
})();

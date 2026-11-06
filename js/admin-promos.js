/* COLIZEUM бэк-офис: управление акциями сайта (добавить, изменить, выключить, удалить, назначить срок) */
(function () {
  var A = window.A, $ = A.$, esc = A.esc, P = window.PROMOS, editId = null;
  var ST = { live: ["ok", "Идёт сейчас"], soon: ["info", "Запланирована"], done: ["bad", "Завершена"], off: ["warn", "Выключена"] };
  var dmy = function (iso) { return iso ? A.fmtDate(A.parseISO(iso)) : ""; };
  $("#p-img").innerHTML = P.IMGS.map(function (i) { return '<option value="' + i[0] + '">' + esc(i[1]) + "</option>"; }).join("");

  function term(p) { return p.start || p.end ? (p.start ? "с " + dmy(p.start) : "") + (p.start && p.end ? " " : "") + (p.end ? "по " + dmy(p.end) : "") : "Без срока"; }
  function render() {
    var list = P.all(); $("#cnt-promos").textContent = list.filter(function (p) { return P.status(p) === "live"; }).length;
    $("#p-rows").innerHTML = list.length ? list.map(function (p, i) {
      var s = P.status(p);
      return "<tr><td><b style=\"color:var(--white)\">" + esc(p.title) + "</b></td><td>" + esc(P.CATS[p.cat] || p.cat) + "</td><td>" + term(p) + '</td><td><span class="pill ' + ST[s][0] + '">' + ST[s][1] + "</span></td>" +
        '<td><div class="acts"><button class="btn sm" data-a="edit" data-i="' + i + '">Изменить</button><button class="btn sm quiet" data-a="on" data-i="' + i + '">' + (p.on ? "Выключить" : "Включить") + '</button><button class="btn sm danger" data-a="del" data-i="' + i + '">Удалить</button></div></td></tr>';
    }).join("") : '<tr><td colspan="5"><div class="empty"><b>Акций нет</b>Нажмите «Новая акция».</div></td></tr>';
  }
  function open(p) {
    editId = p ? p.id : null; var f = $("#p-form"); f.hidden = false; $("#p-err").hidden = true;
    $("#p-form-title").textContent = p ? "Изменить акцию" : "Новая акция";
    p = p || { cat: "season", on: true };
    $("#p-title").value = p.title || ""; $("#p-cat").value = p.cat; $("#p-lead").value = p.lead || ""; $("#p-start").value = p.start || ""; $("#p-end").value = p.end || "";
    $("#p-img").value = p.img || ""; $("#p-price").value = p.price || ""; $("#p-pricenote").value = p.priceNote || ""; $("#p-list").value = (p.list || []).join("\n"); $("#p-note").value = p.note || "";
    $("#p-on").checked = !!p.on; $("#p-feat").checked = !!p.featured;
    f.scrollIntoView({ behavior: "smooth", block: "start" }); $("#p-title").focus();
  }
  $("#p-new").addEventListener("click", function () { open(null); });
  $("#p-cancel").addEventListener("click", function () { $("#p-form").hidden = true; });
  $("#p-rows").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return; var list = P.all(), i = +b.dataset.i, p = list[i];
    if (b.dataset.a === "edit") open(p);
    if (b.dataset.a === "on") { p.on = !p.on; P.save(list); render(); A.toast(p.on ? "Акция включена" : "Акция выключена"); }
    if (b.dataset.a === "del") A.confirmBtn(b, "Точно удалить?", function () { list.splice(i, 1); P.save(list); render(); A.toast("Акция удалена"); });
  });
  $("#p-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var s = $("#p-start").value, en = $("#p-end").value, err = $("#p-err");
    if (s && en && en < s) { err.hidden = false; err.textContent = "Дата окончания раньше даты начала."; return; }
    err.hidden = true;
    var list = P.all(), cat = $("#p-cat").value, img = $("#p-img").value;
    var old = list.filter(function (x) { return x.id === editId; })[0] || {};
    var p = Object.assign({}, old, { id: editId || "p" + Date.now(), cat: cat, catName: P.CATS[cat], featured: $("#p-feat").checked, title: $("#p-title").value.trim(), lead: $("#p-lead").value.trim(),
      price: $("#p-price").value.trim(), priceNote: $("#p-pricenote").value.trim(), note: $("#p-note").value.trim(), img: img, imgAlt: img ? $("#p-title").value.trim() : "",
      list: $("#p-list").value.split("\n").map(function (t) { return t.trim(); }).filter(Boolean), start: s, end: en, on: $("#p-on").checked });
    if (!p.price) { delete p.price; delete p.priceNote; } if (!p.note) delete p.note; if (!p.list.length) delete p.list; if (!p.img) { delete p.img; delete p.imgAlt; }
    if (editId) list[list.indexOf(old)] = p; else list.push(p);
    P.save(list); $("#p-form").hidden = true; render(); A.toast(editId ? "Акция обновлена" : "Акция добавлена");
  });
  A.hooks.promos = render; render();
})();
